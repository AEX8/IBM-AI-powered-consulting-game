import { NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getServerSession } from '@/actions/auth.actions'
import { adminDb } from '@/lib/firebase/admin'
import { GroqError, callGroq } from '@/lib/groq'
import {
  CLOSING_STAGE_ID,
  canStartClosing,
  closingResult,
  signedSkillDeltas,
} from '@/features/closing/closing'
import { buildFinaliseSystemPrompt, parseClosingResult } from '@/features/closing/prompts'
import { finaliseRequestSchema } from '@/features/closing/schema'
import { getProgressData } from '@/features/progress/queries'
import { saveStageCompletion } from '@/features/progress/server'
import { getPersonaPrompts } from '@/features/proposal/personaPrompts'

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = finaliseRequestSchema.safeParse(await request.json().catch(() => null))

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid request' },
        { status: 400 }
      )
    }

    const { personaKey, terms, exchanges } = parsed.data
    const prompts = getPersonaPrompts(personaKey)

    if (!prompts) {
      return NextResponse.json({ error: 'Unknown client' }, { status: 400 })
    }

    if (!canStartClosing(await getProgressData(session.uid), personaKey)) {
      return NextResponse.json(
        { error: 'Finish the proposal with this client first.' },
        { status: 403 }
      )
    }

    const raw = await callGroq({
      messages: [
        { role: 'system', content: buildFinaliseSystemPrompt(prompts, terms, exchanges) },
        { role: 'user', content: 'Assess how the consultant closed this deal.' },
      ],
      maxTokens: 1000,
      temperature: 0,
    })

    const assessment = parseClosingResult(raw)

    if (!assessment) {
      console.error('Closing finalise: could not read the AI response:', raw)
      return NextResponse.json({ error: 'The deal could not be assessed.' }, { status: 502 })
    }

    const result = closingResult(assessment.scores)

    try {
      const contractRef = adminDb.collection('contracts').doc()

      await contractRef.set({
        id: contractRef.id,
        uid: session.uid,
        personaKey,
        terms,
        exchanges,
        scores: assessment.scores,
        overall: result.overall,
        outcome: result.outcome,
        feedback: assessment.feedback,
        improvements: assessment.improvements,
        closingLine: assessment.closingLine,
        createdAt: Timestamp.now(),
        _schemaVersion: 1,
      })

      // Skill points are only granted by the scorecard when the stage completes.
      const reward = await saveStageCompletion(session.uid, {
        stageId: CLOSING_STAGE_ID,
        personaKey,
        performance: result.performance,
        skillDeltas: signedSkillDeltas(),
        metrics: { ...assessment.scores, overall: result.overall },
        completesStage: result.completesStage,
      })

      return NextResponse.json({
        outcome: result.outcome,
        completed: result.completesStage,
        overall: result.overall,
        scores: assessment.scores,
        feedback: assessment.feedback,
        improvements: assessment.improvements,
        closingLine: assessment.closingLine,
        xpAwarded: reward.xpAwarded,
        skillsAwarded: reward.skillsAwarded,
      })
    } catch (saveError) {
      // A result that was not saved must never look like a signed deal.
      console.error('Closing finalise: could not save the result:', saveError)
      return NextResponse.json(
        { error: 'Your deal was assessed but the result could not be saved. Please retry.' },
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

    console.error('Closing finalise API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}