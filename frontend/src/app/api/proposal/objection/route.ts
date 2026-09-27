import { NextResponse } from 'next/server'
import { getPersonaPrompts } from '@/features/proposal/personaPrompts'
import { GroqError, callGroqForJson, extractJsonObject } from '@/lib/groq'

type ObjectionRequestBody = {
  personaKey?: unknown
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

type ObjectionResult = { objection: string; suggestions: string[] }

function parseObjection(rawContent: string): ObjectionResult | null {
  const jsonSlice = extractJsonObject(rawContent)
  if (!jsonSlice) return null

  let parsed: { objection?: unknown; suggestions?: unknown }

  try {
    parsed = JSON.parse(jsonSlice)
  } catch {
    return null
  }

  const objection = typeof parsed.objection === 'string' ? parsed.objection.trim() : ''
  if (!objection) return null

  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.filter((item): item is string => typeof item === 'string')
    : []

  return { objection, suggestions }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ObjectionRequestBody

    const prompts = getPersonaPrompts(body.personaKey)

    if (!prompts) {
      return NextResponse.json({ error: 'Unknown client' }, { status: 400 })
    }

    const solutionScope = typeof body.solutionScope === 'string' ? body.solutionScope : ''
    const investment = typeof body.investment === 'string' ? body.investment : ''
    const nextSteps = typeof body.nextSteps === 'string' ? body.nextSteps : ''
    const timeline = timelineLabels(body.timeline)
    const weakestDimension = typeof body.weakestDimension === 'string' ? body.weakestDimension : 'fit'
    const roundNumber = typeof body.roundNumber === 'number' ? body.roundNumber : 1

    const prompt = `
${prompts.objectionVoice}

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

    const { result, lastRaw } = await callGroqForJson({
      messages: [
        {
          role: 'system',
          content:
            'You are powering a client persona in a consulting training simulation. Return only valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      maxTokens: 1000,
      temperature: 0.6,
      parse: parseObjection,
    })

    if (!result) {
      console.error('Proposal objection: could not read the AI response:', lastRaw)
      return NextResponse.json({ error: 'Could not parse objection response' }, { status: 502 })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof GroqError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Proposal objection API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}