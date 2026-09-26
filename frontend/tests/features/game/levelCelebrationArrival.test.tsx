import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ConsultingRoom from '../../../src/components/landing/ConsultingRoom'
import { consultingStages } from '../../../src/components/landing/landingData'

vi.mock('next/image', () => ({ default: () => null }))
vi.mock('../../../src/components/landing/LevelCompletionCelebration', () => ({
  default: ({ show }: { show: boolean }) => (show ? <span>Celebration visible</span> : null),
}))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  localStorage.clear()
  sessionStorage.clear()
  window.history.replaceState({}, '', '/dashboard')
})

describe('completion arrival', () => {
  it.each([1, 2, 3])(
    'keeps Level %i celebration through its animation and unlocks the next room',
    (level) => {
      vi.useFakeTimers()
      const word = ['one', 'two', 'three'][level - 1]
      localStorage.setItem(`ibm-level-${word}-completed`, 'true')
      if (level > 1) sessionStorage.setItem(`ibm-level-${word}-celebration-pending`, 'true')
      window.history.replaceState({}, '', `/dashboard?completed=level-${level}`)
      const stage = consultingStages.find((item) => item.id === level + 1)!
      render(<ConsultingRoom stage={stage} completedStageIds={[level]} />)
      expect(screen.getByText('Celebration visible')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: `ENTER LEVEL ${level + 1}` })).toHaveAttribute(
        'href',
        stage.href
      )
      act(() => {
        vi.advanceTimersByTime(5300)
      })
      expect(screen.getByText('Celebration visible')).toBeInTheDocument()
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(screen.queryByText('Celebration visible')).not.toBeInTheDocument()
      expect(window.location.search).toBe('')
      expect(localStorage.getItem(`ibm-level-${word}-completed`)).toBe('true')
    }
  )
})
