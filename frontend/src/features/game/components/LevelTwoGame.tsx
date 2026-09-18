'use client'

import type Phaser from 'phaser'
import { useEffect, useRef, useState } from 'react'
import { PreparationPanel } from './PreparationPanel'
import type { GradePreparation } from './preparationContent'

const GAME_WIDTH = 1440
const GAME_HEIGHT = 720

const defaultGradePreparation: GradePreparation = async ({
  personaId,
  objectives,
  questions,
}) => {
  const sessionId = crypto.randomUUID()

  const response = await fetch('/api/meeting-prep/submissions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      personaId,
      selectedObjectives: objectives,
      selectedQuestions: questions,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to review meeting preparation')
  }

  return {
    submissionId: sessionId,
    feedback: Array.isArray(data.feedback)
      ? data.feedback.join('\n')
      : 'Your meeting preparation was saved successfully.',
  }
}

/**
 * Level 2 owns a separate Phaser instance so its scene lifecycle cannot affect Level 1.
 * Keeping this wrapper small also lets the route remain a normal Next.js server component.
 */
export function LevelTwoGame({
  preparation = false,
  gradePreparation = defaultGradePreparation,
}: {
  preparation?: boolean; gradePreparation?: GradePreparation
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | undefined>(undefined)
  const [preparationOpen, setPreparationOpen] = useState(false)
  const [managerIntroOpen, setManagerIntroOpen] = useState(preparation)

  useEffect(() => {
    let game: Phaser.Game | undefined
    let cancelled = false

    const startGame = async () => {
      const PhaserRuntime = await import('phaser')
      const { LevelTwoScene } = await import('../scenes/LevelTwoScene')

      if (cancelled || !containerRef.current) return

      game = new PhaserRuntime.Game({
        type: PhaserRuntime.AUTO,
        parent: containerRef.current,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        backgroundColor: '#efe1c7',
        autoFocus: true,
        dom: {
          // The consultant notebook uses a real textarea so normal editing,
          // spaces and keyboard shortcuts behave exactly as they do in Level 1.
          createContainer: true,
        },
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
          },
        },
        scale: {
          mode: PhaserRuntime.Scale.FIT,
          autoCenter: PhaserRuntime.Scale.CENTER_BOTH,
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
        },
        scene: new LevelTwoScene(preparation),
      })
      gameRef.current = game
      game.events.on('preparation:open', () => {
        setManagerIntroOpen(false)
        setPreparationOpen(true)
      })
    }

    void startGame()

    return () => {
      cancelled = true
      game?.destroy(true)
      gameRef.current = undefined
    }
  }, [preparation])

  return (
    <div className="h-dvh w-screen overflow-hidden bg-[#2c2c2a]">
      <div ref={containerRef} className="relative h-full w-full overflow-hidden" />
      {preparation && managerIntroOpen && !preparationOpen && (
        <aside aria-label="Manager introduction" className="fixed right-4 bottom-4 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border-4 border-[#2c2c2a] bg-[#fff7e4] shadow-lg">
          <h2 className="border-b-4 border-[#2c2c2a] bg-[#b88b00] px-4 py-2 text-lg font-bold text-[#2c2c2a]">A word from your manager</h2>
          <div className="space-y-3 p-4 text-sm leading-relaxed text-[#2c2c2a]">
            <p>Time to prepare for your client meeting! Head to the laptop and press E to get started.</p>
            <p>Review your client’s file, choose up to three meeting objectives, and prepare up to three useful questions. Then request feedback before entering the meeting.</p>
            <button type="button" onClick={() => setManagerIntroOpen(false)} className="rounded-lg border-2 border-[#2c2c2a] bg-[#608e49] px-4 py-2 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#205578]">Got it!</button>
          </div>
        </aside>
      )}
      {preparation && preparationOpen && (
        <PreparationPanel gradePreparation={gradePreparation} onClose={() => {
          setPreparationOpen(false)
          gameRef.current?.events.emit('preparation:close')
        }} />
      )}
    </div>
  )
}
