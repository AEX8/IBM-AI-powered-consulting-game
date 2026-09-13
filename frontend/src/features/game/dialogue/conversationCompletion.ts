/**
 * Deterministic completion rules for LLM-driven client conversations.
 *
 * The LLM identifies which facts appeared, but this module has final authority
 * over progression. Keeping it independent of Phaser and the API also makes every
 * completion and fallback path testable without Groq or Firebase.
 */
export const MINIMUM_DISCOVERY_TURNS = 4
export const GUIDED_WRAP_TURN = 9
export const MAXIMUM_CONVERSATION_TURNS = 10
export const REQUIRED_COVERAGE_COUNT = 6

export const SUGGESTED_CLOSING_REPLY =
  "Thanks, that gives me a much clearer picture. It was great speaking with you - I'll take this information back to my team."

export type CompletionReason = 'coverage-and-wrap-up' | 'explicit-exit' | 'turn-limit'

export type PersonaInfoPoint = {
  key: string
  description: string
  hint: string
  critical: boolean
}

export type PersonaCompletionConfig = {
  personaId: string
  canonicalCompany?: string
  infoPoints: readonly PersonaInfoPoint[]
}

export type ConversationCompletionState = {
  coveredInfoPoints: string[]
  missingInfoPoints: string[]
  coverageReady: boolean
  readyToClose: boolean
  conversationComplete: boolean
  completionReason?: CompletionReason
  hint?: string
  suggestedClosingReply?: string
}

// These IDs match the two persona documents currently used in Level 1. Descriptions
// define what counts as coverage; hints guide players without revealing the answer.
// Every critical point must be covered before an ordinary wrap-up is allowed.
const CURRENT_LEVEL_ONE_PERSONAS: Record<string, PersonaCompletionConfig> = {
  'test-level-1': {
    personaId: 'test-level-1',
    canonicalCompany: 'ACMD Manufacturing',
    infoPoints: [
      {
        key: 'business_problem',
        description: 'Supply-chain delays are the core business problem.',
        hint: 'Ask about the supply delays.',
        critical: true,
      },
      {
        key: 'root_cause',
        description:
          'Disconnected systems and poor operational visibility make the delays difficult to diagnose.',
        hint: 'Ask what causes the delays.',
        critical: false,
      },
      {
        key: 'business_impact',
        description: 'The delays have caused missed delivery targets and customer compensation.',
        hint: 'Ask how delays affect clients.',
        critical: true,
      },
      {
        key: 'current_approach',
        description: 'The company currently relies on extra staff and manual reporting.',
        hint: 'Ask what they have tried.',
        critical: false,
      },
      {
        key: 'client_concern',
        description: 'Sarah wants to avoid a disruptive eighteen-month system replacement.',
        hint: 'Ask about change concerns.',
        critical: false,
      },
      {
        key: 'desired_outcome',
        description: 'Sarah wants better operational visibility without replacing everything.',
        hint: 'Ask what success looks like.',
        critical: true,
      },
      {
        key: 'urgency',
        description: 'The issue is becoming urgent because the company is growing quickly.',
        hint: 'Ask why this is urgent.',
        critical: true,
      },
    ],
  },
  'test-level-2': {
    personaId: 'test-level-2',
    infoPoints: [
      {
        key: 'business_problem',
        description:
          'Customer information is fragmented across stores, online, mobile, and loyalty systems.',
        hint: 'Ask about the disconnected data.',
        critical: true,
      },
      {
        key: 'business_impact',
        description:
          'The fragmented data prevents reliable customer, churn, and promotion analysis.',
        hint: 'Ask how data silos affect decisions.',
        critical: true,
      },
      {
        key: 'current_approach',
        description: 'Existing dashboards fail because the underlying data sources do not agree.',
        hint: 'Ask why the dashboards disagree.',
        critical: false,
      },
      {
        key: 'internal_capability',
        description: 'David already has a strong internal technology team.',
        hint: 'Ask about the internal team.',
        critical: false,
      },
      {
        key: 'client_concern',
        description: 'David does not want an expensive two-year transformation programme.',
        hint: 'Ask about budget or scope.',
        critical: false,
      },
      {
        key: 'desired_outcome',
        description:
          'David wants one reliable customer view and a practical solution that demonstrates value quickly.',
        hint: 'Ask what one view should enable.',
        critical: true,
      },
      {
        key: 'urgency',
        description:
          'The issue is becoming urgent because the company is planning a major expansion.',
        hint: 'Ask why expansion makes this urgent.',
        critical: true,
      },
    ],
  },
}

