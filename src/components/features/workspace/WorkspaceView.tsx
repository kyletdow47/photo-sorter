'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { Globe, Grid3X3, HardDrive, List, Menu, Search, Upload, X } from 'lucide-react'
import { Button } from '@/components/common'
import { CategorySection } from '@/components/features/CategorySection'
import { Lightbox } from '@/components/features/Lightbox'
import { SelectionToolbar } from '@/components/features/SelectionToolbar'
import { UploadZone } from '@/components/features/UploadZone'
import { useBatchSelect } from '@/hooks/useBatchSelect'
import { useMediaStore } from '@/stores/mediaStore'
import { useUploadStore } from '@/stores/uploadStore'
import { PLANS } from '@/lib/stripe/plans'
import type { Media, Project } from '@/types/supabase'
import type { UserTier } from '@/types/supabase'
import type { MediaItem } from '@/types/media'

function mediaToItem(m: Media): MediaItem {
  return {
    id: m.id,
    filename: m.filename,
    thumbnail_url: m.thumbnail_url,
    ai_category: m.ai_category,
    ai_confidence: m.ai_confidence,
    orientation: m.orientation,
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export interface WorkspaceViewProps {
  project: Project
  initialMedia: Media[]
  tier?: UserTier
}

export function WorkspaceView({ project, initialMedia, tier = 'free' }: WorkspaceViewProps) {
  const storageLimitBytes = PLANS[tier].limits.storageBytes
  const router = useRouter()
  const {
    setMedia,
    viewMode,
    setViewMode,
    filters,
    setFilter,
    groupedByCategory,
    filteredMedia,
    removeMedia,
    loading,
  } = useMediaStore()

  const { selectedIds, toggle, selectRange, selectAll, deselectAll } = useBatchSelect()
  const initializeUploads = useUploadStore((s) => s.initialize)
  const uploadItems = useUploadStore((s) => s.items)
  const hasInterruptedUploads = Object.values(uploadItems).some((i) => i.status === 'uploading' || i.status === 'queued')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const lastSelectedRef = useRef<string | null>(null)

  // Seed store with SSR data on mount
  useEffect(() => {
    setMedia(initialMedia)
    void initializeUploads()
  }, [initialMedia, setMedia, initializeUploads])

  const groups = groupedByCategory()
  const categoryNames = Object.keys(groups)
  const allFilteredMedia = filteredMedia()
  const flatMediaItems = allFilteredMedia.map(mediaToItem)

  const handleSelect = useCallback(
    (id: string, shiftKey: boolean) => {
      if (shiftKey && lastSelectedRef.current) {
        const allIds = flatMediaItems.map((m) => m.id)
        selectRange(lastSelectedRef.current, id, allIds)
      } else {
        toggle(id)
        lastSelectedRef.current = id
      }
    },
    [flatMediaItems, toggle, selectRange],
  )

  function handleDoubleClick(id: string) {
    const idx = flatMediaItems.findIndex((m) => m.id === id)
    if (idx !== -1) setLightboxIndex(idx)
  }

  async function handleDeleteSelected() {
    if (!confirm(`Delete ${selectedIds.size} photo(s)? This cannot be undone.`)) return
    try {
      await removeMedia([...selectedIds])
      deselectAll()
    } catch (err) {
      console.error('Failed to delete media:', err)
    }
  }

  const totalBytes = allFilteredMedia.reduce((sum, m) => sum + m.size_bytes, 0)
  const storagePercent = Math.min((totalBytes / storageLimitBytes) * 100, 100)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-56 border-r border-view1-border bg-surface flex flex-col transform transition-transform duration-200 lg:static lg:translate-x-0 lg:flex-shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="p-4 border-b border-view1-border">
          <button
            type="button"
            className="text-xs font-semibold text-white/30 uppercase tracking-wider hover:text-white/50 transition-colors"
            onClick={() => router.push('/dashboard')}
          >
            ← Dashboard
          </button>
        </div>

        <div className="p-3">
          <Button
            variant="primary"
            size="sm"
            className="w-full gap-2"
            onClick={() => setShowUpload((prev) => !prev)}
          >
            <Upload className="w-4 h-4" />
            Upload Photos
          </Button>
        </div>

        {/* Category filters */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          <p className="text-[10px] uppercase tracking-wider text-white/30 px-2 py-2">
            Categories
          </p>

          <button
            type="button"
            className={clsx(
              'w-full text-left rounded-lg px-3 py-1.5 text-sm transition-colors flex items-center',
              activeCategory === null
                ? 'bg-accent/10 text-white'
                : 'text-white/50 hover:text-white hover:bg-white/5',
            )}
            onClick={() => {
              setActiveCategory(null)
              setFilter({ category: null })
              setSidebarOpen(false)
            }}
          >
            All Photos
            <span className="ml-auto text-xs text-white/30">{allFilteredMedia.length}</span>
          </button>

          {categoryNames.map((cat) => (
            <button
              key={cat}
              type="button"
              className={clsx(
                'w-full text-left rounded-lg px-3 py-1.5 text-sm transition-colors capitalize flex items-center',
                activeCategory === cat
                  ? 'bg-accent/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5',
              )}
              onClick={() => {
                setActiveCategory(cat)
                setFilter({ category: cat })
                setSidebarOpen(false)
              }}
            >
              <span className="truncate flex-1">{cat}</span>
              <span className="ml-1 text-xs text-white/30 flex-shrink-0">{groups[cat].length}</span>
            </button>
          ))}
        </nav>

        {/* Storage usage */}
        <div className="p-4 border-t border-view1-border">
          <div className="flex items-center gap-1.5 mb-1.5">
            <HardDrive className="w-3.5 h-3.5 text-white/40" />
            <span className="text-xs text-white/40">Storage</span>
            <span className="ml-auto text-xs text-white/30">{formatBytes(totalBytes)} / {formatBytes(storageLimitBytes)}</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${storagePercent}%` }}
            />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-4 px-6 py-4 border-b border-view1-border bg-surface/80 backdrop-blur-sm flex-shrink-0">
          <button
            type="button"
            aria-label="Open sidebar"
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-white text-base truncate flex-1">{project.name}</h1>

          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <input
              type="search"
              placeholder="Search photos…"
              value={filters.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              className="bg-white/5 border border-view1-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent focus:bg-white/[0.08] w-48 transition-all"
            />
          </div>

          {/* View toggle */}
          <div className="flex border border-view1-border rounded-lg overflow-hidden">
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              className={clsx(
                'p-2 transition-colors',
                viewMode === 'grid'
                  ? 'bg-accent/20 text-white'
                  : 'text-white/40 hover:text-white hover:bg-white/5',
              )}
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              className={clsx(
                'p-2 transition-colors',
                viewMode === 'list'
                  ? 'bg-accent/20 text-white'
                  : 'text-white/40 hover:text-white hover:bg-white/5',
              )}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button
            size="sm"
            className="gap-2 flex-shrink-0"
            onClick={() => router.push(`/dashboard/project/${project.id}/publish`)}
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Publish Gallery</span>
          </Button>
        </header>

        {/* Interrupted uploads banner */}
        {!showUpload && hasInterruptedUploads && (
          <div className="px-6 py-3 border-b border-view1-border bg-yellow-500/10 flex items-center justify-between">
            <p className="text-sm text-yellow-400">You have interrupted uploads. Resume them?</p>
            <button
              type="button"
              className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
              onClick={() => setShowUpload(true)}
            >
              Resume
            </button>
          </div>
        )}

        {/* Upload zone (collapsible) */}
        {showUpload && (
          <div className="relative px-6 pt-4 border-b border-view1-border">
            <button
              type="button"
              aria-label="Close upload area"
              className="absolute top-3 right-4 text-white/40 hover:text-white transition-colors"
              onClick={() => setShowUpload(false)}
            >
              <X className="w-4 h-4" />
            </button>
            <UploadZone projectId={project.id} className="mb-4" />
          </div>
        )}

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-view1-border bg-surface/50 animate-pulse"
                >
                  <div className="h-12 border-b border-view1-border" />
                  <div className="p-4 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <div key={j} className="aspect-square rounded-lg bg-white/5" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : allFilteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in duration-300">
              <Upload className="w-16 h-16 text-muted mx-auto mb-6" />
              <h2 className="text-white/60 font-medium mb-2">No photos yet</h2>
              <p className="text-muted text-sm mb-6 max-w-xs">
                Upload your first photos to get started with AI sorting.
              </p>
              <Button size="sm" onClick={() => setShowUpload(true)} className="gap-2">
                <Upload className="w-4 h-4" />
                Upload Photos
              </Button>
            </div>
          ) : filters.category ? (
            <CategorySection
              category={filters.category}
              media={allFilteredMedia.map(mediaToItem)}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onDoubleClick={handleDoubleClick}
            />
          ) : (
            <div className="space-y-4">
              {categoryNames.map((cat) => (
                <CategorySection
                  key={cat}
                  category={cat}
                  media={groups[cat].map(mediaToItem)}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  onDoubleClick={handleDoubleClick}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          media={flatMediaItems}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      {/* Selection toolbar */}
      <SelectionToolbar
        selectedCount={selectedIds.size}
        totalCount={flatMediaItems.length}
        onSelectAll={() => selectAll(flatMediaItems.map((m) => m.id))}
        onDeselectAll={deselectAll}
        onDelete={handleDeleteSelected}
      />
    </div>
  )
}
