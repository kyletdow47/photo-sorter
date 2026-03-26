import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingWizard } from './OnboardingWizard'

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

// Mock Supabase client
const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()
const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

// Mock Toast
vi.mock('@/components/common/Toast', () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

function setupSupabaseMocks() {
  const chain = {
    update: mockUpdate,
    insert: mockInsert,
    select: mockSelect,
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
  mockUpdate.mockReturnValue(chain)
  mockInsert.mockReturnValue({
    ...chain,
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: 'ws-1' }, error: null }),
    }),
  })
  mockFrom.mockReturnValue(chain)
}

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    setupSupabaseMocks()
  })

  it('renders step 1 (Welcome) by default', () => {
    render(<OnboardingWizard />)
    expect(screen.getByText('Welcome to View1 Studio')).toBeInTheDocument()
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument()
  })

  it('shows progress bar with correct step labels', () => {
    render(<OnboardingWizard />)
    expect(screen.getByText('Welcome')).toBeInTheDocument()
    expect(screen.getByText('Specialty')).toBeInTheDocument()
    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(screen.getByText('First Project')).toBeInTheDocument()
  })

  it('does not show Back button on step 1', () => {
    render(<OnboardingWizard />)
    expect(screen.queryByText('Back')).not.toBeInTheDocument()
  })

  describe('Step 1 validation', () => {
    it('shows errors when name fields are empty', async () => {
      render(<OnboardingWizard />)
      fireEvent.click(screen.getByText('Continue'))
      expect(await screen.findByText('Name is required')).toBeInTheDocument()
      expect(await screen.findByText('Business name is required')).toBeInTheDocument()
    })

    it('advances to step 2 when both fields are filled', async () => {
      render(<OnboardingWizard />)
      await userEvent.type(screen.getByLabelText(/your name/i), 'Jane Smith')
      await userEvent.type(screen.getByLabelText(/business name/i), 'Jane Smith Photography')
      fireEvent.click(screen.getByText('Continue'))
      await waitFor(() => {
        expect(screen.getByText('What do you shoot?')).toBeInTheDocument()
      })
    })
  })

  describe('Step 2 validation', () => {
    async function reachStep2() {
      render(<OnboardingWizard />)
      await userEvent.type(screen.getByLabelText(/your name/i), 'Jane')
      await userEvent.type(screen.getByLabelText(/business name/i), 'Biz')
      fireEvent.click(screen.getByText('Continue'))
      await screen.findByText('What do you shoot?')
    }

    it('shows error when no specialty selected', async () => {
      await reachStep2()
      fireEvent.click(screen.getByText('Continue'))
      expect(await screen.findByText('Please select a specialty')).toBeInTheDocument()
    })

    it('advances to step 3 when specialty is selected', async () => {
      await reachStep2()
      fireEvent.click(screen.getByText('Wedding'))
      fireEvent.click(screen.getByText('Continue'))
      await waitFor(() => {
        expect(screen.getByText('Choose your plan')).toBeInTheDocument()
      })
    })
  })

  describe('Step 3 (Plan)', () => {
    async function reachStep3() {
      render(<OnboardingWizard />)
      await userEvent.type(screen.getByLabelText(/your name/i), 'Jane')
      await userEvent.type(screen.getByLabelText(/business name/i), 'Biz')
      fireEvent.click(screen.getByText('Continue'))
      await screen.findByText('What do you shoot?')
      fireEvent.click(screen.getByText('Wedding'))
      fireEvent.click(screen.getByText('Continue'))
      await screen.findByText('Choose your plan')
    }

    it('renders three plan cards', async () => {
      await reachStep3()
      expect(screen.getByText('Free')).toBeInTheDocument()
      expect(screen.getByText('Pro')).toBeInTheDocument()
      expect(screen.getByText('Business')).toBeInTheDocument()
    })

    it('advances to step 4 without selecting a plan (default is Free)', async () => {
      await reachStep3()
      fireEvent.click(screen.getByText('Continue'))
      await waitFor(() => {
        expect(screen.getByText('Create your first project')).toBeInTheDocument()
      })
    })

    it('shows Back button on step 3', async () => {
      await reachStep3()
      expect(screen.getByText('Back')).toBeInTheDocument()
    })
  })

  describe('Step 4 validation', () => {
    async function reachStep4() {
      render(<OnboardingWizard />)
      await userEvent.type(screen.getByLabelText(/your name/i), 'Jane')
      await userEvent.type(screen.getByLabelText(/business name/i), 'Biz')
      fireEvent.click(screen.getByText('Continue'))
      await screen.findByText('What do you shoot?')
      fireEvent.click(screen.getByText('Event'))
      fireEvent.click(screen.getByText('Continue'))
      await screen.findByText('Choose your plan')
      fireEvent.click(screen.getByText('Continue'))
      await screen.findByText('Create your first project')
    }

    it('shows error when project name is empty', async () => {
      await reachStep4()
      fireEvent.click(screen.getByText('Launch my workspace'))
      expect(await screen.findByText('Project name is required')).toBeInTheDocument()
    })

    it('shows project preview card when name is typed', async () => {
      await reachStep4()
      await userEvent.type(screen.getByLabelText(/project name/i), 'Summer Wedding 2026')
      expect(await screen.findByText('Summer Wedding 2026')).toBeInTheDocument()
    })
  })

  describe('Back navigation', () => {
    it('goes back from step 2 to step 1', async () => {
      render(<OnboardingWizard />)
      await userEvent.type(screen.getByLabelText(/your name/i), 'Jane')
      await userEvent.type(screen.getByLabelText(/business name/i), 'Biz')
      fireEvent.click(screen.getByText('Continue'))
      await screen.findByText('What do you shoot?')
      fireEvent.click(screen.getByText('Back'))
      await waitFor(() => {
        expect(screen.getByText('Welcome to View1 Studio')).toBeInTheDocument()
      })
    })
  })
})
