import { z } from 'zod'
import { MAX_PLAYER_MESSAGES } from './meeting'

const personaId = z.string().regex(/^[A-Za-z0-9_-]{1,60}$/, 'Invalid client')

const message = z.object({
  role: z.enum(['player', 'client']),
  content: z.string().trim().min(1).max(700),
})

const prep = z
  .object({
    objectives: z.array(z.string().max(400)).max(3),
    questions: z.array(z.string().max(400)).max(3),
  })
  .optional()

// The client's opening line counts as a message, hence the +2 headroom.
const MAX_MESSAGES = MAX_PLAYER_MESSAGES * 2 + 2

export const replyRequestSchema = z.object({
  personaId,
  history: z.array(message).min(1).max(MAX_MESSAGES),
  message: z.string().trim().min(1, 'Message is required').max(200),
  prep,
})

export const scoreRequestSchema = z.object({
  personaId,
  transcript: z.array(message).min(2).max(MAX_MESSAGES),
  prep,
})
