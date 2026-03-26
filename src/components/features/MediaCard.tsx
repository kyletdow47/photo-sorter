'use client'

import { useRef } from 'react'
import { clsx } from 'clsx'
import { GripVertical, ImageOff, Maximize2, RectangleHorizontal, RectangleVertical, Square } from 'lucide-react'
import { Badge } from '@/components/common'
import type { MediaItem, MediaOrientation } from '@/types/media'

export interface MediaCardProps {
  media: MediaItem
  onSelect: (id: string, shiftKey: boolean) => void
  onDoubleClick: (id: string) => void
  className?: string
}

function OrientationIcon({ orientation }: { orientation?: MediaOrientation | null }) {
  const cls = 'w-3 h-3 text-white/50'
  if (orientation === 'landscape') return <RectangleHorizontal className={cls} />
  if (orientation === 'portrait') return <RectangleVertical className={cls} />
  if (orientation === 'square') return <Square className={cls} />
  return null
}

export function MediaCard({ media, onSelect, onDoubleClick, className }: MediaCardProps) {
  const lastClickRef = useRef<number>(0)

  function handleClick(e: React.MouseEvent) {
    const now = Date.now()
    const delta = now - lastClickRef.current

    if (delta < 300) {
      onDoubleClick(media.id)
      lastClickRef.current = 0
      return
    }

    lastClickRef.current = now
    onSelect(media.id, e.shiftKey)
  }

  const truncatedName =
    media.filename.length > 24 ? `${media.filename.slice(0, 21)}…` : media.filename

  return (
    <div
      role="checkbox"
      aria-checked={media.selected ?? false}
      aria-label={media.filename}
      tabIndex={0}
      className={clsx(
        'group relative cursor-pointer select-none rounded-lg overflow-hidden bg-surface border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background',
        media.selected
          ? 'border-blue-500 ring-2 ring-blue-500/40'
          : 'border-view1-border hover:border-white/20',
        className
      )}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(media.id, e.shiftKey)
        }
      }}
    >
      {/* Thumbnail */}
      <div className="aspect-square w-full relative bg-gradient-to-br from-white/5 to-white/[0.02]">
        {media.thumbnail_url ? (
          <img
            src={media.thumbnail_url}
            alt={media.filename}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-white/20" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-150" />

        {/* Checkbox */}
        <div
          className={clsx(
            'absolute top-2 left-2 w-5 h-5 rounded border-2 transition-all duration-150 flex items-center justify-center',
            media.selected
              ? 'bg-blue-500 border-blue-500 opacity-100'
              : 'bg-black/50 border-white/60 opacity-0 group-hover:opacity-100'
          )}
        >
          {media.selected && (
            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {/* Double-click preview hint */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Maximize2 className="w-4 h-4 text-white/70" />
        </div>

        {/* Drag handle */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-white/50" />
        </div>
      </div>

      {/* Footer info */}
      <div className="px-2 py-1.5 flex items-center gap-1.5">
        <OrientationIcon orientation={media.orientation} />
        <span className="text-xs text-white/60 truncate flex-1 min-w-0" title={media.filename}>
          {truncatedName}
        </span>
      </div>

      {/* Category badge + confidence */}
      {media.ai_category && (
        <div className="px-2 pb-2 flex items-center gap-1.5 flex-wrap">
          <Badge variant="info" className="text-[10px] px-1.5 py-0.5">
            {media.ai_category}
          </Badge>
          {media.ai_confidence != null && (
            <span className="text-[10px] text-white/40">
              {Math.round(media.ai_confidence * 100)}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}
