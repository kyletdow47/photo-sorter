import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewProjectModal } from './NewProjectModal'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock project store
const mockAddProject = vi.fn().mockResolvedValue({ id: 'new-proj' })
vi.mock('@/stores/projectStore', () => ({
  useProjectStore: () => ({ addProject: mockAddProject }),
}))

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  workspaceId: 'ws-1',
  activeProjectCount: 0,
  tier: 'free' as const,
}

describe('NewProjectModal', () => {
  it('renders form when under free tier limit', () => {
    render(<NewProjectModal {...defaultProps} />)
    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
    expect(screen.getByText('Create Project')).toBeInTheDocument()
  })

  it('shows upgrade prompt when free tier limit reached', () => {
    render(
      <NewProjectModal
        {...defaultProps}
        activeProjectCount={3}
        tier="free"
      />,
    )
    expect(screen.getByText(/free plan limit reached/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upgrade to pro/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/project name/i)).toBeNull()
  })

  it('does not show upgrade prompt for pro tier even at 3 projects', () => {
    render(
      <NewProjectModal
        {...defaultProps}
        activeProjectCount={3}
        tier="pro"
      />,
    )
    expect(screen.queryByText(/free plan limit reached/i)).toBeNull()
    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
  })

  it('does not show upgrade prompt for business tier', () => {
    render(
      <NewProjectModal
        {...defaultProps}
        activeProjectCount={10}
        tier="business"
      />,
    )
    expect(screen.queryByText(/free plan limit reached/i)).toBeNull()
    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
  })

  it('submit button is disabled when name is empty', () => {
    render(<NewProjectModal {...defaultProps} />)
    expect(screen.getByText('Create Project').closest('button')).toBeDisabled()
  })

  it('submit button is enabled when name is filled', async () => {
    const user = userEvent.setup()
    render(<NewProjectModal {...defaultProps} />)
    await user.type(screen.getByLabelText(/project name/i), 'My Project')
    expect(screen.getByText('Create Project').closest('button')).not.toBeDisabled()
  })

  it('renders all preset options', () => {
    render(<NewProjectModal {...defaultProps} />)
    expect(screen.getByText('Wedding')).toBeInTheDocument()
    expect(screen.getByText('Portrait')).toBeInTheDocument()
    expect(screen.getByText('Event')).toBeInTheDocument()
    expect(screen.getByText('Product')).toBeInTheDocument()
    expect(screen.getByText('Real Estate')).toBeInTheDocument()
    expect(screen.getByText('Custom')).toBeInTheDocument()
  })

  it('calls addProject with correct data on submit', async () => {
    const user = userEvent.setup()
    render(<NewProjectModal {...defaultProps} />)
    await user.type(screen.getByLabelText(/project name/i), 'Smith Wedding')
    await user.click(screen.getByText('Create Project').closest('button')!)
    expect(mockAddProject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Smith Wedding',
        workspace_id: 'ws-1',
        status: 'active',
      }),
    )
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<NewProjectModal {...defaultProps} onClose={onClose} />)
    await user.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })
})
