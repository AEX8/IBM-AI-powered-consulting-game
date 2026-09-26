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
     * The thick outline, flat shadow and soft blue surfaces establish
     * the cartoon style without requiring repeated markup on every auth page.
     */
    <section
      className={`w-full max-w-[440px] overflow-hidden rounded-xl border-[4px] border-[#001d6c] bg-[#d0e2ff] shadow-[8px_8px_0_rgba(0,29,108,0.18)] ${
        centred ? 'text-center' : ''
      }`}
    >
      {/*
       * The small blue strip resembles a game window's title bar.
       * Keeping the project name here ensures every auth route remains clearly
       * connected to the IBM Consultancy 101 experience.
       */}
      <div className="flex min-h-10 items-center border-b-[4px] border-[#001d6c] bg-[#001d6c] px-5 py-2">
        <p className="text-xs font-semibold tracking-wide text-white">IBM CONSULTANCY 101</p>

        {/*
         * These circles are decorative window controls. They reinforce the
         * playful interface without acting like real buttons.
         */}
        <div className="ml-auto flex items-center gap-1.5" aria-hidden="true">
          <span className="block h-2.5 w-2.5 rounded-full border border-white/70 bg-[#78a9ff]" />
          <span className="block h-2.5 w-2.5 rounded-full border border-white/70 bg-[#a6c8ff]" />
        </div>
      </div>

      {/*
       * Dark heading text keeps the pale blue card readable
       * and matching the sign-in wireframe supplied by the UX designer.
       */}
      <header className="px-6 pt-6 pb-5 sm:px-7">
        <h1 className="text-[clamp(1.7rem,5vw,2rem)] leading-tight font-semibold text-[#001d6c]">
          {title}
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#243b53]">{description}</p>
      </header>

      {/*
       * Form fields sit inside a separate white panel. The outline makes
       * the form feel like a contained game interface rather than a generic
       * website card.
       */}
      <div className="text-charcoal mx-5 rounded-lg border-[4px] border-[#a6c8ff] bg-white p-5 shadow-[inset_0_-3px_0_rgba(0,45,156,0.08)] sm:mx-6 sm:p-6">
        {children}
      </div>

      {/*
       * Footer links remain outside the form panel so actions such as account
       * creation and returning to sign in are visually secondary.
       */}
      {footer && <div className="px-6 py-5 text-center text-sm text-[#001d6c]">{footer}</div>}

      {/*
       * Pages without a footer still need breathing room below the form panel.
       * Reset-sent is the current example of this layout.
       */}
      {!footer && <div className="h-6" aria-hidden="true" />}
    </section>
  )
}
