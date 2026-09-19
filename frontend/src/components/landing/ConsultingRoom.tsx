'use client'

import type { CSSProperties } from 'react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle2, LockKeyhole, Sparkles } from 'lucide-react'
import LevelCompletionCelebration from './LevelCompletionCelebration'
import type { ConsultingStage } from './landingData'

type ConsultingRoomProps = {
  stage: ConsultingStage
}

const LEVEL_ONE_UNLOCK_KEY = 'ibm-level-one-unlocked'
const LEVEL_ONE_UNLOCK_EVENT = 'ibm-level-one-unlocked'
const LEVEL_ONE_COMPLETION_KEY = 'ibm-level-one-completed'
const LEVEL_ONE_COMPLETION_EVENT = 'ibm-level-one-completed'
const LEVEL_TWO_COMPLETION_KEY = 'ibm-level-two-completed'
const LEVEL_TWO_COMPLETION_EVENT = 'ibm-level-two-completed'
const LEVEL_TWO_CELEBRATION_KEY = 'ibm-level-two-celebration-pending'
const LEVEL_THREE_COMPLETION_KEY = 'ibm-level-three-completed'
const LEVEL_THREE_CELEBRATION_KEY = 'ibm-level-three-celebration-pending'

const subscribeToLevelThreeCompletion = (changed: () => void) => {
  window.addEventListener('storage', changed)
  window.addEventListener(LEVEL_THREE_COMPLETION_KEY, changed)
  return () => {
    window.removeEventListener('storage', changed)
    window.removeEventListener(LEVEL_THREE_COMPLETION_KEY, changed)
  }
}
const readLevelThreeCompletion = () => localStorage.getItem(LEVEL_THREE_COMPLETION_KEY) === 'true'
// A query string alone cannot award completion. The saved completion and pending
// arrival flag must both exist before the one-time animation is displayed.
const readLevelThreeArrival = () => readLevelThreeCompletion() && sessionStorage.getItem(LEVEL_THREE_CELEBRATION_KEY) === 'true'

const subscribeToLevelOneCompletion = (onStoreChange: () => void) => {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(LEVEL_ONE_COMPLETION_EVENT, onStoreChange)

  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(LEVEL_ONE_COMPLETION_EVENT, onStoreChange)
  }
}

const readLevelOneCompletion = () => {
  const completedFromLevel =
    new URLSearchParams(window.location.search).get('completed') === 'level-1'

  return completedFromLevel || window.localStorage.getItem(LEVEL_ONE_COMPLETION_KEY) === 'true'
}

const readLevelOneCompletionArrival = () =>
  new URLSearchParams(window.location.search).get('completed') === 'level-1'

const subscribeToLevelTwoCompletion = (onStoreChange: () => void) => {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(LEVEL_TWO_COMPLETION_EVENT, onStoreChange)

  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(LEVEL_TWO_COMPLETION_EVENT, onStoreChange)
  }
}

const readLevelTwoCompletion = () =>
  new URLSearchParams(window.location.search).get('completed') === 'level-2' ||
  window.localStorage.getItem(LEVEL_TWO_COMPLETION_KEY) === 'true'

const readLevelTwoCompletionArrival = () =>
  new URLSearchParams(window.location.search).get('completed') === 'level-2' ||
  window.sessionStorage.getItem(LEVEL_TWO_CELEBRATION_KEY) === 'true'

const subscribeToLevelOneUnlock = (onStoreChange: () => void) => {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(LEVEL_ONE_UNLOCK_EVENT, onStoreChange)

  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(LEVEL_ONE_UNLOCK_EVENT, onStoreChange)
  }
}

const readLevelOneUnlock = () => window.localStorage.getItem(LEVEL_ONE_UNLOCK_KEY) === 'true'

const roomImageByType: Record<ConsultingStage['roomType'], string> = {
  'lead-room': '/assets/landing/rooms/findALead2.png',
  'outreach-office': '/assets/landing/rooms/outreach.png',
  'preparation-room': '/assets/landing/rooms/meetingPrep.png',
  'client-meeting': '/assets/landing/rooms/clientMeeting.png',
  'proposal-room': '/assets/landing/rooms/proposalAndNegotiation.png',
  'closing-room': '/assets/landing/rooms/closeDeal.png',
}

const roomImageDescriptionByType: Record<ConsultingStage['roomType'], string> = {
  'lead-room': 'Top-down networking lounge with an elevator entrance',
  'outreach-office': 'Office desk prepared for client outreach',
  'preparation-room': 'Meeting preparation desk and presentation screen',
  'client-meeting': 'Client meeting table and presentation screen',
  'proposal-room': 'Proposal and negotiation conference table',
  'closing-room': 'Executive seating area for closing the deal',
}

