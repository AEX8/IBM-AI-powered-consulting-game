import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { SCORE_RESULTS, scoreMeetingPrep } from '@/data/meetingPrepContent'
import { clientKeyFromPersonaId } from '@/features/progress/clients'
import { saveStageCompletion } from '@/features/progress/server'

const SESSION_COOKIE_NAME = '__session'
const MEETING_PREP_STAGE_ID = 3

type SubmissionBody = {
  sessionId?: string
  personaId?: string
  selectedObjectives?: string[]
  selectedQuestions?: string[]
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)
    const uid = decodedToken.uid

    const body = (await request.json()) as SubmissionBody

    const sessionId = body.sessionId?.trim()
    const personaId = body.personaId?.trim()
    const selectedObjectives = Array.isArray(body.selectedObjectives) ? body.selectedObjectives : []
    const selectedQuestions = Array.isArray(body.selectedQuestions) ? body.selectedQuestions : []

    if (!sessionId || !personaId) {
      return NextResponse.json({ error: 'sessionId and personaId are required' }, { status: 400 })
    }

    const personaKey = clientKeyFromPersonaId(personaId)
    if (!personaKey) {
      return NextResponse.json({ error: 'Unknown client' }, { status: 400 })
    }

    const scoring = scoreMeetingPrep(personaId, selectedObjectives, selectedQuestions)

    const prepRef = adminDb.collection('meetingPreps').doc(`${uid}_${sessionId}_${personaId}`)

    await prepRef.set(
      {
        id: prepRef.id,
        uid,
        sessionId,
        personaId,
        selectedObjectives,
        selectedQuestions,
        objectiveScore: scoring.objectiveScore,
        questionScore: scoring.questionScore,
        totalScore: scoring.totalScore,
        resultLabel: scoring.resultLabel,
        feedback: scoring.feedback,
        createdAt: new Date(),
        updatedAt: new Date(),
        _schemaVersion: 1,
      },
      { merge: true }
    )

    // The submission is only complete when its shared progress is saved too.
    await saveStageCompletion(uid, {
      stageId: MEETING_PREP_STAGE_ID,
      personaKey,
      performance: scoring.totalScore >= SCORE_RESULTS.strong.min ? 'strong' : 'developing',
      metrics: {
        prepScore: scoring.totalScore,
        objectiveScore: scoring.objectiveScore,
        questionScore: scoring.questionScore,
      },
    })

    return NextResponse.json({
      success: true,
      id: prepRef.id,
      sessionId,
      personaId,
      objectiveScore: scoring.objectiveScore,
      questionScore: scoring.questionScore,
      totalScore: scoring.totalScore,
      resultLabel: scoring.resultLabel,
      feedback: scoring.feedback,
    })
  } catch (error) {
    console.error('Failed to save meeting prep submission:', error)

    return NextResponse.json({ error: 'Failed to save meeting prep submission' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)
    const uid = decodedToken.uid

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')?.trim()
    const personaId = searchParams.get('personaId')?.trim()

    if (!sessionId || !personaId) {
      return NextResponse.json({ error: 'sessionId and personaId are required' }, { status: 400 })
    }

    const prepRef = adminDb.collection('meetingPreps').doc(`${uid}_${sessionId}_${personaId}`)

    const prepSnapshot = await prepRef.get()

    if (!prepSnapshot.exists) {
      return NextResponse.json({ error: 'Meeting prep submission not found' }, { status: 404 })
    }

    const prep = prepSnapshot.data()

    return NextResponse.json({
      prep: {
        id: prepRef.id,
        sessionId: prep?.sessionId,
        personaId: prep?.personaId,
        selectedObjectives: prep?.selectedObjectives ?? [],
        selectedQuestions: prep?.selectedQuestions ?? [],
        objectiveScore: prep?.objectiveScore ?? 0,
        questionScore: prep?.questionScore ?? 0,
        totalScore: prep?.totalScore ?? 0,
        resultLabel: prep?.resultLabel ?? '',
        feedback: prep?.feedback ?? [],
      },
    })
  } catch (error) {
    console.error('Failed to load meeting prep submission:', error)

    return NextResponse.json({ error: 'Failed to load meeting prep submission' }, { status: 500 })
  }
}
