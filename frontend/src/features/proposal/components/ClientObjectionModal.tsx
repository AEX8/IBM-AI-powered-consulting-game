import { MAX_NEGOTIATION_ROUNDS } from '../scoring'

type ClientObjectionModalProps = {
  clientName: string
  clientInitials: string
  roundNumber: number
  objection: string
  onAdjustProposal: () => void
}

export function ClientObjectionModal({
  clientName,
  clientInitials,
  roundNumber,
  objection,
  onAdjustProposal,
}: ClientObjectionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="border-charcoal/10 w-full max-w-md rounded-2xl border bg-white p-7 shadow-xl">
        <span className="bg-honey-wood text-charcoal inline-block rounded-full px-3 py-1 text-xs font-extrabold">
          Round {roundNumber} of {MAX_NEGOTIATION_ROUNDS}
        </span>

        <div className="mt-4 flex items-center gap-3">
          <div className="border-charcoal bg-honey-wood flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-extrabold text-white">
            {clientInitials}
          </div>
          <p className="text-charcoal font-extrabold">{clientName} responded:</p>
        </div>

        <blockquote className="bg-warm-cream border-charcoal/15 mt-4 rounded-lg border p-4 text-sm leading-relaxed text-zinc-700">
          &ldquo;{objection}&rdquo;
        </blockquote>

        <p className="text-charcoal/60 mt-4 text-xs">
          Adjust the proposal and send it back, up to {MAX_NEGOTIATION_ROUNDS} rounds before this
          client moves on.
        </p>

        <button
          type="button"
          onClick={onAdjustProposal}
          className="bg-plant-green hover:bg-dark-blue mt-5 w-full rounded-lg py-3 text-sm font-extrabold text-white transition"
        >
          Adjust Proposal →
        </button>
      </div>
    </div>
  )
}