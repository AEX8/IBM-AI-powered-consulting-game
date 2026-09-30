// Tried in order. Groq rate limits are per model, so a model that has hit its
// daily cap leaves the next one's budget untouched. 120b is the same family as
// 20b, so it returns the same response format. qwen is a different family and
// safeguard is tuned for moderation rather than roleplay, so both are last
// resorts: a slightly off reply is better than no reply.
export const GROQ_MODELS = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-safeguard-20b',
] as const

// Some models (qwen) may put their reasoning in the reply as a <think> block.
// It must never reach the player or the JSON parsers, closed or cut off.
export function stripReasoning(text: string): string {
  return text.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '').trim()
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_TIMEOUT_MS = 25_000
// A model that reports its tokens-per-day cap as used up is skipped for a while,
// so later calls do not each waste a request rediscovering that. Keyed by
// "<credential label>:<model>" since each API key has its own separate budget
// per model, even when the model name is the same.
const DAILY_LIMIT_PATTERN = /tokens per day|\(TPD\)/i
const DAILY_LIMIT_SKIP_MS = 5 * 60_000
const exhaustedUntil = new Map<string, number>()

// Tried in order. GROQ_API_KEY is required; GROQ_API_KEY_BACKUP is optional — a
// teammate's own Groq account, so it draws from a completely separate daily
// budget. Every model in GROQ_MODELS is tried on one key before moving to the
// next, so the backup key is only ever touched once the primary is genuinely
// out of room on all four models.
function credentials(): { label: string; apiKey: string }[] {
  const list: { label: string; apiKey: string }[] = []
  const primary = process.env.GROQ_API_KEY
  const backup = process.env.GROQ_API_KEY_BACKUP

  if (primary) list.push({ label: 'primary', apiKey: primary })
  if (backup) list.push({ label: 'backup', apiKey: backup })

  return list
}
// A rate-limit (429) or transient server error (5xx) is worth one retry after
// a short pause — the rejected call was never processed, so this doesn't cost
// extra tokens. Anything else (bad request, bad key) retrying won't fix.
const MAX_TRANSIENT_ATTEMPTS = 2
const TRANSIENT_RETRY_DELAY_MS = 1500

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type GroqMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class GroqError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'GroqError'
    this.status = status
  }
}

// Sends one chat request and returns Groq's raw Response plus which credential
// and model answered. Retries a transient failure once, moves on to the next
// model when one is rate limited, and moves on to the next API key (the
// backup) once every model on the current key is exhausted. A failed Response
// is returned as-is (its body unread) so callers can decide how to report it.
// Server only.
export async function fetchGroqChat(options: {
  messages: GroqMessage[]
  maxTokens: number
  temperature?: number
}): Promise<{ response: Response; model: string; credential: string }> {
  const creds = credentials()

  if (creds.length === 0) {
    throw new GroqError('GROQ_API_KEY is not configured', 500)
  }

  let last: { response: Response; model: string; credential: string } | undefined

  for (const { label, apiKey } of creds) {
    const now = Date.now()
    const available = GROQ_MODELS.filter(
      (model) => (exhaustedUntil.get(`${label}:${model}`) ?? 0) <= now
    )
    // If every model is flagged for this key, try them all anyway rather than
    // skipping straight to the next key.
    const candidates = available.length > 0 ? available : GROQ_MODELS
    let badKey = false

    for (const model of candidates) {
      for (let attempt = 0; attempt < MAX_TRANSIENT_ATTEMPTS; attempt++) {
        const response = await fetch(GROQ_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: options.temperature ?? 0.6,
            messages: options.messages,
            max_tokens: options.maxTokens,
          }),
          signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
        })

        last = { response, model, credential: label }
        if (response.ok) return last

        const body = await response.clone().text()
        console.error('Groq request failed:', label, model, response.status, body)

        // A daily cap will not clear in seconds, so waiting is pointless: go
        // straight to the next model on this key.
        if (response.status === 429 && DAILY_LIMIT_PATTERN.test(body)) {
          exhaustedUntil.set(`${label}:${model}`, Date.now() + DAILY_LIMIT_SKIP_MS)
          break
        }

        // A bad key fails on every model on that key, so stop trying this key
        // entirely and move straight to the next one (if any).
        if (response.status === 401 || response.status === 403) {
          badKey = true
          break
        }

        if (!isRetryableStatus(response.status)) break
        if (attempt < MAX_TRANSIENT_ATTEMPTS - 1) {
          await sleep(TRANSIENT_RETRY_DELAY_MS * (attempt + 1))
        }
      }

      if (badKey) break
    }
  }

  if (!last) throw new GroqError('The AI service request failed', 502)
  return last
}

// Sends one chat request and returns the reply text. Server only.
// maxTokens must be generous (1000+): this is a reasoning model that spends part
// of the budget thinking, and too small a budget produces an empty reply.
export async function callGroq(options: {
  messages: GroqMessage[]
  maxTokens: number
  temperature?: number
}): Promise<string> {
  const { response } = await fetchGroqChat(options)

  if (!response.ok) {
    throw new GroqError('The AI service request failed', response.status)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  const reply = typeof content === 'string' ? stripReasoning(content) : ''

  if (!reply) {
    throw new GroqError('The AI service returned an empty reply', 502)
  }

  return reply
}

// gpt-oss occasionally emits slightly malformed JSON on one call (e.g. an
// extra stray array) even when told to return only JSON. Retry once with the
// same prompt before giving up, since a second generation is usually clean.
export async function callGroqForJson<T>(options: {
  messages: GroqMessage[]
  maxTokens: number
  temperature?: number
  parse: (raw: string) => T | null
}): Promise<{ result: T | null; lastRaw: string }> {
  let lastRaw = ''

  for (let attempt = 0; attempt < 2; attempt++) {
    lastRaw = await callGroq(options)
    const result = options.parse(lastRaw)
    if (result) return { result, lastRaw }
  }

  return { result: null, lastRaw }
}

// Models sometimes wrap JSON in code fences or add a sentence before it. Return the
// {...} slice so callers can parse it, or null if there is no object at all.
export function extractJsonObject(raw: string): string | null {
  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return null
  }

  return cleaned.slice(firstBrace, lastBrace + 1)
}
