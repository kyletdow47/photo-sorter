import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AccessGate } from './AccessGate'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock sessionStorage
const mockSessionStorage: Record<string, string> = {}
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: (key: string) => mockSessionStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockSessionStorage[key] = value },
    removeItem: (key: string) => { delete mockSessionStorage[key] },
    clear: () => { Object.keys(mockSessionStorage).forEach(k => delete mockSessionStorage[k]) },
  },
  writable: true,
})

describe('AccessGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockSessionStorage).forEach(k => delete mockSessionStorage[k])
  })

  it('renders the access form', () => {
    render(<AccessGate projectId="proj-1" theme="dark" />)
    expect(screen.getByText('Private Gallery')).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByLabelText('Access code')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View Gallery' })).toBeInTheDocument()
  })

  it('shows error message when invalidToken is true', () => {
    render(<AccessGate projectId="proj-1" theme="dark" invalidToken />)
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid or expired access link.')
  })

  it('renders with all 4 themes', () => {
    const themes = ['dark', 'light', 'minimal', 'editorial'] as const
    for (const theme of themes) {
      const { unmount } = render(<AccessGate projectId="proj-1" theme={theme} />)
      expect(screen.getByText('Private Gallery')).toBeInTheDocument()
      unmount()
    }
  })

  it('submits email and token, redirects on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'valid-token-123' }),
    })

    render(<AccessGate projectId="proj-1" theme="light" />)

    await userEvent.type(screen.getByLabelText('Email address'), 'client@example.com')
    await userEvent.type(screen.getByLabelText('Access code'), 'secret-code')
    await userEvent.click(screen.getByRole('button', { name: 'View Gallery' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/gallery/proj-1/access',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'client@example.com', token: 'secret-code' }),
        })
      )
    })

    await waitFor(() => {
      expect(mockSessionStorage['gallery_token_proj-1']).toBe('valid-token-123')
      expect(mockPush).toHaveBeenCalledWith('/gallery/proj-1?token=valid-token-123')
    })
  })

  it('shows error message on failed validation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid email or access code.' }),
    })

    render(<AccessGate projectId="proj-1" theme="dark" />)

    await userEvent.type(screen.getByLabelText('Email address'), 'wrong@example.com')
    await userEvent.type(screen.getByLabelText('Access code'), 'wrong-code')
    await userEvent.click(screen.getByRole('button', { name: 'View Gallery' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or access code.')
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows generic error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<AccessGate projectId="proj-1" theme="dark" />)

    await userEvent.type(screen.getByLabelText('Email address'), 'client@example.com')
    await userEvent.type(screen.getByLabelText('Access code'), 'code')
    await userEvent.click(screen.getByRole('button', { name: 'View Gallery' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.')
    })
  })

  it('disables submit button while loading', async () => {
    let resolve!: (value: unknown) => void
    mockFetch.mockReturnValueOnce(new Promise(r => { resolve = r }))

    render(<AccessGate projectId="proj-1" theme="dark" />)

    await userEvent.type(screen.getByLabelText('Email address'), 'a@b.com')
    await userEvent.type(screen.getByLabelText('Access code'), 'code')
    await userEvent.click(screen.getByRole('button', { name: 'View Gallery' }))

    expect(screen.getByRole('button', { name: 'Checking...' })).toBeDisabled()

    resolve({ ok: true, json: async () => ({ token: 'tok' }) })
  })
})
