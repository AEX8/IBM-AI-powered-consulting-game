/** Client-specific information and selectable meeting preparation options. */
export const preparationContent: Record<string, {
  name: string; industry: string; company: string; situation: string;
  stakeholders: string; objectives: string[]; questions: string[]
}> = {
  'test-level-1': {
    name: 'Sarah Chen', industry: 'Manufacturing', company: 'ACMD Manufacturing',
    situation: 'Supply-chain delays and disconnected operational data are causing missed delivery targets, customer compensation and manual reporting. Sarah wants better visibility without significantly disrupting existing systems.',
    stakeholders: 'Sarah is Chief Operating Officer. Supply chain, logistics, inventory, customer service, IT and finance teams rely on separate inventory/order systems and logistics spreadsheets.',
    objectives: [
      'Improve supply chain visibility and reduce delivery delays without significantly disrupting existing systems.',
      'Replace all existing operational systems with a new platform.',
      'Hire more staff to manually monitor orders and inventory.',
      'Develop an AI system to completely automate the supply chain.',
      'Focus on increasing production capacity to support future growth.',
    ],
    questions: [
      'Which parts of the supply chain currently have the least reliable or timely information?',
      "Why haven't your teams fixed these delivery delays already?",
      'How are delivery delays and manual reporting affecting customers and employees?',
      'What would better operational visibility allow your teams to identify or decide earlier?',
      'Would you like us to replace all your existing operational systems?',
      'What constraints should we consider to improve visibility without disrupting current operations?',
    ],
  },
  'test-level-2': {
    name: 'David Palte', industry: 'Retail', company: 'Meridian Retail Group',
    situation: 'Customer information is fragmented across stores, online, mobile and loyalty systems. Conflicting dashboards make customer value, churn and promotion analysis unreliable. David wants measurable value quickly, not a large transformation program.',
    stakeholders: 'David is Chief Technology Officer. Marketing, e-commerce, store operations, loyalty, data/analytics and a strong internal IT team need a shared customer view across existing platforms.',
    objectives: [
      'Create a reliable, integrated view of customer data across channels while delivering measurable value quickly.',
      "Replace Meridian's entire technology infrastructure with a new system.",
      'Build more dashboards for each individual business team.',
      'Use AI to predict which customers will stop purchasing.',
      'Reduce the size of the internal technology team by outsourcing data management.',
    ],
    questions: [
      'Which customer data sources are currently causing the biggest inconsistencies?',
      "Why haven't your internal developers been able to fix this already?",
      'How are inconsistent customer records affecting business decisions?',
      'What would a useful customer view need to allow your teams to do?',
      'Would you be interested in a two-year data transformation program?',
      'What would make an external consulting engagement worthwhile for your team?',
    ],
  },
}

export type PreparationSubmission = {
  personaId: string
  objectives: string[]
  questions: string[]
}

/** Grading service interface. A successful response must include
 * the saved submission ID, so a network failure cannot unlock the next room. */
export type PreparationResult = { submissionId: string; feedback: string }
export type GradePreparation = (submission: PreparationSubmission) => Promise<PreparationResult>
