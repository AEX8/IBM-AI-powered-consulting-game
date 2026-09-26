import { LevelFourGame } from '@/features/game/components/LevelFourGame'

export default function ClientMeetingPage() {
  return (
    // Level routes intentionally fill the viewport so Phaser scales one complete room.
    <main className="relative h-screen w-full overflow-hidden bg-[#161616]">
      <LevelFourGame />
    </main>
  )
}
