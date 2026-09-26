'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { FileCheck2, ArrowRight, Check, LoaderCircle, Trophy } from 'lucide-react'
import { LevelNavigationControls } from '@/features/game/components/LevelNavigationControls'
import { z } from 'zod'
import {
  PERSONAS,
  personaKeyFromName,
  type PersonaKey,
  type ProposalPersona,
} from '@/features/proposal/personas'
import { SKILL_KEYS, SKILL_LABELS } from '@/features/progress/progress'
import { contractTermsSchema, type ContractTerms, type ClosingExchange } from '../schema'
import { MAX_ANSWER_LENGTH, MAX_CONCERN_ROUNDS, SCORE_KEYS, SCORE_LABELS } from '../closing'
import type { ContractSummary } from '../contracts'
import styles from './ClosingPortal.module.css'

const resultSchema = z.object({
  outcome: z.enum(['signed', 'stalled', 'lost']),
  completed: z.boolean(),
  overall: z.number().min(0).max(100),
  scores: z.object({
    terms: z.number(),
    concerns: z.number(),
    relationship: z.number(),
    clarity: z.number(),
  }),
  feedback: z.string(),
  improvements: z.array(z.string()),
  closingLine: z.string(),
  xpAwarded: z.number(),
  skillsAwarded: z.record(z.number()),
})
type Result = z.infer<typeof resultSchema>
const blankTerms: ContractTerms = { scope: '', investment: '', startDate: '', paymentTerms: '' }
const subscribe = (changed: () => void) => {
  window.addEventListener('storage', changed)
  return () => window.removeEventListener('storage', changed)
}
function selectedClient() {
  try {
    const saved = JSON.parse(localStorage.getItem('ibm-selected-outreach-client') ?? 'null')
    return typeof saved?.name === 'string' ? personaKeyFromName(saved.name) : null
  } catch {
    return null
  }
}
async function request(path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(
    `/api/closing/${path}`,
    body === undefined
      ? { cache: 'no-store' }
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
  )
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401)
      throw new Error('Your session has expired. Sign in again to continue.')
    throw new Error(
      typeof data?.error === 'string'
        ? data.error
        : 'The request could not be completed. Please try again.'
    )
  }
  return data
}

export function ClosingPortal({
  availableClientKeys,
  initialClientKey,
}: {
  availableClientKeys: PersonaKey[]
  initialClientKey: PersonaKey | null
}) {
  const stored = useSyncExternalStore(subscribe, selectedClient, () => null)
  const [picked, setPicked] = useState<PersonaKey | null>(null)
  const [portfolio, setPortfolio] = useState(false)
  const preferred = picked ?? initialClientKey ?? stored
  const active =
    preferred && availableClientKeys.includes(preferred) ? preferred : availableClientKeys[0]
  return (
    <div className={`ibm-theme ${styles.portal}`}>
      <header className="bg-light-blue flex flex-wrap items-center justify-between gap-3 px-6 py-3">
        <p className="text-xs font-extrabold tracking-[0.12em] text-white uppercase">
          Level 6 · Close the Deal
        </p>
        <nav aria-label="Choose client" className="flex flex-wrap items-center gap-2">
          {availableClientKeys.map((key) => (
            <button
              key={key}
              type="button"
              aria-current={!portfolio && active === key ? 'true' : undefined}
              onClick={() => {
                setPicked(key)
                setPortfolio(false)
              }}
              className={`rounded-full px-3 py-1 text-xs font-extrabold ${!portfolio && active === key ? 'text-dark-blue bg-white' : 'bg-white/20 text-white'}`}
            >
              {PERSONAS[key].name}
            </button>
          ))}
          <button
            type="button"
            className="rounded-full border border-white/70 px-3 py-1 text-xs font-bold text-white"
            aria-pressed={portfolio}
            onClick={() => setPortfolio(!portfolio)}
          >
            {portfolio ? 'Back to workspace' : 'My contracts'}
          </button>
        </nav>
      </header>
      {portfolio && <ContractHistory />}
      {!active && !portfolio && (
        <section className={styles.empty}>
          <FileCheck2 size={48} aria-hidden="true" />
          <h1>One more step before closing</h1>
          <p>
            Complete Level 5 with a client to unlock their contract. Your saved proposals determine
            which clients appear here.
          </p>
          <Link className={styles.primary} href="/levels/proposal-and-negotiation">
            Return to proposals <ArrowRight size={18} />
          </Link>
        </section>
      )}
      {availableClientKeys.map((key) => (
        <div key={key} className={styles.clientView} hidden={portfolio || key !== active}>
          <ClosingWorkspace persona={PERSONAS[key]} />
        </div>
      ))}
      <LevelNavigationControls level={6} client={active} />
    </div>
  )
}

