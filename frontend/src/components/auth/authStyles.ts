/**
 * Shared authentication control styles.
 *
 * Keeping these styles in one place prevents sign-in, sign-up and reset pages
 * from slowly developing different visual treatments.
 */

export const authInputClassName =
  'h-11 w-full rounded-lg border-[3px] border-charcoal bg-white px-3 text-sm text-charcoal outline-none placeholder:text-charcoal/45 shadow-[inset_0_-2px_0_rgba(138,90,38,0.14)] transition focus:border-dark-blue focus:ring-3 focus:ring-[var(--focus-ring)] aria-invalid:border-red-700'

export const authPrimaryButtonClassName =
  'flex h-11 w-full items-center justify-center rounded-lg border-[3px] border-charcoal bg-plant-green px-4 text-sm font-semibold text-white shadow-[4px_4px_0_#000] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#4f7d41] hover:shadow-[2px_2px_0_#000] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60'

export const authInlineLinkClassName =
  'inline-block text-sm font-semibold text-dark-blue underline decoration-2 underline-offset-3 transition hover:text-building-near'
