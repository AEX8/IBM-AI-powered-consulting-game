import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LevelNavigationControls } from '../../../src/features/game/components/LevelNavigationControls'
import { saveNotebook } from '../../../src/features/game/notebookStorage'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../../../src/features/game/notebookStorage', () => ({
  readNotebook: vi.fn(() => ''),
  saveNotebook: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('level notebook keyboard input', () => {
  it.each([1, 2, 3, 4, 5, 6] as const)(
    'accepts E and Space and saves the note in Level %i',
    async (level) => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(<LevelNavigationControls level={level} onOpenChange={onOpenChange} />)

      await user.click(screen.getByRole('button', { name: 'Open notebook' }))
      const notes = screen.getByRole('textbox', { name: `Level ${level} consultant notes` })
      expect(notes).toHaveFocus()
      await user.type(notes, 'e e')
      expect(notes).toHaveValue('e e')
      await user.click(screen.getByRole('button', { name: 'Save notebook' }))
      expect(saveNotebook).toHaveBeenCalledWith(level, 'e e', undefined)
      expect(onOpenChange).toHaveBeenLastCalledWith(false)
    }
  )
})
