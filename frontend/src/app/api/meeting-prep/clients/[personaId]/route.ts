import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase/admin'
import { getMeetingPrepClient } from '@/data/meetingPrepContent'

const SESSION_COOKIE_NAME = '__session'

type RouteContext = {
  params: Promise<{
    personaId: string
  }>
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await adminAuth.verifySessionCookie(sessionCookie, true)

    const { personaId } = await context.params

    if (!personaId) {
      return NextResponse.json(
        { error: 'Missing personaId' },
        { status: 400 }
      )
    }

    const client = getMeetingPrepClient(personaId)

    if (!client) {
      return NextResponse.json(
        { error: 'Client file not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      client,
    })
  } catch (error) {
    console.error('Failed to load client file:', error)

    return NextResponse.json(
      { error: 'Failed to load client file' },
      { status: 500 }
    )
  }
}