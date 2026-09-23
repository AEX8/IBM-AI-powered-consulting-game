export const TOTAL_STAGES = 6
export const XP_PER_LEVEL = 5000

export const SKILL_KEYS = [
  'clientDiscovery',
  'businessAcumen',
  'solutionDesign',
  'clientManagement',
  'dealSuccess',
] as const

export type SkillKey = (typeof SKILL_KEYS)[number]
export type SkillStats = Record<SkillKey, number>
export type SkillDeltas = Partial<Record<SkillKey, number>>

export const SKILL_LABELS: Record<SkillKey, string> = {
  clientDiscovery: 'Client Discovery',
  businessAcumen: 'Business Acumen',
  solutionDesign: 'Solution Design',
  clientManagement: 'Client Management',
  dealSuccess: 'Deal Success',
}

export type Performance = 'strong' | 'developing'

// Base XP for completing each stage. Rebalance here; nothing else needs to change.
export const STAGE_XP: Record<number, number> = {
  1: 300,
  2: 400,
  3: 500,
  4: 800,
  5: 1000,
  6: 1200,
}

export const PERFORMANCE_XP_MULTIPLIER: Record<Performance, number> = {
  strong: 1,
  developing: 0.7,
}

// Numeric scores a level reports, e.g. { leadScore: 60 } or { outreachScore: 5 }.
export type StageMetrics = Record<string, number>

export type StageResult = {
  performance: Performance
  xp: number
  skillsAwarded: boolean
  // False while a level has scored this client but has not finished yet (Level 1).
  completed: boolean
  metrics: StageMetrics
}

export type ProgressData = {
  completedPersonaIds: string[]
  completedLevels: number[]
  totalXp: number
  skillStats: SkillStats
  stageResults: Record<string, StageResult>
  badges: string[]
}

export type ConsultantProgress = {
  level: number
  currentXp: number
  requiredXp: number
  totalXp: number
  completedStages: number
  completedStageIds: number[]
  totalStages: number
  badgesCollected: number
  durationHours: number
  skillStats: SkillStats
}

export type StageCompletionInput = {
  stageId: number
  personaKey: string
  performance: Performance
  skillDeltas?: SkillDeltas
  metrics?: StageMetrics
  // Defaults to true. Levels that score several clients before the level itself
  // ends pass false for every client except the one that finishes the level.
  completesStage?: boolean
}

export type StageCompletionReward = {
  xpAwarded: number
  skillsAwarded: SkillDeltas
}

export function emptySkillStats(): SkillStats {
  return {
    clientDiscovery: 0,
    businessAcumen: 0,
    solutionDesign: 0,
    clientManagement: 0,
    dealSuccess: 0,
  }
}

export function emptyProgressData(): ProgressData {
  return {
    completedPersonaIds: [],
    completedLevels: [],
    totalXp: 0,
    skillStats: emptySkillStats(),
    stageResults: {},
    badges: [],
  }
}

export function stageResultKey(stageId: number, personaKey: string): string {
  return `${stageId}_${personaKey}`
}

export function xpForStage(stageId: number, performance: Performance): number {
  return Math.round((STAGE_XP[stageId] ?? 0) * PERFORMANCE_XP_MULTIPLIER[performance])
}

