import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PreparationPanel } from '../../../src/features/game/components/PreparationPanel'

vi.mock('../../../src/features/progress/actions/progress.actions', () => ({
  getCompletedClientKeysAction: vi.fn().mockResolvedValue(['david']),
}))

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem(
    'ibm-selected-outreach-client',
    JSON.stringify({ personaId: 'test-level-2' })
  )
})
afterEach(cleanup)

function prepare() {
  fireEvent.click(screen.getByRole('button', { name: 'Set Meeting Objectives →' }))
  fireEvent.click(screen.getByRole('button', { name: /Create a reliable/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Prepare Questions →' }))
  fireEvent.click(screen.getByRole('button', { name: /Which customer data sources/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Review Preparation →' }))
}

describe('preparation progression', () => {
  it('enforces three objectives and lets the player deselect one', () => {
    render(<PreparationPanel onClose={vi.fn()} availableClientKeys={['david']} />)
    fireEvent.click(screen.getByRole('button', { name: 'Set Meeting Objectives →' }))
    const choices = [
      /Create a reliable/,
      /Replace Meridian's entire/,
      /Build more dashboards/,
      /Use AI to predict/,
    ].map((name) => screen.getByRole('button', { name }))
    choices.slice(0, 3).forEach((choice) => fireEvent.click(choice))
    expect(choices[3]).toBeDisabled()
    fireEvent.click(choices[0]!)
    expect(choices[3]).not.toBeDisabled()
  })

  it('does not award completion when the grading adapter is unavailable', () => {
    render(<PreparationPanel onClose={vi.fn()} availableClientKeys={['david']} />)
    prepare()
    expect(screen.getByRole('alert')).toHaveTextContent('not available')
    expect(localStorage.getItem('ibm-level-three-completed')).toBeNull()
  })

  it('shows returned feedback and saves the reviewed submission before unlocking', async () => {
    const grade = vi.fn().mockResolvedValue({
      submissionId: 'saved-prep-1',
      feedback: 'Explore measurable business value.',
      firstCompletion: true,
    })
    render(<PreparationPanel onClose={vi.fn()} gradePreparation={grade} availableClientKeys={['david']} />)
    prepare()
    await screen.findByText('Explore measurable business value.')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enter Meeting →' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Enter Meeting →' }))
    expect(localStorage.getItem('ibm-level-three-completed')).toBe('true')
    expect(sessionStorage.getItem('ibm-level-three-celebration-pending')).toBe('true')
    expect(JSON.parse(localStorage.getItem('ibm-level-three-preparation')!)['test-level-2']).toMatchObject({
      objectives: expect.any(Array),
      questions: expect.any(Array),
    })
    expect(await screen.findByText('Level 4 unlocked')).toBeInTheDocument()
  })

  it('saves a replay without announcing another unlock', async () => {
    const grade = vi.fn().mockResolvedValue({
      submissionId: 'saved-prep-replay',
      feedback: 'Good preparation.',
      firstCompletion: false,
    })
    render(<PreparationPanel onClose={vi.fn()} gradePreparation={grade} availableClientKeys={['david']} />)
    prepare()
    await screen.findByText('Good preparation.')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enter Meeting →' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Enter Meeting →' }))
    expect(sessionStorage.getItem('ibm-level-three-celebration-pending')).toBeNull()
    expect(await screen.findByText('Preparation saved')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return home →' })).toHaveAttribute(
      'href',
      '/dashboard'
    )
  })

  it('retains choices and does not unlock on a failed grading request', async () => {
    render(
      <PreparationPanel
        onClose={vi.fn()}
        gradePreparation={vi.fn().mockRejectedValue(new Error('offline'))}
        availableClientKeys={['david']}
      />
    )
    prepare()
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('could not be reviewed')
    )
    expect(localStorage.getItem('ibm-level-three-completed')).toBeNull()
    expect(localStorage.getItem('ibm-preparation-draft:test-level-2')).toContain(
      'Which customer data sources'
    )
  })
})
