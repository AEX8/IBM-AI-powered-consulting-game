'use client'

import { useAuth } from '@/hooks/useAuth'

export default function SignOutButton() {
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    window.location.replace('/')
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-full bg-[#001d6c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002d9c]"
    >
      Sign out
    </button>
  )
}
