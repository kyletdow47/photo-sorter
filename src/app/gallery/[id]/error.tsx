'use client'

import { AlertTriangle } from 'lucide-react'

export default function GalleryError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6 text-center">
      <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
      <h2 className="text-lg font-semibold text-white mb-2">Gallery unavailable</h2>
      <p className="text-sm text-muted mb-6 max-w-sm">
        {error.message || 'An unexpected error occurred while loading this gallery.'}
      </p>
      <button
        onClick={reset}
        className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
