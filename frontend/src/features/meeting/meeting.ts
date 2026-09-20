// Rules for the Level 4 client meeting. Plain code with no Firebase or Phaser, so
// the screen, the API routes and the tests all share one definition.

export const MIN_PLAYER_MESSAGES_TO_END = 4 // the player may end the meeting from here
export const MAX_PLAYER_MESSAGES = 8 // the client ends the meeting here
export const MIN_PLAYER_MESSAGES_FOR_CLIENT_TO_END = 3 // earliest the client may walk out
export const MIN_PLAYER_MESSAGES_TO_SCORE = 3
export const MAX_FREE_MESSAGE_LENGTH = 120

export const PASS_SCORE = 50 // overall score needed to complete the level
export const STRONG_SCORE = 70 // overall score for full XP

export const MEETING_OPENING_CHOICES = [
  'Confirm the client’s most urgent priority',
  'Explore the impact on customers and teams',
  'Ask what a successful outcome looks like',
  'Discuss stakeholders and practical next steps',
] as const

export const SCORE_KEYS = [
  'relationship',
  'trust',
  'understanding',
  'dealPotential',
  'patience',
] as const

export type ScoreKey = (typeof SCORE_KEYS)[number]
export type MeetingScores = Record<ScoreKey, number>

export const SCORE_LABELS: Record<ScoreKey, string> = {
  relationship: 'Relationship',
  trust: 'Trust',
  understanding: 'Understanding of needs',
  dealPotential: 'Deal potential',
  patience: 'Client patience',
}

export type MeetingMessage = {
  role: 'player' | 'client'
  content: string
}

export type MeetingOutcome = {
  overall: number
  passed: boolean
  performance: 'strong' | 'developing'
}

export function countPlayerMessages(messages: readonly MeetingMessage[]): number {
  return messages.filter((message) => message.role === 'player').length
}

export function canEndMeeting(playerMessages: number): boolean {
  return playerMessages >= MIN_PLAYER_MESSAGES_TO_END
}

export function meetingIsOver(playerMessages: number): boolean {
  return playerMessages >= MAX_PLAYER_MESSAGES
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
export function normalizeScores(raw: unknown): MeetingScores | null {
  if (!raw || typeof raw !== 'object') return null

  const source = raw as Record<string, unknown>
  const scores = {} as MeetingScores

  for (const key of SCORE_KEYS) {
    const value = toScoreNumber(source[key])
    if (value === null) return null
    scores[key] = value
  }

  return scores
}

export function overallScore(scores: MeetingScores): number {
  const total = SCORE_KEYS.reduce((sum, key) => sum + scores[key], 0)
  return Math.round(total / SCORE_KEYS.length)
}

export function meetingOutcome(scores: MeetingScores): MeetingOutcome {
  const overall = overallScore(scores)

  return {
    overall,
    passed: overall >= PASS_SCORE,
    performance: overall >= STRONG_SCORE ? 'strong' : 'developing',
  }
}
