'use client'

import { useState, useSyncExternalStore } from 'react'
import { LevelNavigationControls } from '@/features/game/components/LevelNavigationControls'
import { ProposalHeader } from './ProposalHeader'
import { ProposalWorkspace } from './ProposalWorkspace'
import { PERSONAS, personaKeyFromName, type PersonaKey } from '../personas'

// Same key Level 2 writes when the player picks a client (see OutreachLaptopFlow.ts).
// Duplicated on purpose so this feature does not import from the game feature.
const SELECTED_CLIENT_STORAGE_KEY = 'ibm-selected-outreach-client'

function subscribeToSelectedClient(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  return () => window.removeEventListener('storage', onStoreChange)
}

function readSelectedClientName(): string | null {
  try {
    const stored = window.localStorage.getItem(SELECTED_CLIENT_STORAGE_KEY)
    if (!stored) return null

    const selection = JSON.parse(stored) as { name?: unknown }
    return typeof selection.name === 'string' ? selection.name : null
  } catch {
    return null
  }
}

function LobbyButton({ client }: { client?: string }) {
  return <LevelNavigationControls level={5} client={client} />
}

// The only two clients this stage is ever played with (Tom belongs to a
// separate, one-off decline scenario elsewhere in Level 5).
const PROPOSAL_CLIENT_KEYS: PersonaKey[] = ['sarah', 'david']

function AlreadyCompletedPopup() {
  return (
    <div className="fixed inset-0 z-[9500] grid place-items-center bg-[#17212a]/70 p-6">
      <div className="border-charcoal bg-cloud-white w-[min(420px,92vw)] rounded-2xl border-[5px] p-8 text-center shadow-[8px_10px_0_#16161633]">
        <h2 className="text-dark-blue text-xl font-extrabold">Already completed</h2>
        <p className="text-charcoal mt-3 text-sm font-medium">
          You&rsquo;ve already submitted proposals for both clients in Level 5.
        </p>
        <a
          href="/dashboard"
          className="border-charcoal bg-dark-blue mt-5 inline-block rounded-lg border-[3px] px-6 py-3 text-sm font-extrabold text-white"
        >
          Return to lobby
        </a>
      </div>
    </div>
  )
}

type ProposalPortalProps = {
  initialClientKey: PersonaKey | null
  availableClientKeys: PersonaKey[]
  // Client keys already completed for Level 5 itself — shown greyed out and
  // disabled in the switcher so the player cannot redo a finished proposal.
  completedClientKeys?: PersonaKey[]
}

export function ProposalPortal({
  initialClientKey,
  availableClientKeys,
  completedClientKeys = [],
}: ProposalPortalProps) {
  const storedClientName = useSyncExternalStore(
    subscribeToSelectedClient,
    readSelectedClientName,
    () => null
  )
  const [pickedKey, setPickedKey] = useState<PersonaKey | null>(null)

  const storedKey = storedClientName ? personaKeyFromName(storedClientName) : null
  const preferredKey = pickedKey ?? initialClientKey ?? storedKey
  const notCompleted = availableClientKeys.filter((key) => !completedClientKeys.includes(key))
  const activeKey =
    preferredKey && availableClientKeys.includes(preferredKey) && !completedClientKeys.includes(preferredKey)
      ? preferredKey
      : (notCompleted[0] ?? availableClientKeys[0] ?? null)

  // Captured once from the server-fetched props at page load, not recomputed
  // as the player works — so this only appears when they land on the page
  // with both already done (a retry), never right after finishing the second
  // one in the same visit.
  const [showAlreadyDone] = useState(() =>
    PROPOSAL_CLIENT_KEYS.every((key) => completedClientKeys.includes(key))
  )

  if (showAlreadyDone) {
    return <AlreadyCompletedPopup />
  }

  if (!activeKey) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-10">
        <p className="text-charcoal max-w-md text-center font-semibold">
          Complete Level 4 with a client to start building a proposal.
        </p>
        <LobbyButton />
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <ProposalHeader
        clients={availableClientKeys.map((key) => ({ key, name: PERSONAS[key].name }))}
        completedKeys={completedClientKeys}
        activeKey={activeKey}
        onSelectClient={setPickedKey}
      />

      {availableClientKeys.map((key) => (
        <div
          key={key}
          className={key === activeKey ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : 'hidden'}
        >
          <ProposalWorkspace persona={PERSONAS[key]} />
        </div>
      ))}

      <LobbyButton client={activeKey} />
    </div>
  )
}
