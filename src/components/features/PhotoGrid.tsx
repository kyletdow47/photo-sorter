'use client'

import { clsx } from 'clsx'
import { ImageOff } from 'lucide-react'
import { MediaCard } from './MediaCard'
import type { MediaItem } from '@/types/media'

export type ViewMode = 'grid' | 'list'

export interface PhotoGridProps {
  media: MediaItem[]
  selectedIds: Set<string>
  onSelect: (id: string, shiftKey: boolean) => void
  onDoubleClick: (id: string) => void
  viewMode?: ViewMode
  loading?: boolean
  className?: string
}

function SkeletonCard() {
  return (
    <div className="rounded-lg overflow-hidden bg-surface border border-view1-border animate-pulse">
      <div className="aspect-square bg-white/5" />
      <div className="p-2 space-y-1.5">
        <div className="h-2.5 bg-white/5 rounded w-3/4" />
        <div className="h-2 bg-white/5 rounded w-1/2" />
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-surface border border-view1-border animate-pulse">
      <div className="w-12 h-12 rounded bg-white/5 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-white/5 rounded w-1/3" />
        <div className="h-2.5 bg-white/5 rounded w-1/5" />
      </div>
    </div>
  )
}

function ListRow({
  media,
  selected,
  onSelect,
  onDoubleClick,
}: {
  media: MediaItem
  selected: boolean
  onSelect: (id: string, shiftKey: boolean) => void
  onDoubleClick: (id: string) => void
}) {
  return (
    <div
      role="checkbox"
      aria-checked={selected}
      aria-label={media.filename}
      tabIndex={0}
      className={clsx(
        'flex items-center gap-4 p-3 rounded-lg border cursor-pointer select-none transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background',
        selected
          ? 'bg-blue-500/10 border-blue-500/50'
          : 'bg-surface border-view1-border hover:border-white/20 hover:bg-white/[0.02]'
      )}
      onClick={(e) => onSelect(media.id, e.shiftKey)}
      onDoubleClick={() => onDoubleClick(media.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(media.id, e.shiftKey)
        }
      }}
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-gradient-to-br from-white/5 to-white/[0.02] relative">
        {media.thumbnail_url ? (
          <img
            src={media.thumbnail_url}
            alt={media.filename}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-5 h-5 text-white/20" />
          </div>
        )}
      </div>

      {/* Filename */}
      <span className="flex-1 text-sm text-white truncate" title={media.filename}>
        {media.filename}
      </span>

      {/* Orientation */}
      {media.orientation && (
        <span className="text-xs text-white/40 capitalize hidden sm:block">
          {media.orientation}
        </span>
      )}

      {/* Category + confidence */}
      {media.ai_category && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full">
            {media.ai_category}
          </span>
          {media.ai_confidence != null && (
            <span className="text-xs text-white/40 hidden md:block">
              {Math.round(media.ai_confidence * 100)}%
            </span>
          )}
        </div>
      )}

      {/* Checkbox */}
      <div
        className={clsx(
          'w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center',
          selected ? 'bg-blue-500 border-blue-500' : 'border-white/30'
        )}
      >
        {selected && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  )
}

export function PhotoGrid({
  media,
  selectedIds,
  onSelect,
  onDoubleClick,
  viewMode = 'grid',
  loading = false,
  className,
}: PhotoGridProps) {
  if (loading) {
    if (viewMode === 'list') {
      return (
        <div className={clsx('space-y-2', className)}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )
    }
    return (
      <div
        className={clsx(
          'grid gap-3',
          '[grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]',
          className
        )}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (media.length === 0) {
    return (
      <div className={clsx('flex flex-col items-center justify-center py-20 text-center', className)}>
        <ImageOff className="w-12 h-12 text-white/20 mb-4" />
        <p className="text-white/40 text-sm">No photos yet — upload some to get started</p>
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <div className={clsx('space-y-2', className)}>
        {media.map((item) => (
          <ListRow
            key={item.id}
            media={item}
            selected={selectedIds.has(item.id)}
            onSelect={onSelect}
            onDoubleClick={onDoubleClick}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'grid gap-3',
        '[grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]',
        className
      )}
    >
      {media.map((item) => (
        <MediaCard
          key={item.id}
          media={{ ...item, selected: selectedIds.has(item.id) }}
          onSelect={onSelect}
          onDoubleClick={onDoubleClick}
        />
      ))}
    </div>
  )
}
