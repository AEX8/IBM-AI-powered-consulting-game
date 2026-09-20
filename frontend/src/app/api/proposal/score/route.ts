import { NextResponse } from 'next/server'
import { getPersonaPrompts } from '@/features/proposal/personaPrompts'

const MODEL = 'openai/gpt-oss-20b'

type ProposalScoreRequestBody = {
  personaKey?: unknown
  solutionScope?: unknown
  investment?: unknown
  nextSteps?: unknown
  timeline?: unknown
}

function scoreFieldOrZero(value: unknown): 0 | 1 | 2 {
  const parsed = typeof value === 'number' ? value : Number(value)
  return parsed === 1 || parsed === 2 ? parsed : 0
}

function timelineLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) =>
      item && typeof item === 'object' && 'label' in item ? String((item as { label: unknown }).label) : ''
    )
    .filter(Boolean)
}

// Some models (especially reasoning models like gpt-oss) prepend explanatory text
// or a code fence before the JSON object. Extract the {...} slice directly instead
// of assuming the whole trimmed string is valid JSON.
function extractJsonObject(rawContent: string): string | null {
  const cleaned = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim()
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return null
  }

  return cleaned.slice(firstBrace, lastBrace + 1)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProposalScoreRequestBody

    const prompts = getPersonaPrompts(body.personaKey)

    if (!prompts) {
      return NextResponse.json({ error: 'Unknown client' }, { status: 400 })
    }

    const solutionScope = typeof body.solutionScope === 'string' ? body.solutionScope : ''
    const investment = typeof body.investment === 'string' ? body.investment : ''
    const nextSteps = typeof body.nextSteps === 'string' ? body.nextSteps : ''
    const timeline = timelineLabels(body.timeline)

    if (!solutionScope.trim()) {
      return NextResponse.json({ error: 'solutionScope is required' }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 })
    }

    const gradingPrompt = `
You are evaluating a consulting engagement proposal against a specific client's situation.

${prompts.scoringContext}

Proposal to evaluate:
- Solution / scope: ${solutionScope}
- Timeline: ${timeline.join('; ') || 'Not specified'}
- Investment: ${investment || 'Not specified'}
- Next steps: ${nextSteps || 'Not specified'}

Score the proposal on three dimensions, each 0-2:
- "problem": Does it address the client's actual business problem? 2 = clearly yes, 1 = partially/related, 0 = irrelevant or assumed.
- "value": Does it create clear, meaningful business value for this client? 2 = yes and measurable, 1 = unclear, 0 = none.
- "fit": Is it a realistic, appropriately scoped engagement given the client's constraints (avoids unnecessary disruption, unrealistic scope, or technology for its own sake)? 2 = yes, 1 = partially, 0 = no.

Return ONLY valid JSON in this format:

{
  "problem": 0,
  "value": 0,
  "fit": 0,
  "feedback": "One short sentence explaining the weakest dimension."
}
`

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'You are an evaluator for a consulting simulation game. Return only valid JSON.',
          },
          { role: 'user', content: gradingPrompt },
        ],
        max_tokens: 1000,
      }),
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error('Proposal score: Groq API request failed:', errorText)
      return NextResponse.json({ error: 'Scoring request failed' }, { status: 502 })
    }

    const data = await groqResponse.json()
    const rawContent = data?.choices?.[0]?.message?.content

    if (!rawContent || typeof rawContent !== 'string') {
      console.error('Proposal score: invalid response shape:', data)
      return NextResponse.json({ error: 'Invalid scoring response' }, { status: 502 })
    }

    const jsonSlice = extractJsonObject(rawContent)

    if (!jsonSlice) {
      console.error('Proposal score: no JSON object found in Groq response:', rawContent)
      return NextResponse.json({ error: 'Could not parse scoring response' }, { status: 502 })
    }

    let parsed: { problem?: unknown; value?: unknown; fit?: unknown; feedback?: unknown }

    try {
      parsed = JSON.parse(jsonSlice)
    } catch {
      console.error('Proposal score: JSON.parse failed on:', jsonSlice)
      return NextResponse.json({ error: 'Could not parse scoring response' }, { status: 502 })
    }

    return NextResponse.json({
      problem: scoreFieldOrZero(parsed.problem),
      value: scoreFieldOrZero(parsed.value),
      fit: scoreFieldOrZero(parsed.fit),
      feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
    })
  } catch (error) {
    console.error('Proposal score API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}