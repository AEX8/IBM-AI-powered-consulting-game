import type { Metadata } from 'next'
import { getServerSession } from '@/actions/auth.actions'

export const metadata: Metadata = {
  title: 'Profile',
}

export default async function ProfilePage() {
  const session = await getServerSession()

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-charcoal text-2xl font-extrabold">Profile</h1>
      <p className="mt-1 text-sm font-medium text-[#3d3d3d]">Your account details.</p>

      <div className="border-charcoal bg-cloud-white mt-6 rounded-xl border-[3px] p-5 shadow-[4px_4px_0_var(--charcoal)]">
        <p className="text-dark-blue text-xs font-extrabold tracking-wide uppercase">Email</p>
        <p className="text-charcoal mt-1 text-sm font-semibold">
          {session?.email ?? 'Guest session — no email on this account'}
        </p>
      </div>
    </div>
  )
}
