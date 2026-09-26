'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

type LevelCompletionCelebrationProps = {
  show: boolean
  completedLevel?: 1 | 2 | 3
}

const confetti = Array.from({ length: 42 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  delay: (index % 9) * 0.08,
  duration: 2.2 + (index % 5) * 0.22,
  colour: ['#002d9c', '#002d9c', '#a6c8ff', '#d0e2ff', '#ffffff'][index % 5],
}))

export default function LevelCompletionCelebration({
  show,
  completedLevel = 1,
}: LevelCompletionCelebrationProps) {
  const [dismissed, setDismissed] = useState(false)
  const visible = show && !dismissed
  const nextLevel = completedLevel + 1

  useEffect(() => {
    if (!show) {
      return
    }

    const timer = window.setTimeout(() => {
      setDismissed(true)
    }, 5200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [show])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[100] overflow-hidden bg-[#edf5ff]/85"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {confetti.map((piece) => (
            <motion.span
              key={piece.id}
              className="absolute top-[-6vh] h-4 w-2 rounded-sm"
              style={{
                left: piece.left,
                backgroundColor: piece.colour,
              }}
              initial={{
                y: '-8vh',
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: '115vh',
                rotate: 720,
                opacity: [1, 1, 0.85],
              }}
              transition={{
                duration: piece.duration,
                delay: piece.delay,
                ease: 'easeIn',
              }}
            />
          ))}

          <div className="absolute inset-x-0 top-20 bottom-6 flex items-center justify-center px-5">
            <motion.section
              className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl border-[6px] border-[#a6c8ff] bg-white px-6 py-6 text-center shadow-[10px_12px_0_#d0e2ff]"
              initial={{ scale: 0.4, rotate: -8, opacity: 0 }}
              animate={{
                scale: [0.4, 1.12, 0.96, 1],
                rotate: [-8, 3, -1, 0],
                opacity: 1,
              }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'backOut' }}
            >
              <motion.div
                className="mx-auto flex h-18 w-18 items-center justify-center rounded-full border-4 border-[#a6c8ff] bg-[#d0e2ff] text-4xl text-[#001d6c] shadow-[5px_5px_0_#d0e2ff]"
                animate={{
                  rotate: [0, -8, 8, -5, 5, 0],
                  scale: [1, 1.15, 1],
                }}
                transition={{ duration: 1.2, delay: 0.6 }}
              >
                ★
              </motion.div>

              <p className="text-dark-blue mt-5 text-xs font-extrabold tracking-[0.2em] uppercase">
                Level {completedLevel} complete
              </p>

              <h2 className="text-charcoal mt-2 text-3xl font-extrabold sm:text-4xl">
                {completedLevel === 1
                  ? 'Outreach unlocked!'
                  : completedLevel === 2
                    ? 'Meeting preparation unlocked!'
                    : 'Client meeting unlocked!'}
              </h2>

              <p className="text-charcoal mt-3 text-base font-semibold">
                {completedLevel === 1
                  ? 'You found your first potential leads. Level 2 is now ready.'
                  : completedLevel === 2
                    ? 'Your outreach is complete. Level 3 is now ready.'
                    : 'Your preparation is saved. Level 4 is now ready.'}
              </p>

              <motion.div
                className="mx-auto mt-5 w-fit rounded-xl border-[4px] border-[#002d9c] bg-[#002d9c] px-5 py-2 font-extrabold text-white"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{
                  duration: 0.75,
                  repeat: 3,
                  delay: 1,
                }}
              >
                ROOM {nextLevel} OPEN
              </motion.div>
            </motion.section>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
