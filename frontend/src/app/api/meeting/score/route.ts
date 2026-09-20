import { NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getServerSession } from '@/actions/auth.actions'
import { adminDb } from '@/lib/firebase/admin'
import { GroqError, callGroq } from '@/lib/groq'
import {
  MIN_PLAYER_MESSAGES_TO_SCORE,
  countPlayerMessages,
  meetingOutcome,
} from '@/features/meeting/meeting'
import {
  buildScoreSystemPrompt,
  formatTranscript,
  parseScoreResult,
} from '@/features/meeting/prompts'
import { scoreRequestSchema } from '@/features/meeting/schema'
import { clientKeyFromPersonaId } from '@/features/progress/clients'
import { saveStageCompletion } from '@/features/progress/server'

const CLIENT_MEETING_STAGE_ID = 4

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = scoreRequestSchema.safeParse(await request.json().catch(() => null))

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid request' },
        { status: 400 }
      )
    }

    const { personaId, transcript, prep } = parsed.data

    if (countPlayerMessages(transcript) < MIN_PLAYER_MESSAGES_TO_SCORE) {
      return NextResponse.json({ error: 'The meeting was too short to assess.' }, { status: 400 })
    }

    const personaSnapshot = await adminDb.collection('personas').doc(personaId).get()

    if (!personaSnapshot.exists) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
    }

    const persona = personaSnapshot.data() ?? {}

    const raw = await callGroq({
      messages: [
        { role: 'system', content: buildScoreSystemPrompt(persona, prep) },
        { role: 'user', content: formatTranscript(transcript) },
      ],
      maxTokens: 1000,
      temperature: 0,
    })

    const result = parseScoreResult(raw)

    if (!result) {
      console.error('Meeting score: could not read the AI response:', raw)
      return NextResponse.json({ error: 'The meeting could not be assessed.' }, { status: 502 })
    }

    const outcome = meetingOutcome(result.scores)
    const personaKey = clientKeyFromPersonaId(personaId)

    try {
      const meetingRef = adminDb.collection('meetings').doc()

      await meetingRef.set({
        id: meetingRef.id,
        uid: session.uid,
        personaId,
        personaKey,
        transcript,
        prep: prep ?? null,
        scores: result.scores,
        overall: outcome.overall,
        passed: outcome.passed,
        feedback: result.feedback,
        improvements: result.improvements,
        createdAt: Timestamp.now(),
        _schemaVersion: 1,
      })

      const reward = personaKey
        ? await saveStageCompletion(session.uid, {
            stageId: CLIENT_MEETING_STAGE_ID,
            personaKey,
            performance: outcome.performance,
            metrics: { ...result.scores, overall: outcome.overall },
            completesStage: outcome.passed,
          })
        : null

      return NextResponse.json({
        scores: result.scores,
        overall: outcome.overall,
        passed: outcome.passed,
        feedback: result.feedback,
        improvements: result.improvements,
        xpAwarded: reward?.xpAwarded ?? 0,
      })
    } catch (saveError) {
      // A result that was not saved must never look like a pass.
      console.error('Meeting score: could not save the result:', saveError)
      return NextResponse.json(
        { error: 'Your meeting was assessed but the result could not be saved. Please retry.' },
        { status: 500 }
      )
    }
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

    console.error('Meeting score API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
