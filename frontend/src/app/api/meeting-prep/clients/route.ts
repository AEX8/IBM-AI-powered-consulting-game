import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

const SESSION_COOKIE_NAME = '__session'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)
    const uid = decodedToken.uid

    const sessionsSnapshot = await adminDb
      .collection('sessions')
      .where('uid', '==', uid)
      .where('status', '==', 'completed')
      .get()

    const contactedPersonaIds = [
      ...new Set(
        sessionsSnapshot.docs
          .map((doc) => doc.data())
          .filter((session) => session.level === 1 || session.level === 2)
          .map((session) => session.personaId)
          .filter((personaId): personaId is string => typeof personaId === 'string')
      ),
    ]

    if (contactedPersonaIds.length === 0) {
      return NextResponse.json({
        clients: [],
        message: 'No contacted clients found',
      })
    }

    const personaDocs = await Promise.all(
      contactedPersonaIds.map((personaId) =>
        adminDb.collection('personas').doc(personaId).get()
      )
    )

    const clients = personaDocs
      .filter((doc) => doc.exists)
      .map((doc) => {
        const data = doc.data()

        return {
          id: doc.id,
          name: data?.name ?? '',
          jobTitle: data?.jobTitle ?? '',
          company: data?.company ?? '',
          industry: data?.industry ?? '',
          coreProblem: data?.coreProblem ?? '',
          desiredOutcome: data?.desiredOutcome ?? '',
        }
      })

    return NextResponse.json({ clients })
  } catch (error) {
    console.error('Failed to load contacted clients:', error)

    return NextResponse.json(
      { error: 'Failed to load contacted clients' },
      { status: 500 }
    )
  }
}