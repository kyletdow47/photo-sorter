import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MediaCard } from './MediaCard'
import type { MediaItem } from '@/types/media'

const baseMedia: MediaItem = {
  id: 'photo-1',
  filename: 'IMG_0001.jpg',
  thumbnail_url: 'https://example.com/thumb.jpg',
  ai_category: 'portrait',
  ai_confidence: 0.92,
  orientation: 'portrait',
  selected: false,
}

describe('MediaCard', () => {
  it('renders the thumbnail image', () => {
    render(
      <MediaCard
        media={baseMedia}
        onSelect={vi.fn()}
        onDoubleClick={vi.fn()}
      />
    )
    const img = screen.getByRole('img', { name: /IMG_0001/i })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg')
  })

  it('renders the filename (truncated if long)', () => {
    render(
      <MediaCard
        media={{ ...baseMedia, filename: 'IMG_0001.jpg' }}
        onSelect={vi.fn()}
        onDoubleClick={vi.fn()}
      />
    )
    expect(screen.getByText('IMG_0001.jpg')).toBeInTheDocument()
  })

  it('renders the AI category badge', () => {
    render(
      <MediaCard
        media={baseMedia}
        onSelect={vi.fn()}
        onDoubleClick={vi.fn()}
      />
    )
    expect(screen.getByText('portrait')).toBeInTheDocument()
  })

  it('renders the AI confidence percentage', () => {
    render(
      <MediaCard
        media={baseMedia}
        onSelect={vi.fn()}
        onDoubleClick={vi.fn()}
      />
    )
    expect(screen.getByText('92%')).toBeInTheDocument()
  })

  it('shows placeholder when no thumbnail_url', () => {
    render(
      <MediaCard
        media={{ ...baseMedia, thumbnail_url: null }}
        onSelect={vi.fn()}
        onDoubleClick={vi.fn()}
      />
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('has selected styling when selected=true', () => {
    render(
      <MediaCard
        media={{ ...baseMedia, selected: true }}
        onSelect={vi.fn()}
        onDoubleClick={vi.fn()}
      />
    )
    const card = screen.getByRole('checkbox', { name: /IMG_0001/i })
    expect(card).toHaveAttribute('aria-checked', 'true')
    expect(card).toHaveClass('border-blue-500')
  })

  it('calls onSelect with id and shiftKey when clicked', async () => {
    const onSelect = vi.fn()
    render(
      <MediaCard
        media={baseMedia}
        onSelect={onSelect}
        onDoubleClick={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onSelect).toHaveBeenCalledWith('photo-1', false)
  })

  it('does not render category section when ai_category is null', () => {
    render(
      <MediaCard
        media={{ ...baseMedia, ai_category: null, ai_confidence: null }}
        onSelect={vi.fn()}
        onDoubleClick={vi.fn()}
      />
    )
    expect(screen.queryByText('portrait')).not.toBeInTheDocument()
    expect(screen.queryByText('92%')).not.toBeInTheDocument()
  })
})
