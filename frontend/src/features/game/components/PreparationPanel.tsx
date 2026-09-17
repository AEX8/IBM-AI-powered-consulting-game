'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { preparationContent, type GradePreparation, type PreparationResult } from './preparationContent'
import styles from './PreparationPanel.module.css'

const SELECTION_KEY = 'ibm-selected-outreach-client'
const COMPLETION_KEY = 'ibm-level-three-completed'
const CELEBRATION_KEY = 'ibm-level-three-celebration-pending'
const steps = ['Client File', 'Meeting Objectives', 'Prepare Questions', 'Preparation Feedback']

function readClient(): string {
  try {
    const saved = JSON.parse(localStorage.getItem(SELECTION_KEY) ?? 'null')
    return typeof saved?.personaId === 'string' ? saved.personaId : ''
  } catch { return '' }
}

function readDraft(personaId: string, kind: 'objectives' | 'questions'): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(`ibm-preparation-draft:${personaId}`) ?? 'null')
    const allowed = preparationContent[personaId]?.[kind] ?? []
    return Array.isArray(saved?.[kind])
      ? [...new Set<string>(saved[kind].filter((value: unknown) => typeof value === 'string' && allowed.includes(value)))].slice(0, 3)
      : []
  } catch { return [] }
}

/** The native overlay stays outside Phaser's camera transforms. The room's own
 * sitting animation still runs before this UI appears. Grading is injected through
 * one typed adapter, avoiding guesses about an endpoint that has not been supplied. */
export function PreparationPanel({ onClose, gradePreparation }: {
  onClose: () => void; gradePreparation?: GradePreparation
}) {
  const [personaId] = useState(readClient)
  const client = preparationContent[personaId]
  const [step, setStep] = useState(0)
  const [objectives, setObjectives] = useState<string[]>(() => readDraft(personaId, 'objectives'))
  const [questions, setQuestions] = useState<string[]>(() => readDraft(personaId, 'questions'))
  const [result, setResult] = useState<PreparationResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (!personaId) return
    try {
      localStorage.setItem(`ibm-preparation-draft:${personaId}`, JSON.stringify({ objectives, questions }))
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
    update(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value])
    setResult(null)
    setError('')
  }

  async function review() {
    if (busy || !objectives.length || !questions.length) return
    setStep(3)
    setError('')
    if (!gradePreparation) {
      setError('Preparation review is not available yet. Your choices are kept here so you can return and revise them.')
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
      setError('Your preparation could not be reviewed. Please try again; no progress has been marked complete.')
    } finally { setBusy(false) }
  }

  function finish() {
    if (!result) return
    try {
      // The handoff records the exact reviewed selections, not a later edited draft.
      localStorage.setItem('ibm-level-three-preparation', JSON.stringify({ personaId, objectives, questions, ...result }))
      localStorage.setItem(COMPLETION_KEY, 'true')
      sessionStorage.setItem(CELEBRATION_KEY, 'true')
      window.dispatchEvent(new Event(COMPLETION_KEY))
      setFinished(true)
    } catch { setError('Progress could not be saved. Please allow browser storage and try again.') }
  }

  return <div className={styles.overlay} onKeyDown={event => event.stopPropagation()} onKeyUp={event => event.stopPropagation()}>
    <motion.section className={styles.laptop} role="dialog" aria-modal="true" aria-label="Meeting preparation"
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
      <div className={styles.camera} aria-hidden="true" />
      <button className={styles.close} onClick={onClose} aria-label="Return to office">×</button>
      <div className={styles.screen}>
        <header><small>LEVEL 3 · MEETING PREPARATION</small><h1>{finished ? 'Ready for your meeting!' : steps[step]}</h1>
          {client && <p>{client.name} · {client.industry}</p>}</header>
        <nav aria-label="Preparation steps">{steps.map((label, index) => <button key={label}
          disabled={busy || finished || index > step || index === 3} onClick={() => setStep(index)}
          aria-current={index === step ? 'step' : undefined}>{index + 1}<span>{label}</span></button>)}</nav>
        <div className={styles.content}>
          {!client ? <><h2>Select a client in Outreach first</h2><p>Your meeting preparation follows the client you researched in Level 2.</p><a href="/levels/outreach">Return to Outreach →</a></>
          : finished ? <motion.div className={styles.finish} initial={{ scale: .8 }} animate={{ scale: 1 }}>
            <span aria-hidden="true">★</span><h2>Level 4 unlocked</h2><p>Your preparation is saved. Return home for your unlock celebration, then enter the client meeting.</p>
            <a className={styles.primary} href="/dashboard?completed=level-3">Return home →</a>
          </motion.div>
          : step === 0 ? <>
            <h2>Company &amp; Industry</h2><p>{client.company} · {client.industry}</p>
            <h2>Business Situation</h2><p>{client.situation}</p>
            <h2>Stakeholders &amp; Current Tech</h2><p>{client.stakeholders}</p>
          </> : step === 1 || step === 2 ? <>
            <p className={styles.hint}>{step === 1 ? 'What do you want to achieve in this meeting?' : 'What questions will help you understand this client?'} Select up to 3.</p>
            <p aria-live="polite">{(step === 1 ? objectives : questions).length} / 3 selected</p>
            {step === 2 && !client.questions.length && <p role="status">Question choices for this client are awaiting approval. You can review your objectives, or return to the office.</p>}
            {(step === 1 ? client.objectives : client.questions).map((option, index) => {
              const selected = step === 1 ? objectives : questions
              return <button key={option} className={`${styles.option} ${selected.includes(option) ? styles.selected : ''}`}
                aria-pressed={selected.includes(option)} disabled={!selected.includes(option) && selected.length >= 3}
                onClick={() => toggle(option, step === 1 ? 'objectives' : 'questions')}>
                <span>{selected.includes(option) ? '✓' : index + 1}</span>{option}</button>
            })}
          </> : <>
            <h2>What You Prepared</h2><p>✓ Reviewed the Client File</p><p>✓ {objectives.length} meeting objectives</p><p>✓ {questions.length} prepared questions</p>
            <h2>Feedback on Your Preparation</h2>
            {busy && <p role="status">Preparing your review…</p>}
            {result && <p className={styles.feedback}>{result.feedback}</p>}
          </>}
          {error && <p role="alert" className={styles.error}>{error}</p>}
        </div>
        {client && !finished && <footer>
          {step > 0 && <button disabled={busy} onClick={() => { setStep(step - 1); setError('') }}>← Back</button>}
          {step === 0 && <button className={styles.primary} onClick={() => setStep(1)}>Set Meeting Objectives →</button>}
          {step === 1 && <button className={styles.primary} disabled={!objectives.length} onClick={() => setStep(2)}>Prepare Questions →</button>}
          {step === 2 && <button className={styles.primary} disabled={!questions.length} onClick={review}>Review Preparation →</button>}
          {step === 3 && !result && <button className={styles.primary} disabled={busy || !gradePreparation} onClick={review}>Retry review</button>}
          {step === 3 && result && <button className={styles.primary} onClick={finish}>Enter Meeting →</button>}
        </footer>}
      </div>
    </motion.section>
  </div>
}
