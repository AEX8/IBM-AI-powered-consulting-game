import { NextResponse } from 'next/server'

const MODEL = 'openai/gpt-oss-20b'

const CLIENT_PERSONA_VOICE = `
You are Sarah Chen, Chief Operating Officer at ACMD Manufacturing. Your main concern is
disruption and implementation risk — you don't want an eighteen-month project before seeing
value, and you want reassurance the proposal will actually reduce delivery problems.
`

type ObjectionRequestBody = {
  solutionScope?: unknown
  investment?: unknown
  nextSteps?: unknown
  timeline?: unknown
  weakestDimension?: unknown
  roundNumber?: unknown
}

function timelineLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) =>
      item && typeof item === 'object' && 'label' in item ? String((item as { label: unknown }).label) : ''
    )
    .filter(Boolean)
}

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
    const body = (await request.json()) as ObjectionRequestBody

    const solutionScope = typeof body.solutionScope === 'string' ? body.solutionScope : ''
    const investment = typeof body.investment === 'string' ? body.investment : ''
    const nextSteps = typeof body.nextSteps === 'string' ? body.nextSteps : ''
    const timeline = timelineLabels(body.timeline)
    const weakestDimension = typeof body.weakestDimension === 'string' ? body.weakestDimension : 'fit'
    const roundNumber = typeof body.roundNumber === 'number' ? body.roundNumber : 1

    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 })
    }

    const prompt = `
${CLIENT_PERSONA_VOICE}

This is round ${roundNumber} of 3 in reviewing a consultant's proposal.

Proposal:
- Solution / scope: ${solutionScope}
- Timeline: ${timeline.join('; ') || 'Not specified'}
- Investment: ${investment || 'Not specified'}
- Next steps: ${nextSteps || 'Not specified'}

The weakest part of this proposal is its "${weakestDimension}" (problem = does it solve your
actual business problem, value = does it create clear business value, fit = is it realistic and
appropriately scoped for you).

Return ONLY valid JSON in this format:

{
  "objection": "One or two sentences, in character as the client, raising your concern about the weakest part above. Stay natural and conversational, not robotic.",
  "suggestions": ["Short, concrete suggestion 1", "Short, concrete suggestion 2", "Short, concrete suggestion 3"]
}

The suggestions are coaching tips for the consultant on how to revise the proposal — write them
as plain advice, not as your own dialogue.
`

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.6,
        messages: [
          {
            role: 'system',
            content:
              'You are powering a client persona in a consulting training simulation. Return only valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1000,
      }),
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error('Proposal objection: Groq API request failed:', errorText)
      return NextResponse.json({ error: 'Objection request failed' }, { status: 502 })
    }

    const data = await groqResponse.json()
    const rawContent = data?.choices?.[0]?.message?.content

    if (!rawContent || typeof rawContent !== 'string') {
      console.error('Proposal objection: invalid response shape:', data)
      return NextResponse.json({ error: 'Invalid objection response' }, { status: 502 })
    }

    const jsonSlice = extractJsonObject(rawContent)

    if (!jsonSlice) {
      console.error('Proposal objection: no JSON object found in Groq response:', rawContent)
      return NextResponse.json({ error: 'Could not parse objection response' }, { status: 502 })
    }

    let parsed: { objection?: unknown; suggestions?: unknown }

    try {
      parsed = JSON.parse(jsonSlice)
    } catch {
      console.error('Proposal objection: JSON.parse failed on:', jsonSlice)
      return NextResponse.json({ error: 'Could not parse objection response' }, { status: 502 })
    }

    const objection = typeof parsed.objection === 'string' ? parsed.objection.trim() : ''
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((item): item is string => typeof item === 'string')
      : []

    if (!objection) {
      console.error('Proposal objection: empty objection field in parsed response:', parsed)
      return NextResponse.json({ error: 'Empty objection from provider' }, { status: 502 })
    }

    return NextResponse.json({ objection, suggestions })
  } catch (error) {
    console.error('Proposal objection API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}