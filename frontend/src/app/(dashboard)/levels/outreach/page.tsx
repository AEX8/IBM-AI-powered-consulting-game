import { getServerSession } from '@/actions/auth.actions'
import { LevelTwoGame } from '@/features/game/components/LevelTwoGame'
import { getCompletedClientKeys } from '@/features/progress/queries'

const OUTREACH_STAGE_ID = 2

export default async function OutreachPage() {
  const session = await getServerSession()
  const completedClientKeys = session ? await getCompletedClientKeys(session.uid, OUTREACH_STAGE_ID) : []

  return (
    // Level routes intentionally fill the viewport so Phaser can scale the room as one canvas.
    <main className="relative h-screen w-full overflow-hidden bg-[#161616]">
      <LevelTwoGame completedClientKeys={completedClientKeys} />
    </main>
  )
}
