export type PrepQuestion = {
  id: string
  text: string
  strength: 'strong' | 'poor' | 'neutral'
  reason?: string
}

export type PrepObjective = {
  text: string
  isCorrect: boolean
}

export type MeetingPrepClientContent = {
  personaId?: string
  name: string
  role: string
  company: string
  industry: string
  companyStage?: string
  leadDifficulty: string

  companyOverview: string[]
  businessChallenge: string
  currentSituation: string[]
  businessImpact: string[]

  stakeholders: string[]
  priorities: string[]
  concerns: string[]
  desiredOutcome: string[]
  potentialBusinessValue: string[]

  ibmFit: string
  potentialIbmAreas: string[]
  consultantNotes: {
    keyProblem: string
    underlyingIssue: string
    impact: string
    urgency: string
    decisionMakerAccess?: string
    potentialEngagement?: string
    discoveryQuestion?: string
  }

  objectives: PrepObjective[]
  bestObjective: string

  questions: PrepQuestion[]
  bestQuestion?: string

  pursueRule?: {
    shouldPursue: boolean
    correctReason: string
  }
}

export const SCORING_CRITERIA = {
  problem: {
    label: 'Problem',
    maxScore: 2,
    description: "Did the player focus on the client's actual business problem?",
    scores: {
      2: 'Clearly identifies the real problem',
      1: 'Identifies something related but misses the underlying issue',
      0: 'Focuses on an irrelevant issue or assumes a problem',
    },
  },

  value: {
    label: 'Value',
    maxScore: 2,
    description:
      'Does the objective/question help establish the business value of solving the problem?',
    scores: {
      2: 'Connects to measurable business impact',
      1: 'Relevant but value is unclear',
      0: 'No meaningful business value',
    },
  },

  fit: {
    label: 'Fit',
    maxScore: 2,
    description:
      'Does it consider whether the opportunity is appropriate for IBM consulting?',
    scores: {
      2: "Realistic consulting opportunity and doesn't jump to a solution",
      1: 'Potentially relevant but makes assumptions',
      0: 'Clearly inappropriate or jumps straight to selling technology',
    },
  },
} as const

export const SCORE_RESULTS = {
  strong: {
    min: 5,
    max: 6,
    label: 'Strong',
  },
  developing: {
    min: 3,
    max: 4,
    label: 'Developing',
  },
  needsImprovement: {
    min: 0,
    max: 2,
    label: 'Needs improvement',
  },
} as const

