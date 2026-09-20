'use client'

import { useState } from 'react'
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
import type { ProposalFormValues, ProposalWorkspaceView } from '../types'

function createBlankProposal(): ProposalFormValues {
  return {
    solutionScope: '',
    investment: '',
    nextSteps: '',
    timeline: [{ label: '' }, { label: '' }, { label: '' }],
  }
}

type ProposalWorkspaceProps = {
  persona: ProposalPersona
}

export function ProposalWorkspace({ persona }: ProposalWorkspaceProps) {
  const [view, setView] = useState<ProposalWorkspaceView>('editing')
  const [proposal, setProposal] = useState<ProposalFormValues>(createBlankProposal)
  const [round, setRound] = useState(1)
  const [objection, setObjection] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [outcome, setOutcome] = useState<'accepted' | 'rejected' | null>(null)
  const [rewards, setRewards] = useState<StageCompletionReward | null>(null)
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

  return (
    <div className="flex flex-1">
      {view === 'editing' && (
        <>
          <EarlierMeetingsSidebar
            clientName={persona.name}
            clientInitials={persona.initials}
            notes={persona.earlierNotes}
            selectedNoteId={selectedNoteId}
            onSelectNote={setSelectedNoteId}
          />

          <div className="flex-1 px-10 py-8">
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
          onContinue={() => toast.success("Level 6 isn't built yet — nice work closing this one!")}
        />
      )}

      {view === 'outcome' && outcome === 'rejected' && (
        <ProposalOutcomeScreen
          outcome="rejected"
          onRetry={() => {
            setProposal(createBlankProposal())
            setRound(1)
            setObjection('')
            setSuggestions([])
            setOutcome(null)
            setRewards(null)
            setView('editing')
          }}
        />
      )}
    </div>
  )
}