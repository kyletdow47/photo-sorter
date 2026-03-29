'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { Project, Media } from '@/types/supabase'

interface GalleryPaywallProps {
  project: Project
  sampleMedia: Media[]
  photographerName: string
}

export function GalleryPaywall({ project, sampleMedia, photographerName }: GalleryPaywallProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const price = getPriceLabel(project)

  async function handlePay() {
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/gallery/${project.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? 'Failed to create checkout session.')
      }

      const { url } = (await res.json()) as { url: string }
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center px-4 py-16">
      {/* Blurred sample thumbnails */}
      {sampleMedia.length > 0 && (
        <div className="relative w-full max-w-2xl mb-10 flex gap-3 justify-center overflow-hidden rounded-xl max-h-48 sm:max-h-none">
          {sampleMedia.slice(0, 3).map((item) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={item.id}
              src={item.watermarked_url ?? item.thumbnail_url ?? item.storage_path}
              alt=""
              aria-hidden="true"
              className="w-1/3 aspect-square object-cover rounded-lg blur-sm brightness-75 select-none pointer-events-none"
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80 rounded-xl" />
        </div>
      )}

      {/* Info card */}
      <div className="bg-surface border border-view1-border rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <p className="text-sm text-muted mb-1 uppercase tracking-widest">Gallery by</p>
        <h2 className="text-xl font-semibold mb-1">{photographerName}</h2>
        <h1 className="text-2xl font-bold mb-6">{project.name}</h1>

        <div className="flex items-baseline gap-2 mb-8">
          <span className="text-3xl font-bold text-white">{price}</span>
          {project.pricing_model === 'per_photo' && (
            <span className="text-sm text-muted">per photo</span>
          )}
        </div>

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePay()}
            placeholder="your@email.com"
            disabled={loading}
            className="w-full bg-background border border-view1-border rounded-lg px-4 py-3 text-white placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50"
          />

          {error && (
            <p role="alert" className="text-red-400 text-sm">{error}</p>
          )}

          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-background font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecting...
              </span>
            ) : (
              `Pay & Download — ${price}`
            )}
          </button>
        </div>

        <p className="text-xs text-muted mt-4 text-center">
          Secure payment via Stripe. You&apos;ll receive your download link by email.
        </p>
      </div>
    </div>
  )
}

function getPriceLabel(project: Project): string {
  if (project.pricing_model === 'flat_fee' && project.flat_fee_cents != null) {
    return `$${(project.flat_fee_cents / 100).toFixed(2)}`
  }
  if (project.pricing_model === 'per_photo' && project.per_photo_cents != null) {
    return `$${(project.per_photo_cents / 100).toFixed(2)}`
  }
  return 'Paid'
}
