// Rules for Level 6 (Close Deal). Plain code with no Firebase or Phaser, so the
// API routes, the screen and the tests all share one definition.
import { completedClientKeys, type ProgressData, type SkillDeltas } from '@/features/progress/progress'

export const CLOSING_STAGE_ID = 6
export const PROPOSAL_STAGE_ID = 5 // the stage that must be finished first

export const MAX_CONCERN_ROUNDS = 2 // final concerns the client raises before deciding
export const MAX_ANSWER_LENGTH = 400

export const SIGNED_SCORE = 60 // overall score needed to sign the contract
export const STALLED_SCORE = 40 // below this the deal is lost
export const STRONG_SCORE = 75 // overall score for full XP

export const SCORE_KEYS = ['terms', 'concerns', 'relationship', 'clarity'] as const

export type ScoreKey = (typeof SCORE_KEYS)[number]
export type ClosingScores = Record<ScoreKey, number>

export const SCORE_LABELS: Record<ScoreKey, string> = {
  terms: 'Contract terms',
  concerns: 'Handling final concerns',
  relationship: 'Relationship',
  clarity: 'Clarity and commitment',
}

export type ContractOutcome = 'signed' | 'stalled' | 'lost'

export type ClosingResult = {
  overall: number
  outcome: ContractOutcome
  performance: 'strong' | 'developing'
  // Only a signed contract completes the level; stalled and lost deals can be retried.
  completesStage: boolean
}

// Skill points for closing a deal (awarded once per client by the shared scorecard).
const SIGNED_SKILL_DELTAS: SkillDeltas = { dealSuccess: 2, clientManagement: 1 }

export function signedSkillDeltas(): SkillDeltas {
  return { ...SIGNED_SKILL_DELTAS }
}

// Level 6 opens for a client only once the player has finished Level 5 with them.
export function canStartClosing(progress: ProgressData, personaKey: string): boolean {
  return completedClientKeys(progress, PROPOSAL_STAGE_ID).includes(personaKey)
}

function toScoreNumber(value: unknown): number | null {
  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value

  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) {
    return null
  }

  return Math.min(100, Math.max(0, Math.round(parsed)))
}

// Model output is untrusted: every score must be present and numeric, and is
// clamped to 0-100. Returns null instead of guessing when anything is missing.
export function normalizeScores(raw: unknown): ClosingScores | null {
  if (!raw || typeof raw !== 'object') return null

  const source = raw as Record<string, unknown>
  const scores = {} as ClosingScores

  for (const key of SCORE_KEYS) {
    const value = toScoreNumber(source[key])
    if (value === null) return null
    scores[key] = value
  }

  return scores
}

export function overallScore(scores: ClosingScores): number {
  const total = SCORE_KEYS.reduce((sum, key) => sum + scores[key], 0)
  return Math.round(total / SCORE_KEYS.length)
}

export function closingResult(scores: ClosingScores): ClosingResult {
  const overall = overallScore(scores)
  const outcome: ContractOutcome =
    overall >= SIGNED_SCORE ? 'signed' : overall >= STALLED_SCORE ? 'stalled' : 'lost'

  return {
    overall,
    outcome,
    performance: overall >= STRONG_SCORE ? 'strong' : 'developing',
    completesStage: outcome === 'signed',
  }
}