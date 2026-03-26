import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PhotoGrid } from './PhotoGrid'
import type { MediaItem } from '@/types/media'

const makeMedia = (count: number): MediaItem[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `photo-${i + 1}`,
    filename: `IMG_${String(i + 1).padStart(4, '0')}.jpg`,
    thumbnail_url: `https://example.com/thumb-${i + 1}.jpg`,
    ai_category: 'portrait',
    ai_confidence: 0.9,
    orientation: 'portrait' as const,
    selected: false,
  }))

describe('PhotoGrid', () => {
  it('renders a grid of MediaCards', () => {
    const media = makeMedia(3)
    render(
      <PhotoGrid
        media={media}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDoubleClick={vi.fn()}
      />
    )
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
  })

  it('renders empty state when media is empty', () => {
    render(
      <PhotoGrid
        media={[]}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDoubleClick={vi.fn()}
      />
    )
    expect(
      screen.getByText(/No photos yet — upload some to get started/i)
    ).toBeInTheDocument()
  })

  it('marks selected items with aria-checked=true', () => {
    const media = makeMedia(3)
    const selectedIds = new Set(['photo-1', 'photo-3'])
    render(
      <PhotoGrid
        media={media}
        selectedIds={selectedIds}
        onSelect={vi.fn()}
        onDoubleClick={vi.fn()}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    const checked = checkboxes.filter((cb) => cb.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(2)
  })

  it('renders loading skeletons when loading=true', () => {
    const { container } = render(
      <PhotoGrid
        media={[]}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDoubleClick={vi.fn()}
        loading
      />
    )
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders list rows in list view mode', () => {
    const media = makeMedia(2)
    render(
      <PhotoGrid
        media={media}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDoubleClick={vi.fn()}
        viewMode="list"
      />
    )
    // In list mode, we have role=checkbox rows
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  })
})
