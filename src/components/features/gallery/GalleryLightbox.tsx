'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import type { Media, GalleryTheme } from '@/types/supabase'

interface GalleryLightboxProps {
  media: Media[]
  initialIndex: number
  onClose: () => void
  onDownload: (item: Media) => void
  theme: GalleryTheme
}

export function GalleryLightbox({
  media,
  initialIndex,
  onClose,
  onDownload,
  theme,
}: GalleryLightboxProps) {
  const [index, setIndex] = useState(initialIndex)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const current = media[index]

  const prev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : media.length - 1))
  }, [media.length])

  const next = useCallback(() => {
    setIndex((i) => (i < media.length - 1 ? i + 1 : 0))
  }, [media.length])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, prev, next])

  // Prevent scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Touch / swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    // Only register horizontal swipes
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) next()
      else prev()
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  const backdropBg =
    theme === 'minimal'
      ? 'rgba(249,250,251,0.97)'
      : theme === 'editorial'
      ? 'rgba(12,10,9,0.97)'
      : 'rgba(0,0,0,0.95)'

  const textColor = theme === 'minimal' ? '#1f2937' : '#f0f0f0'
  const mutedColor = theme === 'minimal' ? '#6b7280' : '#8a8a8a'
  const btnBg = theme === 'minimal' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'
  const btnHoverBg = theme === 'minimal' ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.2)'

  if (!current) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo lightbox"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: backdropBg,
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          flexShrink: 0,
        }}
      >
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: textColor, margin: 0 }}>
            {current.filename}
          </p>
          {current.ai_category && (
            <p style={{ fontSize: '0.75rem', color: mutedColor, margin: '0.125rem 0 0' }}>
              {current.ai_category}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => onDownload(current)}
            aria-label="Download photo"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              backgroundColor: btnBg,
              color: textColor,
              border: 'none',
              borderRadius: '0.375rem',
              padding: '0.5rem 0.75rem',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = btnHoverBg)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = btnBg)}
          >
            <Download size={14} />
            <span>Download</span>
          </button>
          <button
            onClick={onClose}
            aria-label="Close lightbox"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: btnBg,
              color: textColor,
              border: 'none',
              borderRadius: '0.375rem',
              padding: '0.5rem',
              cursor: 'pointer',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = btnHoverBg)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = btnBg)}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          padding: '0 4rem',
        }}
        onClick={onClose}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.watermarked_url ?? current.thumbnail_url ?? current.storage_path}
          alt={current.filename}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: '0.25rem',
            userSelect: 'none',
          }}
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />

        {/* Prev arrow */}
        {media.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); prev() }}
            aria-label="Previous photo"
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: btnBg,
              color: textColor,
              border: 'none',
              borderRadius: '50%',
              width: '2.5rem',
              height: '2.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = btnHoverBg)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = btnBg)}
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Next arrow */}
        {media.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            aria-label="Next photo"
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: btnBg,
              color: textColor,
              border: 'none',
              borderRadius: '50%',
              width: '2.5rem',
              height: '2.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = btnHoverBg)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = btnBg)}
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {/* Counter */}
      <div
        style={{
          padding: '1rem',
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '0.75rem', color: mutedColor }}>
          {index + 1} / {media.length}
        </span>
      </div>
    </div>
  )
}
