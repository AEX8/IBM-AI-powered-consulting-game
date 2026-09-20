import { SKILL_KEYS, SKILL_LABELS, type StageCompletionReward } from '@/features/progress/progress'
import { MAX_NEGOTIATION_ROUNDS } from '../scoring'

type ProposalOutcomeScreenProps =
  | {
      outcome: 'accepted'
      closedOnRound: number
      rewards: StageCompletionReward | null
      onContinue: () => void
    }
  | { outcome: 'rejected'; onRetry: () => void }

function RewardsSummary({ rewards }: { rewards: StageCompletionReward }) {
  const skillLines = SKILL_KEYS.filter((skill) => (rewards.skillsAwarded[skill] ?? 0) > 0)

  if (rewards.xpAwarded === 0 && skillLines.length === 0) {
    return (
      <p className="text-charcoal/60 mt-4 text-xs">
        You have already earned this reward with this client.
      </p>
    )
  }

  return (
    <div className="bg-warm-cream mt-5 rounded-lg p-4 text-left">
      <p className="text-charcoal/60 text-[11px] font-extrabold tracking-[0.1em] uppercase">
        Rewards
      </p>
      <p className="text-dark-blue mt-1 text-lg font-extrabold">+{rewards.xpAwarded} XP</p>

      {skillLines.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {skillLines.map((skill) => (
            <li key={skill} className="text-charcoal flex justify-between">
              <span>{SKILL_LABELS[skill]}</span>
              <span className="font-bold">+{rewards.skillsAwarded[skill]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ProposalOutcomeScreen(props: ProposalOutcomeScreenProps) {
  if (props.outcome === 'accepted') {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <div className="border-charcoal/10 w-full max-w-md rounded-2xl border bg-white p-10 text-center shadow-sm">
          <div className="bg-plant-green/15 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <span className="text-plant-green text-3xl" aria-hidden="true">
              ✓
            </span>
          </div>

          <h1 className="text-charcoal mt-5 text-2xl font-extrabold">Proposal Accepted</h1>
          <p className="text-charcoal/70 mt-2 text-sm">
            The client has signed off on the proposal. Great work getting them across the line.
          </p>

          <span className="bg-warm-grey text-charcoal mt-4 inline-block rounded-full px-3 py-1 text-xs font-bold">
            Closed on Round {props.closedOnRound}
          </span>

          {props.rewards && <RewardsSummary rewards={props.rewards} />}

          <button
            type="button"
            onClick={props.onContinue}
            className="bg-plant-green hover:bg-dark-blue mt-6 w-full rounded-lg py-3 text-sm font-extrabold text-white transition"
          >
            Continue to level 6 →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="border-charcoal/10 w-full max-w-md rounded-2xl border bg-white p-10 text-center shadow-sm">
        <div className="bg-honey-wood/25 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
          <span className="text-honey-wood text-3xl" aria-hidden="true">
            ✕
          </span>
        </div>

        <h1 className="text-charcoal mt-5 text-2xl font-extrabold">Client Did Not Move Forward</h1>
        <p className="text-charcoal/70 mt-2 text-sm">
          After {MAX_NEGOTIATION_ROUNDS} rounds of revisions, the client decided not to proceed
          with this proposal.
        </p>

        <button
          type="button"
          onClick={props.onRetry}
          className="bg-charcoal hover:bg-dark-blue mt-6 w-full rounded-lg py-3 text-sm font-extrabold text-white transition"
        >
          Try this level again →
        </button>
      </div>
    </div>
  )
}