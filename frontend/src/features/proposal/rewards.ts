import type { Performance, SkillDeltas } from '@/features/progress/progress'
import type { PersonaKey } from './personas'

export const PROPOSAL_STAGE_ID = 5

// Skill points when the client accepts the proposal (Level 5 doc, "Portfolio Stats").
const ACCEPTED_SKILL_DELTAS: Partial<Record<PersonaKey, SkillDeltas>> = {
  sarah: {
    clientDiscovery: 1,
    businessAcumen: 1,
    solutionDesign: 1,
    clientManagement: 1,
    dealSuccess: 1,
  },
  david: { clientManagement: 2, businessAcumen: 1, dealSuccess: 1 },
}

export function acceptedSkillDeltas(personaKey: PersonaKey): SkillDeltas | undefined {
  return ACCEPTED_SKILL_DELTAS[personaKey]
}

// Closing on the first round is a strong result; needing revisions is "developing".
export function performanceForRound(round: number): Performance {
  return round <= 1 ? 'strong' : 'developing'
}