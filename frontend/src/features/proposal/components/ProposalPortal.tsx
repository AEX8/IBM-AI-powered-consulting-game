'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Home } from 'lucide-react'
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

function LobbyButton() {
  return (
    <Link
      href="/dashboard"
      aria-label="Back to lobby"
      title="Back to lobby"
      className="border-charcoal bg-plant-green hover:bg-dark-blue fixed bottom-6 left-6 z-30 flex size-14 items-center justify-center rounded-full border-[3px] text-white shadow-[3px_3px_0_var(--charcoal)] transition"
    >
      <Home className="size-6" aria-hidden="true" />
    </Link>
  )
}

type ProposalPortalProps = {
  initialClientKey: PersonaKey | null
  availableClientKeys: PersonaKey[]
}

export function ProposalPortal({ initialClientKey, availableClientKeys }: ProposalPortalProps) {
  const storedClientName = useSyncExternalStore(
    subscribeToSelectedClient,
    readSelectedClientName,
    () => null
  )
  const [pickedKey, setPickedKey] = useState<PersonaKey | null>(null)

  const storedKey = storedClientName ? personaKeyFromName(storedClientName) : null
  const preferredKey = pickedKey ?? initialClientKey ?? storedKey
  const activeKey =
    preferredKey && availableClientKeys.includes(preferredKey)
      ? preferredKey
      : (availableClientKeys[0] ?? null)

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
        activeKey={activeKey}
        onSelectClient={setPickedKey}
      />

      {availableClientKeys.map((key) => (
        <div key={key} className={key === activeKey ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : 'hidden'}>
          <ProposalWorkspace persona={PERSONAS[key]} />
        </div>
      ))}

      <LobbyButton />
    </div>
  )
}
