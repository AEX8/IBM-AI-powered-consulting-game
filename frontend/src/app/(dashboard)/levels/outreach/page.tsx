import { LevelTwoGame } from '@/features/game/components/LevelTwoGame'

export default function OutreachPage() {
  return (
    // Level routes intentionally fill the viewport so Phaser can scale the room as one canvas.
    <main className="relative h-screen w-full overflow-hidden bg-[#161616]">
      <LevelTwoGame />
    </main>
  )
}
