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
// so later calls do not each waste a request rediscovering that.
const DAILY_LIMIT_PATTERN = /tokens per day|\(TPD\)/i
const DAILY_LIMIT_SKIP_MS = 5 * 60_000
const exhaustedUntil = new Map<string, number>()
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

// Sends one chat request and returns Groq's raw Response plus the model that
// answered. Retries a transient failure once, and moves on to the next model in
// GROQ_MODELS when one is rate limited. A failed Response is returned as-is (its
// body unread) so callers can decide how to report it. Server only.
export async function fetchGroqChat(options: {
  messages: GroqMessage[]
  maxTokens: number
  temperature?: number
}): Promise<{ response: Response; model: string }> {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    throw new GroqError('GROQ_API_KEY is not configured', 500)
  }

  const now = Date.now()
  const available = GROQ_MODELS.filter((model) => (exhaustedUntil.get(model) ?? 0) <= now)
  // If every model is flagged, try them all anyway rather than failing outright.
  const candidates = available.length > 0 ? available : GROQ_MODELS

  let last: { response: Response; model: string } | undefined

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

      last = { response, model }
      if (response.ok) return last

      const body = await response.clone().text()
      console.error('Groq request failed:', model, response.status, body)

      // A daily cap will not clear in seconds, so waiting is pointless: go
      // straight to the next model.
      if (response.status === 429 && DAILY_LIMIT_PATTERN.test(body)) {
        exhaustedUntil.set(model, Date.now() + DAILY_LIMIT_SKIP_MS)
        break
      }

      if (!isRetryableStatus(response.status)) {
        // A bad key fails on every model, so stop. Any other rejection can be
        // specific to one model, so let the next one try.
        if (response.status === 401 || response.status === 403) return last
        break
      }
      if (attempt < MAX_TRANSIENT_ATTEMPTS - 1) {
        await sleep(TRANSIENT_RETRY_DELAY_MS * (attempt + 1))
      }
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