export const MEETING_PREP_CLIENTS: MeetingPrepClientContent[] = [
  {
    personaId: 'test-level1-1',
    name: 'Sarah Chen',
    role: 'Chief Operating Officer',
    company: 'ACMD Manufacturing',
    industry: 'Manufacturing',
    companyStage: 'High-growth / expanding',
    leadDifficulty: 'Easy',

    companyOverview: [
      'ACMD Manufacturing is a growing manufacturing company that has recently secured several large customers.',
      "The increase in demand has placed pressure on the company's existing operational processes.",
      'The company currently relies on multiple systems and manual processes to manage inventory, orders and logistics.',
      'As the business grows, these systems are becoming increasingly difficult to manage effectively.',
    ],

    businessChallenge:
      'ACMD Manufacturing is experiencing supply chain delays and poor operational visibility.',

    currentSituation: [
      'Inventory information is stored in one system.',
      'Order information is managed separately.',
      'Logistics information is maintained using spreadsheets.',
      'Different teams often have different versions of operational data.',
      'Employees rely heavily on manual reporting.',
      'Additional staff have been assigned to monitor and resolve issues.',
      'Problems are often identified reactively rather than proactively.',
    ],

    businessImpact: [
      'Delivery targets have been missed several times this quarter.',
      'Some customers have required compensation.',
      'Employees are spending additional time manually checking information.',
      'Operational problems are becoming more difficult to identify as the company grows.',
      "Existing processes may not be able to support the company's expected growth.",
    ],

    stakeholders: [
      'Sarah Chen — Chief Operating Officer',
      'Supply chain managers',
      'Logistics team',
      'Warehouse / inventory staff',
      'Customer service team',
      'IT team',
      'Finance team',
      'Senior management',
    ],

    priorities: [
      'Improve visibility across the supply chain.',
      'Identify operational problems earlier.',
      'Reduce delivery delays.',
      'Support continued business growth.',
      'Avoid significant disruption to existing operations.',
    ],

    concerns: [
      "Sarah is concerned about replacing the company's existing technology.",
      'She does not want the business to spend a long period replacing systems while customer demand is increasing.',
      'Any proposed approach needs to consider existing systems, implementation disruption, cost, time to deliver value and integration with current processes.',
    ],

    desiredOutcome: [
      'Better visibility across operations without completely replacing existing systems.',
      'A more reliable view of supply chain information.',
      'Help employees identify potential problems earlier.',
    ],

    potentialBusinessValue: [
      'Reduce delivery delays.',
      'Reduce customer compensation costs.',
      'Reduce manual reporting.',
      'Improve operational visibility.',
      'Help employees identify problems earlier.',
      'Provide a more scalable operational process.',
    ],

    ibmFit: 'High',

    potentialIbmAreas: [
      'Data integration',
      'Supply chain optimisation',
      'Business intelligence',
      'Process improvement',
      'Data analytics',
      'Systems integration',
    ],

    consultantNotes: {
      keyProblem: 'Supply chain visibility',
      underlyingIssue: 'Disconnected operational data',
      impact: 'Missed delivery targets, customer impact and manual work',
      urgency: 'High',
      decisionMakerAccess: 'High',
      potentialEngagement: 'High',
      discoveryQuestion:
        'How could ACMD improve operational visibility while minimising disruption to its existing systems?',
    },

    objectives: [
      {
        text: 'Improve supply chain visibility and reduce delivery delays without significantly disrupting existing systems.',
        isCorrect: true,
      },
      {
        text: 'Replace all existing operational systems with a new platform.',
        isCorrect: false,
      },
      {
        text: 'Hire more staff to manually monitor orders and inventory.',
        isCorrect: false,
      },
      {
        text: 'Develop an AI system to completely automate the supply chain.',
        isCorrect: false,
      },
      {
        text: 'Focus on increasing production capacity to support future growth.',
        isCorrect: false,
      },
    ],

    bestObjective:
      'Improve supply chain visibility and reduce delivery delays without significantly disrupting existing systems.',

    // Fatima's supplied file does not include Sarah question options.
    questions: [],
  },

  {
    personaId: 'test-level1-2',
    name: 'David Palte',
    role: 'Chief Technology Officer',
    company: 'Meridian Retail Group',
    industry: 'Retail',
    companyStage: 'Expanding',
    leadDifficulty: 'Medium',

    companyOverview: [
      'Meridian Retail Group operates across physical stores, online shopping, mobile platforms and loyalty programs.',
      'The company has invested heavily in technology, but customer information remains fragmented across different platforms.',
    ],

    businessChallenge:
      'Meridian has no single reliable view of its customers.',

    currentSituation: [
      'Customer data is distributed across physical stores.',
      'Customer data is distributed across online platforms.',
      'Customer data is distributed across mobile applications.',
      'Customer data is distributed across loyalty systems.',
      'Customer data is distributed across marketing platforms.',
      'Different teams have different views of the same customer.',
      'Existing dashboards have not solved the underlying data inconsistencies.',
    ],

    businessImpact: [
      'Meridian struggles to identify which customers are most valuable.',
      'It is difficult to determine why customers stop purchasing.',
      'It is difficult to determine whether promotions are effective across channels.',
      'Teams spend significant time validating and reconciling conflicting data.',
      'Business teams frequently require help from the technology team to interpret data.',
    ],

    stakeholders: [
      'David Palte — Chief Technology Officer',
      'Marketing',
      'E-commerce',
      'Store operations',
      'Loyalty team',
      'Data / analytics team',
      'IT team',
      'Senior management',
    ],

    priorities: [
      'Establish a reliable view of customer information.',
      'Make customer data more accessible to business teams.',
      'Reduce dependence on the IT team for basic analysis.',
      "Support the company's planned expansion.",
      'Demonstrate practical business value quickly.',
    ],

    concerns: [
      'David is highly sceptical of large consulting engagements.',
      'He does not want an unnecessarily large transformation program.',
      'He does not want a two-year implementation without demonstrated value.',
      'He does not want technology introduced simply because it sounds impressive.',
      'He does not want consultants duplicating capabilities already available internally.',
    ],

    desiredOutcome: [
      'One reliable view of the customer.',
      'Business teams should be able to use customer information without constantly relying on the technology team.',
      'The approach should demonstrate value relatively quickly.',
    ],

    potentialBusinessValue: [
      'Improve marketing decisions.',
      'Improve customer understanding.',
      'Reduce duplicated analysis.',
      'Reduce time spent reconciling data.',
      'Improve cross-channel customer experiences.',
      'Create a stronger foundation for future expansion.',
    ],

    ibmFit: 'High',

    potentialIbmAreas: [
      'Data integration',
      'Data architecture',
      'Customer data platforms',
      'Analytics',
      'Data governance',
      'Systems integration',
    ],

    consultantNotes: {
      keyProblem: 'Fragmented customer data',
      underlyingIssue: 'Disconnected systems and inconsistent data',
      impact: 'Poor decision-making and inefficient use of IT resources',
      urgency: 'Medium/high',
      decisionMakerAccess: 'High',
      potentialEngagement: 'High',
      discoveryQuestion:
        'What is preventing Meridian from creating a reliable customer view from its existing systems and data?',
    },

    objectives: [
      {
        text: 'Create a reliable, integrated view of customer data across channels while delivering measurable value quickly.',
        isCorrect: true,
      },
      {
        text: "Replace Meridian's entire technology infrastructure with a new system.",
        isCorrect: false,
      },
      {
        text: 'Build more dashboards for each individual business team.',
        isCorrect: false,
      },
      {
        text: 'Use AI to predict which customers will stop purchasing.',
        isCorrect: false,
      },
      {
        text: 'Reduce the size of the internal technology team by outsourcing data management.',
        isCorrect: false,
      },
    ],

    bestObjective:
      'Create a reliable, integrated view of customer data across channels while delivering measurable value quickly.',

    questions: [
      {
        id: 'A',
        text: 'Which customer data sources are currently causing the biggest inconsistencies?',
        strength: 'strong',
        reason: 'Investigates the underlying problem.',
      },
      {
        id: 'B',
        text: "Why haven't your internal developers been able to fix this already?",
        strength: 'poor',
        reason: "Unnecessarily challenges the client's internal capability.",
      },
      {
        id: 'C',
        text: 'How are inconsistent customer records affecting business decisions?',
        strength: 'strong',
        reason: 'Establishes business impact.',
      },
      {
        id: 'D',
        text: 'What would a useful customer view need to allow your teams to do?',
        strength: 'strong',
        reason: 'Identifies the desired outcome.',
      },
      {
        id: 'E',
        text: 'Would you be interested in a two-year data transformation program?',
        strength: 'poor',
        reason: 'Immediately proposes an oversized solution.',
      },
      {
        id: 'F',
        text: 'What would make an external consulting engagement worthwhile for your team?',
        strength: 'strong',
        reason: "Addresses David's concerns about consulting value.",
      },
    ],

    bestQuestion:
      'What would make an external consulting engagement worthwhile for your team?',
  },

  {
    name: 'Maya Thompson',
    role: 'Head of Operations',
    company: 'GreenPath Logistics',
    industry: 'Logistics',
    companyStage: 'Expanding',
    leadDifficulty: 'Medium',

    companyOverview: [
      'GreenPath Logistics provides delivery and transportation services to business customers.',
      'The company is experiencing increased demand and preparing to take on another major customer.',
      'Operational efficiency has not improved at the same rate as delivery volume.',
    ],

    businessChallenge:
      'GreenPath is experiencing fleet inefficiency and unpredictable delivery operations.',

    currentSituation: [
      'The company relies on spreadsheets, operational software, phone calls and manual coordination.',
      'Routes are not always optimal.',
      'Vehicles sometimes return empty.',
      'Drivers experience unnecessary waiting time.',
      'Capacity varies significantly between days.',
      'Fuel consumption is increasing.',
      'Operational planning is largely reactive.',
    ],

    businessImpact: [
      'Increased fuel costs.',
      'Unnecessary kilometres travelled.',
      'Inefficient use of vehicles.',
      'Capacity problems.',
      'Increased operational complexity.',
      'Reduced ability to scale efficiently.',
    ],

    stakeholders: [
      'Maya Thompson — Head of Operations',
      'Fleet managers',
      'Drivers',
      'Dispatchers',
      'Logistics planners',
      'Finance',
      'IT / data teams',
      'Senior management',
      'Major customers',
    ],

    priorities: [
      'Improve fleet efficiency.',
      'Reduce unnecessary kilometres.',
      'Reduce fuel costs.',
      'Better utilise available vehicles.',
      'Predict operational problems before they occur.',
      'Prepare for increased delivery volume.',
    ],

    concerns: [
      'Maya does not want another system that simply produces more information.',
      'She wants something that helps the operations team make better decisions.',
      'Any proposed solution needs to demonstrate measurable operational value.',
    ],

    desiredOutcome: [
      'Move from reactive operational management to predictive planning.',
      'Use existing operational data to identify potential problems before they happen.',
    ],

    potentialBusinessValue: [
      'Reduce unnecessary kilometres.',
      'Reduce fuel consumption.',
      'Improve vehicle utilisation.',
      'Reduce waiting time.',
      'Improve capacity planning.',
      'Reduce operational costs.',
      "Support the company's expansion.",
    ],

    ibmFit: 'High',

    potentialIbmAreas: [
      'Data analytics',
      'Predictive analytics',
      'Route optimisation',
      'Operational optimisation',
      'Data-driven decision-making',
      'Process improvement',
    ],

    consultantNotes: {
      keyProblem: 'Fleet inefficiency',
      underlyingIssue:
        'Inefficient planning and underutilised operational data',
      impact: 'Fuel costs, unnecessary kilometres and capacity problems',
      urgency: 'High',
      decisionMakerAccess: 'High',
      potentialEngagement: 'High',
      discoveryQuestion:
        'How could GreenPath use its existing operational data to improve fleet planning and reduce unnecessary costs?',
    },

    objectives: [
      {
        text: 'Improve fleet efficiency by using operational data to reduce unnecessary kilometres, fuel costs and capacity problems.',
        isCorrect: true,
      },
      {
        text: 'Purchase more vehicles to prepare for the new customer.',
        isCorrect: false,
      },
      {
        text: 'Replace all existing logistics software.',
        isCorrect: false,
      },
      {
        text: 'Build a dashboard showing historical fleet performance.',
        isCorrect: false,
      },
      {
        text: 'Automate all decisions made by the operations team.',
        isCorrect: false,
      },
    ],

    bestObjective:
      'Improve fleet efficiency by using operational data to reduce unnecessary kilometres, fuel costs and capacity problems.',

    questions: [
      {
        id: 'A',
        text: 'Which operational inefficiencies are currently costing GreenPath the most?',
        strength: 'strong',
        reason: 'Prioritises the business impact.',
      },
      {
        id: 'B',
        text: 'What type of AI would you like us to implement?',
        strength: 'poor',
        reason: 'Jumps to AI.',
      },
      {
        id: 'C',
        text: 'How are you currently using your operational data to make fleet decisions?',
        strength: 'strong',
        reason: 'Investigates current processes and data.',
      },
      {
        id: 'D',
        text: 'What would a 10% reduction in unnecessary kilometres mean for the business?',
        strength: 'strong',
        reason: 'Quantifies potential value.',
      },
      {
        id: 'E',
        text: 'How much new software would you be willing to purchase?',
        strength: 'poor',
        reason:
          'Focuses on purchasing technology rather than solving the problem.',
      },
      {
        id: 'F',
        text: 'What upcoming changes could make the current problem more urgent?',
        strength: 'strong',
        reason: 'Explores urgency and future requirements.',
      },
    ],

    bestQuestion:
      'Which operational inefficiencies are currently costing GreenPath the most?',
  },

  {
    name: 'Tom Harris',
    role: 'Team Manager',
    company: 'BrightTech',
    industry: 'Technology',
    leadDifficulty: 'Easy',

    companyOverview: [
      'BrightTech is a technology company with an established development team.',
      'The team is performing well and there are no significant operational or business problems affecting the team.',
    ],

    businessChallenge:
      'The primary complaint is that one developer has a very loud keyboard.',

    currentSituation: [
      'The keyboard noise is noticeable around the office.',
      'Tom has not attempted to address the issue directly.',
      'A direct conversation or quieter keyboard would be an obvious solution.',
    ],

    businessImpact: [
      'Team performance has not decreased.',
      'There is no reported productivity issue.',
      'There is no customer impact.',
      'There is no financial impact.',
      'There is no strategic impact.',
      'There is no wider operational problem.',
    ],

    stakeholders: ['Tom Harris — Team Manager'],

    priorities: [],

    concerns: [],

    desiredOutcome: [],

    potentialBusinessValue: [],

    ibmFit: 'Low',

    potentialIbmAreas: [],

    consultantNotes: {
      keyProblem: 'No meaningful consulting problem',
      underlyingIssue: 'Minor workplace annoyance',
      impact: 'Very low',
      urgency: 'Low',
      potentialEngagement: 'Very Low',
    },

    objectives: [
      {
        text: 'Implement a workplace noise management system.',
        isCorrect: false,
      },
      {
        text: 'Improve employee productivity by analysing workplace noise.',
        isCorrect: false,
      },
      {
        text: 'Purchase quieter equipment for the development team.',
        isCorrect: false,
      },
      {
        text: 'Determine that there is no significant business objective requiring a consulting engagement.',
        isCorrect: true,
      },
    ],

    bestObjective:
      'Determine that there is no significant business objective requiring a consulting engagement.',

    questions: [
      {
        id: 'A',
        text: 'How much is the keyboard issue affecting team productivity?',
        strength: 'neutral',
      },
      {
        id: 'B',
        text: "Has the issue caused any measurable impact on the team's work?",
        strength: 'strong',
        reason: 'Tests whether there is meaningful business impact.',
      },
      {
        id: 'C',
        text: 'What business problem is the keyboard issue creating?',
        strength: 'strong',
        reason: 'Challenges whether there is actually a business problem.',
      },
      {
        id: 'D',
        text: 'Would replacing the keyboard resolve the issue?',
        strength: 'poor',
        reason:
          'The solution is already obvious and does not require consulting.',
      },
      {
        id: 'E',
        text: 'Are there any other significant business or operational challenges affecting your team?',
        strength: 'strong',
        reason: 'Looks for a genuine opportunity elsewhere.',
      },
      {
        id: 'F',
        text: 'Would you like IBM to investigate workplace productivity?',
        strength: 'poor',
        reason: 'Attempts to manufacture a consulting opportunity.',
      },
    ],

    bestQuestion:
      'Are there any other significant business or operational challenges affecting your team?',

    pursueRule: {
      shouldPursue: false,
      correctReason:
        "This is a minor workplace annoyance with no meaningful business impact, so it isn't a consulting opportunity.",
    },
  },

  {
    name: 'Olivia Brown',
    role: 'Marketing Manager',
    company: 'Small local business',
    industry: 'Marketing / Retail',
    leadDifficulty: 'Medium',

    companyOverview: [
      'The business is operating reasonably well.',
      'Olivia cannot identify a significant business problem that needs to be addressed.',
    ],

    businessChallenge:
      'Olivia wants the company to use AI because competitors are using it, but she cannot identify a specific business problem that AI would solve.',

    currentSituation: [
      'The motivation is primarily competitive pressure.',
      'Olivia does not want the company to fall behind.',
      'There is currently no clearly defined AI use case.',
    ],

    businessImpact: [
      'No significant lost revenue has been identified.',
      'No major customer problems have been identified.',
      'No operational inefficiency has been established.',
      'No excessive costs have been established.',
      'No productivity issue has been established.',
      'No measurable competitive disadvantage has been established.',
    ],

    stakeholders: ['Olivia Brown — Marketing Manager'],

    priorities: [],

    concerns: [
      'Olivia is demonstrating solution-first thinking.',
      'She has selected a technology before identifying the business problem.',
    ],

    desiredOutcome: [
      'Olivia wants an impressive AI project that could potentially increase engagement.',
      'She cannot clearly define the problem, success measure or business value.',
    ],

    potentialBusinessValue: [],

    ibmFit: 'Low in its current form',

    potentialIbmAreas: [],

    consultantNotes: {
      keyProblem: 'No defined business problem',
      underlyingIssue: 'Solution-first thinking',
      impact: 'Unknown',
      urgency: 'Low',
      potentialEngagement: 'Low',
    },

    objectives: [
      {
        text: 'Implement an AI marketing platform to ensure the business keeps up with competitors.',
        isCorrect: false,
      },
      {
        text: 'Develop an AI chatbot to increase customer engagement.',
        isCorrect: false,
      },
      {
        text: 'Use generative AI to create more marketing content.',
        isCorrect: false,
      },
      {
        text: 'Identify a genuine business problem and measurable objective before selecting a technology solution.',
        isCorrect: true,
      },
    ],

    bestObjective:
      'Identify a genuine business problem and measurable objective before selecting a technology solution.',

    questions: [
      {
        id: 'A',
        text: 'What business problem are you hoping AI will solve?',
        strength: 'strong',
        reason: 'Establishes whether there is a genuine problem.',
      },
      {
        id: 'B',
        text: 'Which AI technology would you like to implement?',
        strength: 'poor',
        reason: 'Assumes AI is already the answer.',
      },
      {
        id: 'C',
        text: 'What is currently not working well for the business?',
        strength: 'strong',
        reason:
          'Moves the conversation away from the solution and towards the business.',
      },
      {
        id: 'D',
        text: 'How would you measure whether an AI project was successful?',
        strength: 'strong',
        reason: 'Establishes measurable outcomes.',
      },
      {
        id: 'E',
        text: 'Which of your competitors are using AI?',
        strength: 'neutral',
      },
      {
        id: 'F',
        text: 'What would improving engagement actually mean for the business?',
        strength: 'strong',
        reason: 'Challenges the vague definition of engagement.',
      },
    ],

    pursueRule: {
      shouldPursue: false,
      correctReason:
        "There isn't a defined business problem yet. We should investigate the business need before considering AI.",
    },
  },
]

