import {
  MAX_FREE_MESSAGE_LENGTH,
  MEETING_OPENING_CHOICES,
  SCORE_KEYS,
  SCORE_LABELS,
  canEndMeeting,
  countPlayerMessages,
  meetingIsOver,
  normalizeScores,
  type MeetingMessage,
  type MeetingScores,
} from './meeting'
import type { MeetingPrepContext } from './prompts'

const REPLY_TIMEOUT_MS = 30_000
const SCORE_TIMEOUT_MS = 60_000

export type MeetingOverlayClient = {
  name: string
  personaId: string
  portrait: string
  opening: string
}

export type MeetingOverlayOptions = {
  client: MeetingOverlayClient
  getPrep: () => MeetingPrepContext | undefined
  onClose: () => void
}

export type MeetingOverlayHandle = {
  destroy: () => void
}

type Mode = 'choice' | 'free' | 'ended' | 'scoring' | 'feedback'

type MeetingResult = {
  scores: MeetingScores
  overall: number
  passed: boolean
  feedback: string
  improvements: string[]
  xpAwarded: number
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    }
    return entities[character] ?? character
  })
}

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const message = (data as { error?: unknown }).error
    if (typeof message === 'string' && message.trim()) return message
  }

  return fallback
}

async function postJson(
  url: string,
  body: unknown,
  timeoutMs: number
): Promise<{ ok: boolean; data: unknown }> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const data: unknown = await response.json().catch(() => null)

    return { ok: response.ok, data }
  } finally {
    window.clearTimeout(timer)
  }
}

// The server response is validated again here rather than trusted.
function toMeetingResult(data: unknown): MeetingResult | null {
  if (!data || typeof data !== 'object') return null

  const source = data as Record<string, unknown>
  const scores = normalizeScores(source.scores)

  if (!scores || typeof source.overall !== 'number' || typeof source.passed !== 'boolean') {
    return null
  }

  return {
    scores,
    overall: Math.round(source.overall),
    passed: source.passed,
    feedback: typeof source.feedback === 'string' ? source.feedback : '',
    improvements: Array.isArray(source.improvements)
      ? source.improvements.filter((tip): tip is string => typeof tip === 'string')
      : [],
    xpAwarded: typeof source.xpAwarded === 'number' ? source.xpAwarded : 0,
  }
}

function meterClass(score: number): string {
  return score >= 70 ? 'good' : score >= 50 ? 'fair' : 'low'
}

/**
 * The Level 4 conversation panel. A native fixed overlay is used because Phaser's DOM
 * container inherits the canvas camera transform, which would distort this panel.
 */
