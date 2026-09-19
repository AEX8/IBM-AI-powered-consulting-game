export const PERSONA_FALLBACK_MESSAGE =
  "Sorry, I'm having trouble responding right now. Please try speaking with me again."

export const DEFAULT_PERSONA_TIMEOUT_MS = 10_000

// Typed boundary between Phaser and the Next.js route. Success and fallback paths
// share one result shape, keeping transport details out of the scene controller.
export type PersonaConversationMessage = {
  role: 'player' | 'persona'
  content: string
}

export type PersonaReplyResult = {
  reply: string
  conversationComplete: boolean
  coveredInfoPoints: string[]
  missingInfoPoints: string[]
  coverageReady: boolean
  readyToClose: boolean
  hint?: string
  suggestedClosingReply?: string
  completionReason?: string
  usedFallback: boolean
  reason: 'success' | 'timeout' | 'network' | 'server' | 'invalid-response'
}
export type PersonaMeetingPrepContext = {
  selectedObjectives: string[]
  selectedQuestions: string[]
}

type RequestPersonaReplyOptions = {
  message: string
  personaId: string
  history?: PersonaConversationMessage[]
  coveredInfoPoints?: string[]
  timeoutMs?: number
  meetingPrep?: PersonaMeetingPrepContext
}

type PersonaApiBody = {
  reply?: unknown
  conversation_complete?: unknown
  covered_info_points?: unknown
  missing_info_points?: unknown
  coverage_ready?: unknown
  ready_to_close?: unknown
  conversation_hint?: unknown
  suggested_closing_reply?: unknown
  completion_reason?: unknown
}

export async function requestPersonaReply({
  message,
  personaId,
  history = [],
  coveredInfoPoints: priorCoveredInfoPoints = [],
  meetingPrep,
  timeoutMs = DEFAULT_PERSONA_TIMEOUT_MS,
}: RequestPersonaReplyOptions): Promise<PersonaReplyResult> {
  // Abort stalled providers so the game cannot leave its reply field disabled
  // indefinitely while waiting for a response that may never arrive.
  const controller = new AbortController()

  const timeout = globalThis.setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch('/api/persona/respond', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        persona_id: personaId,
        history,
        covered_info_points: priorCoveredInfoPoints,
        meeting_prep: meetingPrep,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      return fallbackResult('server')
    }

    let body: PersonaApiBody

    try {
      body = (await response.json()) as PersonaApiBody
    } catch {
      return fallbackResult('invalid-response')
    }

    if (typeof body.reply !== 'string' || body.reply.trim().length === 0) {
      return fallbackResult('invalid-response')
    }

    // TypeScript cannot guarantee deployed response data. Validate all optional
    // progression metadata before exposing it to the game controller.
    const coveredInfoPoints = Array.isArray(body.covered_info_points)
      ? body.covered_info_points.filter((item): item is string => typeof item === 'string')
      : []
    const missingInfoPoints = Array.isArray(body.missing_info_points)
      ? body.missing_info_points.filter((item): item is string => typeof item === 'string')
      : []

    return {
      reply: body.reply.trim(),
      conversationComplete: body.conversation_complete === true,
      coveredInfoPoints,
      missingInfoPoints,
      coverageReady: body.coverage_ready === true,
      readyToClose: body.ready_to_close === true,
      hint: typeof body.conversation_hint === 'string' ? body.conversation_hint : undefined,
      suggestedClosingReply:
        typeof body.suggested_closing_reply === 'string' ? body.suggested_closing_reply : undefined,
      completionReason:
        typeof body.completion_reason === 'string' ? body.completion_reason : undefined,
      usedFallback: false,
      reason: 'success',
    }
  } catch {
    return fallbackResult(controller.signal.aborted ? 'timeout' : 'network')
  } finally {
    globalThis.clearTimeout(timeout)
  }
}

function fallbackResult(
  reason: Exclude<PersonaReplyResult['reason'], 'success'>
): PersonaReplyResult {
  // A transport fallback never grants new progress or completion. Confirmed points
  // remain in the controller, whose turn-nine and turn-ten safety rules still apply.
  return {
    reply: PERSONA_FALLBACK_MESSAGE,
    conversationComplete: false,
    coveredInfoPoints: [],
    missingInfoPoints: [],
    coverageReady: false,
    readyToClose: false,
    usedFallback: true,
    reason,
  }
}
