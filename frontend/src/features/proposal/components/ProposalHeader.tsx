import type { PersonaKey } from '../personas'

type HeaderClient = {
  key: PersonaKey
  name: string
}

type ProposalHeaderProps = {
  clients: HeaderClient[]
  completedKeys?: PersonaKey[]
  activeKey: PersonaKey | null
  onSelectClient: (key: PersonaKey) => void
}

export function ProposalHeader({
  clients,
  completedKeys = [],
  activeKey,
  onSelectClient,
}: ProposalHeaderProps) {
  return (
    <div className="bg-light-blue flex shrink-0 flex-wrap items-center justify-between gap-3 px-6 py-3">
      <p className="text-xs font-extrabold tracking-[0.12em] text-white uppercase">
        Level 5 · Proposal Builder
      </p>

      {clients.length > 0 && (
        <nav aria-label="Choose client" className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold tracking-[0.1em] text-white/80 uppercase">
            Client
          </span>

          <ul className="flex flex-wrap gap-1.5">
            {clients.map((client) => {
              const isActive = client.key === activeKey
              const isDone = completedKeys.includes(client.key)

              return (
                <li key={client.key}>
                  <button
                    type="button"
                    disabled={isDone}
                    onClick={() => onSelectClient(client.key)}
                    aria-current={isActive ? 'true' : undefined}
                    title={isDone ? 'You have already submitted a proposal for this client' : undefined}
                    className={`rounded-full px-3 py-1 text-xs font-extrabold transition ${
                      isDone
                        ? 'cursor-not-allowed bg-white/10 text-white/50 grayscale'
                        : isActive
                          ? 'text-dark-blue bg-white'
                          : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {client.name}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </div>
  )
}