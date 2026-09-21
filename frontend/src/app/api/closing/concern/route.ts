import { NextResponse } from 'next/server'
import { getServerSession } from '@/actions/auth.actions'
import { GroqError, callGroq } from '@/lib/groq'
import { canStartClosing } from '@/features/closing/closing'
import { buildConcernSystemPrompt, parseConcern } from '@/features/closing/prompts'
import { concernRequestSchema } from '@/features/closing/schema'
import { getProgressData } from '@/features/progress/queries'
import { getPersonaPrompts } from '@/features/proposal/personaPrompts'

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = concernRequestSchema.safeParse(await request.json().catch(() => null))

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid request' },
        { status: 400 }
      )
    }

    const { personaKey, terms, history } = parsed.data
    const prompts = getPersonaPrompts(personaKey)

    if (!prompts) {
      return NextResponse.json({ error: 'Unknown client' }, { status: 400 })
    }

    // Level 6 cannot be reached by skipping Level 5 with this client.
    if (!canStartClosing(await getProgressData(session.uid), personaKey)) {
      return NextResponse.json(
        { error: 'Finish the proposal with this client first.' },
        { status: 403 }
      )
    }

    const round = history.length + 1

    const raw = await callGroq({
      messages: [
        { role: 'system', content: buildConcernSystemPrompt(prompts, terms, round, history) },
        { role: 'user', content: 'Raise your next concern before signing.' },
      ],
      maxTokens: 1000,
      temperature: 0.7,
    })

    const concern = parseConcern(raw)

    if (!concern) {
      console.error('Closing concern: could not read the AI response:', raw)
      return NextResponse.json({ error: 'The client could not respond.' }, { status: 502 })
    }

    return NextResponse.json({ concern, round })
  } catch (error) {
    if (error instanceof GroqError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'The AI service took too long to respond' },
        { status: 504 }
      )
    }

    console.error('Closing concern API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}