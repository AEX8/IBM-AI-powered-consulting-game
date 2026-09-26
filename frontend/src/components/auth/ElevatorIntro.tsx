'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

type IntroPhase = 'typing' | 'opening' | 'leaving' | 'hidden'

const ELEVATOR_TITLE = 'IBM CONSULTANCY 101'

/**
 * Large decorative plant positioned directly beside the elevator.
 *
 * The plant uses CSS shapes, so we do not need additional image files.
 * It is anchored to the bottom of the screen to prevent it from floating.
 */
function CartoonPlant({ side }: { side: 'left' | 'right' }) {
  /*
   * The elevator is 68vw wide, with a maximum width of 820px.
   * This calculation places each plant just outside the elevator frame.
   */
  const position =
    side === 'left'
      ? { right: 'calc(50% + min(34vw, 410px) + 8px)' }
      : { left: 'calc(50% + min(34vw, 410px) + 8px)' }

  return (
    <div
      className="absolute bottom-0 z-[65] hidden origin-bottom scale-75 md:block lg:scale-100"
      style={position}
      aria-hidden="true"
    >
      <div className="relative h-64 w-44">
        {/* Left leaf */}
        <div className="border-charcoal bg-plant-green absolute bottom-20 left-0 h-36 w-20 -rotate-[30deg] rounded-[55%] border-[5px]" />

        {/* Tall middle leaf */}
        <div className="border-charcoal bg-plant-green absolute bottom-20 left-12 h-44 w-20 -rotate-[8deg] rounded-[55%] border-[5px]" />

        {/* Right leaf */}
        <div className="border-charcoal bg-plant-green absolute right-0 bottom-20 h-36 w-20 rotate-[30deg] rounded-[55%] border-[5px]" />

        {/* Plant pot */}
        <div className="border-charcoal bg-honey-wood absolute right-0 bottom-0 left-0 h-24 rounded-t-xl rounded-b-3xl border-[5px] shadow-[0_8px_0_rgba(44,44,42,0.22)]">
          <div className="border-wood-shadow absolute inset-x-3 top-4 border-t-[5px]" />
        </div>
      </div>
    </div>
  )
}

