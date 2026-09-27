export const GROQ_MODEL = 'openai/gpt-oss-20b'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_TIMEOUT_MS = 25_000
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

// Sends one chat request and returns the reply text. Server only.
// maxTokens must be generous (1000+): this is a reasoning model that spends part
// of the budget thinking, and too small a budget produces an empty reply.
export async function callGroq(options: {
  messages: GroqMessage[]
  maxTokens: number
  temperature?: number
}): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    throw new GroqError('GROQ_API_KEY is not configured', 500)
  }

  let lastStatus = 502

  for (let attempt = 0; attempt < MAX_TRANSIENT_ATTEMPTS; attempt++) {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: options.temperature ?? 0.6,
        messages: options.messages,
        max_tokens: options.maxTokens,
      }),
      signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
    })

    if (response.ok) {
      const data = await response.json()
      const content = data?.choices?.[0]?.message?.content

      if (typeof content !== 'string' || !content.trim()) {
        throw new GroqError('The AI service returned an empty reply', 502)
      }

      return content.trim()
    }

    lastStatus = response.status
    console.error('Groq request failed:', response.status, await response.text())

    const isLastAttempt = attempt === MAX_TRANSIENT_ATTEMPTS - 1
    if (!isRetryableStatus(response.status) || isLastAttempt) break

    await sleep(TRANSIENT_RETRY_DELAY_MS * (attempt + 1))
  }

  throw new GroqError('The AI service request failed', lastStatus)
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
