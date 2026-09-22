'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthCard from '@/components/auth/AuthCard'
import ElevatorIntro from '@/components/auth/ElevatorIntro'
import { FullPageSpinner, LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { authPrimaryButtonClassName } from '@/components/auth/authStyles'

// Fixed demo account for the showcase event — no typing, no clicking. This
// account only ever exists in the isolated demo Firebase project and holds
// no real data. Must match scripts/seed-demo-account.js exactly.
const DEMO_EMAIL = 'demo@team9-showcase.dev'
const DEMO_PASSWORD = 'IbmDemo2026!'

export default function SignInPage() {
  const router = useRouter()
  const signingIn = useRef(false)
  const { user, loading, signInWithEmail } = useAuth()
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  /*
   * Already-authenticated users should not be able to remain on the login
   * page. This preserves the existing application behaviour.
   */
  useEffect(() => {
    if (!loading && user && !signingIn.current) {
      router.replace('/dashboard')
    }
  }, [loading, user, router])

  /*
   * Demo build: the moment this page is ready, sign in with the fixed demo
   * account automatically. Nobody at the event should have to type or click
   * anything to get in. `attempt` exists only so the "Try again" button below
   * can force this to run again after a failure.
   */
  useEffect(() => {
    if (loading || user || signingIn.current) return

    signingIn.current = true
    setError('')

    signInWithEmail(DEMO_EMAIL, DEMO_PASSWORD)
      .then(() => {
        router.replace('/dashboard?arrival=signin')
        router.refresh()
      })
      .catch(() => {
        signingIn.current = false
        setError('Could not sign in automatically.')
      })
  }, [loading, user, signInWithEmail, router, attempt])

  function retry() {
    signingIn.current = false
    setError('')
    setAttempt((count) => count + 1)
  }

  return (
    <>
      {/*
       * ElevatorIntro always mounts immediately, even while Firebase is checking
       * the existing session. This prevents the skyline spinner from flashing
       * before the lift appears.
       */}
      <ElevatorIntro />

      {loading ? (
        <FullPageSpinner />
      ) : (
        <AuthCard title="Going up?" description="Preparing your workspace..." centred>
          {error ? (
            <div className="space-y-4">
              <p className="text-sm text-white">{error}</p>
              <button onClick={retry} className={authPrimaryButtonClassName} type="button">
                Try again
              </button>
            </div>
          ) : (
            <div className="flex justify-center py-2">
              <LoadingSpinner size="lg" className="border-white/30 border-t-white" />
            </div>
          )}
        </AuthCard>
      )}
    </>
  )
}