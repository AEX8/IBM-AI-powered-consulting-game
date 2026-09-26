'use client'

import { useState } from 'react'
import { SKILL_KEYS, SKILL_LABELS, type StageCompletionReward } from '@/features/progress/progress'
import { MAX_NEGOTIATION_ROUNDS } from '../scoring'
import type { ProposalScore } from '../types'

type Scorecard = { scores: ProposalScore; feedback: string } | null

type ProposalOutcomeScreenProps =
  | {
      outcome: 'accepted'
      closedOnRound: number
      rewards: StageCompletionReward | null
      scorecard: Scorecard
      savingProgress: boolean
      onRetrySave: () => void
      onPlayAgain: () => void
      onContinue: () => void
    }
  | { outcome: 'rejected'; scorecard: Scorecard; onRetry: () => void; onContinue: () => void }

function ProposalScorecard({ scorecard }: { scorecard: Scorecard }) {
  if (!scorecard)
    return <p className="mt-4 text-sm">A scorecard is not available for this attempt.</p>
  const categories: Array<{ label: string; value: number }> = [
    { label: 'Business problem', value: scorecard.scores.problem },
    { label: 'Client value', value: scorecard.scores.value },
    { label: 'Solution fit', value: scorecard.scores.fit },
  ]
  const focus = categories.reduce((lowest, item) => (item.value < lowest.value ? item : lowest))
  return (
    <section
      className="border-charcoal/20 bg-warm-cream mt-5 rounded-xl border p-5 text-left"
      aria-label="Proposal scorecard"
    >
      <h2 className="text-dark-blue text-lg font-extrabold">Proposal scorecard</h2>
      <p className="text-charcoal/70 mt-1 text-xs">
        The three categories returned by the proposal review, each scored out of 2.
      </p>
      <div className="mt-4 space-y-3">
        {categories.map(({ label, value }) => (
          <div key={label}>
            <div className="flex justify-between text-sm font-bold">
              <span>{label}</span>
              <span>{value}/2</span>
            </div>
            <div
              className="bg-warm-grey mt-1 h-2 overflow-hidden rounded-full"
              role="meter"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={2}
              aria-valuenow={value}
            >
              <div
                className="bg-plant-green h-full"
                style={{ width: `${Math.max(0, Math.min(100, value * 50))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <h3 className="text-dark-blue mt-5 text-sm font-extrabold">Coach feedback</h3>
      <p className="mt-1 text-sm">{scorecard.feedback || 'No written feedback was provided.'}</p>
      <p className="mt-3 text-sm">
        <strong>Focus area:</strong> {focus.label}
      </p>
    </section>
  )
}

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
  const [showScorecard, setShowScorecard] = useState(false)
  if (props.outcome === 'accepted') {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <div className="border-charcoal/10 w-full max-w-md overflow-hidden rounded-2xl border bg-white text-center shadow-sm">
          <p className="bg-plant-green px-6 py-3 text-sm font-extrabold tracking-wide text-white uppercase">
            Outcome · accepted
          </p>
          <div className="p-10">
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
              className="text-dark-blue border-dark-blue mt-5 w-full rounded-lg border-2 px-4 py-2 text-sm font-extrabold"
              aria-expanded={showScorecard}
              onClick={() => setShowScorecard(!showScorecard)}
            >
              {showScorecard ? 'Hide scorecard' : 'View scorecard'}
            </button>
            {showScorecard && <ProposalScorecard scorecard={props.scorecard} />}

            <p className="text-charcoal/70 mt-5 text-sm">
              {props.rewards
                ? 'Level 6 is unlocked for this client. Return home, then choose Close Deal to finalise your contract.'
                : 'Return home to check your saved progress. Level 6 becomes available once your proposal completion is saved.'}
            </p>

            {!props.rewards && (
              <button
                type="button"
                disabled={props.savingProgress}
                onClick={props.onRetrySave}
                className="bg-honey-wood mt-5 w-full rounded-lg py-3 text-sm font-extrabold disabled:opacity-60"
              >
                {props.savingProgress ? 'Saving progress…' : 'Retry saving progress'}
              </button>
            )}
            <button
              type="button"
              onClick={props.onContinue}
              className="bg-plant-green hover:bg-dark-blue mt-4 w-full rounded-lg py-3 text-sm font-extrabold text-white transition"
            >
              Return to lobby →
            </button>
            <button
              type="button"
              onClick={props.onPlayAgain}
              className="text-dark-blue mt-3 text-sm font-bold underline"
            >
              Play again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="border-charcoal/10 w-full max-w-md overflow-hidden rounded-2xl border bg-white text-center shadow-sm">
        <p className="bg-honey-wood px-6 py-3 text-sm font-extrabold tracking-wide uppercase">
          Outcome · revise
        </p>
        <div className="p-10">
          <div className="bg-honey-wood/25 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <span className="text-honey-wood text-3xl" aria-hidden="true">
              ✕
            </span>
          </div>

          <h1 className="text-charcoal mt-5 text-2xl font-extrabold">
            Client Did Not Move Forward
          </h1>
          <p className="text-charcoal/70 mt-2 text-sm">
            After {MAX_NEGOTIATION_ROUNDS} rounds of revisions, the client decided not to proceed
            with this proposal.
          </p>

          <button
            type="button"
            className="text-dark-blue border-dark-blue mt-5 w-full rounded-lg border-2 px-4 py-2 text-sm font-extrabold"
            aria-expanded={showScorecard}
            onClick={() => setShowScorecard(!showScorecard)}
          >
            {showScorecard ? 'Hide scorecard' : 'View scorecard'}
          </button>
          {showScorecard && <ProposalScorecard scorecard={props.scorecard} />}
          <button
            type="button"
            onClick={props.onRetry}
            className="bg-charcoal hover:bg-dark-blue mt-6 w-full rounded-lg py-3 text-sm font-extrabold text-white transition"
          >
            Try this level again →
          </button>
          <button
            type="button"
            onClick={props.onContinue}
            className="text-dark-blue mt-4 text-sm font-bold underline"
          >
            Return to lobby
          </button>
        </div>
      </div>
    </div>
  )
}
