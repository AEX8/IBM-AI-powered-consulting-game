import { NextResponse } from 'next/server'
import { getPersonaPrompts } from '@/features/proposal/personaPrompts'
import { GroqError, callGroqForJson, extractJsonObject } from '@/lib/groq'

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

type ProposalScoreResult = {
  problem: 0 | 1 | 2
  value: 0 | 1 | 2
  fit: 0 | 1 | 2
  feedback: string
}

function parseProposalScore(rawContent: string): ProposalScoreResult | null {
  const jsonSlice = extractJsonObject(rawContent)
  if (!jsonSlice) return null

  let parsed: { problem?: unknown; value?: unknown; fit?: unknown; feedback?: unknown }

  try {
    parsed = JSON.parse(jsonSlice)
  } catch {
    return null
  }

  return {
    problem: scoreFieldOrZero(parsed.problem),
    value: scoreFieldOrZero(parsed.value),
    fit: scoreFieldOrZero(parsed.fit),
    feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
  }
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

    const { result, lastRaw } = await callGroqForJson({
      messages: [
        {
          role: 'system',
          content: 'You are an evaluator for a consulting simulation game. Return only valid JSON.',
        },
        { role: 'user', content: gradingPrompt },
      ],
      maxTokens: 1000,
      temperature: 0,
      parse: parseProposalScore,
    })

    if (!result) {
      console.error('Proposal score: could not read the AI response:', lastRaw)
      return NextResponse.json({ error: 'Could not parse scoring response' }, { status: 502 })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof GroqError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Proposal score API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}