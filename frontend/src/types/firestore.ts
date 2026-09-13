import type { Timestamp } from 'firebase/firestore'

/**
 * Firestore collection type definitions.
 *
 * Keep in sync with:
 *   - src/lib/firebase/firestore.ts  (typed collection exports)
 *   - firebase/firestore.rules       (security rules)
 *   - docs/FIRESTORE-SCHEMA.md       (schema documentation)
 *
 * When adding a new collection, use the /firebase-collection skill.
 */

export interface UserProfile {
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
  role: 'user'
  createdAt: Timestamp
  updatedAt: Timestamp
  _schemaVersion: 1
}

export interface Note {
  id: string
  uid: string // owner's user id — used by security rules
  title: string
  body: string
  createdAt: Timestamp
  updatedAt: Timestamp
  _schemaVersion: 1 // every document carries this — see /evolve-schema
}

export interface Persona {
  id: string
  name: string
  level: 1 | 2

  jobTitle: string
  company: string
  industry: string

  coreProblem: string
  personality: string
  desiredOutcome: string

  budgetRange: string
  timeline: string
  decisionMaker: string

  requiredInfoPoints: string[]

  systemPrompt: string
  objections: string[]

  createdAt: Timestamp
  updatedAt: Timestamp
  _schemaVersion: 1
}

export interface ConsultingSession {
  id: string
  uid: string
  personaId: string
  level: 1 | 2
  status: 'active' | 'completed'
  leadScore?: number
  relationshipState?: 'cold' | 'warm' | 'qualified'
  messages: Array<{
    role: 'player' | 'persona'
    content: string
    createdAt: Timestamp
  }>
  createdAt: Timestamp
  updatedAt: Timestamp
  _schemaVersion: 1
}

export interface PortfolioProgress {
  id: string
  uid: string
  completedPersonaIds: string[]
  completedLevels: number[]
  totalXp: number
  createdAt: Timestamp
  updatedAt: Timestamp
  _schemaVersion: 1
}

export type CreateUserProfileInput = Omit<UserProfile, 'createdAt' | 'updatedAt'>
