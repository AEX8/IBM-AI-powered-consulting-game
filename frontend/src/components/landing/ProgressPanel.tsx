import type { ConsultantProgress } from '@/features/progress/progress'

type ProgressPanelProps = {
  progress: ConsultantProgress
}

export default function ProgressPanel({ progress }: ProgressPanelProps) {
  const xpPercentage =
    progress.requiredXp > 0
      ? Math.min(100, Math.round((progress.currentXp / progress.requiredXp) * 100))
      : 0

  const stagePercentage =
    progress.totalStages > 0
      ? Math.min(100, Math.round((progress.completedStages / progress.totalStages) * 100))
      : 0

  return (
    <aside
      className="grid content-start gap-3 xl:h-full xl:min-h-0"
      aria-label="Consultant progress"
    >
      <section className="game-progress-panel border-charcoal bg-cloud-white rounded-xl border-[3px] p-3 shadow-[4px_4px_0_var(--charcoal)]">
        <h2 className="text-dark-blue text-lg font-extrabold">Level {progress.level}</h2>

        <div
          className="bg-warm-grey border-charcoal mt-3 h-3 overflow-hidden rounded-full border-[2px]"
          role="progressbar"
          aria-label="Experience points"
          aria-valuemin={0}
          aria-valuemax={progress.requiredXp}
          aria-valuenow={progress.currentXp}
        >
          <div
            className="xp-progress-fill bg-dark-blue h-full rounded-full transition-[width] duration-500"
            style={{ width: `${xpPercentage}%` }}
          />
        </div>

        <p className="text-charcoal mt-2 text-xs font-semibold">
          {progress.currentXp} / {progress.requiredXp} XP
        </p>
      </section>

      <section className="game-progress-panel border-charcoal bg-cloud-white rounded-xl border-[3px] p-3 text-center shadow-[4px_4px_0_var(--charcoal)]">
        <h2 className="text-dark-blue text-lg font-extrabold">Your progress</h2>

        <div
          className="progress-donut border-charcoal relative mx-auto mt-3 flex h-24 w-24 items-center justify-center rounded-full border-[3px]"
          style={{
            background: `conic-gradient(
              var(--plant-green) 0% ${stagePercentage}%,
              var(--warm-grey) ${stagePercentage}% 100%
            )`,
          }}
          role="img"
          aria-label={`${stagePercentage}% of consulting stages complete`}
        >
          <div className="border-charcoal bg-cloud-white absolute inset-3 flex items-center justify-center rounded-full border-[3px]">
            <span className="text-dark-blue text-2xl font-extrabold">{stagePercentage}%</span>
          </div>
        </div>

        <p className="text-charcoal mt-2 text-xs">
          {progress.completedStages} / {progress.totalStages} stages complete
        </p>
      </section>

      <section className="game-progress-panel border-charcoal bg-cloud-white rounded-xl border-[3px] p-3 shadow-[4px_4px_0_var(--charcoal)]">
        <h2 className="text-dark-blue text-lg font-extrabold">Your stats</h2>

        <dl className="mt-3 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-charcoal flex items-center gap-2">
              <span
                className="border-charcoal bg-honey-wood h-3 w-3 shrink-0 rounded-full border-2"
                aria-hidden="true"
              />
              XP earned
            </dt>

            <dd className="text-dark-blue font-extrabold">{progress.totalXp}</dd>
          </div>

          <div className="flex items-center justify-between gap-2">
            <dt className="text-charcoal flex items-center gap-2">
              <span
                className="border-charcoal bg-plant-green h-3 w-3 shrink-0 rounded-full border-2"
                aria-hidden="true"
              />
              Badges
            </dt>

            <dd className="text-dark-blue font-extrabold">{progress.badgesCollected}</dd>
          </div>
        </dl>

      </section>
    </aside>
  )
}
