import { describe, it, expect } from 'vitest'
import {
  applyStageCompletion,
  completedClientKeys,
  emptyProgressData,
  normalizeProgressData,
  toConsultantProgress,
  type StageCompletionInput,
} from '@/features/progress/progress'

const SARAH_STAGE_5: StageCompletionInput = {
  stageId: 5,
  personaKey: 'sarah',
  performance: 'strong',
}

describe('applyStageCompletion', () => {
  it('awards full stage XP, completes the stage and adds a badge', () => {
    const { data, reward } = applyStageCompletion(emptyProgressData(), SARAH_STAGE_5)

    expect(reward.xpAwarded).toBe(1000)
    expect(data.totalXp).toBe(1000)
    expect(data.completedLevels).toEqual([5])
    expect(data.badges).toEqual(['stage-5'])
  })

  it('awards 70% of the XP for a developing result', () => {
    const { reward } = applyStageCompletion(emptyProgressData(), {
      ...SARAH_STAGE_5,
      performance: 'developing',
    })

    expect(reward.xpAwarded).toBe(700)
  })

  it('never double counts a replay', () => {
    const first = applyStageCompletion(emptyProgressData(), SARAH_STAGE_5)
    const second = applyStageCompletion(first.data, SARAH_STAGE_5)

    expect(second.reward.xpAwarded).toBe(0)
    expect(second.data.totalXp).toBe(1000)
    expect(second.data.badges).toEqual(['stage-5'])
  })

  it('awards only the difference when a replay improves the result', () => {
    const first = applyStageCompletion(emptyProgressData(), {
      ...SARAH_STAGE_5,
      performance: 'developing',
    })
    const second = applyStageCompletion(first.data, SARAH_STAGE_5)

    expect(second.reward.xpAwarded).toBe(300)
    expect(second.data.totalXp).toBe(1000)
  })

  it('keeps the best result and its scores when a replay is worse', () => {
    const first = applyStageCompletion(emptyProgressData(), {
      ...SARAH_STAGE_5,
      metrics: { proposalScore: 6 },
    })
    const second = applyStageCompletion(first.data, {
      ...SARAH_STAGE_5,
      performance: 'developing',
      metrics: { proposalScore: 4 },
    })

    expect(second.reward.xpAwarded).toBe(0)
    expect(second.data.stageResults['5_sarah']?.performance).toBe('strong')
    expect(second.data.stageResults['5_sarah']?.metrics).toEqual({ proposalScore: 6 })
  })

  it('awards skill points only once per client and stage', () => {
    const input: StageCompletionInput = {
      ...SARAH_STAGE_5,
      skillDeltas: { clientDiscovery: 1, dealSuccess: 1 },
    }
    const first = applyStageCompletion(emptyProgressData(), input)
    const second = applyStageCompletion(first.data, input)

    expect(first.reward.skillsAwarded).toEqual({ clientDiscovery: 1, dealSuccess: 1 })
    expect(second.reward.skillsAwarded).toEqual({})
    expect(second.data.skillStats.clientDiscovery).toBe(1)
    expect(second.data.skillStats.dealSuccess).toBe(1)
  })

  it('stores scores without finishing the stage when completesStage is false', () => {
    const { data, reward } = applyStageCompletion(emptyProgressData(), {
      stageId: 1,
      personaKey: 'sarah',
      performance: 'strong',
      completesStage: false,
      metrics: { leadScore: 60 },
    })

    expect(reward.xpAwarded).toBe(0)
    expect(data.completedLevels).toEqual([])
    expect(data.badges).toEqual([])
    expect(data.stageResults['1_sarah']?.completed).toBe(false)
    expect(data.stageResults['1_sarah']?.metrics).toEqual({ leadScore: 60 })
  })

  it('keeps earlier scores when the stage is completed afterwards', () => {
    const scored = applyStageCompletion(emptyProgressData(), {
      stageId: 1,
      personaKey: 'sarah',
      performance: 'strong',
      completesStage: false,
      metrics: { leadScore: 60 },
    })
    const finished = applyStageCompletion(scored.data, {
      stageId: 1,
      personaKey: 'sarah',
      performance: 'strong',
    })

    expect(finished.reward.xpAwarded).toBe(300)
    expect(finished.data.completedLevels).toEqual([1])
    expect(finished.data.stageResults['1_sarah']?.metrics).toEqual({ leadScore: 60 })
  })
})

describe('completedClientKeys', () => {
  it('lists only clients whose stage was actually completed', () => {
    const scoredOnly = applyStageCompletion(emptyProgressData(), {
      stageId: 4,
      personaKey: 'david',
      performance: 'strong',
      completesStage: false,
    })
    const both = applyStageCompletion(scoredOnly.data, {
      stageId: 4,
      personaKey: 'sarah',
      performance: 'strong',
    })

    expect(completedClientKeys(both.data, 4)).toEqual(['sarah'])
  })
})

describe('normalizeProgressData', () => {
  it('copes with missing and malformed fields', () => {
    const data = normalizeProgressData({
      totalXp: 'lots',
      badges: ['stage-5', 7],
      stageResults: {
        '5_sarah': { performance: 'strong', xp: 1000, skillsAwarded: true },
        '5_bad': { performance: 'excellent' },
      },
    })

    expect(data.totalXp).toBe(0)
    expect(data.badges).toEqual(['stage-5'])
    expect(data.stageResults['5_sarah']).toEqual({
      performance: 'strong',
      xp: 1000,
      skillsAwarded: true,
      completed: true,
      metrics: {},
    })
    expect(data.stageResults['5_bad']).toBeUndefined()
  })

  it('recovers earlier stages and minimum XP when an older scorecard only saved Level 3', () => {
    const data = normalizeProgressData({
      completedLevels: [3],
      totalXp: 500,
      stageResults: {
        '3_sarah': { performance: 'strong', xp: 500, completed: true },
      },
    })

    expect(toConsultantProgress(data).completedStageIds).toEqual([1, 2, 3])
    expect(data.totalXp).toBe(990)
    expect(data.badges).toEqual(['stage-1', 'stage-2', 'stage-3'])
    expect(normalizeProgressData(data).totalXp).toBe(990)
  })

  it('preserves higher saved XP and does not recover stages from an unfinished result', () => {
    const data = normalizeProgressData({
      completedLevels: [2],
      totalXp: 1500,
      stageResults: {
        '3_sarah': { performance: 'strong', xp: 0, completed: false },
      },
    })

    expect(data.completedLevels).toEqual([1, 2])
    expect(data.totalXp).toBe(1500)
  })

  it('does not award recovered stage XP twice when that stage is replayed', () => {
    const recovered = normalizeProgressData({ completedLevels: [3], totalXp: 500 })
    const replayed = applyStageCompletion(recovered, {
      stageId: 1,
      personaKey: 'sarah',
      performance: 'strong',
    })

    expect(replayed.reward.xpAwarded).toBe(90)
    expect(replayed.data.totalXp).toBe(930)
  })
})

describe('toConsultantProgress', () => {
  it('derives level and in-level XP from total XP', () => {
    const progress = toConsultantProgress({ ...emptyProgressData(), totalXp: 5200 })

    expect(progress.level).toBe(2)
    expect(progress.currentXp).toBe(200)
    expect(progress.requiredXp).toBe(5000)
  })
  it('lists completed stage ids in order without duplicates', () => {
    const progress = toConsultantProgress({ ...emptyProgressData(), completedLevels: [3, 1, 3] })

    expect(progress.completedStageIds).toEqual([1, 3])
    expect(progress.completedStages).toBe(2)
  })
})