export function getMeetingPrepClient(personaId: string) {
  return MEETING_PREP_CLIENTS.find(
    (client) => client.personaId === personaId
  )
}

export type MeetingPrepScoreResult = {
  objectiveScore: number
  questionScore: number
  totalScore: number
  resultLabel: string
  feedback: string[]
}

export function scoreMeetingPrep(
  personaId: string,
  selectedObjectives: string[],
  selectedQuestions: string[]
): MeetingPrepScoreResult {
  const client = getMeetingPrepClient(personaId)

  if (!client) {
    return {
      objectiveScore: 0,
      questionScore: 0,
      totalScore: 0,
      resultLabel: SCORE_RESULTS.needsImprovement.label,
      feedback: ['Unable to score preparation because the client was not found.'],
    }
  }

  const selectedObjectiveResults = client.objectives.filter((objective) =>
    selectedObjectives.includes(objective.text)
  )

  const hasCorrectObjective = selectedObjectiveResults.some(
    (objective) => objective.isCorrect
  )

  // The objective represents the overall meeting direction.
  // A correct objective earns the full objective portion of the six-point score.
  const objectiveScore = hasCorrectObjective ? 3 : 0

  const selectedQuestionResults = client.questions.filter((question) =>
    selectedQuestions.includes(question.text)
  )

  const questionPoints = selectedQuestionResults.map((question) => {
    if (question.strength === 'strong') return 1
    if (question.strength === 'neutral') return 0.5
    return 0
  })

  // Questions contribute a maximum of three points.
  const questionScore = Math.min(
    3,
    questionPoints.reduce<number>((total, score) => total + score, 0)
  )

  const totalScore = Math.min(6, objectiveScore + questionScore)

  const resultLabel =
    totalScore >= SCORE_RESULTS.strong.min
      ? SCORE_RESULTS.strong.label
      : totalScore >= SCORE_RESULTS.developing.min
        ? SCORE_RESULTS.developing.label
        : SCORE_RESULTS.needsImprovement.label

  const feedback: string[] = []

  if (hasCorrectObjective) {
    feedback.push('The selected objective is well aligned with the client business need.')
  } else {
    feedback.push(
      `Consider focusing the meeting objective on: ${client.bestObjective}`
    )
  }

  if (client.questions.length === 0) {
    feedback.push('No scored preparation questions are defined for this client.')
  } else {
    selectedQuestionResults.forEach((question) => {
      if (question.reason) {
        feedback.push(`${question.text} — ${question.reason}`)
      }
    })

    if (!selectedQuestionResults.some((question) => question.strength === 'strong')) {
      feedback.push(
        'Consider choosing questions that explore the business problem, impact, desired outcome or consulting value.'
      )
    }
  }

  return {
    objectiveScore,
    questionScore,
    totalScore,
    resultLabel,
    feedback,
  }
}