export function openMeetingOverlay(options: MeetingOverlayOptions): MeetingOverlayHandle {
  const { client } = options

  const root = document.createElement('div')
  root.dataset.levelFourMeeting = 'true'
  root.className = 'l4-viewport-overlay'
  document.body.appendChild(root)

  let messages: MeetingMessage[] = [{ role: 'client', content: client.opening }]
  let mode: Mode = 'choice'
  let busy = false
  let replyError = ''
  let pendingMessage = ''
  let scoreError = ''
  let result: MeetingResult | null = null
  let destroyed = false

  function portraitFor(role: MeetingMessage['role']): string {
    return `/assets/characters/npcs/${role === 'client' ? client.portrait : 'character-03.png'}`
  }

  function transcriptHtml(): string {
    const bubbles = messages
      .map(
        (message) =>
          `<div class="l4-message ${message.role}"><img src="${escapeHtml(portraitFor(message.role))}" alt=""><p>${escapeHtml(message.content)}</p></div>`
      )
      .join('')

    const typing =
      busy && mode !== 'scoring'
        ? `<div class="l4-message client"><img src="${escapeHtml(portraitFor('client'))}" alt=""><p class="l4-typing" aria-label="${escapeHtml(client.name)} is typing"><i></i><i></i><i></i></p></div>`
        : ''

    return bubbles + typing
  }

  function controlsHtml(): string {
    if (!client.personaId) {
      return `<div class="l4-notice"><p>This client is not available for a live meeting yet.</p><button data-close-meeting>Back to Office</button></div>`
    }

    if (mode === 'scoring') {
      return scoreError
        ? `<div class="l4-error" role="alert"><p>${escapeHtml(scoreError)}</p><button data-retry-score>Try again</button></div>`
        : `<div class="l4-notice" role="status"><div class="l4-spinner"></div><p>Assessing your meeting…</p></div>`
    }

    if (replyError) {
      return `<div class="l4-error" role="alert"><p>${escapeHtml(replyError)}</p><button data-retry>Try again</button></div>`
    }

    if (mode === 'ended') {
      return `<div class="l4-notice"><p>The meeting has come to an end.</p><button data-score>See your feedback</button></div>`
    }

    if (mode === 'choice') {
      return `<div class="l4-choices">${MEETING_OPENING_CHOICES.map(
        (choice, index) =>
          `<button data-choice="${index}" ${busy ? 'disabled' : ''}>${index + 1}. ${escapeHtml(choice)}</button>`
      ).join('')}</div>`
    }

    const showEnd = canEndMeeting(countPlayerMessages(messages))

    return `<div class="l4-compose"><textarea maxlength="${MAX_FREE_MESSAGE_LENGTH}" data-reply placeholder="Type your response…" ${busy ? 'disabled' : ''}></textarea><span data-count>${MAX_FREE_MESSAGE_LENGTH} characters remaining</span><button data-send aria-label="Send response" ${busy ? 'disabled' : ''}>➜</button>${showEnd ? `<button class="l4-end" data-end ${busy ? 'disabled' : ''}>End meeting</button>` : ''}</div>`
  }

  function feedbackHtml(meeting: MeetingResult): string {
    const meters = SCORE_KEYS.map(
      (key) =>
        `<div class="l4-row"><span>${SCORE_LABELS[key]}</span><b>${meeting.scores[key]}</b></div><div class="l4-meter ${meterClass(meeting.scores[key])}"><i style="width:${meeting.scores[key]}%"></i></div>`
    ).join('')

    const tips = meeting.improvements.length
      ? `<h3>To improve</h3><ul>${meeting.improvements.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')}</ul>`
      : ''

    const verdict = meeting.passed
      ? 'Level complete. The client is keen to see a proposal.'
      : 'Not quite yet. The client would like to reschedule.'

    const xp = meeting.xpAwarded > 0 ? `<span class="l4-xp">+${meeting.xpAwarded} XP</span>` : ''

    const actions = meeting.passed
      ? `<button data-lobby>Return to lobby →</button><button class="secondary" data-close-meeting>Back to Office</button>`
      : `<button data-restart>Try again</button><button class="secondary" data-close-meeting>Back to Office</button>`

    return `<div class="l4-feedback"><div class="l4-feedback-head">Meeting Feedback</div><div class="l4-feedback-body"><div class="l4-summary"><div class="l4-score">${meeting.overall}</div><div><p class="l4-verdict ${meeting.passed ? 'pass' : 'fail'}">${verdict}</p>${xp}</div></div>${meters}<h3>Meeting summary</h3><p>${escapeHtml(meeting.feedback)}</p>${tips}<div class="l4-actions">${actions}</div></div></div>`
  }

  function render(): void {
    if (destroyed) return

    const body =
      mode === 'feedback' && result
        ? feedbackHtml(result)
        : `<header class="l4-head">${escapeHtml(client.name)}</header><div class="l4-transcript" data-transcript>${transcriptHtml()}</div><div class="l4-controls">${controlsHtml()}</div>`

    root.innerHTML = `
        <style>${STYLES}</style>
        <div class="l4-shell">
          <section class="l4-panel">
            <button class="l4-close" data-close aria-label="Close meeting">×</button>
            ${body}
          </section>
        </div>`

    bind()

    const transcriptNode = root.querySelector<HTMLElement>('[data-transcript]')
    if (transcriptNode) transcriptNode.scrollTop = transcriptNode.scrollHeight

    if (mode === 'free' && !busy && !replyError) {
      root.querySelector<HTMLTextAreaElement>('[data-reply]')?.focus()
    }
  }

  function bind(): void {
    root.querySelector('[data-close]')?.addEventListener('click', () => options.onClose())

    root.querySelectorAll('[data-close-meeting]').forEach((button) => {
      button.addEventListener('click', () => options.onClose())
    })

    root.querySelectorAll<HTMLElement>('[data-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        const selected = Number(button.dataset.choice)
        void sendPlayerMessage(MEETING_OPENING_CHOICES[selected] ?? MEETING_OPENING_CHOICES[0])
      })
    })

    const reply = root.querySelector<HTMLTextAreaElement>('[data-reply]')
    const count = root.querySelector<HTMLElement>('[data-count]')

    // Keys typed into the reply box must not reach Phaser's movement controls.
    for (const eventName of ['keydown', 'keyup'] as const) {
      reply?.addEventListener(eventName, (event) => event.stopPropagation())
    }

    reply?.addEventListener('input', () => {
      if (count) {
        count.textContent = `${MAX_FREE_MESSAGE_LENGTH - reply.value.length} characters remaining`
      }
    })

    reply?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        void sendPlayerMessage(reply.value)
      }
    })

    root.querySelector('[data-send]')?.addEventListener('click', () => {
      void sendPlayerMessage(reply?.value ?? '')
    })

    root.querySelector('[data-retry]')?.addEventListener('click', () => {
      void sendPlayerMessage(pendingMessage)
    })

    root.querySelector('[data-end]')?.addEventListener('click', () => void requestScore())
    root.querySelector('[data-score]')?.addEventListener('click', () => void requestScore())
    root.querySelector('[data-retry-score]')?.addEventListener('click', () => void requestScore())
    root.querySelector('[data-restart]')?.addEventListener('click', () => restart())
    root.querySelector('[data-lobby]')?.addEventListener('click', () => {
      window.location.assign('/dashboard')
    })
  }

  async function sendPlayerMessage(text: string): Promise<void> {
    const message = text.trim()
    if (!message || busy || destroyed) return

    replyError = ''
    pendingMessage = ''
    messages = [...messages, { role: 'player', content: message }]
    busy = true
    render()

    try {
      const history = messages.slice(0, -1)
      const { ok, data } = await postJson(
        '/api/meeting/reply',
        { personaId: client.personaId, history, message, prep: options.getPrep() },
        REPLY_TIMEOUT_MS
      )

      if (destroyed) return

      const source = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}

      if (!ok || typeof source.reply !== 'string' || !source.reply.trim()) {
        throw new Error('No reply')
      }

      messages = [...messages, { role: 'client', content: source.reply }]
      mode =
        source.endMeeting === true || meetingIsOver(countPlayerMessages(messages))
          ? 'ended'
          : 'free'
    } catch {
      if (destroyed) return

      // Take the unanswered message back out so a retry does not duplicate it.
      messages = messages.slice(0, -1)
      pendingMessage = message
      replyError = "The client couldn't respond just now. Please try again."
    } finally {
      if (!destroyed) {
        busy = false
        render()
      }
    }
  }

  async function requestScore(): Promise<void> {
    if (busy || destroyed) return

    mode = 'scoring'
    scoreError = ''
    busy = true
    render()

    try {
      const { ok, data } = await postJson(
        '/api/meeting/score',
        { personaId: client.personaId, transcript: messages, prep: options.getPrep() },
        SCORE_TIMEOUT_MS
      )

      if (destroyed) return

      if (!ok) throw new Error(errorMessage(data, 'The meeting could not be assessed.'))

      const parsed = toMeetingResult(data)
      if (!parsed) throw new Error('The meeting could not be assessed.')

      result = parsed
      mode = 'feedback'
    } catch (error) {
      if (destroyed) return

      scoreError =
        error instanceof Error && error.name === 'AbortError'
          ? 'The assessment took too long. Please try again.'
          : error instanceof Error && error.message
            ? error.message
            : 'The meeting could not be assessed.'
    } finally {
      if (!destroyed) {
        busy = false
        render()
      }
    }
  }

  function restart(): void {
    messages = [{ role: 'client', content: client.opening }]
    mode = 'choice'
    busy = false
    replyError = ''
    pendingMessage = ''
    scoreError = ''
    result = null
    render()
  }

  render()

  return {
    destroy: () => {
      destroyed = true
      root.remove()
    },
  }
}

