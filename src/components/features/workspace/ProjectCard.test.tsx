import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectCard } from './ProjectCard'
import type { Project } from '@/types/supabase'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock project store
const mockArchive = vi.fn()
const mockRemove = vi.fn()
vi.mock('@/stores/projectStore', () => ({
  useProjectStore: () => ({
    removeProject: mockRemove,
    archiveProject: mockArchive,
  }),
}))

const baseProject: Project = {
  id: 'proj-1',
  workspace_id: 'ws-1',
  name: 'Smith Wedding 2026',
  preset: 'Wedding',
  status: 'active',
  cover_image_url: null,
  gallery_public: false,
  gallery_theme: 'dark',
  pricing_model: 'free',
  flat_fee_cents: null,
  per_photo_cents: null,
  currency: 'usd',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-15T00:00:00Z',
}

describe('ProjectCard', () => {
  it('renders project name', () => {
    render(<ProjectCard project={baseProject} />)
    expect(screen.getByText('Smith Wedding 2026')).toBeInTheDocument()
  })

  it('renders preset badge', () => {
    render(<ProjectCard project={baseProject} />)
    expect(screen.getByText('Wedding')).toBeInTheDocument()
  })

  it('renders photo count', () => {
    render(<ProjectCard project={baseProject} photoCount={42} />)
    expect(screen.getByText('42 photos')).toBeInTheDocument()
  })

  it('renders singular photo count', () => {
    render(<ProjectCard project={baseProject} photoCount={1} />)
    expect(screen.getByText('1 photo')).toBeInTheDocument()
  })

  it('renders status indicator', () => {
    render(<ProjectCard project={baseProject} />)
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('renders archived status', () => {
    const archived = { ...baseProject, status: 'archived' as const }
    render(<ProjectCard project={archived} />)
    expect(screen.getByText('archived')).toBeInTheDocument()
  })

  it('renders published status', () => {
    const published = { ...baseProject, status: 'published' as const }
    render(<ProjectCard project={published} />)
    expect(screen.getByText('published')).toBeInTheDocument()
  })

  it('navigates to project on Enter key', async () => {
    const user = userEvent.setup()
    render(<ProjectCard project={baseProject} />)
    const card = screen.getByRole('button', { name: /Open project Smith Wedding 2026/i })
    await user.type(card, '{Enter}')
    expect(mockPush).toHaveBeenCalledWith('/dashboard/project/proj-1')
  })

  it('renders gradient placeholder when no cover image', () => {
    const { container } = render(<ProjectCard project={baseProject} />)
    // Should not have an img in the cover area
    const coverArea = container.querySelector('.aspect-video')
    expect(coverArea?.querySelector('img')).toBeNull()
  })

  it('renders cover image when provided', () => {
    const withCover = { ...baseProject, cover_image_url: 'https://example.com/cover.jpg' }
    render(<ProjectCard project={withCover} />)
    const img = screen.getByRole('img', { name: 'Smith Wedding 2026' })
    expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg')
  })

  it('shows default zero photo count', () => {
    render(<ProjectCard project={baseProject} />)
    expect(screen.getByText('0 photos')).toBeInTheDocument()
  })
})
