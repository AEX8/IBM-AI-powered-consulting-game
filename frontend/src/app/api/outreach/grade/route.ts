import { NextResponse } from 'next/server'
import { GroqError, callGroqForJson, extractJsonObject } from '@/lib/groq'

type OutreachGradeResult = { score: number; feedback: string }

function parseOutreachGrade(rawContent: string): OutreachGradeResult | null {
  const jsonSlice = extractJsonObject(rawContent)
  if (!jsonSlice) return null

  let parsed: { score?: unknown; feedback?: unknown }

  try {
    parsed = JSON.parse(jsonSlice)
  } catch {
    return null
  }

  const score = Number(parsed.score)
  const feedback = parsed.feedback

  if (!Number.isInteger(score) || score < 0 || score > 6 || typeof feedback !== 'string') {
    return null
  }

  return { score, feedback }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { email, persona } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!persona || typeof persona !== 'object') {
      return NextResponse.json(
        { error: 'Persona information is required' },
        { status: 400 }
      )
    }

    const gradingPrompt = `
You are evaluating a consulting outreach email.

Evaluate the player's email against the target client's persona information.

Target persona:
${JSON.stringify(persona, null, 2)}

Player email:
${email}

Score the email from 0 to 6.

Consider:
1. Personalisation to the client
2. Relevance to the client's needs
3. Clear value proposition
4. Professional tone
5. Clear call to action
6. Overall effectiveness

Return ONLY valid JSON in this format:

{
  "score": 0,
  "feedback": "Short written feedback explaining the score."
}
`

    const { result, lastRaw } = await callGroqForJson({
      messages: [
        {
          role: 'system',
          content: 'You are an evaluator for a consulting simulation game. Return only valid JSON.',
        },
        {
          role: 'user',
          content: gradingPrompt,
        },
      ],
      maxTokens: 1000,
      temperature: 0,
      parse: parseOutreachGrade,
    })

    if (!result) {
      console.error('Outreach grading: could not read the AI response:', lastRaw)
      return NextResponse.json(
        { error: 'Could not parse grading response' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      score: result.score,
      feedback: result.feedback,
    })
  } catch (error) {
    if (error instanceof GroqError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Outreach grading API error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}