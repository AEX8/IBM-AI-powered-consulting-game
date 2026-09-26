import ElevatorIntro from '@/components/auth/ElevatorIntro'
import { PhaserGame } from '@/features/game/components/PhaserGame'

export default function FindLeadPage() {
  return (
    /*
     * The Level 1 game uses the entire browser viewport.
     * LandingHeader is already hidden for /levels routes.
     */
    <main className="relative h-screen w-full overflow-hidden bg-[#2c2c2a]">
      <PhaserGame />

      {/*
       * Exact existing elevator animation:
       * - gold arched frame;
       * - silver elevator doors;
       * - level indicator;
       * - door rails;
       * - existing opening/fade timing.
       */}
      <ElevatorIntro />
    </main>
  )
}
