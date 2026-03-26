import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GalleryView } from './GalleryView'
import type { Project, Media } from '@/types/supabase'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const mockProject: Project = {
  id: 'proj-1',
  workspace_id: 'ws-1',
  name: 'Summer Wedding',
  preset: null,
  status: 'published',
  cover_image_url: null,
  gallery_public: true,
  gallery_theme: 'dark',
  pricing_model: 'free',
  flat_fee_cents: null,
  per_photo_cents: null,
  currency: 'usd',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const makeMedia = (overrides: Partial<Media> = {}): Media => ({
  id: 'media-1',
  project_id: 'proj-1',
  storage_path: '/photos/test.jpg',
  filename: 'test.jpg',
  mime_type: 'image/jpeg',
  size_bytes: 100000,
  width: 1920,
  height: 1280,
  orientation: 'landscape',
  cloudflare_image_id: null,
  thumbnail_url: 'https://example.com/thumb.jpg',
  watermarked_url: null,
  ai_category: 'Ceremony',
  ai_confidence: 0.95,
  ai_labels: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('GalleryView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.location.href
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    })
  })

  it('renders project name in header', () => {
    render(<GalleryView project={mockProject} media={[]} theme="dark" />)
    expect(screen.getByRole('heading', { name: 'Summer Wedding' })).toBeInTheDocument()
  })

  it('renders photo count', () => {
    const media = [makeMedia(), makeMedia({ id: 'media-2', filename: 'test2.jpg' })]
    render(<GalleryView project={mockProject} media={media} theme="dark" />)
    expect(screen.getByText('2 photos')).toBeInTheDocument()
  })

  it('renders with dark theme', () => {
    const { container } = render(
      <GalleryView project={mockProject} media={[makeMedia()]} theme="dark" />
    )
    // Dark theme gallery div should be present
    expect(container.firstChild).toBeTruthy()
  })

  it('renders with light theme', () => {
    const project = { ...mockProject, gallery_theme: 'light' as const }
    render(<GalleryView project={project} media={[makeMedia()]} theme="light" />)
    expect(screen.getByRole('heading', { name: 'Summer Wedding' })).toBeInTheDocument()
  })

  it('renders with minimal theme', () => {
    const project = { ...mockProject, gallery_theme: 'minimal' as const }
    render(<GalleryView project={project} media={[makeMedia()]} theme="minimal" />)
    expect(screen.getByRole('heading', { name: 'Summer Wedding' })).toBeInTheDocument()
  })

  it('renders with editorial theme', () => {
    const project = { ...mockProject, gallery_theme: 'editorial' as const }
    render(<GalleryView project={project} media={[makeMedia()]} theme="editorial" />)
    expect(screen.getByRole('heading', { name: 'Summer Wedding' })).toBeInTheDocument()
  })

  it('groups photos by category', () => {
    const media = [
      makeMedia({ id: 'm1', ai_category: 'Ceremony' }),
      makeMedia({ id: 'm2', ai_category: 'Reception' }),
      makeMedia({ id: 'm3', ai_category: 'Ceremony' }),
    ]
    render(<GalleryView project={mockProject} media={media} theme="dark" />)
    expect(screen.getByText('Ceremony')).toBeInTheDocument()
    expect(screen.getByText('Reception')).toBeInTheDocument()
  })

  it('shows "Uncategorized" for media with no category', () => {
    const media = [makeMedia({ ai_category: null })]
    render(<GalleryView project={mockProject} media={media} theme="dark" />)
    expect(screen.getByText('Uncategorized')).toBeInTheDocument()
  })

  it('shows "Powered by PhotoSorter" for free tier', () => {
    render(<GalleryView project={mockProject} media={[]} theme="dark" />)
    expect(screen.getByText(/Powered by/i)).toBeInTheDocument()
    expect(screen.getByText('PhotoSorter')).toBeInTheDocument()
  })

  it('shows photographer branding for pro tier', () => {
    const proProject = { ...mockProject, pricing_model: 'flat_fee' as const }
    render(<GalleryView project={proProject} media={[]} theme="dark" />)
    expect(screen.queryByText(/Powered by/i)).not.toBeInTheDocument()
    expect(screen.getByText('Summer Wedding')).toBeInTheDocument()
  })

  it('opens lightbox when a photo is clicked', async () => {
    const media = [makeMedia()]
    render(<GalleryView project={mockProject} media={media} theme="dark" />)
    const photo = screen.getByRole('img', { name: 'test.jpg' })
    await userEvent.click(photo)
    // Lightbox dialog should open
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes lightbox when close button is clicked', async () => {
    const media = [makeMedia()]
    render(<GalleryView project={mockProject} media={media} theme="dark" />)
    const photo = screen.getByRole('img', { name: 'test.jpg' })
    await userEvent.click(photo)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Close lightbox' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders download all button', () => {
    render(<GalleryView project={mockProject} media={[]} theme="dark" />)
    expect(screen.getByRole('button', { name: /download all/i })).toBeInTheDocument()
  })
})
