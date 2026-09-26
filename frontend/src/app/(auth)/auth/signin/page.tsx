'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthCard from '@/components/auth/AuthCard'
import ElevatorIntro from '@/components/auth/ElevatorIntro'
import { FullPageSpinner, LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { authPrimaryButtonClassName } from '@/components/auth/authStyles'

export default function SignInPage() {
  const router = useRouter()
  const signingIn = useRef(false)
  const { user, loading, signInAsGuest } = useAuth()
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
   * Demo build: the moment this page is ready, create a fresh guest account
   * for this browser/device automatically. Nobody at the event should have to
   * type or click anything to get in, and each visitor gets their own isolated
   * progress instead of sharing one save file. `attempt` exists only so the
   * "Try again" button below can force this to run again after a failure.
   */
  useEffect(() => {
    if (loading || user || signingIn.current) return

    signingIn.current = true
    setError('')

    signInAsGuest()
      .then(() => {
        router.replace('/dashboard?arrival=signin')
        router.refresh()
      })
      .catch(() => {
        signingIn.current = false
        setError('Could not sign in automatically.')
      })
  }, [loading, user, signInAsGuest, router, attempt])

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