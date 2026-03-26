import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useMediaStore } from './mediaStore'
import type { Media } from '@/types/supabase'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

// Mock query functions
const mockGetMedia = vi.fn()
const mockUpdateMedia = vi.fn()
const mockDeleteMedia = vi.fn()
const mockGetCategories = vi.fn()

vi.mock('@/lib/queries/media', () => ({
  getMedia: (...args: unknown[]) => mockGetMedia(...args),
  updateMedia: (...args: unknown[]) => mockUpdateMedia(...args),
  deleteMedia: (...args: unknown[]) => mockDeleteMedia(...args),
  getCategories: (...args: unknown[]) => mockGetCategories(...args),
}))

const makeMedia = (overrides: Partial<Media> = {}): Media => ({
  id: 'media-1',
  project_id: 'proj-1',
  storage_path: 'path/to/file.jpg',
  filename: 'photo.jpg',
  mime_type: 'image/jpeg',
  size_bytes: 1024 * 1024, // 1MB
  width: 3000,
  height: 2000,
  orientation: 'landscape',
  cloudflare_image_id: null,
  thumbnail_url: null,
  watermarked_url: null,
  ai_category: null,
  ai_confidence: null,
  ai_labels: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('useMediaStore', () => {
  beforeEach(() => {
    useMediaStore.setState({
      media: [],
      categories: [],
      selectedIds: new Set(),
      filters: { category: null, search: '' },
      sortOrder: 'asc',
      viewMode: 'grid',
      loading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  it('initializes with empty state', () => {
    const state = useMediaStore.getState()
    expect(state.media).toEqual([])
    expect(state.selectedIds.size).toBe(0)
    expect(state.viewMode).toBe('grid')
    expect(state.filters).toEqual({ category: null, search: '' })
  })

  it('setMedia replaces media array', () => {
    const media = [makeMedia({ id: 'm1' }), makeMedia({ id: 'm2' })]
    useMediaStore.getState().setMedia(media)
    expect(useMediaStore.getState().media).toEqual(media)
  })

  it('fetchMedia sets media on success', async () => {
    const media = [makeMedia()]
    mockGetMedia.mockResolvedValueOnce(media)

    await useMediaStore.getState().fetchMedia('proj-1')

    expect(useMediaStore.getState().media).toEqual(media)
    expect(useMediaStore.getState().loading).toBe(false)
  })

  it('fetchMedia sets error on failure', async () => {
    mockGetMedia.mockRejectedValueOnce(new Error('DB error'))

    await useMediaStore.getState().fetchMedia('proj-1')

    expect(useMediaStore.getState().error).toContain('DB error')
    expect(useMediaStore.getState().loading).toBe(false)
  })

  it('toggleSelect adds id to selectedIds', () => {
    useMediaStore.getState().toggleSelect('m1')
    expect(useMediaStore.getState().selectedIds.has('m1')).toBe(true)
  })

  it('toggleSelect removes id if already selected', () => {
    useMediaStore.setState({ selectedIds: new Set(['m1']) })
    useMediaStore.getState().toggleSelect('m1')
    expect(useMediaStore.getState().selectedIds.has('m1')).toBe(false)
  })

  it('selectAll selects all filtered media', () => {
    const media = [makeMedia({ id: 'm1' }), makeMedia({ id: 'm2' }), makeMedia({ id: 'm3' })]
    useMediaStore.setState({ media })
    useMediaStore.getState().selectAll()
    const { selectedIds } = useMediaStore.getState()
    expect(selectedIds.size).toBe(3)
    expect(selectedIds.has('m1')).toBe(true)
    expect(selectedIds.has('m2')).toBe(true)
    expect(selectedIds.has('m3')).toBe(true)
  })

  it('deselectAll clears selection', () => {
    useMediaStore.setState({ selectedIds: new Set(['m1', 'm2']) })
    useMediaStore.getState().deselectAll()
    expect(useMediaStore.getState().selectedIds.size).toBe(0)
  })

  it('setFilter updates filters', () => {
    useMediaStore.getState().setFilter({ category: 'wedding' })
    expect(useMediaStore.getState().filters.category).toBe('wedding')
  })

  it('setFilter merges with existing filters', () => {
    useMediaStore.setState({ filters: { category: 'wedding', search: 'test' } })
    useMediaStore.getState().setFilter({ search: 'new' })
    expect(useMediaStore.getState().filters).toEqual({ category: 'wedding', search: 'new' })
  })

  it('setViewMode updates view mode', () => {
    useMediaStore.getState().setViewMode('list')
    expect(useMediaStore.getState().viewMode).toBe('list')
  })

  it('setSortOrder updates sort order', () => {
    useMediaStore.getState().setSortOrder('desc')
    expect(useMediaStore.getState().sortOrder).toBe('desc')
  })

  it('filteredMedia filters by category', () => {
    const media = [
      makeMedia({ id: 'm1', ai_category: 'wedding' }),
      makeMedia({ id: 'm2', ai_category: 'portrait' }),
      makeMedia({ id: 'm3', ai_category: 'wedding' }),
    ]
    useMediaStore.setState({ media, filters: { category: 'wedding', search: '' } })
    const filtered = useMediaStore.getState().filteredMedia()
    expect(filtered).toHaveLength(2)
    expect(filtered.every((m) => m.ai_category === 'wedding')).toBe(true)
  })

  it('filteredMedia filters by search term', () => {
    const media = [
      makeMedia({ id: 'm1', filename: 'bride.jpg', ai_category: null }),
      makeMedia({ id: 'm2', filename: 'groom.jpg', ai_category: null }),
      makeMedia({ id: 'm3', filename: 'ceremony.jpg', ai_category: null }),
    ]
    useMediaStore.setState({ media, filters: { category: null, search: 'bride' } })
    const filtered = useMediaStore.getState().filteredMedia()
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('m1')
  })

  it('groupedByCategory groups media by ai_category', () => {
    const media = [
      makeMedia({ id: 'm1', ai_category: 'wedding' }),
      makeMedia({ id: 'm2', ai_category: 'portrait' }),
      makeMedia({ id: 'm3', ai_category: 'wedding' }),
      makeMedia({ id: 'm4', ai_category: null }),
    ]
    useMediaStore.setState({ media })
    const groups = useMediaStore.getState().groupedByCategory()
    expect(groups['wedding']).toHaveLength(2)
    expect(groups['portrait']).toHaveLength(1)
    expect(groups['Uncategorized']).toHaveLength(1)
  })

  it('removeMedia deletes from media array and deselects', async () => {
    const media = [makeMedia({ id: 'm1' }), makeMedia({ id: 'm2' }), makeMedia({ id: 'm3' })]
    useMediaStore.setState({ media, selectedIds: new Set(['m1', 'm2']) })
    mockDeleteMedia.mockResolvedValueOnce(undefined)

    await useMediaStore.getState().removeMedia(['m1'])

    const state = useMediaStore.getState()
    expect(state.media).toHaveLength(2)
    expect(state.media.find((m) => m.id === 'm1')).toBeUndefined()
    // m1 removed from selection, m2 still selected
    expect(state.selectedIds.has('m1')).toBe(false)
    expect(state.selectedIds.has('m2')).toBe(true)
  })
})
