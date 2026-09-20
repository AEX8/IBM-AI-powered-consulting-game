import { getServerSession } from '@/actions/auth.actions'
import { getCompletedClientKeys } from '@/features/progress/queries'
import { ProposalPortal } from '@/features/proposal/components/ProposalPortal'
import { ALL_PERSONA_KEYS, isPersonaKey, type PersonaKey } from '@/features/proposal/personas'

const LEVEL_FOUR_STAGE_ID = 4

async function getAvailableClientKeys(requestedKey: PersonaKey | null): Promise<PersonaKey[]> {
  const session = await getServerSession()
  const completedKeys = session
    ? await getCompletedClientKeys(session.uid, LEVEL_FOUR_STAGE_ID)
    : []
  const completed = ALL_PERSONA_KEYS.filter((key) => completedKeys.includes(key))
  const isProduction = process.env.NODE_ENV === 'production'

  // TEMPORARY: until Level 4 calls recordStageCompletion nobody has "completed" it,
  // so development shows every client. Production shows only real completions.
  const available = completed.length > 0 || isProduction ? completed : [...ALL_PERSONA_KEYS]

  // Development-only escape hatch so ?client=tom works before Tom exists in Level 4.
  if (!isProduction && requestedKey && !available.includes(requestedKey)) {
    available.push(requestedKey)
  }

  return available
}

export default async function ProposalAndNegotiationPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const { client } = await searchParams
  const requested = client?.toLowerCase()
  const initialClientKey = requested && isPersonaKey(requested) ? requested : null
  const availableClientKeys = await getAvailableClientKeys(initialClientKey)

  return (
    <main className="bg-warm-cream min-h-dvh w-full">
      <ProposalPortal initialClientKey={initialClientKey} availableClientKeys={availableClientKeys} />
    </main>
  )
}