function isPerformance(value: unknown): value is Performance {
  return value === 'strong' || value === 'developing'
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function toNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
    : []
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function toMetrics(value: unknown): StageMetrics {
  const metrics: StageMetrics = {}

  for (const [key, item] of Object.entries(toRecord(value))) {
    if (typeof item === 'number' && Number.isFinite(item)) metrics[key] = item
  }

  return metrics
}

// Firestore data is untrusted shape-wise (older documents lack the newer fields),
// so every field is defaulted rather than assumed.
export function normalizeProgressData(raw: unknown): ProgressData {
  const source = toRecord(raw)
  const rawSkills = toRecord(source.skillStats)
  const rawResults = toRecord(source.stageResults)

  const skillStats = emptySkillStats()
  for (const skill of SKILL_KEYS) {
    skillStats[skill] = toNumber(rawSkills[skill])
  }

  const stageResults: Record<string, StageResult> = {}
  for (const [key, value] of Object.entries(rawResults)) {
    const result = toRecord(value)
    if (!isPerformance(result.performance)) continue

    stageResults[key] = {
      performance: result.performance,
      xp: toNumber(result.xp),
      skillsAwarded: result.skillsAwarded === true,
      // Results saved before this field existed were all completions.
      completed: result.completed !== false,
      metrics: toMetrics(result.metrics),
    }
  }

  const completedLevels = toNumberArray(source.completedLevels).filter(
    (stageId) => Number.isInteger(stageId) && stageId >= 1 && stageId <= TOTAL_STAGES
  )
  const latestCompleted = Math.max(0, ...completedLevels)
  // Older sessions can contain a later saved stage but lack earlier scorecard
  // entries. A completed later stage implies the preceding stages were reached.
  const recoveredLevels = Array.from({ length: latestCompleted }, (_, index) => index + 1)
  const recordedXpByStage = new Map<number, number>()
  for (const [key, result] of Object.entries(stageResults)) {
    if (!result.completed) continue
    const stageId = Number(key.split('_', 1)[0])
    if (!Number.isInteger(stageId) || stageId < 1 || stageId > TOTAL_STAGES) continue
    recordedXpByStage.set(stageId, Math.max(recordedXpByStage.get(stageId) ?? 0, result.xp))
  }
  const recoveredXp = recoveredLevels.reduce(
    (sum, stageId) =>
      sum + Math.max(recordedXpByStage.get(stageId) ?? 0, xpForStage(stageId, 'developing')),
    0
  )

  return {
    completedPersonaIds: toStringArray(source.completedPersonaIds),
    completedLevels: recoveredLevels,
    totalXp: Math.max(toNumber(source.totalXp), recoveredXp),
    skillStats,
    stageResults,
    badges: [
      ...new Set([...toStringArray(source.badges), ...recoveredLevels.map((id) => `stage-${id}`)]),
    ],
  }
}

export function applyStageCompletion(
  current: ProgressData,
  input: StageCompletionInput
): { data: ProgressData; reward: StageCompletionReward } {
  const key = stageResultKey(input.stageId, input.personaKey)
  const previous = current.stageResults[key]
  const completesStage = input.completesStage !== false

  const xpForThisRun = completesStage ? xpForStage(input.stageId, input.performance) : 0
  // A recovered earlier stage already has its minimum XP included in totalXp.
  // Replaying it can improve that award, but must not grant the full amount again.
  const previousXp =
    previous?.xp ??
    (current.completedLevels.includes(input.stageId) ? xpForStage(input.stageId, 'developing') : 0)
  const xpAwarded = Math.max(0, xpForThisRun - previousXp)
  const keepPrevious = previous !== undefined && previous.xp > xpForThisRun

  const shouldAwardSkills =
    completesStage && !previous?.skillsAwarded && input.skillDeltas !== undefined
  const skillStats = { ...current.skillStats }
  const skillsAwarded: SkillDeltas = {}

  if (shouldAwardSkills && input.skillDeltas) {
    for (const skill of SKILL_KEYS) {
      const delta = input.skillDeltas[skill] ?? 0
      if (delta > 0) {
        skillStats[skill] += delta
        skillsAwarded[skill] = delta
      }
    }
  }

  // The latest scores win, except that a worse replay of a finished stage must not
  // overwrite the best result already saved.
  const metrics: StageMetrics =
    input.metrics && !(completesStage && keepPrevious)
      ? { ...previous?.metrics, ...input.metrics }
      : (previous?.metrics ?? {})

  const performance: Performance =
    previous !== undefined && keepPrevious ? previous.performance : input.performance
  const badgeId = `stage-${input.stageId}`

  return {
    data: {
      ...current,
      totalXp: current.totalXp + xpAwarded,
      skillStats,
      completedLevels:
        completesStage && !current.completedLevels.includes(input.stageId)
          ? [...current.completedLevels, input.stageId].sort((a, b) => a - b)
          : current.completedLevels,
      badges:
        completesStage && !current.badges.includes(badgeId)
          ? [...current.badges, badgeId]
          : current.badges,
      stageResults: {
        ...current.stageResults,
        [key]: {
          performance,
          xp: Math.max(previousXp, xpForThisRun),
          skillsAwarded: Boolean(previous?.skillsAwarded) || shouldAwardSkills,
          completed: Boolean(previous?.completed) || completesStage,
          metrics,
        },
      },
    },
    reward: { xpAwarded, skillsAwarded },
  }
}

export function toConsultantProgress(data: ProgressData): ConsultantProgress {
  return {
    level: Math.floor(data.totalXp / XP_PER_LEVEL) + 1,
    currentXp: data.totalXp % XP_PER_LEVEL,
    requiredXp: XP_PER_LEVEL,
    totalXp: data.totalXp,
    completedStages: Math.min(TOTAL_STAGES, new Set(data.completedLevels).size),
    completedStageIds: [...new Set(data.completedLevels)].sort((a, b) => a - b),
    totalStages: TOTAL_STAGES,
    badgesCollected: data.badges.length,
    durationHours: 0,
    skillStats: data.skillStats,
  }
}

// Client keys (e.g. 'sarah') the player has fully completed a given stage with.
export function completedClientKeys(data: ProgressData, stageId: number): string[] {
  const prefix = `${stageId}_`

  return Object.entries(data.stageResults)
    .filter(([key, result]) => key.startsWith(prefix) && result.completed)
    .map(([key]) => key.slice(prefix.length))
}
