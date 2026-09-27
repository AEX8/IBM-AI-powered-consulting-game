'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { clientKeyFromPersonaId } from '@/features/progress/clients'
import { getCompletedClientKeysAction } from '@/features/progress/actions/progress.actions'
import { MeetingOrderPopup } from './MeetingOrderPopup'
import {
  preparationContent,
  type GradePreparation,
  type PreparationResult,
} from './preparationContent'
import styles from './PreparationPanel.module.css'

const SELECTION_KEY = 'ibm-selected-outreach-client'
const COMPLETION_KEY = 'ibm-level-three-completed'
const CELEBRATION_KEY = 'ibm-level-three-celebration-pending'
const PREPARATION_KEY = 'ibm-level-three-preparation'
const MEETING_ORDER_KEY = 'ibm-level-four-meeting-order'
const MEETING_DONE_KEY = 'ibm-level-four-meeting-done'
const MEETING_PREP_STAGE_ID = 3
const steps = ['Client File', 'Meeting Objectives', 'Prepare Questions', 'Preparation Feedback']

// Demo build: lets the client switcher below persist a selection in the same
// shape Level 2 writes, so Level 4 picks up whichever client was chosen here.
const CLIENT_META: Record<string, { texture: string; portrait: string }> = {
  'test-level-1': { texture: 'good-client', portrait: 'character-01.png' },
  'test-level-2': { texture: 'bad-client', portrait: 'character-02.png' },
}

function readClient(): string {
  try {
    const saved = JSON.parse(localStorage.getItem(SELECTION_KEY) ?? 'null')
    return typeof saved?.personaId === 'string' ? saved.personaId : ''
  } catch {
    return ''
  }
}

function readDraft(personaId: string, kind: 'objectives' | 'questions'): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(`ibm-preparation-draft:${personaId}`) ?? 'null')
    const allowed = preparationContent[personaId]?.[kind] ?? []
    return Array.isArray(saved?.[kind])
      ? [
          ...new Set<string>(
            saved[kind].filter(
              (value: unknown) => typeof value === 'string' && allowed.includes(value)
            )
          ),
        ].slice(0, 3)
      : []
  } catch {
    return []
  }
}

/** The native overlay stays outside Phaser's camera transforms. The room's own
 * sitting animation still runs before this UI appears. Grading is injected through
 * one typed adapter, avoiding guesses about an endpoint that has not been supplied. */
