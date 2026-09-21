import { normalizeScores, overallScore, type ClosingScores, type ContractOutcome } from './closing'

export type ContractSummary = {
  id: string
  personaKey: string
  outcome: ContractOutcome
  overall: number
  scores: ClosingScores
  feedback: string
  improvements: string[]
  closingLine: string
  terms: {
    scope: string
    investment: string
    startDate: string
    paymentTerms: string
  }
  createdAt: number // milliseconds since 1970
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function textList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : []
}

function isOutcome(value: unknown): value is ContractOutcome {
  return value === 'signed' || value === 'stalled' || value === 'lost'
}

// Firestore Timestamps expose toMillis(); anything else counts as "no date".
function toMillis(value: unknown): number {
  const candidate = toRecord(value).toMillis

  return typeof candidate === 'function' ? Number((candidate as () => number).call(value)) || 0 : 0
}

// A stored contract is shaped defensively: a malformed document is skipped (null)
// rather than breaking the whole list, and private fields are never copied over.
export function toContractSummary(id: string, raw: unknown): ContractSummary | null {
  const source = toRecord(raw)
  const scores = normalizeScores(source.scores)

  if (!id || !isOutcome(source.outcome) || !scores) return null

  const terms = toRecord(source.terms)

  return {
    id,
    personaKey: text(source.personaKey),
    outcome: source.outcome,
    overall:
      typeof source.overall === 'number' && Number.isFinite(source.overall)
        ? source.overall
        : overallScore(scores),
    scores,
    feedback: text(source.feedback),
    improvements: textList(source.improvements),
    closingLine: text(source.closingLine),
    terms: {
      scope: text(terms.scope),
      investment: text(terms.investment),
      startDate: text(terms.startDate),
      paymentTerms: text(terms.paymentTerms),
    },
    createdAt: toMillis(source.createdAt),
  }
}