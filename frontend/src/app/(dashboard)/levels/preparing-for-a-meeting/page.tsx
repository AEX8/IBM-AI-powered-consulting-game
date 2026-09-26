import { getServerSession } from '@/actions/auth.actions'
import { LevelTwoGame } from '@/features/game/components/LevelTwoGame'
import { getCompletedClientKeys } from '@/features/progress/queries'

const OUTREACH_STAGE_ID = 2

export default async function PreparationPage() {
  const session = await getServerSession()
  const availableClientKeys = session ? await getCompletedClientKeys(session.uid, OUTREACH_STAGE_ID) : []

  return <LevelTwoGame preparation availableClientKeys={availableClientKeys} />
}
