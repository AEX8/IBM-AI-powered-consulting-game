import { redirect } from 'next/navigation'
import { getServerSession } from '@/actions/auth.actions'
import { getCompletedClientKeys } from '@/features/progress/queries'
import { ALL_PERSONA_KEYS, isPersonaKey } from '@/features/proposal/personas'
import { ClosingPortal } from '@/features/closing/components/ClosingPortal'

export default async function CloseDealPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const session = await getServerSession()
  if (!session) redirect('/auth/signin')
  const completed = await getCompletedClientKeys(session.uid, 5)
  const availableClientKeys = ALL_PERSONA_KEYS.filter((key) => completed.includes(key))
  // Stage 6 is the closing stage itself — already-closed deals are shown
  // greyed out in the switcher rather than reopened.
  const closed = await getCompletedClientKeys(session.uid, 6)
  const completedClientKeys = ALL_PERSONA_KEYS.filter((key) => closed.includes(key))
  const requested = (await searchParams).client?.toLowerCase()
  return (
    <main className="bg-warm-cream min-h-dvh w-full">
      <ClosingPortal
        availableClientKeys={availableClientKeys}
        completedClientKeys={completedClientKeys}
        initialClientKey={requested && isPersonaKey(requested) ? requested : null}
      />
    </main>
  )
}
