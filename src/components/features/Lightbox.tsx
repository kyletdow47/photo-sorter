'use client'

import { useCallback, useEffect } from 'react'
import { clsx } from 'clsx'
import { ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-react'
import type { MediaItem } from '@/types/media'

export interface LightboxProps {
  media: MediaItem[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export function Lightbox({ media, currentIndex, onClose, onNavigate }: LightboxProps) {
  const current = media[currentIndex]
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < media.length - 1

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(currentIndex + 1)
  }, [hasNext, currentIndex, onNavigate])

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(currentIndex - 1)
  }, [hasPrev, currentIndex, onNavigate])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, goNext, goPrev])

  if (!current) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Image preview: ${current.filename}`}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <span className="text-sm text-white/50">
          {currentIndex + 1} / {media.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close lightbox"
          className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image area */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 px-16">
        {/* Prev */}
        <button
          type="button"
          onClick={goPrev}
          disabled={!hasPrev}
          aria-label="Previous image"
          className={clsx(
            'absolute left-4 p-2 rounded-xl text-white transition-all focus:outline-none focus:ring-2 focus:ring-accent',
            hasPrev
              ? 'bg-white/10 hover:bg-white/20 cursor-pointer'
              : 'opacity-20 cursor-not-allowed'
          )}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Image */}
        <div className="max-w-full max-h-full flex items-center justify-center">
          {current.thumbnail_url ? (
            <img
              key={current.id}
              src={current.thumbnail_url}
              alt={current.filename}
              className="max-w-full max-h-[calc(100vh-10rem)] object-contain rounded-lg shadow-2xl"
              draggable={false}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-white/30">
              <ImageOff className="w-16 h-16" />
              <span className="text-sm">No preview available</span>
            </div>
          )}
        </div>

        {/* Next */}
        <button
          type="button"
          onClick={goNext}
          disabled={!hasNext}
          aria-label="Next image"
          className={clsx(
            'absolute right-4 p-2 rounded-xl text-white transition-all focus:outline-none focus:ring-2 focus:ring-accent',
            hasNext
              ? 'bg-white/10 hover:bg-white/20 cursor-pointer'
              : 'opacity-20 cursor-not-allowed'
          )}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom info bar */}
      <div className="flex items-center justify-center gap-4 px-4 py-3 flex-shrink-0 border-t border-white/10">
        <span className="text-sm text-white/70 truncate max-w-xs" title={current.filename}>
          {current.filename}
        </span>
        {current.ai_category && (
          <span className="text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full flex-shrink-0">
            {current.ai_category}
          </span>
        )}
        {current.orientation && (
          <span className="text-xs text-white/30 capitalize flex-shrink-0">{current.orientation}</span>
        )}
      </div>
    </div>
  )
}