export function getPersonaCompletionConfig(
  personaId: string,
  fallbackInfoPoints: readonly string[] = []
): PersonaCompletionConfig {
  const configuredPersona = CURRENT_LEVEL_ONE_PERSONAS[personaId]

  if (configuredPersona) {
    return configuredPersona
  }

  // Future personas can operate from Firestore descriptions. Generated keys keep
  // free-form wording out of the completion decision and provide stable identifiers.
  return {
    personaId,
    infoPoints: fallbackInfoPoints.map((description, index) => ({
      key: `information_${index + 1}`,
      description,
      hint: 'Ask about their priorities.',
      critical: index < Math.min(4, fallbackInfoPoints.length),
    })),
  }
}

export function isExplicitConversationExit(message: string): boolean {
  // Exact matching is intentional: normal role-play goodbyes remain conversation
  // text, while this documented escape phrase works even during provider failure.
  return /^bye for now[.!?]*$/i.test(message.trim())
}

export function isPlayerWrappingUp(message: string): boolean {
  return /\b(clearer picture|enough (?:information|to work with)|great speaking|take (?:this|the) (?:information|details) back|wrap up|follow up with you)\b/i.test(
    message
  )
}

export function getContextualConversationHint({
  config,
  coveredInfoPoints,
  playerTurnCount,
}: {
  config: PersonaCompletionConfig
  coveredInfoPoints: readonly string[]
  playerTurnCount: number
}): string | undefined {
  // The client opens with "Hi!", so the first coaching step should establish the
  // consultant's role before directing the player into discovery questions.
  if (playerTurnCount === 0) {
    return 'Say hello and briefly introduce yourself.'
  }

  const covered = new Set(coveredInfoPoints)
  const missingPoints = config.infoPoints.filter((point) => !covered.has(point.key))

  if (missingPoints.length === 0) {
    return undefined
  }

  // Coverage normally advances the first missing topic. If the classifier misses
  // a valid answer, the turn offset still advances the prompt instead of showing
  // the same hint forever. Every returned string is authored for the active client.
  const hintIndex = Math.max(playerTurnCount - 1, 0) % missingPoints.length
  return missingPoints[hintIndex]?.hint
}

export function evaluateConversationCompletion({
  config,
  coveredInfoPoints,
  playerTurnCount,
  playerMessage,
}: {
  config: PersonaCompletionConfig
  coveredInfoPoints: readonly string[]
  playerTurnCount: number
  playerMessage: string
}): ConversationCompletionState {
  // Coverage is untrusted LLM output. Unknown keys and duplicates cannot inflate
  // progress or satisfy a persona's authored discovery requirements.
  const validKeys = new Set(config.infoPoints.map((point) => point.key))
  const covered = [...new Set(coveredInfoPoints)].filter((key) => validKeys.has(key))
  const coveredSet = new Set(covered)
  const missing = config.infoPoints
    .filter((point) => !coveredSet.has(point.key))
    .map((point) => point.key)
  const criticalCovered = config.infoPoints
    .filter((point) => point.critical)
    .every((point) => coveredSet.has(point.key))
  const coverageTarget = Math.min(REQUIRED_COVERAGE_COUNT, config.infoPoints.length)
  const coverageReady =
    config.infoPoints.length > 0 &&
    playerTurnCount >= MINIMUM_DISCOVERY_TURNS &&
    criticalCovered &&
    covered.length >= coverageTarget
  const explicitExit = isExplicitConversationExit(playerMessage)
  const reachedTurnLimit = playerTurnCount >= MAXIMUM_CONVERSATION_TURNS
  const completedAfterWrap = coverageReady && isPlayerWrappingUp(playerMessage)
  const conversationComplete = explicitExit || reachedTurnLimit || completedAfterWrap
  // READY_TO_WRAP remains distinct from COMPLETE: reaching the target offers a
  // closing reply, but the player must send it before the input becomes locked.
  const readyToClose =
    !conversationComplete && (coverageReady || playerTurnCount >= GUIDED_WRAP_TURN)

  let completionReason: CompletionReason | undefined
  if (explicitExit) completionReason = 'explicit-exit'
  else if (reachedTurnLimit) completionReason = 'turn-limit'
  else if (completedAfterWrap) completionReason = 'coverage-and-wrap-up'

  const hint = readyToClose
    ? 'You have enough information to assess this opportunity. Wrap up the conversation.'
    : getContextualConversationHint({
        config,
        coveredInfoPoints: covered,
        playerTurnCount,
      })

  return {
    coveredInfoPoints: covered,
    missingInfoPoints: missing,
    coverageReady,
    readyToClose,
    conversationComplete,
    completionReason,
    hint,
    suggestedClosingReply: readyToClose ? SUGGESTED_CLOSING_REPLY : undefined,
  }
}
