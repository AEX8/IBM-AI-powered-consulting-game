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
  colour: ['#c98a3e', '#1f4e79', '#7eb6e0', '#5b8c4a', '#f4ede1'][index % 5],
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
          className="pointer-events-none fixed inset-0 z-[100] overflow-hidden bg-indigo-950/35"
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

          <div className="absolute inset-0 flex items-center justify-center px-5">
            <motion.section
              className="border-charcoal bg-cloud-white max-w-xl rounded-3xl border-[6px] px-8 py-9 text-center shadow-[10px_12px_0_var(--charcoal)]"
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
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#2c2c2a] bg-[#c98a3e] text-5xl shadow-[5px_5px_0_#2c2c2a]"
                animate={{
                  rotate: [0, -8, 8, -5, 5, 0],
                  scale: [1, 1.15, 1],
                }}
                transition={{ duration: 1.2, delay: 0.6 }}
              >
                ★
              </motion.div>

              <p className="text-dark-blue mt-7 text-sm font-extrabold tracking-[0.2em] uppercase">
                Level {completedLevel} complete
              </p>

              <h2 className="text-charcoal mt-2 text-4xl font-extrabold sm:text-5xl">
                {completedLevel === 1 ? 'Outreach unlocked!' : completedLevel === 2 ? 'Meeting preparation unlocked!' : 'Client meeting unlocked!'}
              </h2>

              <p className="text-charcoal mt-4 text-lg font-semibold">
                {completedLevel === 1
                  ? 'You found your first potential leads. Level 2 is now ready.'
                  : completedLevel === 2 ? 'Your outreach is complete. Level 3 is now ready.' : 'Your preparation is saved. Level 4 is now ready.'}
              </p>

              <motion.div
                className="bg-plant-green border-charcoal mx-auto mt-7 w-fit rounded-xl border-[4px] px-6 py-3 font-extrabold text-white"
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
