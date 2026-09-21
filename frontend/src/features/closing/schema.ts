import { z } from 'zod'
import { MAX_ANSWER_LENGTH, MAX_CONCERN_ROUNDS } from './closing'

// Same key format the shared progress record uses (e.g. 'sarah').
const personaKey = z.string().regex(/^[a-z0-9-]{1,40}$/, 'Invalid client')

export const contractTermsSchema = z.object({
  scope: z
    .string()
    .trim()
    .min(20, 'Describe the agreed scope in a couple of sentences (at least 20 characters).')
    .max(1500, 'Keep the scope under 1,500 characters.'),
  investment: z
    .string()
    .trim()
    .min(1, 'Enter the final investment, for example $25,000 AUD.')
    .max(100, 'Keep the investment under 100 characters.'),
  startDate: z
    .string()
    .trim()
    .min(1, 'Enter the proposed start date.')
    .max(60, 'Keep the start date under 60 characters.'),
  paymentTerms: z
    .string()
    .trim()
    .min(1, 'Explain the payment terms.')
    .max(500, 'Keep the payment terms under 500 characters.'),
})

// One final concern raised by the client and the player's answer to it.
const exchange = z.object({
  concern: z.string().trim().min(1).max(700),
  answer: z
    .string()
    .trim()
    .min(1, 'Answer is required')
    .max(MAX_ANSWER_LENGTH, `Keep your answer under ${MAX_ANSWER_LENGTH} characters.`),
})

// Asks for the client's next concern. The history holds the rounds already
// answered (none on the first request), so the last round is never requested.
export const concernRequestSchema = z.object({
  personaKey,
  terms: contractTermsSchema,
  history: z.array(exchange).max(MAX_CONCERN_ROUNDS - 1),
})

// Sends the finished negotiation for scoring: every round must be answered.
export const finaliseRequestSchema = z.object({
  personaKey,
  terms: contractTermsSchema,
  exchanges: z.array(exchange).length(MAX_CONCERN_ROUNDS, 'Answer every final concern first.'),
})

export type ContractTerms = z.infer<typeof contractTermsSchema>
export type ClosingExchange = z.infer<typeof exchange>