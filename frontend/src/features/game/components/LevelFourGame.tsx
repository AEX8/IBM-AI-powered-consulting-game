'use client'

import type Phaser from 'phaser'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { LevelNavigationControls } from './LevelNavigationControls'

const GAME_WIDTH = 1440
const GAME_HEIGHT = 720
const RETURN_TO_LOBBY_DELAY_MS = 2600

/**
 * Owns Level 4's Phaser lifecycle independently from the earlier rooms.
 * This prevents navigating directly to the meeting route from creating or
 * mutating any Level 1-3 scene state while the cross-level data work continues.
 */
export function LevelFourGame({
  completedClientKeys = [],
}: {
  // Client keys (e.g. 'sarah') the server already has a passed meeting for —
  // excludes them from this run's queue so a returning player is never asked
  // to redo a client they already finished in an earlier session.
  completedClientKeys?: string[]
}) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | undefined>(undefined)
  const [allMeetingsComplete, setAllMeetingsComplete] = useState(false)

  useEffect(() => {
    let game: Phaser.Game | undefined
    let cancelled = false

    const startGame = async () => {
      const PhaserRuntime = await import('phaser')
      const { LevelFourScene } = await import('../scenes/LevelFourScene')

      if (cancelled || !containerRef.current) return

      game = new PhaserRuntime.Game({
        type: PhaserRuntime.AUTO,
        parent: containerRef.current,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        backgroundColor: '#ffffff',
        autoFocus: true,
        dom: { createContainer: true },
        physics: {
          default: 'arcade',
          arcade: { gravity: { x: 0, y: 0 }, debug: false },
        },
        scale: {
          mode: PhaserRuntime.Scale.FIT,
          autoCenter: PhaserRuntime.Scale.CENTER_BOTH,
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
        },
        scene: new LevelFourScene(completedClientKeys),
      })
      gameRef.current = game
      game.events.on('level-four:all-meetings-complete', () => setAllMeetingsComplete(true))
    }

    void startGame()

    return () => {
      cancelled = true
      game?.destroy(true)
      gameRef.current = undefined
    }
  }, [completedClientKeys])

  useEffect(() => {
    if (!allMeetingsComplete) return
    const timer = window.setTimeout(() => router.push('/dashboard'), RETURN_TO_LOBBY_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [allMeetingsComplete, router])

  return (
    <div className="h-dvh w-screen overflow-hidden bg-[#161616]">
      <div ref={containerRef} className="relative h-full w-full overflow-hidden" />
      <LevelNavigationControls
        level={4}
        onOpenChange={(open) => {
          if (gameRef.current?.input.keyboard) gameRef.current.input.keyboard.enabled = !open
          for (const scene of gameRef.current?.scene.getScenes(true) ?? []) {
            if (scene.input.keyboard) scene.input.keyboard.enabled = !open
          }
        }}
      />
      {allMeetingsComplete && (
        <div className="fixed inset-0 z-[9500] grid place-items-center bg-[#17212a]/70 p-6">
          <div className="border-charcoal bg-cloud-white w-[min(420px,92vw)] rounded-2xl border-[5px] p-8 text-center shadow-[8px_10px_0_#16161633]">
            <h2 className="text-dark-blue text-2xl font-extrabold">Both meetings complete!</h2>
            <p className="text-charcoal mt-3 text-sm font-medium">
              Great work — you&rsquo;ve met with both clients. Heading back to the lobby…
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
