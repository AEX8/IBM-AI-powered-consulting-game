'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { recordStageCompletion } from '@/features/progress/actions/progress.actions'
import type { StageCompletionReward } from '@/features/progress/progress'
import { EarlierMeetingsSidebar } from './EarlierMeetingsSidebar'
import { MeetingContextDrawer } from './MeetingContextDrawer'
import { ProposalForm } from './ProposalForm'
import { ProposalDocumentPreview } from './ProposalDocumentPreview'
import { ClientObjectionModal } from './ClientObjectionModal'
import { ProposalOutcomeScreen } from './ProposalOutcomeScreen'
import { MAX_NEGOTIATION_ROUNDS, decideOutcome, weakestDimension } from '../scoring'
import { PROPOSAL_STAGE_ID, acceptedSkillDeltas, performanceForRound } from '../rewards'
import type { ProposalPersona } from '../personas'
import type { ProposalFormValues, ProposalScore, ProposalWorkspaceView } from '../types'

// Demo build: a ready-to-send proposal per client, so the player only has to
// review and press send. Fields stay editable in case anyone wants to tweak them.
const PROPOSAL_DRAFTS: Partial<Record<ProposalPersona['key'], ProposalFormValues>> = {
  sarah: {
    solutionScope:
      "A phased visibility layer that connects ACMD's existing inventory, order and logistics systems into a single live dashboard, without replacing any of the systems you already run. This surfaces delivery risks early, cuts the manual cross-checking your team currently does, and gives you one place to see the whole supply chain end to end.",
    investment: '$25,000 AUD, fixed price for phase one',
    nextSteps:
      "On acceptance we start with a two-week discovery to map your current systems, followed by phase one delivery. We'll check in weekly and review results with you at the six-week mark before any further investment.",
    timeline: [
      { label: 'Weeks 1-2: Map existing systems and connect data sources' },
      { label: 'Weeks 3-5: Build the live visibility dashboard and test with your team' },
      { label: 'Week 6: Review results with you and agree next steps' },
    ],
  },
  david: {
    solutionScope:
      "A focused engagement that unifies Meridian's store, online, mobile and loyalty customer data into one reliable view your business teams can use directly, working alongside your internal technology team rather than replacing their work. This removes the manual reconciliation between systems and gives you a consistent customer picture within weeks, not years.",
    investment: '$30,000 AUD, fixed price for the first phase',
    nextSteps:
      "We start with a two-week data audit alongside your technology team, then deliver the first working version of the unified view. We'll demonstrate measurable value within six weeks before discussing any further phases.",
    timeline: [
      { label: 'Weeks 1-2: Audit data sources with your technology team' },
      { label: 'Weeks 3-5: Build and test the unified customer view' },
      { label: 'Week 6: Demonstrate results and agree on next steps' },
    ],
  },
}

function createPrefilledProposal(personaKey: ProposalPersona['key']): ProposalFormValues {
  return (
    PROPOSAL_DRAFTS[personaKey] ?? {
      solutionScope: '',
      investment: '',
      nextSteps: '',
      timeline: [{ label: '' }, { label: '' }, { label: '' }],
    }
  )
}

type ProposalWorkspaceProps = {
  persona: ProposalPersona
}

