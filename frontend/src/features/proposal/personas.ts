import type { EarlierMeetingNote } from './types'

export type PersonaKey = 'sarah' | 'david' | 'tom'

export type ProposalPersona = {
  key: PersonaKey
  name: string
  initials: string
  role: string
  company: string
  // Tom's correct move is to decline; used by the decline flow in Step C2.
  shouldPursue: boolean
  lesson?: string
  objectives: string[]
  earlierNotes: EarlierMeetingNote[]
}

export const ALL_PERSONA_KEYS: PersonaKey[] = ['sarah', 'david', 'tom']

export function isPersonaKey(value: string): value is PersonaKey {
  return (ALL_PERSONA_KEYS as string[]).includes(value)
}

const PERSONA_KEY_BY_NAME: Record<string, PersonaKey> = {
  'sarah chen': 'sarah',
  'david palte': 'david',
  'tom harris': 'tom',
}

export function personaKeyFromName(name: string): PersonaKey | null {
  return PERSONA_KEY_BY_NAME[name.trim().toLowerCase()] ?? null
}

export const PERSONAS: Record<PersonaKey, ProposalPersona> = {
  sarah: {
    key: 'sarah',
    name: 'Sarah Chen',
    initials: 'SC',
    role: 'Chief Operating Officer',
    company: 'ACMD Manufacturing',
    shouldPursue: true,
    objectives: [
      'Improve supply chain visibility',
      'Reduce delivery delays',
      'Reduce manual reporting',
    ],
    earlierNotes: [
      {
        id: 'sarah-objective',
        label: 'Meeting objective: improve supply chain visibility',
        category: 'Set meeting objectives',
        title: 'Improve supply chain visibility',
        detail:
          'You set this as the goal for the meeting. Sarah confirmed that inventory, orders and logistics live in separate systems and spreadsheets, so her team usually finds problems only after a delivery is already affected.',
        relatedObjectives: ['Reduce delivery delays', 'Reduce manual reporting'],
      },
      {
        id: 'sarah-priority',
        label: 'Client priority: avoid disrupting existing systems',
        category: 'Client priority',
        title: 'Avoid disrupting existing systems',
        detail:
          'Sarah does not want a long system replacement while customer demand is growing. She wants value early and a solution that works with what ACMD already runs.',
      },
      {
        id: 'sarah-impact',
        label: 'Impact: missed deliveries and customer compensation',
        category: 'Business impact',
        title: 'Missed deliveries and customer compensation',
        detail:
          'Delivery targets were missed several times this quarter and some customers required compensation. Staff also spend extra time manually checking information.',
      },
    ],
  },

  david: {
    key: 'david',
    name: 'David Palte',
    initials: 'DP',
    role: 'Chief Technology Officer',
    company: 'Meridian Retail Group',
    shouldPursue: true,
    objectives: [
      'Create one reliable view of the customer',
      'Reduce time spent reconciling data',
      'Demonstrate value quickly',
    ],
    earlierNotes: [
      {
        id: 'david-objective',
        label: 'Meeting objective: find out why customer data is inconsistent',
        category: 'Set meeting objectives',
        title: 'Find out why customer data is inconsistent',
        detail:
          'You set out to learn what is stopping Meridian from building one reliable customer view from the systems it already has. David explained that store, online, mobile, loyalty and marketing data all disagree.',
        relatedObjectives: ['Reduce time spent reconciling data', 'Demonstrate value quickly'],
      },
      {
        id: 'david-priority',
        label: 'Client priority: complement the internal tech team',
        category: 'Client priority',
        title: 'Complement the internal tech team',
        detail:
          'David already has a strong internal technology team. He is not looking for someone to simply build technology for him, so any engagement has to add something his team cannot easily do alone.',
      },
      {
        id: 'david-concern',
        label: 'Client concern: no two-year transformation',
        category: 'Client concern',
        title: 'No two-year transformation programme',
        detail:
          'David is sceptical of large consulting engagements. He wants a practical start that shows measurable value quickly, not technology that merely sounds impressive.',
      },
    ],
  },

  tom: {
    key: 'tom',
    name: 'Tom Harris',
    initials: 'TH',
    role: 'Team Manager',
    company: 'BrightTech',
    shouldPursue: false,
    lesson:
      'Not every problem is a consulting opportunity. A consultant should tell a genuine business problem apart from a minor workplace annoyance.',
    objectives: ['Reduce workplace noise'],
    earlierNotes: [
      {
        id: 'tom-objective',
        label: 'Meeting objective: check for a real business problem',
        category: 'Set meeting objectives',
        title: 'Check for a real business problem',
        detail:
          "You set out to find out whether the noisy keyboard is affecting the team's work, and whether anything else is holding the team back.",
      },
      {
        id: 'tom-impact',
        label: 'Business impact: none reported',
        category: 'Business impact',
        title: 'No measurable business impact',
        detail:
          'Tom confirmed team performance has not dropped. There is no customer, financial or strategic impact. The noise is simply irritating him.',
      },
      {
        id: 'tom-other',
        label: 'Other challenges: none identified',
        category: 'Client discovery',
        title: 'No other significant challenges',
        detail:
          'When you asked whether anything else was affecting his team, Tom could not name a significant operational or business challenge.',
      },
    ],
  },
}