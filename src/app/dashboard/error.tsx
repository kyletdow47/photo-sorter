'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/common'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
      <h2 className="text-lg font-semibold text-white mb-2">Something went wrong</h2>
      <p className="text-sm text-muted mb-6 max-w-sm">
        {error.message || 'An unexpected error occurred while loading the dashboard.'}
      </p>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  )
}
