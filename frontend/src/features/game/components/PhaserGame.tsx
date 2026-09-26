'use client'

import type Phaser from 'phaser'
import { useEffect, useRef } from 'react'

const GAME_WIDTH = 1440
const GAME_HEIGHT = 720

export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let game: Phaser.Game | undefined
    let cancelled = false

    const startGame = async () => {
      const PhaserRuntime = await import('phaser')
      const { LevelOneScene } = await import('../scenes/LevelOneScene')

      if (cancelled || !containerRef.current) {
        return
      }

      game = new PhaserRuntime.Game({
        type: PhaserRuntime.AUTO,
        parent: containerRef.current,

        width: GAME_WIDTH,
        height: GAME_HEIGHT,

        backgroundColor: '#efe1c7',
        autoFocus: true,

        dom: {
          createContainer: true,
        },

        physics: {
          default: 'arcade',

          arcade: {
            gravity: {
              x: 0,
              y: 0,
            },

            debug: false,
          },
        },

        scale: {
          mode: PhaserRuntime.Scale.FIT,

          autoCenter: PhaserRuntime.Scale.CENTER_BOTH,

          width: GAME_WIDTH,
          height: GAME_HEIGHT,
        },

        scene: LevelOneScene,
      })
    }

    void startGame()

    return () => {
      cancelled = true
      game?.destroy(true)
    }
  }, [])

  return (
    <div className="h-dvh w-screen overflow-hidden bg-[#2c2c2a]">
      <div ref={containerRef} className="relative h-full w-full overflow-hidden" />
    </div>
  )
}