const STYLES = `
    .l4-viewport-overlay{position:fixed;z-index:9999;top:18px;right:18px;width:min(650px,46vw);height:calc(100vh - 36px)}
    .l4-shell,.l4-shell *{box-sizing:border-box}.l4-shell{width:100%;height:100%;padding:10px;background:#d0e2ff;border:7px solid #2c2c2a;border-radius:18px;font-family:Arial,sans-serif;color:#2c2c2a;box-shadow:0 20px 48px #0008;animation:l4-open .45s cubic-bezier(.2,.9,.3,1.2)}
    .l4-panel{position:relative;display:flex;height:100%;min-height:0;flex-direction:column;overflow:hidden;border:5px solid #2c2c2a;border-radius:14px;background:#f4f7f9}.l4-head{height:92px;flex:0 0 92px;display:grid;place-items:center;background:#d0e2ff;border-bottom:5px solid #2c2c2a;font-size:27px;font-weight:800}.l4-close{position:absolute;right:15px;top:16px;z-index:4;width:48px;height:48px;border:4px solid #2c2c2a;border-radius:50%;background:#fff;font-size:28px;cursor:pointer;transition:.18s}.l4-close:hover{transform:rotate(90deg) scale(1.08)}
    .l4-transcript{min-height:0;flex:1;overflow-y:auto;padding:22px}.l4-message{display:flex;gap:12px;align-items:flex-start;margin:0 0 16px}.l4-message.player{flex-direction:row-reverse}.l4-message img{width:54px;height:54px;border:3px solid #2c2c2a;border-radius:50%;background:#fff;object-fit:contain}.l4-message p{max-width:380px;margin:0;border:2px solid #9ba4aa;border-radius:14px;background:#fff;padding:13px 15px;font-size:16px;line-height:1.38}.l4-message.player p{border-color:#78a9ff;background:#edf5ff}
    .l4-typing{display:flex;gap:6px;align-items:center;min-height:24px}.l4-typing i{width:9px;height:9px;border-radius:50%;background:#9ba4aa;animation:l4-dot 1s infinite ease-in-out}.l4-typing i:nth-child(2){animation-delay:.15s}.l4-typing i:nth-child(3){animation-delay:.3s}
    .l4-controls{flex:0 0 auto;padding:14px 18px 18px}.l4-choices{display:grid;gap:8px;border:3px solid #78a9ff;border-radius:15px;background:#edf5ff;padding:10px}.l4-choices button{border:3px solid #2c2c2a;border-radius:11px;background:#002d9c;padding:12px 15px;color:#fff;text-align:left;font-size:14px;font-weight:700;cursor:pointer;transition:.16s}.l4-choices button:not(:disabled):hover{transform:translateX(5px);filter:brightness(1.08)}.l4-choices button:disabled{opacity:.5;cursor:not-allowed}
    .l4-compose{position:relative;display:grid;grid-template-columns:1fr 62px;gap:9px}.l4-compose textarea{height:82px;border:3px solid #a6c8ff;border-radius:13px;padding:12px 14px;font:16px Arial;resize:none}.l4-compose textarea:disabled{background:#eee}.l4-compose [data-count]{position:absolute;left:6px;top:87px;color:#777;font-size:12px}.l4-compose [data-send]{border:4px solid #2c2c2a;border-radius:13px;background:#002d9c;color:#fff;font-size:28px;cursor:pointer}.l4-compose [data-send]:disabled{opacity:.5;cursor:not-allowed}.l4-end{grid-column:1/-1;margin-top:15px;border:3px solid #2c2c2a;border-radius:10px;background:#002d9c;padding:10px;color:#fff;font-weight:700;cursor:pointer}.l4-end:disabled{opacity:.5;cursor:not-allowed}
    .l4-notice,.l4-error{display:grid;gap:12px;justify-items:start;border:3px solid #78a9ff;border-radius:15px;background:#edf5ff;padding:16px}.l4-error{border-color:#b5533c;background:#fdeeea}.l4-notice p,.l4-error p{margin:0;font-size:15px;line-height:1.4}.l4-notice button,.l4-error button{border:3px solid #2c2c2a;border-radius:10px;background:#002d9c;padding:10px 18px;color:#fff;font-weight:800;cursor:pointer}
    .l4-spinner{width:26px;height:26px;border:4px solid #d5d1c8;border-top-color:#002d9c;border-radius:50%;animation:l4-spin .8s linear infinite}
    .l4-feedback{position:absolute;inset:0;display:flex;flex-direction:column;background:#f4f7f9}.l4-feedback-head{flex:0 0 90px;display:grid;place-items:center;background:#d0e2ff;border-bottom:5px solid #2c2c2a;color:#fff;font-size:27px;font-weight:800}.l4-feedback-body{flex:1;min-height:0;overflow-y:auto;padding:22px 30px 26px}
    .l4-summary{display:flex;align-items:center;gap:20px;margin-bottom:8px}.l4-score{display:grid;flex:0 0 112px;width:112px;height:112px;place-items:center;border:6px solid #2c2c2a;border-radius:50%;background:#fff;font-size:44px;font-weight:900;animation:l4-score .7s ease-out}.l4-verdict{margin:0 0 8px;font-size:17px;font-weight:800;line-height:1.35}.l4-verdict.pass{color:#002d9c}.l4-verdict.fail{color:#9b442f}.l4-xp{display:inline-block;border:3px solid #2c2c2a;border-radius:20px;background:#edf5ff;padding:3px 12px;font-weight:800}
    .l4-row{display:flex;justify-content:space-between;margin:12px 0 4px;font-size:15px;font-weight:700}.l4-meter{height:20px;border-radius:14px;background:#d5d1c8;overflow:hidden}.l4-meter i{display:block;height:100%;animation:l4-meter 1s ease-out}.l4-meter.good i{background:#002d9c}.l4-meter.fair i{background:#a6c8ff}.l4-meter.low i{background:#b5533c}
    .l4-feedback h3{margin:20px 0 6px}.l4-feedback p{font-size:16px;line-height:1.5}.l4-feedback ul{margin:0;padding-left:20px;font-size:16px;line-height:1.5}
    .l4-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}.l4-actions button{border:4px solid #2c2c2a;border-radius:11px;background:#002d9c;padding:12px 22px;color:#fff;font-size:16px;font-weight:800;box-shadow:4px 4px 0 #2c2c2a;cursor:pointer}.l4-actions button.secondary{background:#fff;color:#2c2c2a}
    .l4-shell{background:#edf5ff;border-color:#a6c8ff;box-shadow:0 20px 48px #a6c8ff88}
    .l4-panel,.l4-feedback{background:#fff}.l4-panel{border-color:#a6c8ff}
    .l4-head,.l4-feedback-head{background:#d0e2ff;border-bottom-color:#a6c8ff;color:#001d6c}
    .l4-choices,.l4-notice,.l4-message.player p,.l4-score,.l4-xp{border-color:#a6c8ff}
    @keyframes l4-open{from{opacity:0;transform:translateX(90px)}to{opacity:1;transform:none}}@keyframes l4-score{from{transform:scale(.2) rotate(-30deg)}}@keyframes l4-meter{from{width:0}}@keyframes l4-dot{0%,80%,100%{transform:scale(.6);opacity:.5}40%{transform:scale(1);opacity:1}}@keyframes l4-spin{to{transform:rotate(360deg)}}
    @media(prefers-reduced-motion:reduce){.l4-shell *{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}}
  `
