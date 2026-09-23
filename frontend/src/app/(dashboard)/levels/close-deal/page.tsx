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
  const requested = (await searchParams).client?.toLowerCase()
  return (
    <main className="bg-warm-cream min-h-dvh w-full">
      <ClosingPortal
        availableClientKeys={availableClientKeys}
        initialClientKey={requested && isPersonaKey(requested) ? requested : null}
      />
    </main>
  )
}