export default function ConsultingRoom({ stage }: ConsultingRoomProps) {
  const [isUnlocking, setIsUnlocking] = useState(false)
  const levelThreeCompleted = useSyncExternalStore(subscribeToLevelThreeCompletion, readLevelThreeCompletion, () => false)
  const levelThreeArrival = useSyncExternalStore(subscribeToLevelThreeCompletion, readLevelThreeArrival, () => false)

  useEffect(() => {
    if (stage.id !== 4 || !levelThreeArrival) return
    const timer = window.setTimeout(() => {
      sessionStorage.removeItem(LEVEL_THREE_CELEBRATION_KEY)
      const url = new URL(window.location.href)
      if (url.searchParams.get('completed') === 'level-3') {
        url.searchParams.delete('completed')
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
      }
      window.dispatchEvent(new Event(LEVEL_THREE_COMPLETION_KEY))
    }, 5400)
    return () => window.clearTimeout(timer)
  }, [stage.id, levelThreeArrival])

  const levelOneCompleted = useSyncExternalStore(
    subscribeToLevelOneCompletion,
    readLevelOneCompletion,
    () => false
  )

  const levelOneCompletionArrival = useSyncExternalStore(
    subscribeToLevelOneCompletion,
    readLevelOneCompletionArrival,
    () => false
  )

  const levelTwoCompleted = useSyncExternalStore(
    subscribeToLevelTwoCompletion,
    readLevelTwoCompletion,
    () => false
  )

  const levelTwoCompletionArrival = useSyncExternalStore(
    subscribeToLevelTwoCompletion,
    readLevelTwoCompletionArrival,
    () => false
  )

  const levelOneUnlocked = useSyncExternalStore(
    subscribeToLevelOneUnlock,
    readLevelOneUnlock,
    () => false
  )

  // Keep the arrival signal until the celebration finishes, including hydration.
  useEffect(() => {
    if (stage.id !== 2) return

    const currentUrl = new URL(window.location.href)
    if (currentUrl.searchParams.get('completed') !== 'level-1') return

    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href)
      if (url.searchParams.get('completed') === 'level-1') {
        url.searchParams.delete('completed')
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
      }
      window.dispatchEvent(new Event(LEVEL_ONE_COMPLETION_EVENT))
    }, 5400)
    return () => window.clearTimeout(timer)
  }, [levelOneCompletionArrival, stage.id])

  useEffect(() => {
    if (stage.id !== 3) return

    const currentUrl = new URL(window.location.href)
    const arrivedFromLevelTwo = currentUrl.searchParams.get('completed') === 'level-2'
    const hasPendingCelebration =
      window.sessionStorage.getItem(LEVEL_TWO_CELEBRATION_KEY) === 'true'

    if (!arrivedFromLevelTwo && !hasPendingCelebration) return

    // Keep the arrival state alive for the full animation. The Level 2 scene stores
    // this session flag before navigation, so the celebration cannot be lost while
    // the dashboard hydrates or while the one-use query parameter is being cleaned up.
    const cleanupTimer = window.setTimeout(() => {
      window.sessionStorage.removeItem(LEVEL_TWO_CELEBRATION_KEY)

      if (arrivedFromLevelTwo) {
        currentUrl.searchParams.delete('completed')
        window.history.replaceState(
          {},
          '',
          `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
        )
      }

      window.dispatchEvent(new Event(LEVEL_TWO_COMPLETION_EVENT))
    }, 5400)

    return () => window.clearTimeout(cleanupTimer)
  }, [levelTwoCompletionArrival, stage.id])

  const isInitialLevelOneLock = stage.id === 1 && !levelOneUnlocked && !levelOneCompleted

  const effectiveStatus: ConsultingStage['status'] =
    levelThreeCompleted && stage.id <= 3 ? 'completed'
      : levelThreeCompleted && stage.id === 4 ? 'active'
      : (levelOneCompleted || levelTwoCompleted) && stage.id === 1
      ? 'completed'
      : levelTwoCompleted && stage.id === 2
        ? 'completed'
        : levelTwoCompleted && stage.id === 3
          ? 'active'
          : levelOneCompleted && stage.id === 2
            ? 'active'
        : isInitialLevelOneLock
          ? 'locked'
          : stage.status

  const isActive = effectiveStatus === 'active'
  const isCompleted = effectiveStatus === 'completed'
  const isLocked = effectiveStatus === 'locked'
  const isPlayable = isActive || isCompleted

  const isExpandedRoomImage = stage.id !== 1 && !isLocked

  const isNextLevelUnlocked =
    (levelOneCompleted && stage.id === 2) || (levelTwoCompleted && stage.id === 3) || (levelThreeCompleted && stage.id === 4)

  const isShowingUnlockAnimation = isUnlocking && stage.id === 1

  const imageSource = roomImageByType[stage.roomType]
  const imageDescription = roomImageDescriptionByType[stage.roomType]

  const roomAnimationStyle = {
    '--room-delay': `${(stage.id - 1) * 110}ms`,
  } as CSSProperties

  const unlockLevelOne = () => {
    setIsUnlocking(true)

    window.localStorage.setItem(LEVEL_ONE_UNLOCK_KEY, 'true')
    window.dispatchEvent(new Event(LEVEL_ONE_UNLOCK_EVENT))

    window.setTimeout(() => {
      setIsUnlocking(false)
    }, 1400)
  }

  return (
    <>
      {stage.id === 4 && <LevelCompletionCelebration show={levelThreeArrival} completedLevel={3} />}
      {stage.id === 2 && <LevelCompletionCelebration show={levelOneCompletionArrival} />}
      {stage.id === 3 && (
        <LevelCompletionCelebration show={levelTwoCompletionArrival} completedLevel={2} />
      )}

      <section
        id={`stage-${stage.id}`}
        style={roomAnimationStyle}
        className={`game-room border-charcoal relative min-h-72 overflow-hidden border-[4px] transition-all duration-500 xl:h-full xl:min-h-0 ${
          isPlayable
            ? 'game-room-active cursor-pointer bg-[#ffdda3]'
            : 'game-room-locked cursor-not-allowed bg-white'
        } ${isCompleted ? 'ring-8 ring-[#5b8c4a]/55' : ''} ${
          isNextLevelUnlocked || isShowingUnlockAnimation
            ? 'z-10 shadow-[0_0_38px_rgba(201,138,62,0.85)] ring-8 ring-[#c98a3e]'
            : ''
        }`}
        aria-labelledby={`stage-${stage.id}-title`}
      >
        {isActive && <div className="room-light-sweep" aria-hidden="true" />}

        {isShowingUnlockAnimation && (
          <div
            className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
            aria-hidden="true"
          >
            <Sparkles className="absolute top-[20%] left-[18%] h-8 w-8 animate-ping text-[#c98a3e]" />
            <Sparkles className="absolute top-[42%] right-[14%] h-6 w-6 animate-pulse text-[#5b8c4a]" />
            <Sparkles className="absolute bottom-[18%] left-[44%] h-7 w-7 animate-ping text-[#c98a3e]" />
          </div>
        )}

        <div className="relative z-20 flex items-start gap-2 p-3">
          <div
            className={`border-charcoal flex h-11 w-10 shrink-0 items-center justify-center rounded-[35%] border-[3px] text-base font-extrabold text-white shadow-[2px_2px_0_var(--charcoal)] ${
              isCompleted ? 'bg-plant-green' : 'bg-dark-blue'
            }`}
          >
            {isCompleted ? <CheckCircle2 className="h-6 w-6" aria-label="Completed" /> : stage.id}
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative min-w-0">
              <h2
                id={`stage-${stage.id}-title`}
                className="text-charcoal min-w-0 pr-7 text-sm leading-tight font-extrabold 2xl:text-base"
              >
                {stage.name}
              </h2>

              {isLocked && (
                <LockKeyhole
                  className="room-lock text-charcoal absolute top-0 right-0 z-30 h-5 w-5"
                  aria-label="Locked"
                />
              )}
            </div>

            {isInitialLevelOneLock ? (
              <button
                type="button"
                onClick={unlockLevelOne}
                className="start-room-button border-charcoal bg-dark-blue hover:bg-building-near mt-2 inline-flex items-center gap-2 rounded-lg border-[3px] px-4 py-1.5 text-xs font-extrabold text-white transition"
              >
                <Sparkles className="h-4 w-4" />
                UNLOCK LEVEL 1
              </button>
            ) : isPlayable ? (
              <Link
                href={stage.href}
                className={`start-room-button border-charcoal mt-2 inline-block rounded-lg border-[3px] px-4 py-1.5 text-xs font-extrabold text-white transition ${
                  isCompleted
                    ? 'bg-plant-green hover:bg-dark-blue'
                    : 'bg-dark-blue hover:bg-building-near'
                }`}
              >
                {isCompleted
                  ? 'REPLAY'
                  : isNextLevelUnlocked
                    ? `ENTER LEVEL ${stage.id}`
                    : 'START HERE'}
              </Link>
            ) : (
              <p className="text-charcoal mt-1 max-w-48 text-[11px] leading-4">
                {stage.shortDescription}
              </p>
            )}
          </div>
        </div>

        <div
          className={`absolute z-0 overflow-hidden opacity-100 transition-all duration-500 ${
            stage.id === 1
              ? 'inset-x-0 top-24 bottom-1'
              : isExpandedRoomImage
                ? 'inset-x-0 top-20 bottom-1'
                : stage.id <= 3
                  ? 'inset-x-2 top-28 bottom-2'
                  : 'inset-x-2 top-32 bottom-2'
          }`}
        >
          <div
            className={`relative h-full w-full transition-transform duration-500 ${
              stage.id === 1
                ? 'translate-y-2'
                : isExpandedRoomImage
                  ? 'origin-bottom scale-[1.1]'
                  : ''
            }`}
          >
            <Image
              src={imageSource}
              alt={imageDescription}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 45vw, 90vw"
              className="room-furniture object-contain object-bottom"
              priority={stage.id === 1}
            />
          </div>
        </div>

        {isLocked && (
          <div
            className="pointer-events-none absolute inset-0 z-30 bg-white/40"
            aria-hidden="true"
          />
        )}
      </section>
    </>
  )
}