export function ProposalWorkspace({ persona }: ProposalWorkspaceProps) {
  const router = useRouter()
  const [view, setView] = useState<ProposalWorkspaceView>('editing')
  const [proposal, setProposal] = useState<ProposalFormValues>(() =>
    createPrefilledProposal(persona.key)
  )
  const [round, setRound] = useState(1)
  const [objection, setObjection] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [outcome, setOutcome] = useState<'accepted' | 'rejected' | null>(null)
  const [rewards, setRewards] = useState<StageCompletionReward | null>(null)
  const [scorecard, setScorecard] = useState<{ scores: ProposalScore; feedback: string } | null>(
    null
  )
  const [isScoring, setIsScoring] = useState(false)
  const [scoringError, setScoringError] = useState('')
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

  const selectedNote = persona.earlierNotes.find((note) => note.id === selectedNoteId) ?? null

  async function saveAcceptedResult(): Promise<StageCompletionReward | null> {
    try {
      const result = await recordStageCompletion({
        stageId: PROPOSAL_STAGE_ID,
        personaKey: persona.key,
        performance: performanceForRound(round),
        skillDeltas: acceptedSkillDeltas(persona.key),
      })

      return result.success && result.data ? result.data : null
    } catch {
      return null
    }
  }

  async function handleSendToClient() {
    setIsScoring(true)
    setScoringError('')

    try {
      const scoreResponse = await fetch('/api/proposal/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...proposal, personaKey: persona.key }),
      })

      if (!scoreResponse.ok) throw new Error('Scoring request failed')

      const score = await scoreResponse.json()
      setScorecard({
        scores: score,
        feedback: typeof score.feedback === 'string' ? score.feedback : '',
      })
      const decision = decideOutcome(score)

      if (decision === 'accept') {
        const reward = await saveAcceptedResult()
        setRewards(reward)

        if (!reward) {
          toast.error("Your result couldn't be saved to your progress. Please try again later.")
        }

        setOutcome('accepted')
        setView('outcome')
        return
      }

      if (decision === 'reject') {
        setOutcome('rejected')
        setView('outcome')
        return
      }

      // decision === 'revise'
      if (round > MAX_NEGOTIATION_ROUNDS) {
        setOutcome('rejected')
        setView('outcome')
        return
      }

      const objectionResponse = await fetch('/api/proposal/objection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...proposal,
          personaKey: persona.key,
          weakestDimension: weakestDimension(score),
          roundNumber: round,
        }),
      })

      if (!objectionResponse.ok) throw new Error('Objection request failed')

      const objectionData = await objectionResponse.json()
      setObjection(objectionData.objection)
      setSuggestions(objectionData.suggestions ?? [])
      setView('negotiating')
    } catch {
      setScoringError('Something went wrong scoring the proposal. Please try again.')
      setView('editing')
    } finally {
      setIsScoring(false)
    }
  }

  function playAgain() {
    setProposal(createPrefilledProposal(persona.key))
    setRound(1)
    setObjection('')
    setSuggestions([])
    setOutcome(null)
    setRewards(null)
    setScorecard(null)
    setView('editing')
  }

  async function retryProgressSave() {
    setIsScoring(true)
    const reward = await saveAcceptedResult()
    setRewards(reward)
    setIsScoring(false)
    if (!reward) toast.error('Progress could not be saved. Please try again.')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ol
        aria-label="Proposal progress"
        className="bg-warm-cream flex shrink-0 flex-wrap gap-6 px-6 py-5"
      >
        {['Proposal', 'Review', 'Negotiation', 'Outcome'].map((label, index) => {
          const active = ['editing', 'review', 'negotiating', 'outcome'].indexOf(view)
          return (
            <li
              key={label}
              aria-current={active === index ? 'step' : undefined}
              className={`flex items-center gap-2 text-sm font-bold ${active >= index ? 'text-dark-blue' : 'text-charcoal/60'}`}
            >
              <span
                className={`flex size-8 items-center justify-center rounded-full ${active >= index ? 'bg-dark-blue text-white' : 'bg-warm-grey'}`}
              >
                {index + 1}
              </span>
              {label}
            </li>
          )
        })}
      </ol>
      <div
        className={`flex min-h-0 flex-1 flex-col md:flex-row ${view === 'editing' ? 'overflow-hidden' : 'overflow-y-auto'}`}
      >
        {view === 'editing' && (
          <>
            <EarlierMeetingsSidebar
              clientName={persona.name}
              clientInitials={persona.initials}
              notes={persona.earlierNotes}
              selectedNoteId={selectedNoteId}
              onSelectNote={setSelectedNoteId}
            />

            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-8 pb-28 md:px-10">
              {scoringError && (
                <p className="mb-4 text-sm font-semibold text-red-600">{scoringError}</p>
              )}

              <ProposalForm
                clientCompany={persona.company}
                objectives={persona.objectives}
                defaultValues={proposal}
                suggestions={suggestions}
                onSubmit={(values) => {
                  setProposal(values)
                  setView('review')
                }}
              />
            </div>

            {selectedNote && (
              <MeetingContextDrawer note={selectedNote} onClose={() => setSelectedNoteId(null)} />
            )}
          </>
        )}

        {view === 'review' && (
          <ProposalDocumentPreview
            clientName={persona.name}
            objectives={persona.objectives}
            proposal={proposal}
            isSubmitting={isScoring}
            onBackToEditing={() => setView('editing')}
            onSendToClient={handleSendToClient}
          />
        )}

        {view === 'negotiating' && (
          <ClientObjectionModal
            clientName={persona.name}
            clientInitials={persona.initials}
            roundNumber={round}
            objection={objection}
            onAdjustProposal={() => {
              setRound((current) => current + 1)
              setView('editing')
            }}
          />
        )}

        {view === 'outcome' && outcome === 'accepted' && (
          <ProposalOutcomeScreen
            outcome="accepted"
            closedOnRound={round}
            rewards={rewards}
            scorecard={scorecard}
            savingProgress={isScoring}
            onRetrySave={() => void retryProgressSave()}
            onPlayAgain={playAgain}
            onContinue={() => router.push('/dashboard')}
          />
        )}

        {view === 'outcome' && outcome === 'rejected' && (
          <ProposalOutcomeScreen
            outcome="rejected"
            scorecard={scorecard}
            onRetry={playAgain}
            onContinue={() => router.push('/dashboard')}
          />
        )}
      </div>
    </div>
  )
}