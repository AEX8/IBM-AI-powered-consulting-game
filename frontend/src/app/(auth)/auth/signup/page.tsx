'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import AuthCard from '@/components/auth/AuthCard'
import { FullPageSpinner } from '@/components/shared/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { signupSchema, type SignupInput } from '@/lib/validations/auth'
import { authInputClassName, authPrimaryButtonClassName } from '@/components/auth/authStyles'

export default function SignUpPage() {
  const router = useRouter()
  const { user, loading, signUpWithEmail } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  })

  useEffect(() => {
    if (!loading && !isSubmitting && user) {
      router.replace('/dashboard')
    }
  }, [loading, isSubmitting, user, router])

  if (loading) {
    return <FullPageSpinner />
  }

  const onSubmit = async (data: SignupInput) => {
    try {
      /*
       * Firebase only receives the email, password and display name.
       * confirmPassword remains a client-side safety check.
       */
      await signUpWithEmail(data.email, data.password, data.displayName)
      router.push('/auth/signin?verification=sent')
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('email-already-in-use')) {
        toast.error('An account with this email already exists.')
      } else {
        toast.error('Failed to create account. Please try again.')
      }
    }
  }

  return (
    <AuthCard
      title="Join the academy"
      description="Create your consultant profile before travelling to floor 12."
      footer={
        <p>
          Already registered?{' '}
          <Link
            href="/auth/signin"
            className="hover:text-light-blue font-medium text-white underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium">
            Full name
          </label>

          <input
            id="displayName"
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            aria-invalid={Boolean(errors.displayName)}
            aria-describedby={errors.displayName ? 'display-name-error' : undefined}
            className={authInputClassName}
            {...register('displayName')}
          />

          {errors.displayName && (
            <p
              id="display-name-error"
              className="mt-1 text-xs font-medium text-red-700"
              role="alert"
            >
              {errors.displayName.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>

          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'signup-email-error' : undefined}
            className={authInputClassName}
            {...register('email')}
          />

          {errors.email && (
            <p
              id="signup-email-error"
              className="mt-1 text-xs font-medium text-red-700"
              role="alert"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            Password
          </label>

          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a secure password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'signup-password-error' : 'password-help'}
            className={authInputClassName}
            {...register('password')}
          />

          {errors.password ? (
            <p
              id="signup-password-error"
              className="mt-1 text-xs font-medium text-red-700"
              role="alert"
            >
              {errors.password.message}
            </p>
          ) : (
            <p id="password-help" className="text-charcoal/70 mt-1 text-xs">
              Use at least 8 characters, one uppercase letter and one number.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium">
            Confirm password
          </label>

          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
            className={authInputClassName}
            {...register('confirmPassword')}
          />

          {errors.confirmPassword && (
            <p
              id="confirm-password-error"
              className="mt-1 text-xs font-medium text-red-700"
              role="alert"
            >
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button type="submit" disabled={isSubmitting} className={authPrimaryButtonClassName}>
          {isSubmitting ? 'Creating profile...' : 'Create consultant profile'}
        </button>
      </form>
    </AuthCard>
  )
}
