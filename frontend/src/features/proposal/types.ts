export type ProposalTimelineItem = {
    label: string
  }
  
  export type ProposalFormValues = {
    solutionScope: string
    investment: string
    nextSteps: string
    timeline: ProposalTimelineItem[]
  }
  
  export type EarlierMeetingNote = {
    id: string
    label: string
    category: string
    title: string
    detail: string
    relatedObjectives?: string[]
  }
  
  export type ProposalWorkspaceView = 'editing' | 'review' | 'negotiating' | 'outcome'
  
  export type ProposalRound = {
    roundNumber: number
    objection: string
    suggestions: string[]
  }
  
  export type ProposalScore = {
    problem: 0 | 1 | 2
    value: 0 | 1 | 2
    fit: 0 | 1 | 2
  }
  
  export type ProposalOutcome = 'accepted' | 'rejected' | null