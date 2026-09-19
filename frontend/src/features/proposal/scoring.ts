import type { ProposalScore } from './types'

export const MAX_NEGOTIATION_ROUNDS = 3
export const ACCEPT_THRESHOLD = 5
export const REJECT_THRESHOLD = 2

export type ProposalDecision = 'accept' | 'revise' | 'reject'

export function totalScore(score: ProposalScore): number {
  return score.problem + score.value + score.fit
}

export function decideOutcome(score: ProposalScore): ProposalDecision {
  const total = totalScore(score)
  if (total >= ACCEPT_THRESHOLD) return 'accept'
  if (total <= REJECT_THRESHOLD) return 'reject'
  return 'revise'
}

export function weakestDimension(score: ProposalScore): keyof ProposalScore {
  const entries: Array<[keyof ProposalScore, number]> = [
    ['problem', score.problem],
    ['value', score.value],
    ['fit', score.fit],
  ]

  return entries.reduce((weakest, entry) => (entry[1] < weakest[1] ? entry : weakest))[0]
}