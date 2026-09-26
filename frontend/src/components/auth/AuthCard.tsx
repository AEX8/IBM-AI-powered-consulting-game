import type { ReactNode } from 'react'

/**
 * Content supplied by each authentication route.
 *
 * The shared card owns the visual structure, while each page remains
 * responsible for its own form fields and Firebase behaviour.
 */
type AuthCardProps = {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
  centred?: boolean
}

export default function AuthCard({
  title,
  description,
  children,
  footer,
  centred = false,
}: AuthCardProps) {
  return (
    /*
     * Every authentication screen uses this same outer structure.
     *
     * The thick outline, flat shadow, orange brand strip and navy body establish
     * the cartoon style without requiring repeated markup on every auth page.
     */
    <section
      className={`border-charcoal bg-dark-blue w-full max-w-[440px] overflow-hidden rounded-xl border-[4px] shadow-[8px_8px_0_rgba(44,44,42,0.28)] ${
        centred ? 'text-center' : ''
      }`}
    >
      {/*
       * The small orange strip resembles a game window's title bar.
       * Keeping the project name here ensures every auth route remains clearly
       * connected to the IBM Consultancy 101 experience.
       */}
      <div className="border-charcoal bg-honey-wood flex min-h-10 items-center border-b-[4px] px-5 py-2">
        <p className="text-charcoal text-xs font-semibold tracking-wide">IBM CONSULTANCY 101</p>

        {/*
         * These circles are decorative window controls. They reinforce the
         * playful interface without acting like real buttons.
         */}
        <div className="ml-auto flex items-center gap-1.5" aria-hidden="true">
          <span className="border-charcoal block h-2.5 w-2.5 rounded-full border bg-[#f4d06f]" />
          <span className="border-charcoal block h-2.5 w-2.5 rounded-full border bg-[#7eb6e0]" />
        </div>
      </div>

      {/*
       * The heading remains on the navy background, providing strong contrast
       * and matching the sign-in wireframe supplied by the UX designer.
       */}
      <header className="px-6 pt-6 pb-5 sm:px-7">
        <h1 className="text-[clamp(1.7rem,5vw,2rem)] leading-tight font-semibold text-white">
          {title}
        </h1>

        <p className="text-cloud-white/80 mt-2 text-sm leading-6">{description}</p>
      </header>

      {/*
       * Form fields sit inside a separate cream panel. The dark outline makes
       * the form feel like a contained game interface rather than a generic
       * website card.
       */}
      <div className="bg-warm-cream text-charcoal mx-5 rounded-lg border-[4px] border-[#b88900] p-5 shadow-[inset_0_-3px_0_rgba(138,90,38,0.14)] sm:mx-6 sm:p-6">
        {children}
      </div>

      {/*
       * Footer links remain outside the form panel so actions such as account
       * creation and returning to sign in are visually secondary.
       */}
      {footer && <div className="text-cloud-white/90 px-6 py-5 text-center text-sm">{footer}</div>}

      {/*
       * Pages without a footer still need breathing room below the cream panel.
       * Reset-sent is the current example of this layout.
       */}
      {!footer && <div className="h-6" aria-hidden="true" />}
    </section>
  )
}
