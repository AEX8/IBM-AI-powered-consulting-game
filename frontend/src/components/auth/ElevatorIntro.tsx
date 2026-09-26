'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

type IntroPhase = 'typing' | 'opening' | 'leaving' | 'hidden'

const IBM_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg'

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
        <div className="border-charcoal absolute bottom-20 left-0 h-36 w-20 -rotate-[30deg] rounded-[55%] border-[5px] bg-[#5b8c4a]" />

        {/* Tall middle leaf */}
        <div className="border-charcoal absolute bottom-20 left-12 h-44 w-20 -rotate-[8deg] rounded-[55%] border-[5px] bg-[#5b8c4a]" />

        {/* Right leaf */}
        <div className="border-charcoal absolute right-0 bottom-20 h-36 w-20 rotate-[30deg] rounded-[55%] border-[5px] bg-[#5b8c4a]" />

        {/* Plant pot */}
        <div className="border-charcoal absolute right-0 bottom-0 left-0 h-24 rounded-t-xl rounded-b-3xl border-[5px] bg-[#8a5a26] shadow-[0_8px_0_rgba(44,44,42,0.22)]">
          <div className="absolute inset-x-3 top-4 border-t-[5px] border-[#5b3a20]" />
        </div>
      </div>
    </div>
  )
}

export default function ElevatorIntro() {
  const reduceMotion = useReducedMotion()

  /*
   * The logo appears before the doors open and the intro fades away.
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
       * 0–2.3 seconds: the IBM logo appears.
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
      className="fixed inset-0 z-50 overflow-hidden bg-white"
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'leaving' ? 0 : 1 }}
      transition={{ duration: 0.45 }}
      aria-label="IBM elevator opening"
    >
      {/*
       * Warm striped wallpaper creates the cosy cartoon lobby appearance
       * without requiring a separate background image.
       */}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,#ffffff_0px,#ffffff_44px,#edf5ff_44px,#edf5ff_88px)]" />

      {/* Checkerboard lobby floor */}
      <div className="border-charcoal absolute inset-x-0 bottom-0 h-[34%] border-t-[4px] bg-[conic-gradient(from_90deg_at_1px_1px,#d0e2ff_90deg,#edf5ff_0)_0_0/48px_48px]" />

      {/* Wooden trim separating the wall and floor */}
      <div className="border-charcoal absolute inset-x-0 bottom-[34%] z-10 h-4 border-y-[3px] bg-[#a6c8ff]" />

      {/* Allows the user to immediately dismiss the intro. */}
      <button
        type="button"
        onClick={skipIntro}
        className="border-charcoal absolute top-4 right-4 z-[90] rounded-lg border-[3px] bg-[#002d9c] px-4 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_var(--charcoal)] transition hover:bg-[#002d9c]"
      >
        Skip animation
      </button>

      {/*
       * The elevator now reaches the bottom of the screen.
       * Moving the bottom edge to zero makes it feel grounded on the floor.
       */}
      <div className="border-charcoal absolute top-[6%] bottom-0 left-1/2 z-40 w-[min(68vw,820px)] -translate-x-1/2 overflow-hidden rounded-t-[170px] border-[8px] bg-[#d0e2ff] p-4 shadow-[8px_8px_0_rgba(44,44,42,0.25)]">
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
          className="border-charcoal absolute top-16 bottom-4 left-4 z-[55] w-[calc(50%_-_16px)] overflow-hidden rounded-tl-[125px] border-[4px] bg-[#edf5ff]"
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
          <div className="border-charcoal absolute inset-x-0 top-[25%] h-2 border-y-2 bg-[#a6c8ff]" />
          <div className="border-charcoal absolute inset-x-0 bottom-[8%] h-2 border-y-2 bg-[#a6c8ff]" />
        </motion.div>

        {/* Right elevator door */}
        <motion.div
          className="border-charcoal absolute top-16 right-4 bottom-4 z-[55] w-[calc(50%_-_16px)] overflow-hidden rounded-tr-[125px] border-[4px] bg-[#edf5ff]"
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
          <div className="border-charcoal absolute inset-x-0 top-[25%] h-2 border-y-2 bg-[#a6c8ff]" />
          <div className="border-charcoal absolute inset-x-0 bottom-[8%] h-2 border-y-2 bg-[#a6c8ff]" />
        </motion.div>

        {/* Centre seam disappears immediately before the doors separate. */}
        <motion.div
          className="bg-charcoal absolute top-16 bottom-4 left-1/2 z-[58] w-[5px] -translate-x-1/2"
          initial={{ opacity: 1 }}
          animate={{ opacity: doorsAreOpening ? 0 : 1 }}
          transition={{ duration: 0.15 }}
          aria-hidden="true"
        />

        {/* The black 8-bar mark sits directly on the doors, with no sign behind it. */}
        <motion.div
          className="pointer-events-none absolute top-[52%] left-1/2 z-[65] flex w-[min(42vw,300px)] -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{
            opacity: doorsAreOpening ? 0 : 1,
            scale: doorsAreOpening ? 0.96 : 1,
          }}
          transition={{ duration: 0.7 }}
        >
          <img src={IBM_LOGO_URL} alt="IBM" className="block h-auto w-full brightness-0" />
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
        className="border-charcoal absolute top-[43%] z-[80] hidden -translate-y-1/2 flex-col gap-3 rounded-lg border-[4px] bg-[#edf5ff] p-3 shadow-[4px_4px_0_rgba(44,44,42,0.22)] md:flex"
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
