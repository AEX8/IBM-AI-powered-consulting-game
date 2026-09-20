export const GROQ_MODEL = 'openai/gpt-oss-20b'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_TIMEOUT_MS = 25_000

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

  if (!response.ok) {
    console.error('Groq request failed:', response.status, await response.text())
    throw new GroqError('The AI service request failed', 502)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content

  if (typeof content !== 'string' || !content.trim()) {
    throw new GroqError('The AI service returned an empty reply', 502)
  }

  return content.trim()
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
