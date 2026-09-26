'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'
import { Award, LockKeyhole, Sparkles, X } from 'lucide-react'
import { consultingStages } from './landingData'
import type { ConsultantProgress } from '@/features/progress/progress'

export default function BadgeGallery({ progress }: { progress: ConsultantProgress }) {
  const [open, setOpen] = useState(false)
  const reducedMotion = useReducedMotion()
  const earned = new Set(progress.completedStageIds)
  const earnedCount = consultingStages.filter((stage) => earned.has(stage.id)).length

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-left hover:bg-[#edf5ff] focus-visible:outline-2 focus-visible:outline-[#002d9c]"
        aria-label={`View your ${progress.badgesCollected} badges`}
      >
        <span className="text-charcoal flex items-center gap-2">
          <span
            className="border-charcoal bg-plant-green h-3 w-3 shrink-0 rounded-full border-2"
            aria-hidden="true"
          />
          Badges
        </span>
        <span className="text-dark-blue font-extrabold">{progress.badgesCollected} ↗</span>
      </button>
      {open &&
        createPortal(
          <motion.div
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-white/80 p-4 backdrop-blur-[3px]"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false)
            }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="badge-gallery-title"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.78, y: 46, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              transition={
                reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 330, damping: 22 }
              }
              className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#a6c8ff] bg-white p-6 shadow-[0_20px_60px_rgba(0,45,156,0.16)] sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-xs font-extrabold tracking-[0.16em] text-[#002d9c] uppercase">
                    <Sparkles className="h-4 w-4" />
                    Your journey
                  </p>
                  <h2
                    id="badge-gallery-title"
                    className="mt-1 text-2xl font-extrabold text-[#002d9c] sm:text-3xl"
                  >
                    Badge collection
                  </h2>
                  <p className="mt-1 text-sm text-[#525252]">Your milestones, all in one place.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close badge collection"
                  className="rounded-full border border-[#dde1e6] bg-white p-2 text-[#525252] transition-transform hover:rotate-90 hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-[#002d9c]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-5 border-b border-[#dde1e6] pb-4 text-sm font-semibold text-[#002d9c]">
                <div>
                  {earnedCount} / {consultingStages.length} earned
                </div>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf5ff]"
                  aria-hidden="true"
                >
                  <motion.div
                    className="h-full rounded-full bg-[#78a9ff]"
                    initial={reducedMotion ? false : { width: 0 }}
                    animate={{ width: `${(earnedCount / consultingStages.length) * 100}%` }}
                    transition={{
                      duration: reducedMotion ? 0 : 0.8,
                      delay: reducedMotion ? 0 : 0.25,
                      ease: 'easeOut',
                    }}
                  />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {consultingStages.map((stage, index) => {
                  const unlocked = earned.has(stage.id)
                  return (
                    <motion.div
                      key={stage.id}
                      initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      whileHover={
                        unlocked && !reducedMotion
                          ? {
                              y: -6,
                              scale: 1.035,
                              rotate: index % 2 === 0 ? -1 : 1,
                              boxShadow: '0 12px 24px rgba(0,45,156,0.15)',
                            }
                          : undefined
                      }
                      transition={{
                        delay: reducedMotion ? 0 : 0.1 + index * 0.07,
                        type: 'spring',
                        stiffness: 360,
                        damping: 24,
                      }}
                      className={`group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border p-4 ${unlocked ? 'border-[#a6c8ff] bg-white' : 'border-[#e0e0e0] bg-[#fafafa]'}`}
                    >
                      {unlocked && (
                        <span
                          className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full bg-[#d0e2ff]/60 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform duration-300 ${unlocked ? 'bg-[#edf5ff] text-[#002d9c] group-hover:scale-110 group-hover:rotate-12' : 'bg-[#e0e0e0] text-[#8d8d8d]'}`}
                      >
                        {unlocked ? (
                          <Award className="h-7 w-7" />
                        ) : (
                          <LockKeyhole className="h-5 w-5" />
                        )}
                      </span>
                      <span className="relative min-w-0">
                        <span
                          className={`block text-sm leading-tight font-bold ${unlocked ? 'text-[#002d9c]' : 'text-[#6f6f6f]'}`}
                        >
                          {stage.name}
                        </span>
                        <span
                          className={`mt-1 block text-xs ${unlocked ? 'text-[#002d9c]' : 'text-[#8d8d8d]'}`}
                        >
                          {unlocked ? 'Badge earned' : 'Complete this stage to unlock'}
                        </span>
                      </span>
                      {unlocked && (
                        <Sparkles
                          className="relative ml-auto h-5 w-5 shrink-0 text-[#78a9ff] opacity-0 transition-all duration-300 group-hover:rotate-12 group-hover:opacity-100"
                          aria-hidden="true"
                        />
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </motion.section>
          </motion.div>,
          document.body
        )}
    </>
  )
}
