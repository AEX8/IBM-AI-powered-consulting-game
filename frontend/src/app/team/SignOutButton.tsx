'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function SignOutButton() {
  const router = useRouter()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    router.replace('/auth/signin')
    router.refresh()
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
