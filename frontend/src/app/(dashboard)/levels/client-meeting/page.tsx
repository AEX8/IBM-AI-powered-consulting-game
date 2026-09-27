import Link from 'next/link'
import { getServerSession } from '@/actions/auth.actions'
import { getCompletedClientKeys } from '@/features/progress/queries'
import { LevelFourGame } from '@/features/game/components/LevelFourGame'

const CLIENT_MEETING_STAGE_ID = 4
// The only two clients Level 4 ever meets with (unlike Level 5, which also
// covers the decline-scenario persona "tom").
const MEETING_CLIENT_KEYS = ['sarah', 'david']

export default async function ClientMeetingPage() {
  const session = await getServerSession()
  const completedClientKeys = session
    ? await getCompletedClientKeys(session.uid, CLIENT_MEETING_STAGE_ID)
    : []
  const allDone = MEETING_CLIENT_KEYS.every((key) => completedClientKeys.includes(key))

  if (allDone) {
    return (
      <main className="fixed inset-0 z-[9500] grid place-items-center bg-[#17212a]/70 p-6">
        <div className="border-charcoal bg-cloud-white w-[min(420px,92vw)] rounded-2xl border-[5px] p-8 text-center shadow-[8px_10px_0_#16161633]">
          <h1 className="text-dark-blue text-xl font-extrabold">Already completed</h1>
          <p className="text-charcoal mt-3 text-sm font-medium">
            You&rsquo;ve already met with both clients in Level 4. Head back to the lobby to
            continue your journey.
          </p>
          <Link
            href="/dashboard"
            className="border-charcoal bg-dark-blue mt-5 inline-block rounded-lg border-[3px] px-6 py-3 text-sm font-extrabold text-white"
          >
            Return to lobby
          </Link>
        </div>
      </main>
    )
  }

  return (
    // Level routes intentionally fill the viewport so Phaser scales one complete room.
    <main className="relative h-screen w-full overflow-hidden bg-[#161616]">
      <LevelFourGame completedClientKeys={completedClientKeys} />
    </main>
  )
}