function ClosingWorkspace({ persona }: { persona: ProposalPersona }) {
  const [terms, setTerms] = useState<ContractTerms>({ ...blankTerms })
  const [step, setStep] = useState<
    'terms' | 'review' | 'concerns' | 'result' | 'signature' | 'celebration'
  >('terms')
  const [exchanges, setExchanges] = useState<ClosingExchange[]>([])
  const [concern, setConcern] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [showReplayPrompt, setShowReplayPrompt] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof ContractTerms, string>>>({})

  function review(event: React.FormEvent) {
    event.preventDefault()
    const parsed = contractTermsSchema.safeParse(terms)
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof ContractTerms, string>> = {}
      for (const issue of parsed.error.issues)
        fieldErrors[issue.path[0] as keyof ContractTerms] = issue.message
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    setError('')
    setTerms(parsed.data)
    setStep('review')
  }

  async function getConcern(history: ClosingExchange[]) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      const data = z
        .object({ concern: z.string().min(1).max(700), round: z.number() })
        .parse(await request('concern', { personaKey: persona.key, terms, history }))
      if (data.round !== history.length + 1)
        throw new Error('The response was incomplete. Please try again.')
      setExchanges(history)
      setConcern(data.concern)
      setAnswer('')
      setStep('concerns')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The client could not respond. Please try again.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  async function finalise() {
    if (pending.current || !answer.trim()) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      const data = resultSchema.parse(
        await request('finalise', {
          personaKey: persona.key,
          terms,
          exchanges: [...exchanges, { concern, answer: answer.trim() }],
        })
      )
      setResult(data)
      setStep('result')
      setShowReplayPrompt(!data.completed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your result could not be saved. Please try again.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  function retry() {
    setStep('terms')
    setResult(null)
    setExchanges([])
    setConcern('')
    setAnswer('')
    setError('')
    setShowReplayPrompt(false)
  }
  const currentStep = step === 'terms' ? 0 : step === 'review' ? 1 : step === 'concerns' ? 2 : 3
  return (
    <div className={styles.workspace}>
      <aside className={styles.sidebar}>
        <p className={styles.eyebrow}>Your client</p>
        <div className={styles.avatar}>{persona.initials}</div>
        <h2>{persona.name}</h2>
        <p>{persona.role}</p>
        <strong>{persona.company}</strong>
        <hr />
        <p className={styles.eyebrow}>Keep their priorities in view</p>
        <ul>
          {persona.objectives.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <hr />
        <p className={styles.eyebrow}>Meeting notes</p>
        {persona.earlierNotes.map((note) => (
          <details key={note.id}>
            <summary>{note.title}</summary>
            <p>{note.detail}</p>
          </details>
        ))}
      </aside>
      <div className={styles.main}>
        <ol className={styles.steps} aria-label="Closing progress">
          {['Contract terms', 'Review', 'Final concerns', 'Outcome'].map((label, index) => (
            <li
              key={label}
              aria-current={currentStep === index ? 'step' : undefined}
              data-active={currentStep >= index}
            >
              <span>{currentStep > index ? <Check size={15} /> : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
        <div className={styles.contentScroll}>
          {step === 'terms' && (
            <form onSubmit={review} noValidate className={styles.card}>
              <p className={styles.eyebrow}>The final handshake</p>
              <h1>Let’s close the deal</h1>
              <p className={styles.intro}>
                Turn your agreed proposal into clear contract terms for {persona.company}. You’ll
                review these together before addressing the client’s final concerns.
              </p>
              <label htmlFor={`${persona.key}-scope`}>Agreed scope</label>
              <textarea
                id={`${persona.key}-scope`}
                rows={5}
                maxLength={1500}
                value={terms.scope}
                aria-invalid={Boolean(errors.scope)}
                aria-describedby={errors.scope ? `${persona.key}-scope-error` : undefined}
                onChange={(e) => setTerms({ ...terms, scope: e.target.value })}
                placeholder="Describe the agreed work, deliverables and boundaries."
              />
              {errors.scope && (
                <p id={`${persona.key}-scope-error`} className={styles.error} role="alert">
                  {errors.scope}
                </p>
              )}
              <div className={styles.fields}>
                <div>
                  <label htmlFor={`${persona.key}-investment`}>Final investment</label>
                  <input
                    id={`${persona.key}-investment`}
                    maxLength={100}
                    value={terms.investment}
                    onChange={(e) => setTerms({ ...terms, investment: e.target.value })}
                    placeholder="e.g. $25,000 AUD"
                    aria-invalid={Boolean(errors.investment)}
                  />
                  {errors.investment && (
                    <p className={styles.error} role="alert">
                      {errors.investment}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor={`${persona.key}-start`}>Proposed start date</label>
                  <input
                    id={`${persona.key}-start`}
                    type="date"
                    value={terms.startDate}
                    onChange={(e) => setTerms({ ...terms, startDate: e.target.value })}
                    aria-invalid={Boolean(errors.startDate)}
                  />
                  {errors.startDate && (
                    <p className={styles.error} role="alert">
                      {errors.startDate}
                    </p>
                  )}
                </div>
              </div>
              <label htmlFor={`${persona.key}-payment`}>Payment terms</label>
              <textarea
                id={`${persona.key}-payment`}
                rows={3}
                maxLength={500}
                value={terms.paymentTerms}
                onChange={(e) => setTerms({ ...terms, paymentTerms: e.target.value })}
                placeholder="Specify payment milestones and when each payment is due."
                aria-invalid={Boolean(errors.paymentTerms)}
              />
              {errors.paymentTerms && (
                <p className={styles.error} role="alert">
                  {errors.paymentTerms}
                </p>
              )}
              <div className={styles.actions}>
                <button className={styles.primary} type="submit">
                  Review contract <ArrowRight size={18} />
                </button>
              </div>
            </form>
          )}
          {step === 'review' && (
            <section className={styles.card}>
              <p className={styles.eyebrow}>Prepared for {persona.company}</p>
              <h1>Review your contract</h1>
              <p className={styles.intro}>
                Check the details before starting the final conversation. Terms stay fixed during
                this discussion.
              </p>
              <Terms terms={terms} />
              <div className={styles.actions}>
                <button
                  disabled={busy}
                  className={styles.secondary}
                  onClick={() => {
                    setStep('terms')
                    setError('')
                  }}
                >
                  Edit terms
                </button>
                <button
                  disabled={busy}
                  className={styles.primary}
                  onClick={() => void getConcern([])}
                >
                  {busy ? 'Waiting for client…' : 'Discuss final concerns'}
                  <ArrowRight size={18} />
                </button>
              </div>
            </section>
          )}
          {step === 'concerns' && (
            <section className={styles.card}>
              <p className={styles.eyebrow}>
                Final negotiation · message {exchanges.length + 1} of {MAX_CONCERN_ROUNDS}
              </p>
              <h1>Finish with confidence</h1>
              <details className={styles.contract}>
                <summary>Review agreed terms</summary>
                <Terms terms={terms} />
              </details>
              <div className={styles.conversation} aria-label="Negotiation conversation">
                {exchanges.map((exchange, index) => (
                  <div key={index}>
                    <blockquote>
                      <strong>{persona.name}</strong>
                      <p>{exchange.concern}</p>
                    </blockquote>
                    <p className={styles.playerMessage}>
                      <strong>You</strong>
                      <br />
                      {exchange.answer}
                    </p>
                  </div>
                ))}
                <blockquote>
                  <strong>{persona.name}</strong>
                  <p>{concern}</p>
                </blockquote>
                {busy && (
                  <p className={styles.typing} role="status">
                    {exchanges.length + 1 === MAX_CONCERN_ROUNDS
                      ? 'Finalising the deal…'
                      : `${persona.name} is typing…`}
                  </p>
                )}
              </div>
              <label htmlFor={`${persona.key}-answer`}>Your response</label>
              <textarea
                id={`${persona.key}-answer`}
                rows={5}
                maxLength={MAX_ANSWER_LENGTH}
                value={answer}
                disabled={busy}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Address the concern directly and agree on a practical next step."
              />
              <p className={styles.counter}>
                {answer.length} / {MAX_ANSWER_LENGTH} characters
              </p>
              <div className={styles.actions}>
                <button
                  className={styles.primary}
                  disabled={busy || !answer.trim()}
                  onClick={() =>
                    exchanges.length + 1 === MAX_CONCERN_ROUNDS
                      ? void finalise()
                      : void getConcern([...exchanges, { concern, answer: answer.trim() }])
                  }
                >
                  {busy
                    ? 'Waiting for client…'
                    : exchanges.length + 1 === MAX_CONCERN_ROUNDS
                      ? 'End negotiation and view outcome'
                      : 'Send response'}
                  <ArrowRight size={18} />
                </button>
              </div>
            </section>
          )}
          {step === 'result' && result && (
            <section className={`${styles.card} ${styles.result}`}>
              <div className={styles.resultIcon}>
                <Trophy size={34} />
              </div>
              <p className={styles.eyebrow}>Closing outcome</p>
              <h1>
                {result.outcome === 'signed'
                  ? 'Contract signed!'
                  : result.outcome === 'stalled'
                    ? 'A little more work to do'
                    : 'Deal not secured'}
              </h1>
              <p className={styles.intro}>
                {result.completed
                  ? 'Level 6 complete. Your result and progress have been saved.'
                  : 'Your attempt is saved. Review the feedback and try again to complete this level.'}
              </p>
              <div className={styles.total}>
                {result.overall}
                <span>/100</span>
              </div>
              <p>{result.closingLine}</p>
              <div className={styles.scores}>
                {SCORE_KEYS.map((key) => (
                  <div key={key}>
                    <strong>{result.scores[key]}/100</strong>
                    <span>{SCORE_LABELS[key]}</span>
                  </div>
                ))}
              </div>
              <div className={styles.feedback}>
                <h2>Coach feedback</h2>
                <p>{result.feedback}</p>
                {result.improvements.length > 0 && (
                  <ul>
                    {result.improvements.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
              {result.completed && (
                <div className={styles.rewards}>
                  <strong>+{result.xpAwarded} XP</strong>
                  {SKILL_KEYS.filter((key) => (result.skillsAwarded[key] ?? 0) > 0).map((key) => (
                    <span key={key}>
                      {SKILL_LABELS[key]} +{result.skillsAwarded[key]}
                    </span>
                  ))}
                  {result.xpAwarded === 0 && (
                    <span>No additional XP awarded for this attempt.</span>
                  )}
                </div>
              )}
              <div className={styles.actions}>
                {!result.completed && (
                  <button className={styles.secondary} onClick={retry}>
                    Revise and retry
                  </button>
                )}
                {result.completed ? (
                  <button className={styles.primary} onClick={() => setStep('signature')}>
                    Sign the contract <ArrowRight size={18} />
                  </button>
                ) : (
                  <Link className={styles.primary} href="/dashboard">
                    Return to lobby <ArrowRight size={18} />
                  </Link>
                )}
              </div>
            </section>
          )}
          {step === 'signature' && result?.completed && (
            <SignaturePrompt clientName={persona.name} onSigned={() => setStep('celebration')} />
          )}
          {step === 'celebration' && result?.completed && (
            <GameCompletionCelebration clientName={persona.name} />
          )}
          {showReplayPrompt && result && !result.completed && (
            <div className={styles.replayBackdrop}>
              <section
                className={styles.replayPrompt}
                role="dialog"
                aria-modal="true"
                aria-label="Try Level 6 again"
              >
                <p className={styles.eyebrow}>The deal is still open</p>
                <h2>
                  {result.outcome === 'stalled'
                    ? 'Your client needs more confidence'
                    : 'The contract was not signed'}
                </h2>
                <p>Review the coach feedback, then replay Level 6 when you are ready.</p>
                <div className={styles.actions}>
                  <button className={styles.primary} onClick={retry}>
                    Replay Level 6
                  </button>
                  <button className={styles.secondary} onClick={() => setShowReplayPrompt(false)}>
                    View feedback
                  </button>
                </div>
              </section>
            </div>
          )}
          {busy && step === 'review' && (
            <p role="status" className={styles.status}>
              <LoaderCircle className={styles.spinner} size={18} /> {persona.name} is typing…
            </p>
          )}
          {error && (
            <div className={styles.error} role="alert">
              {error}
              <p>
                Your terms and response are still here. You can retry using the same button above.
              </p>
              {error.includes('session') && <Link href="/auth/signin">Sign in again</Link>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Terms({ terms }: { terms: ContractTerms }) {
  return (
    <dl className={styles.terms}>
      {(
        [
          ['scope', 'Agreed scope'],
          ['investment', 'Investment'],
          ['startDate', 'Start date'],
          ['paymentTerms', 'Payment terms'],
        ] as const
      ).map(([key, label]) => (
        <div key={key}>
          <dt>{label}</dt>
          <dd>{terms[key]}</dd>
        </div>
      ))}
    </dl>
  )
}

function SignaturePrompt({ clientName, onSigned }: { clientName: string; onSigned: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)
  const [typedName, setTypedName] = useState('')

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget
    const bounds = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    }
  }

  function begin(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget
    const context = canvas.getContext('2d')
    if (!context) return
    const { x, y } = point(event)
    canvas.setPointerCapture(event.pointerId)
    drawing.current = true
    context.strokeStyle = '#1f4e79'
    context.lineWidth = 3
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + 0.1, y + 0.1)
    context.stroke()
    setHasInk(true)
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const context = event.currentTarget.getContext('2d')
    if (!context) return
    const { x, y } = point(event)
    context.lineTo(x, y)
    context.stroke()
  }

  function end(event: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function clear() {
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
    setTypedName('')
  }

  return (
    <div className={styles.signatureBackdrop}>
      <section
        className={styles.signaturePrompt}
        role="dialog"
        aria-modal="true"
        aria-label="Sign the contract"
      >
        <p className={styles.eyebrow}>One final moment</p>
        <h1>“Can I have your signature?”</h1>
        <p>{clientName} is ready to sign. Add your game signature to seal the deal.</p>
        <canvas
          ref={canvasRef}
          className={styles.signatureCanvas}
          width={640}
          height={180}
          aria-label="Draw your signature with a mouse, stylus or finger"
          onPointerDown={begin}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
        <label className={styles.signatureLabel} htmlFor="typed-game-signature">
          Or type your name
        </label>
        <input
          id="typed-game-signature"
          value={typedName}
          onChange={(event) => setTypedName(event.target.value)}
          placeholder="Your name"
          maxLength={80}
        />
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={clear}>
            Clear
          </button>
          <button
            type="button"
            className={styles.primary}
            disabled={!hasInk && typedName.trim().length < 2}
            onClick={onSigned}
          >
            Complete the game <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  )
}

function GameCompletionCelebration({ clientName }: { clientName: string }) {
  return (
    <div className={styles.completionScreen} role="status">
      <div className={styles.confetti} aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => (
          <span
            key={index}
            style={{ left: `${(index * 37) % 100}%`, animationDelay: `${(index % 8) * -0.23}s` }}
          />
        ))}
      </div>
      <div className={styles.completionCard}>
        <p className={styles.eyebrow}>All six stages complete</p>
        <Trophy className={styles.completionTrophy} size={74} aria-hidden="true" />
        <h1>Consulting journey complete!</h1>
        <p>
          You closed the deal with {clientName}. Every stage of your consulting journey is complete.
        </p>
        <Link className={styles.primary} href="/dashboard">
          Return to the lobby <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  )
}

function ContractHistory() {
  const [data, setData] = useState<{
    contracts: ContractSummary[]
    contractsClosed: number
  } | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    request('contracts')
      .then((value) => {
        const result = value as { contracts?: ContractSummary[]; contractsClosed?: number }
        if (!Array.isArray(result?.contracts) || typeof result.contractsClosed !== 'number')
          throw new Error('Contract history could not be loaded.')
        if (!cancelled)
          setData({ contracts: result.contracts, contractsClosed: result.contractsClosed })
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Contract history could not be loaded.')
      })
    return () => {
      cancelled = true
    }
  }, [attempt])
  return (
    <section className={`${styles.history} ${styles.card}`}>
      <p className={styles.eyebrow}>Your consulting portfolio</p>
      <h1>My contracts</h1>
      {error ? (
        <div role="alert" className={styles.error}>
          {error}
          <button
            className={styles.secondary}
            onClick={() => {
              setError('')
              setAttempt(attempt + 1)
            }}
          >
            Retry
          </button>
        </div>
      ) : !data ? (
        <p role="status">Loading your contracts…</p>
      ) : (
        <>
          <p className={styles.intro}>
            {data.contractsClosed} client{data.contractsClosed === 1 ? '' : 's'} with signed
            contracts
          </p>
          {!data.contracts.length && (
            <p>No contracts yet. Your finalised deals will appear here.</p>
          )}
          {data.contracts.map((contract) => (
            <details key={contract.id} className={styles.contract}>
              <summary>
                {PERSONAS[contract.personaKey as PersonaKey]?.name ?? contract.personaKey} ·{' '}
                {contract.outcome} · {contract.overall}/100
              </summary>
              {contract.createdAt > 0 && <p>{new Date(contract.createdAt).toLocaleDateString()}</p>}
              <Terms terms={contract.terms} />
              <p>{contract.feedback}</p>
              {contract.improvements.length > 0 && (
                <ul>
                  {contract.improvements.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </details>
          ))}
        </>
      )}
    </section>
  )
}
