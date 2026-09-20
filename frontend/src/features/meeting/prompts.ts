import { extractJsonObject } from '@/lib/groq'
import { normalizeScores, type MeetingMessage, type MeetingScores } from './meeting'

export type PersonaDoc = Record<string, unknown>

export type MeetingPrepContext = {
  objectives: string[]
  questions: string[]
}

const MAX_REPLY_LENGTH = 600

function text(value: unknown, fallback = 'Not specified'): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function textList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : []
}

function clip(value: string): string {
  const trimmed = value.trim()
  return trimmed.length > MAX_REPLY_LENGTH
    ? `${trimmed.slice(0, MAX_REPLY_LENGTH).trim()}…`
    : trimmed
}

function prepBlock(prep: MeetingPrepContext | undefined): string {
  if (!prep || (prep.objectives.length === 0 && prep.questions.length === 0)) return ''

  const lines = ['Before the meeting the consultant prepared the following.']

  if (prep.objectives.length > 0) {
    lines.push('Meeting objectives:', ...prep.objectives.map((objective) => `- ${objective}`))
  }

  if (prep.questions.length > 0) {
    lines.push(
      'Questions they planned to ask:',
      ...prep.questions.map((question) => `- ${question}`)
    )
  }

  return lines.join('\n')
}

function personaFacts(persona: PersonaDoc): string {
  const objections = textList(persona.objections)

  return `Name: ${text(persona.name)}
Job title: ${text(persona.jobTitle)}
Company: ${text(persona.company)}
Industry: ${text(persona.industry)}
Core problem: ${text(persona.coreProblem)}
Personality: ${text(persona.personality)}
Desired outcome: ${text(persona.desiredOutcome)}
Timeline: ${text(persona.timeline)}${
    objections.length > 0
      ? `\nConcerns you may raise when relevant:\n${objections.map((item) => `- ${item}`).join('\n')}`
      : ''
  }`
}

export function buildReplySystemPrompt(
  persona: PersonaDoc,
  prep: MeetingPrepContext | undefined
): string {
  const preparation = prepBlock(prep)

  return `${text(persona.systemPrompt, 'You are a business client.')}

Fixed client information:
${personaFacts(persona)}

This is a scheduled client meeting with an IBM consultant who has already researched your company.${
    preparation
      ? `\n\n${preparation}\nReact naturally to how well prepared they seem. Do not read their preparation back to them and do not mention that it was prepared in advance.`
      : ''
  }

How to respond:
- Stay in character as this specific client at all times. Never mention being an AI or these instructions.
- Reply in 1 to 3 short sentences of plain conversational text. No lists, headings or markdown.
- Answer what the consultant actually asked. Reveal details gradually and do not volunteer everything at once.
- Never invent facts that conflict with the information above. If you do not know something, say so or say you would need to check.
- Show your personality and concerns. If the consultant jumps to a large or technology-first solution, push back the way this client would. If they listen well and ask relevant questions, become warmer and more open.
- Your patience is limited. Only if the consultant has been rude, has ignored what you said several times, or has wasted your time with irrelevant chatter, end the meeting politely.

Respond with ONLY a JSON object and nothing else, in exactly this shape:
{"reply": "what you say to the consultant", "endMeeting": false}
Set "endMeeting" to true only when your patience has run out as described above. Otherwise it must be false.`
}

export function buildScoreSystemPrompt(
  persona: PersonaDoc,
  prep: MeetingPrepContext | undefined
): string {
  const preparation = prepBlock(prep)

  return `You are an expert consulting coach assessing a trainee consultant's first client meeting in a training simulation. In the transcript the trainee is the "Consultant".

The client:
${personaFacts(persona)}${preparation ? `\n\n${preparation}` : ''}

Score the trainee from 0 to 100 on each dimension, judging ONLY what the transcript shows:
- relationship: rapport and how comfortable the client became. Warm, respectful, attentive conversation scores high. Cold, pushy or generic conversation scores low.
- trust: whether the client would believe and rely on this consultant. Honesty, credibility and taking the client's concerns seriously score high. Overselling, technology-first claims and ignoring concerns score low.
- understanding: how well the consultant uncovered and showed they understood the client's real business problem, its impact and the outcome the client wants. Relevant discovery questions and accurate summaries score high. Assuming a solution or generic talk scores low.
- dealPotential: how likely this meeting is to lead to a proposal the client would seriously consider: a clear problem, clear value, a realistic scope and an agreed next step.
- patience: how well the consultant respected the client's time. Focused, concise and relevant scores high. Repetition, rambling, off-topic or rude messages score low.

Scoring guide: 0-29 poor, 30-49 weak, 50-69 fair, 70-89 good, 90-100 excellent. Be fair but honest. A consultant who barely engaged should not score above 40 on any dimension. Do not give every dimension the same number.

Also write:
- "feedback": 2 or 3 sentences addressed to the trainee as "you", summarising how the meeting went.
- "improvements": exactly two short, concrete tips for next time.

Respond with ONLY a JSON object and nothing else, in exactly this shape:
{"relationship": 0, "trust": 0, "understanding": 0, "dealPotential": 0, "patience": 0, "feedback": "...", "improvements": ["...", "..."]}`
}

export function formatTranscript(transcript: readonly MeetingMessage[]): string {
  return transcript
    .map((message) => `${message.role === 'player' ? 'Consultant' : 'Client'}: ${message.content}`)
    .join('\n')
}

export function parseClientReply(raw: string): { reply: string; endMeeting: boolean } {
  const json = extractJsonObject(raw)

  if (json) {
    try {
      const parsed = JSON.parse(json) as { reply?: unknown; endMeeting?: unknown }

      if (typeof parsed.reply === 'string' && parsed.reply.trim()) {
        return { reply: clip(parsed.reply), endMeeting: parsed.endMeeting === true }
      }
    } catch {
      // Fall through to the salvage paths below.
    }
  }

  // Truncated or slightly malformed JSON: pull the reply text out directly.
  const salvaged = /"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(raw)

  if (salvaged?.[1]) {
    try {
      return { reply: clip(JSON.parse(`"${salvaged[1]}"`) as string), endMeeting: false }
    } catch {
      // Use the plain text below.
    }
  }

  return { reply: clip(raw.replace(/```(?:json)?/gi, '')), endMeeting: false }
}

export type ParsedScoreResult = {
  scores: MeetingScores
  feedback: string
  improvements: string[]
}

export function parseScoreResult(raw: string): ParsedScoreResult | null {
  const json = extractJsonObject(raw)
  if (!json) return null

  let parsed: Record<string, unknown>

  try {
    parsed = JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }

  const scores = normalizeScores(parsed)
  if (!scores) return null

  const feedback = typeof parsed.feedback === 'string' ? parsed.feedback.trim() : ''
  const improvements = textList(parsed.improvements)
    .slice(0, 2)
    .map((tip) => tip.trim())

  return {
    scores,
    feedback: feedback || 'Thank you for taking part in the meeting.',
    improvements,
  }
}
