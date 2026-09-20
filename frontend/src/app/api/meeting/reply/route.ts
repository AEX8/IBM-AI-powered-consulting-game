import { NextResponse } from 'next/server'
import { getServerSession } from '@/actions/auth.actions'
import { adminDb } from '@/lib/firebase/admin'
import { GroqError, callGroq, type GroqMessage } from '@/lib/groq'
import {
  MAX_PLAYER_MESSAGES,
  MIN_PLAYER_MESSAGES_FOR_CLIENT_TO_END,
  countPlayerMessages,
} from '@/features/meeting/meeting'
import { buildReplySystemPrompt, parseClientReply } from '@/features/meeting/prompts'
import { replyRequestSchema } from '@/features/meeting/schema'

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = replyRequestSchema.safeParse(await request.json().catch(() => null))

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid request' },
        { status: 400 }
      )
    }

    const { personaId, history, message, prep } = parsed.data

    const personaSnapshot = await adminDb.collection('personas').doc(personaId).get()

    if (!personaSnapshot.exists) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
    }

    const persona = personaSnapshot.data() ?? {}

    if (typeof persona.systemPrompt !== 'string' || !persona.systemPrompt.trim()) {
      return NextResponse.json({ error: 'Persona system prompt is missing' }, { status: 500 })
    }

    const conversation: GroqMessage[] = history.map((item) => ({
      role: item.role === 'player' ? 'user' : 'assistant',
      content: item.content,
    }))

    const raw = await callGroq({
      messages: [
        { role: 'system', content: buildReplySystemPrompt(persona, prep) },
        ...conversation,
        { role: 'user', content: message },
      ],
      maxTokens: 1000,
      temperature: 0.7,
    })

    const { reply, endMeeting } = parseClientReply(raw)
    const playerMessages = countPlayerMessages(history) + 1

    return NextResponse.json({
      reply,
      // The client always ends the meeting at the limit. Walking out earlier is only
      // allowed once the consultant has had a fair number of turns.
      endMeeting:
        playerMessages >= MAX_PLAYER_MESSAGES ||
        (endMeeting && playerMessages >= MIN_PLAYER_MESSAGES_FOR_CLIENT_TO_END),
    })
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

    console.error('Meeting reply API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
