import { describe, expect, it } from 'vitest'
import {
  evaluateConversationCompletion,
  getContextualConversationHint,
  getPersonaCompletionConfig,
  isExplicitConversationExit,
  SUGGESTED_CLOSING_REPLY,
} from '@/features/game/dialogue/conversationCompletion'

// Exercise progression without Groq, Firebase, or Phaser. Provider behaviour is
// represented only by the coverage keys that its classification pass may return.
const sarah = getPersonaCompletionConfig('test-level-1')
const david = getPersonaCompletionConfig('test-level-2')

function evaluate(
  coveredInfoPoints: readonly string[],
  playerTurnCount = 4,
  playerMessage = 'What outcome would help you most?'
) {
  return evaluateConversationCompletion({
    config: sarah,
    coveredInfoPoints,
    playerTurnCount,
    playerMessage,
  })
}

describe('Level 1 client completion rules', () => {
  it('uses the two current clients and the agreed canonical Sarah company', () => {
    expect(sarah.canonicalCompany).toBe('ACMD Manufacturing')
    expect(sarah.infoPoints).toHaveLength(7)
    expect(david.infoPoints).toHaveLength(7)
  })

  it('does not become ready before four player discovery turns', () => {
    const result = evaluate(
      sarah.infoPoints.map((point) => point.key),
      3
    )

    expect(result.coverageReady).toBe(false)
    expect(result.conversationComplete).toBe(false)
  })

  it('becomes ready after six points when every critical point is covered', () => {
    const covered = sarah.infoPoints
      .filter((point) => point.critical || point.key !== 'current_approach')
      .map((point) => point.key)
    const result = evaluate(covered)

    expect(result.coverageReady).toBe(true)
    expect(result.readyToClose).toBe(true)
    expect(result.suggestedClosingReply).toBe(SUGGESTED_CLOSING_REPLY)
    expect(result.conversationComplete).toBe(false)
  })

  it('does not become ready when a critical point is missing', () => {
    const covered = sarah.infoPoints
      .filter((point) => point.key !== 'urgency')
      .map((point) => point.key)
    const result = evaluate(covered)

    expect(result.coverageReady).toBe(false)
    expect(result.hint).toContain('urgent')
  })

  it('does not end early for generic thanks or proposal wording', () => {
    const result = evaluate(['business_problem'], 2, 'Thanks, I will prepare a proposal.')

    expect(result.readyToClose).toBe(false)
    expect(result.conversationComplete).toBe(false)
  })

  it('ends after a genuine wrap-up only when coverage is ready', () => {
    const covered = sarah.infoPoints.map((point) => point.key)
    const result = evaluate(
      covered,
      5,
      "Thanks, that gives me a much clearer picture. I'll take this information back to my team."
    )

    expect(result.conversationComplete).toBe(true)
    expect(result.completionReason).toBe('coverage-and-wrap-up')
  })

  it.each(['bye for now', 'BYE FOR NOW', ' Bye for now! '])(
    'always accepts the explicit exit phrase: %s',
    (message) => {
      const result = evaluate([], 1, message)

      expect(isExplicitConversationExit(message)).toBe(true)
      expect(result.conversationComplete).toBe(true)
      expect(result.completionReason).toBe('explicit-exit')
    }
  )

  it('does not treat a partial goodbye as the explicit exit phrase', () => {
    expect(isExplicitConversationExit('bye')).toBe(false)
    expect(evaluate([], 1, 'bye').conversationComplete).toBe(false)
  })

  it('guides the player to wrap up on turn nine even if coverage checking fails', () => {
    const result = evaluate([], 9)

    expect(result.readyToClose).toBe(true)
    expect(result.conversationComplete).toBe(false)
    expect(result.suggestedClosingReply).toBe(SUGGESTED_CLOSING_REPLY)
  })

  it('forces completion at the ten-turn safety cap', () => {
    const result = evaluate([], 10)

    expect(result.conversationComplete).toBe(true)
    expect(result.completionReason).toBe('turn-limit')
  })

  it('removes duplicate and unknown coverage keys returned by the LLM', () => {
    const result = evaluate(['business_problem', 'business_problem', 'invented_key'])

    expect(result.coveredInfoPoints).toEqual(['business_problem'])
    expect(result.missingInfoPoints).not.toContain('invented_key')
  })

  it('creates safe fallback rules for a future persona without changing current clients', () => {
    const fallback = getPersonaCompletionConfig('future-client', ['Budget', 'Timeline'])

    expect(fallback.infoPoints.map((point) => point.key)).toEqual([
      'information_1',
      'information_2',
    ])
    expect(fallback.infoPoints.every((point) => point.critical)).toBe(true)
  })

  it('uses short, persona-specific hints that advance when coverage stalls', () => {
    const firstHint = getContextualConversationHint({
      config: david,
      coveredInfoPoints: [],
      playerTurnCount: 1,
    })
    const secondHint = getContextualConversationHint({
      config: david,
      coveredInfoPoints: [],
      playerTurnCount: 2,
    })

    expect(firstHint).toBe('Ask about the disconnected data.')
    expect(secondHint).toBe('Ask how data silos affect decisions.')
    expect(firstHint).not.toBe(secondHint)
    expect(Math.max(firstHint?.length ?? 0, secondHint?.length ?? 0)).toBeLessThanOrEqual(40)
  })

  it('starts with a greeting before moving into client discovery', () => {
    const greetingHint = getContextualConversationHint({
      config: david,
      coveredInfoPoints: [],
      playerTurnCount: 0,
    })
    const discoveryHint = getContextualConversationHint({
      config: david,
      coveredInfoPoints: [],
      playerTurnCount: 1,
    })

    expect(greetingHint).toBe('Say hello and briefly introduce yourself.')
    expect(discoveryHint).toBe('Ask about the disconnected data.')
  })
})
