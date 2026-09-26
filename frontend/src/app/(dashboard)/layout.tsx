import { redirect } from 'next/navigation'
import { getServerSession } from '@/actions/auth.actions'
import LandingHeader from '@/components/landing/LandingHeader'

/**
 * Protects all dashboard pages with the Firebase server session.
 *
 * LandingHeader restores the hamburger menu, centred project title and
 * sign-out button across the landing and profile pages.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="bg-warm-cream min-h-screen">
      <LandingHeader />
      <main>{children}</main>
    </div>
  )
}
