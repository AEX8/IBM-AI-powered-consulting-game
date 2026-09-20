import { describe, it, expect } from 'vitest'
import { getMeetingPrepClient, scoreMeetingPrep } from '@/data/meetingPrepContent'
import { preparationContent } from '@/features/game/components/preparationContent'

const SARAH = 'test-level-1'
const DAVID = 'test-level-2'

function requireClient(personaId: string) {
  const client = getMeetingPrepClient(personaId)
  if (!client) throw new Error(`Meeting prep content missing for ${personaId}`)
  return client
}

function correctObjective(personaId: string): string {
  const objective = requireClient(personaId).objectives.find((item) => item.isCorrect)
  if (!objective) throw new Error(`No correct objective for ${personaId}`)
  return objective.text
}

function wrongObjectives(personaId: string, count: number): string[] {
  return requireClient(personaId)
    .objectives.filter((item) => !item.isCorrect)
    .slice(0, count)
    .map((item) => item.text)
}

function questionsByStrength(personaId: string, strength: 'strong' | 'poor'): string[] {
  return requireClient(personaId)
    .questions.filter((item) => item.strength === strength)
    .map((item) => item.text)
}

describe('meeting prep content lookup', () => {
  it('finds Sarah and David by the persona ids the game uses', () => {
    expect(getMeetingPrepClient(SARAH)?.name).toBe('Sarah Chen')
    expect(getMeetingPrepClient(DAVID)?.name).toBe('David Palte')
  })
})

describe('scoreMeetingPrep', () => {
  it.each([SARAH, DAVID])('gives %s a full score for the best objective and three strong questions', (id) => {
    const result = scoreMeetingPrep(
      id,
      [correctObjective(id)],
      questionsByStrength(id, 'strong').slice(0, 3)
    )

    expect(result.totalScore).toBe(6)
    expect(result.resultLabel).toBe('Strong')
  })

  it('takes a point off for each wrong objective chosen alongside the correct one', () => {
    const result = scoreMeetingPrep(
      SARAH,
      [correctObjective(SARAH), ...wrongObjectives(SARAH, 2)],
      []
    )

    expect(result.objectiveScore).toBe(1)
    expect(result.feedback.join(' ')).toContain('do not fit the client need')
  })

  it('gives no objective points when only wrong objectives are chosen', () => {
    const result = scoreMeetingPrep(SARAH, wrongObjectives(SARAH, 3), [])

    expect(result.objectiveScore).toBe(0)
  })

  it('gives no question points for poor questions', () => {
    const result = scoreMeetingPrep(SARAH, [], questionsByStrength(SARAH, 'poor'))

    expect(result.questionScore).toBe(0)
  })

  it('caps question points at three', () => {
    const result = scoreMeetingPrep(SARAH, [], questionsByStrength(SARAH, 'strong'))

    expect(result.questionScore).toBe(3)
  })

  it('reports an unknown client instead of inventing a score', () => {
    const result = scoreMeetingPrep('not-a-client', [], [])

    expect(result.totalScore).toBe(0)
    expect(result.feedback.join(' ')).toContain('not found')
  })
})

// Scoring matches selections by exact text, so every option the Level 3 screen
// offers must exist word for word in the scoring content.
describe('Level 3 screen options match the scoring content', () => {
  it.each([SARAH, DAVID])('%s options exist in the scoring content', (personaId) => {
    const screen = preparationContent[personaId]
    if (!screen) throw new Error(`Level 3 screen content missing for ${personaId}`)

    const client = requireClient(personaId)
    const objectives = client.objectives.map((item) => item.text)
    const questions = client.questions.map((item) => item.text)

    screen.objectives.forEach((text) => expect(objectives).toContain(text))
    screen.questions.forEach((text) => expect(questions).toContain(text))
  })
})