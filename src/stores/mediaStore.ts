'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { deleteMedia, getCategories, getMedia, updateMedia } from '@/lib/queries/media'
import type { Category, Media, MediaUpdate } from '@/types/supabase'
import type { ViewMode } from '@/components/features/PhotoGrid'

interface MediaFilters {
  category: string | null
  search: string
}

interface MediaState {
  media: Media[]
  categories: Category[]
  selectedIds: Set<string>
  filters: MediaFilters
  sortOrder: 'asc' | 'desc'
  viewMode: ViewMode
  loading: boolean
  error: string | null
  fetchMedia: (projectId: string) => Promise<void>
  fetchCategories: (projectId: string) => Promise<void>
  setMedia: (media: Media[]) => void
  editMedia: (id: string, update: MediaUpdate) => Promise<void>
  removeMedia: (ids: string[]) => Promise<void>
  setFilter: (filters: Partial<MediaFilters>) => void
  setSortOrder: (order: 'asc' | 'desc') => void
  setViewMode: (mode: ViewMode) => void
  toggleSelect: (id: string) => void
  selectAll: () => void
  deselectAll: () => void
  filteredMedia: () => Media[]
  groupedByCategory: () => Record<string, Media[]>
}

export const useMediaStore = create<MediaState>((set, get) => ({
  media: [],
  categories: [],
  selectedIds: new Set(),
  filters: { category: null, search: '' },
  sortOrder: 'asc',
  viewMode: 'grid',
  loading: false,
  error: null,

  async fetchMedia(projectId: string) {
    set({ loading: true, error: null })
    try {
      const supabase = createClient()
      const media = await getMedia(supabase, projectId)
      set({ media, loading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch media'
      console.error('fetchMedia error:', error)
      set({ error: message, loading: false })
    }
  },

  async fetchCategories(projectId: string) {
    try {
      const supabase = createClient()
      const categories = await getCategories(supabase, projectId)
      set({ categories })
    } catch (error) {
      console.error('fetchCategories error:', error)
    }
  },

  setMedia(media: Media[]) {
    set({ media })
  },

  async editMedia(id: string, update: MediaUpdate) {
    const supabase = createClient()
    const updated = await updateMedia(supabase, id, update)
    set((state) => ({
      media: state.media.map((m) => (m.id === id ? updated : m)),
    }))
  },

  async removeMedia(ids: string[]) {
    const supabase = createClient()
    await deleteMedia(supabase, ids)
    const idSet = new Set(ids)
    set((state) => ({
      media: state.media.filter((m) => !idSet.has(m.id)),
      selectedIds: new Set([...state.selectedIds].filter((id) => !idSet.has(id))),
    }))
  },

  setFilter(filters: Partial<MediaFilters>) {
    set((state) => ({ filters: { ...state.filters, ...filters } }))
  },

  setSortOrder(order: 'asc' | 'desc') {
    set({ sortOrder: order })
  },

  setViewMode(mode: ViewMode) {
    set({ viewMode: mode })
  },

  toggleSelect(id: string) {
    set((state) => {
      const next = new Set(state.selectedIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { selectedIds: next }
    })
  },

  selectAll() {
    const items = get().filteredMedia()
    set({ selectedIds: new Set(items.map((m) => m.id)) })
  },

  deselectAll() {
    set({ selectedIds: new Set() })
  },

  filteredMedia(): Media[] {
    const { media, filters, sortOrder } = get()
    let result = media

    if (filters.category) {
      result = result.filter((m) => m.ai_category === filters.category)
    }

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (m) =>
          m.filename.toLowerCase().includes(q) ||
          (m.ai_category?.toLowerCase().includes(q) ?? false),
      )
    }

    result = [...result].sort((a, b) => {
      const cmp =
        a.sort_order - b.sort_order ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sortOrder === 'asc' ? cmp : -cmp
    })

    return result
  },

  groupedByCategory(): Record<string, Media[]> {
    const items = get().filteredMedia()
    const groups: Record<string, Media[]> = {}

    for (const item of items) {
      const cat = item.ai_category ?? 'Uncategorized'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(item)
    }

    return groups
  },
}))