export function PreparationPanel({
  onClose,
  gradePreparation,
  availableClientKeys = [],
  completedClientKeys = [],
}: {
  onClose: () => void
  gradePreparation?: GradePreparation
  availableClientKeys?: string[]
  // Client keys already prepared this run — shown greyed out and disabled so
  // the player cannot repeat a client they've already finished.
  completedClientKeys?: string[]
}) {
  function isUnlocked(id: string): boolean {
    const key = clientKeyFromPersonaId(id)
    return key !== null && availableClientKeys.includes(key)
  }

  function isCompleted(id: string): boolean {
    const key = clientKeyFromPersonaId(id)
    return key !== null && completedClientKeys.includes(key)
  }

  const [personaId, setPersonaId] = useState(() => {
    const stored = readClient()
    if (stored && isUnlocked(stored) && !isCompleted(stored)) return stored
    const firstSelectable = Object.keys(preparationContent).find(
      (id) => isUnlocked(id) && !isCompleted(id)
    )
    if (firstSelectable) return firstSelectable
    return stored && isUnlocked(stored) ? stored : (Object.keys(preparationContent).find(isUnlocked) ?? '')
  })
  const client = preparationContent[personaId]
  // False once every client the player can currently prepare has already been
  // prepared — the form must not let an already-finished client be re-edited.
  const hasSelectableClient = Object.keys(preparationContent).some(
    (id) => isUnlocked(id) && !isCompleted(id)
  )
  const [step, setStep] = useState(0)
  const [objectives, setObjectives] = useState<string[]>(() => readDraft(personaId, 'objectives'))
  const [questions, setQuestions] = useState<string[]>(() => readDraft(personaId, 'questions'))
  const [result, setResult] = useState<PreparationResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [finished, setFinished] = useState(false)
  const [firstCompletion, setFirstCompletion] = useState(false)
  const [meetingOrderChoices, setMeetingOrderChoices] = useState<string[] | null>(null)

  // Demo build: lets the player pick or switch clients directly on this form,
  // instead of only inheriting whatever was chosen back in Level 2. Only clients
  // the player has actually completed Outreach with are selectable.
  function selectClient(id: string) {
    if (id === personaId || !isUnlocked(id) || isCompleted(id)) return

    setPersonaId(id)
    setStep(0)
    setObjectives(readDraft(id, 'objectives'))
    setQuestions(readDraft(id, 'questions'))
    setResult(null)
    setError('')

    const meta = CLIENT_META[id]
    const name = preparationContent[id]?.name

    if (meta && name) {
      try {
        localStorage.setItem(
          SELECTION_KEY,
          JSON.stringify({ name, personaId: id, texture: meta.texture, portrait: meta.portrait })
        )
      } catch {
        // The switch still works for this session even if it can't be persisted.
      }
    }
  }

  useEffect(() => {
    if (!personaId) return
    try {
      localStorage.setItem(
        `ibm-preparation-draft:${personaId}`,
        JSON.stringify({ objectives, questions })
      )
    } catch {
      // Selection remains usable in memory; completion separately requires a
      // successful save and reports a visible error if browser storage is blocked.
    }
  }, [personaId, objectives, questions])

  // Editing either selection invalidates earlier feedback. This prevents a result
  // for an old preparation from being used to unlock a newly edited submission.
  function toggle(value: string, kind: 'objectives' | 'questions') {
    const selected = kind === 'objectives' ? objectives : questions
    const update = kind === 'objectives' ? setObjectives : setQuestions
    if (!selected.includes(value) && selected.length >= 3) return
    update(
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]
    )
    setResult(null)
    setError('')
  }

  async function review() {
    if (busy || !objectives.length || !questions.length) return
    setStep(3)
    setError('')
    if (!gradePreparation) {
      setError(
        'Preparation review is not available yet. Your choices are kept here so you can return and revise them.'
      )
      return
    }
    setBusy(true)
    try {
      const response = await gradePreparation({ personaId, objectives, questions })
      if (!response.submissionId?.trim() || !response.feedback?.trim()) {
        throw new Error('The review response was incomplete. Please try again.')
      }
      setResult(response)
    } catch {
      setError(
        'Your preparation could not be reviewed. Please try again; no progress has been marked complete.'
      )
    } finally {
      setBusy(false)
    }
  }

  // Both clients share one Level 4 meeting room, so their prep is stored per
  // persona (not in one slot) — otherwise preparing a second client would
  // silently erase the first client's saved objectives and questions.
  function writePreparation(id: string) {
    const existing = JSON.parse(localStorage.getItem(PREPARATION_KEY) ?? 'null')
    const map = existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {}
    localStorage.setItem(
      PREPARATION_KEY,
      JSON.stringify({ ...map, [id]: { objectives, questions } })
    )
  }

  function writeMeetingOrder(order: string[]) {
    localStorage.setItem(MEETING_ORDER_KEY, JSON.stringify(order))
    // A fresh order starts a fresh run: nobody in it has met with the client yet.
    localStorage.removeItem(MEETING_DONE_KEY)
  }

  async function finish() {
    if (!result) return
    const firstClear = result.firstCompletion !== false
    setBusy(true)
    try {
      writePreparation(personaId)
      localStorage.setItem(COMPLETION_KEY, 'true')
      if (firstClear) sessionStorage.setItem(CELEBRATION_KEY, 'true')
      else sessionStorage.removeItem(CELEBRATION_KEY)
      window.dispatchEvent(new Event(COMPLETION_KEY))
    } catch {
      setError('Progress could not be saved. Please allow browser storage and try again.')
      setBusy(false)
      return
    }

    // If the player has now prepared both clients, ask which order to meet them
    // in instead of assuming whichever was reviewed last goes first.
    const preparedIds = Object.keys(preparationContent).filter(isUnlocked)
    let preparedBothIds = [personaId]

    try {
      const completedKeys = await getCompletedClientKeysAction(MEETING_PREP_STAGE_ID)
      preparedBothIds = preparedIds.filter((id) => {
        const key = clientKeyFromPersonaId(id)
        return key !== null && completedKeys.includes(key)
      })
    } catch {
      // If the check fails, fall back to only this client rather than blocking finish.
    }

    setBusy(false)
    setFirstCompletion(firstClear)

    if (preparedBothIds.length > 1) {
      setMeetingOrderChoices(preparedBothIds)
    } else {
      writeMeetingOrder([personaId])
      setFinished(true)
    }
  }

  function confirmMeetingOrder(order: string[]) {
    writeMeetingOrder(order)
    setMeetingOrderChoices(null)
    setFinished(true)
  }

  return (
    <div
      className={styles.overlay}
      onKeyDown={(event) => event.stopPropagation()}
      onKeyUp={(event) => event.stopPropagation()}
    >
      <motion.section
        className={styles.laptop}
        role="dialog"
        aria-modal="true"
        aria-label="Meeting preparation"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={styles.camera} aria-hidden="true" />
        <button className={styles.close} onClick={onClose} aria-label="Return to office">
          ×
        </button>
        <div className={styles.screen}>
          <header>
            <small>LEVEL 3 · MEETING PREPARATION</small>
            <h1>
              {!hasSelectableClient ? 'Already prepared' : finished ? 'Ready for your meeting!' : steps[step]}
            </h1>
            {hasSelectableClient && client && (
              <p>
                {client.name} · {client.industry}
              </p>
            )}
            {!finished && hasSelectableClient && (
              <div className={styles.clientSwitcher} role="group" aria-label="Change client">
                {Object.entries(preparationContent).map(([id, info]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={id === personaId}
                    disabled={busy || !isUnlocked(id) || isCompleted(id)}
                    title={
                      !isUnlocked(id)
                        ? 'Complete Outreach with this client first'
                        : isCompleted(id)
                          ? 'You have already prepared this client'
                          : undefined
                    }
                    onClick={() => selectClient(id)}
                  >
                    {info.name}
                  </button>
                ))}
              </div>
            )}
          </header>
          {hasSelectableClient && (
            <nav aria-label="Preparation steps">
              {steps.map((label, index) => (
                <button
                  key={label}
                  disabled={busy || finished || index > step || index === 3}
                  onClick={() => setStep(index)}
                  aria-current={index === step ? 'step' : undefined}
                >
                  {index + 1}
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          )}
          <div className={styles.content}>
            {!hasSelectableClient ? (
              <>
                <h2>Nothing left to prepare</h2>
                <p>
                  You&rsquo;ve already prepared every client you can right now. Head back to the
                  office and continue on to the client meeting.
                </p>
                <a className={styles.primary} href="/dashboard">
                  Return home →
                </a>
              </>
            ) : !client ? (
              <>
                <h2>Select a client</h2>
                <p>
                  Choose who you are preparing to meet, above — this also sets who you will meet in
                  the Level 4 client meeting.
                </p>
              </>
            ) : finished ? (
              <motion.div className={styles.finish} initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                <span aria-hidden="true">★</span>
                <h2>{firstCompletion ? 'Level 4 unlocked' : 'Preparation saved'}</h2>
                <p>
                  {firstCompletion
                    ? 'Your preparation is saved. Return home to enter the client meeting.'
                    : 'Your preparation is saved. Return home to continue or replay the client meeting.'}
                </p>
                <a
                  className={styles.primary}
                  href={firstCompletion ? '/dashboard?completed=level-3' : '/dashboard'}
                >
                  Return home →
                </a>
              </motion.div>
            ) : step === 0 ? (
              <>
                <h2>Company &amp; Industry</h2>
                <p>
                  {client.company} · {client.industry}
                </p>
                <h2>Business Situation</h2>
                <p>{client.situation}</p>
                <h2>Stakeholders &amp; Current Tech</h2>
                <p>{client.stakeholders}</p>
              </>
            ) : step === 1 || step === 2 ? (
              <>
                <p className={styles.hint}>
                  {step === 1
                    ? 'What do you want to achieve in this meeting?'
                    : 'What questions will help you understand this client?'}{' '}
                  Select up to 3.
                </p>
                <p aria-live="polite">
                  {(step === 1 ? objectives : questions).length} / 3 selected
                </p>
                {step === 2 && !client.questions.length && (
                  <p role="status">
                    Question choices for this client are awaiting approval. You can review your
                    objectives, or return to the office.
                  </p>
                )}
                {(step === 1 ? client.objectives : client.questions).map((option, index) => {
                  const selected = step === 1 ? objectives : questions
                  return (
                    <button
                      key={option}
                      className={`${styles.option} ${selected.includes(option) ? styles.selected : ''}`}
                      aria-pressed={selected.includes(option)}
                      disabled={!selected.includes(option) && selected.length >= 3}
                      onClick={() => toggle(option, step === 1 ? 'objectives' : 'questions')}
                    >
                      <span>{selected.includes(option) ? '✓' : index + 1}</span>
                      {option}
                    </button>
                  )
                })}
              </>
            ) : (
              <>
                <h2>What You Prepared</h2>
                <p>✓ Reviewed the Client File</p>
                <p>✓ {objectives.length} meeting objectives</p>
                <p>✓ {questions.length} prepared questions</p>
                <h2>Feedback on Your Preparation</h2>
                {busy && <p role="status">Preparing your review…</p>}
                {result && <p className={styles.feedback}>{result.feedback}</p>}
              </>
            )}
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
          </div>
          {hasSelectableClient && client && !finished && (
            <footer>
              {step > 0 && (
                <button
                  disabled={busy}
                  onClick={() => {
                    setStep(step - 1)
                    setError('')
                  }}
                >
                  ← Back
                </button>
              )}
              {step === 0 && (
                <button className={styles.primary} onClick={() => setStep(1)}>
                  Set Meeting Objectives →
                </button>
              )}
              {step === 1 && (
                <button
                  className={styles.primary}
                  disabled={!objectives.length}
                  onClick={() => setStep(2)}
                >
                  Prepare Questions →
                </button>
              )}
              {step === 2 && (
                <button className={styles.primary} disabled={!questions.length} onClick={review}>
                  Review Preparation →
                </button>
              )}
              {step === 3 && !result && (
                <button
                  className={styles.primary}
                  disabled={busy || !gradePreparation}
                  onClick={review}
                >
                  Retry review
                </button>
              )}
              {step === 3 && result && (
                <button className={styles.primary} disabled={busy} onClick={() => void finish()}>
                  Enter Meeting →
                </button>
              )}
            </footer>
          )}
        </div>
      </motion.section>
      {meetingOrderChoices && (
        <MeetingOrderPopup personaIds={meetingOrderChoices} onConfirm={confirmMeetingOrder} />
      )}
    </div>
  )
}
