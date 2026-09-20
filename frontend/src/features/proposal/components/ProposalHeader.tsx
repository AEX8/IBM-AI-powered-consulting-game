import type { PersonaKey } from '../personas'

type HeaderClient = {
  key: PersonaKey
  name: string
}

type ProposalHeaderProps = {
  clients: HeaderClient[]
  activeKey: PersonaKey | null
  onSelectClient: (key: PersonaKey) => void
}

export function ProposalHeader({ clients, activeKey, onSelectClient }: ProposalHeaderProps) {
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

              return (
                <li key={client.key}>
                  <button
                    type="button"
                    onClick={() => onSelectClient(client.key)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`rounded-full px-3 py-1 text-xs font-extrabold transition ${
                      isActive
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