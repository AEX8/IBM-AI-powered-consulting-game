import type { ProposalFormValues } from '../types'

type ProposalDocumentPreviewProps = {
  clientName: string
  objectives: string[]
  proposal: ProposalFormValues
  isSubmitting: boolean
  onBackToEditing: () => void
  onSendToClient: () => void
}

export function ProposalDocumentPreview({
  clientName,
  objectives,
  proposal,
  isSubmitting,
  onBackToEditing,
  onSendToClient,
}: ProposalDocumentPreviewProps) {
  const timelineText = proposal.timeline
    .map((item) => item.label)
    .filter(Boolean)
    .join(', ')

  return (
    <div className="flex flex-1 justify-center px-10 py-10">
      <div className="border-charcoal/20 flex h-fit w-full max-w-2xl flex-col gap-6 border bg-white p-10 shadow-sm">
        <div>
          <p className="text-charcoal/50 text-xs font-bold tracking-[0.12em] uppercase">
            Consulting Proposal
          </p>
          <h1 className="border-honey-wood text-charcoal mt-1 border-b-2 pb-3 text-3xl font-extrabold">
            {clientName}
          </h1>
        </div>

        <section>
          <h2 className="text-charcoal text-xs font-extrabold tracking-wide uppercase">
            I. Proposed Solution &amp; Scope
          </h2>
          <p className="text-charcoal mt-1.5 text-sm leading-relaxed">{proposal.solutionScope}</p>
        </section>

        <section>
          <h2 className="text-charcoal text-xs font-extrabold tracking-wide uppercase">
            II. Objectives Addressed
          </h2>
          <p className="text-charcoal mt-1.5 text-sm leading-relaxed">{objectives.join(' · ')}</p>
        </section>

        <section>
          <h2 className="text-charcoal text-xs font-extrabold tracking-wide uppercase">
            III. Timeline
          </h2>
          <p className="text-charcoal mt-1.5 text-sm leading-relaxed">{timelineText}</p>
        </section>

        <section>
          <h2 className="text-charcoal text-xs font-extrabold tracking-wide uppercase">
            IV. Investment
          </h2>
          <p className="text-charcoal mt-1.5 text-sm leading-relaxed">{proposal.investment}</p>
        </section>

        <section>
          <h2 className="text-charcoal text-xs font-extrabold tracking-wide uppercase">
            V. Next Steps &amp; Terms
          </h2>
          <p className="text-charcoal mt-1.5 text-sm leading-relaxed">{proposal.nextSteps}</p>
        </section>

        <hr className="border-charcoal/15 mt-2" />

        <p className="text-charcoal/50 text-xs">
          This is the same view the client will receive — double-check before sending.
        </p>

        <div className="mt-4 flex justify-between">
          <button
            type="button"
            onClick={onBackToEditing}
            className="bg-plant-green/80 hover:bg-plant-green rounded-lg px-6 py-3 text-sm font-extrabold text-white transition"
          >
            Back to editing
          </button>

          <button
            type="button"
            onClick={onSendToClient}
            disabled={isSubmitting}
            className="bg-plant-green hover:bg-dark-blue rounded-lg px-6 py-3 text-sm font-extrabold text-white transition disabled:opacity-60"
          >
            {isSubmitting ? 'Sending...' : 'Send to Client'}
          </button>
        </div>
      </div>
    </div>
  )
}