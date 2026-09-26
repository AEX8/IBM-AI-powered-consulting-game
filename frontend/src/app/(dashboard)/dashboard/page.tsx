import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { getServerSession } from '@/actions/auth.actions'
import { adminDb } from '@/lib/firebase/admin'
import ConsultingRoom from '@/components/landing/ConsultingRoom'
import ProgressPanel from '@/components/landing/ProgressPanel'
import ElevatorIntro from '@/components/auth/ElevatorIntro'
import { consultingStages } from '@/components/landing/landingData'
import { getConsultantProgress } from '@/features/progress/queries'
import { emptyProgressData, toConsultantProgress } from '@/features/progress/progress'

export const metadata: Metadata = {
  title: 'Consulting Lobby',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ arrival?: string }>
}) {
  const { arrival } = await searchParams
  const session = await getServerSession()

  const profileSnapshot = session ? await adminDb.collection('users').doc(session.uid).get() : null

  const displayName = profileSnapshot?.exists
    ? (profileSnapshot.data()?.displayName as string | null)
    : null

  const consultantName = displayName ?? session?.email ?? 'Consultant'

  const progress = session
    ? await getConsultantProgress(session.uid)
    : toConsultantProgress(emptyProgressData())

  const findLeadStage = consultingStages.find((stage) => stage.id === 1)
  const outreachStage = consultingStages.find((stage) => stage.id === 2)
  const preparationStage = consultingStages.find((stage) => stage.id === 3)
  const clientMeetingStage = consultingStages.find((stage) => stage.id === 4)
  const proposalStage = consultingStages.find((stage) => stage.id === 5)
  const closeDealStage = consultingStages.find((stage) => stage.id === 6)

  if (
    !findLeadStage ||
    !outreachStage ||
    !preparationStage ||
    !clientMeetingStage ||
    !proposalStage ||
    !closeDealStage
  ) {
    throw new Error('The consulting-loop stage configuration is incomplete.')
  }

  return (
    <div className="bg-warm-cream min-h-[calc(100dvh-4rem)] xl:h-[calc(100dvh-4rem)] xl:overflow-hidden">
      {arrival === 'signin' && <ElevatorIntro />}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        {[
          { left: '6%', top: '24%', size: '5px', duration: '6s', delay: '-1s' },
          { left: '18%', top: '72%', size: '7px', duration: '8s', delay: '-4s' },
          { left: '36%', top: '18%', size: '4px', duration: '7s', delay: '-2s' },
          { left: '57%', top: '82%', size: '6px', duration: '6.5s', delay: '-5s' },
          { left: '73%', top: '27%', size: '5px', duration: '7.5s', delay: '-3s' },
          { left: '91%', top: '68%', size: '7px', duration: '8.5s', delay: '-6s' },
        ].map((particle) => (
          <span
            key={`${particle.left}-${particle.top}`}
            className="lobby-particle"
            style={
              {
                left: particle.left,
                top: particle.top,
                '--particle-size': particle.size,
                '--particle-duration': particle.duration,
                '--particle-delay': particle.delay,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="mx-auto flex h-full max-w-[1900px] flex-col px-4 py-2 sm:px-5 lg:px-6 2xl:px-8">
        <section className="shrink-0" aria-labelledby="lobby-heading">
          <p className="text-dark-blue text-[10px] leading-none font-extrabold tracking-[0.12em] uppercase">
            Welcome, {consultantName}
          </p>

          <h1
            id="lobby-heading"
            className="text-charcoal mt-0.5 text-[clamp(1.1rem,1.5vw,1.4rem)] leading-tight font-extrabold"
          >
            Your consultancy journey starts here
          </h1>

          <p className="text-charcoal text-xs leading-tight font-semibold">
            Complete each stage of the consulting loop.
          </p>
        </section>

        <div className="mt-1 grid items-start gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_210px] xl:overflow-hidden 2xl:grid-cols-[minmax(0,1fr)_240px] 2xl:gap-5">
          <section
            className="border-charcoal bg-honey-wood overflow-hidden rounded-2xl border-[5px] p-2 shadow-[6px_7px_0_var(--wood-shadow)] xl:h-full xl:min-h-0"
            aria-label="Consulting stages"
          >
            <div className="relative z-10 grid gap-1 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,2fr)] xl:h-full xl:min-h-0 2xl:grid-cols-[minmax(330px,0.9fr)_minmax(0,2fr)]">
              <div className="min-h-[520px] xl:h-full xl:min-h-0 [&>section]:h-full">
                <ConsultingRoom
                  stage={findLeadStage}
                  completedStageIds={progress.completedStageIds}
                />
              </div>

              <div className="grid gap-1 sm:grid-cols-2 xl:h-full xl:min-h-0 xl:grid-rows-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <ConsultingRoom
                  stage={outreachStage}
                  completedStageIds={progress.completedStageIds}
                />
                <ConsultingRoom
                  stage={preparationStage}
                  completedStageIds={progress.completedStageIds}
                />

                <div className="sm:col-span-2 xl:min-h-0">
                  <div className="grid gap-1 md:grid-cols-3 xl:h-full xl:min-h-0 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)_minmax(0,0.85fr)]">
                    <ConsultingRoom
                      stage={closeDealStage}
                      completedStageIds={progress.completedStageIds}
                    />
                    <ConsultingRoom
                      stage={proposalStage}
                      completedStageIds={progress.completedStageIds}
                    />
                    <ConsultingRoom
                      stage={clientMeetingStage}
                      completedStageIds={progress.completedStageIds}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <ProgressPanel progress={progress} />
        </div>
      </div>
    </div>
  )
}
