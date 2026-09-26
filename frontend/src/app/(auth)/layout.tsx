import type { Metadata } from 'next'
import SkylineBackground from '@/components/auth/SkylineBackground'

export const metadata: Metadata = {
  title: 'Consultant Academy',
}

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    /*
     * The shared authentication layout supplies the background while each
     * individual route supplies its own form card.
     */
    <main className="bg-sky-blue relative isolate flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <SkylineBackground />

      <div className="relative z-10 flex w-full justify-center">{children}</div>
    </main>
  )
}