export default function ElevatorIntro() {
  const reduceMotion = useReducedMotion()

  /*
   * The animation begins by typing the project title.
   * Once typing finishes, the doors open and the whole intro fades away.
   */
  const [phase, setPhase] = useState<IntroPhase>('typing')

  /*
   * Timer IDs are stored so clicking "Skip animation" can cancel every
   * scheduled animation. This prevents the elevator from briefly reappearing.
   */
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    const registerTimer = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(callback, delay)
      timersRef.current.push(timer)
    }

    if (reduceMotion) {
      /*
       * Users who prefer reduced motion should not have to watch the full
       * sequence. Using a timer avoids updating state directly in the effect.
       */
      registerTimer(() => {
        setPhase('hidden')
      }, 0)
    } else {
      /*
       * Animation timeline:
       *
       * 0–2.3 seconds: title appears letter by letter.
       * 2.3–4.1 seconds: elevator doors open.
       * 4.1–4.55 seconds: intro fades away.
       */
      registerTimer(() => {
        setPhase('opening')
      }, 2300)

      registerTimer(() => {
        setPhase('leaving')
      }, 4100)

      registerTimer(() => {
        setPhase('hidden')
      }, 4550)
    }

    return () => {
      timersRef.current.forEach((timer) => {
        window.clearTimeout(timer)
      })

      timersRef.current = []
    }
  }, [reduceMotion])

  const skipIntro = () => {
    /*
     * Cancel all pending phases before hiding the intro.
     * Otherwise an old timer could change the phase after Skip is clicked.
     */
    timersRef.current.forEach((timer) => {
      window.clearTimeout(timer)
    })

    timersRef.current = []
    setPhase('hidden')
  }

  /*
   * Completely remove the intro after it finishes.
   * This prevents the doors from resetting and becoming visible again.
   */
  if (phase === 'hidden') {
    return null
  }

  const doorsAreOpening = phase === 'opening' || phase === 'leaving'

  return (
    <motion.div
      className="bg-warm-cream fixed inset-0 z-50 overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'leaving' ? 0 : 1 }}
      transition={{ duration: 0.45 }}
      aria-label="IBM Consultancy 101 elevator opening"
    >
      {/*
       * Warm striped wallpaper creates the cosy cartoon lobby appearance
       * without requiring a separate background image.
       */}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,#f4ede1_0px,#f4ede1_44px,#faf6ee_44px,#faf6ee_88px)]" />

      {/* Checkerboard lobby floor */}
      <div className="border-charcoal absolute inset-x-0 bottom-0 h-[34%] border-t-[4px] bg-[conic-gradient(from_90deg_at_1px_1px,#d9d4c8_90deg,#f4ede1_0)_0_0/48px_48px]" />

      {/* Wooden trim separating the wall and floor */}
      <div className="border-charcoal bg-wood-shadow absolute inset-x-0 bottom-[34%] z-10 h-4 border-y-[3px]" />

      {/* Allows the user to immediately dismiss the intro. */}
      <button
        type="button"
        onClick={skipIntro}
        className="border-charcoal bg-dark-blue hover:bg-building-near absolute top-4 right-4 z-[90] rounded-lg border-[3px] px-4 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_var(--charcoal)] transition"
      >
        Skip animation
      </button>

      {/*
       * The elevator now reaches the bottom of the screen.
       * Moving the bottom edge to zero makes it feel grounded on the floor.
       */}
      <div className="border-charcoal bg-honey-wood absolute top-[6%] bottom-0 left-1/2 z-40 w-[min(68vw,820px)] -translate-x-1/2 overflow-hidden rounded-t-[170px] border-[8px] p-4 shadow-[8px_8px_0_rgba(44,44,42,0.25)]">
        {/* Dark elevator interior revealed as the doors open */}
        <div className="bg-charcoal absolute inset-4 z-[45] rounded-t-[145px]" />

        {/* Floor indicator */}
        <div className="border-charcoal bg-charcoal absolute top-2 left-1/2 z-[75] flex h-12 w-32 -translate-x-1/2 items-center justify-center gap-3 rounded-2xl border-[4px] text-lg font-semibold text-white shadow-[4px_4px_0_rgba(44,44,42,0.22)]">
          <motion.span
            className="text-light-blue"
            aria-hidden="true"
            animate={{
              y: [2, -2, 2],
              opacity: [0.65, 1, 0.65],
            }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            ▲
          </motion.span>

          <span className="text-light-blue">12</span>
        </div>

        {/* Left elevator door */}
        <motion.div
          className="border-charcoal bg-lift-silver-light absolute top-16 bottom-4 left-4 z-[55] w-[calc(50%_-_16px)] overflow-hidden rounded-tl-[125px] border-[4px]"
          initial={{ x: '0%' }}
          animate={{ x: doorsAreOpening ? '-110%' : '0%' }}
          transition={{
            duration: 1.3,
            ease: [0.65, 0, 0.35, 1],
          }}
        >
          {/* Recessed door panel */}
          <div className="border-charcoal absolute inset-5 rounded-tl-[100px] border-[5px]" />

          {/* Decorative door rails */}
          <div className="border-charcoal bg-honey-wood absolute inset-x-0 top-[25%] h-2 border-y-2" />
          <div className="border-charcoal bg-honey-wood absolute inset-x-0 bottom-[8%] h-2 border-y-2" />
        </motion.div>

        {/* Right elevator door */}
        <motion.div
          className="border-charcoal bg-lift-silver-light absolute top-16 right-4 bottom-4 z-[55] w-[calc(50%_-_16px)] overflow-hidden rounded-tr-[125px] border-[4px]"
          initial={{ x: '0%' }}
          animate={{ x: doorsAreOpening ? '110%' : '0%' }}
          transition={{
            duration: 1.3,
            ease: [0.65, 0, 0.35, 1],
          }}
        >
          {/* Recessed door panel */}
          <div className="border-charcoal absolute inset-5 rounded-tr-[100px] border-[5px]" />

          {/* Decorative door rails */}
          <div className="border-charcoal bg-honey-wood absolute inset-x-0 top-[25%] h-2 border-y-2" />
          <div className="border-charcoal bg-honey-wood absolute inset-x-0 bottom-[8%] h-2 border-y-2" />
        </motion.div>

        {/* Centre seam disappears immediately before the doors separate. */}
        <motion.div
          className="bg-charcoal absolute top-16 bottom-4 left-1/2 z-[58] w-[5px] -translate-x-1/2"
          initial={{ opacity: 1 }}
          animate={{ opacity: doorsAreOpening ? 0 : 1 }}
          transition={{ duration: 0.15 }}
          aria-hidden="true"
        />

        {/*
         * The sign is positioned above the exact centre of the elevator.
         * Each character animates independently to create the typing effect.
         */}
        <motion.div
          className="border-charcoal bg-warm-cream absolute top-[40%] left-1/2 z-[65] flex w-[78%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border-[5px] px-4 py-5 text-[clamp(0.9rem,2.8vw,2.3rem)] font-semibold whitespace-nowrap text-[#4b3525] shadow-[5px_5px_0_rgba(44,44,42,0.25)]"
          initial={{ opacity: 1, scale: 1 }}
          animate={{
            opacity: doorsAreOpening ? 0 : 1,
            scale: doorsAreOpening ? 0.96 : 1,
          }}
          transition={{ duration: 0.3 }}
          aria-label={ELEVATOR_TITLE}
        >
          {Array.from(ELEVATOR_TITLE).map((character, index) => (
            <motion.span
              /*
               * The index is safe here because the title is a fixed string
               * whose character order never changes.
               */
              key={`${character}-${index}`}
              className={character === ' ' ? 'w-[0.35em]' : undefined}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.28,
                delay: index * 0.075,
                ease: 'easeOut',
              }}
              aria-hidden="true"
            >
              {character === ' ' ? '\u00A0' : character}
            </motion.span>
          ))}
        </motion.div>
      </div>

      {/* Large plants grounded beside the elevator */}
      <CartoonPlant side="left" />
      <CartoonPlant side="right" />

      {/*
       * Elevator call buttons are positioned just outside the right edge of
       * the elevator rather than against the edge of the browser window.
       */}
      <div
        className="border-charcoal bg-lift-silver-light absolute top-[43%] z-[80] hidden -translate-y-1/2 flex-col gap-3 rounded-lg border-[4px] p-3 shadow-[4px_4px_0_rgba(44,44,42,0.22)] md:flex"
        style={{
          left: 'calc(50% + min(34vw, 410px) + 24px)',
        }}
        aria-label="Elevator controls"
      >
        <span className="border-charcoal bg-cloud-white text-charcoal flex h-10 w-10 items-center justify-center rounded-full border-[3px] text-base font-bold">
          ▲
        </span>

        <span className="border-charcoal bg-cloud-white text-charcoal flex h-10 w-10 items-center justify-center rounded-full border-[3px] text-base font-bold">
          ▼
        </span>
      </div>
    </motion.div>
  )
}
