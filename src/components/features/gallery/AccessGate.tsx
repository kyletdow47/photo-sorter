'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'
import type { GalleryTheme } from '@/types/supabase'

interface AccessGateProps {
  projectId: string
  theme: GalleryTheme
  invalidToken?: boolean
}

const themeClasses: Record<
  GalleryTheme,
  {
    bg: string
    card: string
    text: string
    muted: string
    input: string
    btn: string
    btnText: string
    font: string
    heading: string
    btnRadius: string
  }
> = {
  dark: {
    bg: 'bg-background',
    card: 'bg-surface border-view1-border',
    text: 'text-white',
    muted: 'text-muted',
    input: 'bg-background border-view1-border text-white placeholder-muted focus:ring-accent focus:border-accent',
    btn: 'bg-accent hover:bg-accent/90',
    btnText: 'text-background',
    font: 'font-sans',
    heading: 'font-bold',
    btnRadius: 'rounded-lg',
  },
  light: {
    bg: 'bg-white',
    card: 'bg-gray-50 border-gray-200',
    text: 'text-gray-900',
    muted: 'text-gray-500',
    input: 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500',
    btn: 'bg-blue-600 hover:bg-blue-700',
    btnText: 'text-white',
    font: 'font-sans',
    heading: 'font-bold',
    btnRadius: 'rounded-lg',
  },
  minimal: {
    bg: 'bg-gray-50',
    card: 'bg-white border-gray-200',
    text: 'text-gray-800',
    muted: 'text-gray-400',
    input: 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-gray-900 focus:border-gray-900',
    btn: 'bg-gray-900 hover:bg-gray-800',
    btnText: 'text-white',
    font: 'font-sans',
    heading: 'font-bold',
    btnRadius: 'rounded-lg',
  },
  editorial: {
    bg: 'bg-stone-900',
    card: 'bg-stone-800 border-stone-700',
    text: 'text-stone-50',
    muted: 'text-stone-400',
    input: 'bg-stone-900 border-stone-700 text-stone-50 placeholder-stone-500 focus:ring-amber-300 focus:border-amber-300',
    btn: 'bg-amber-300 hover:bg-amber-200',
    btnText: 'text-stone-900',
    font: 'font-serif',
    heading: 'font-normal italic',
    btnRadius: 'rounded-none',
  },
}

export function AccessGate({ projectId, theme, invalidToken = false }: AccessGateProps) {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(invalidToken ? 'Invalid or expired access link.' : null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const t = themeClasses[theme]

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/gallery/${projectId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), token: token.trim() }),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Invalid email or access code.')
        return
      }

      const data = await res.json() as { token: string }
      sessionStorage.setItem(`gallery_token_${projectId}`, data.token)
      router.push(`/gallery/${projectId}?token=${data.token}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={clsx('min-h-screen flex items-center justify-center p-8', t.bg, t.font)}>
      <div className={clsx('w-full max-w-sm rounded-xl border p-8', t.card)}>
        <h1 className={clsx('text-2xl mb-2', t.text, t.heading)}>
          Private Gallery
        </h1>
        <p className={clsx('text-sm mb-8', t.muted)}>
          Enter your email and access code to view this gallery.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="access-email"
              className={clsx('block text-sm font-medium mb-1', t.text)}
            >
              Email address
            </label>
            <input
              id="access-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={clsx(
                'w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2',
                t.input,
              )}
            />
          </div>

          <div>
            <label
              htmlFor="access-token"
              className={clsx('block text-sm font-medium mb-1', t.text)}
            >
              Access code
            </label>
            <input
              id="access-token"
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your access code"
              className={clsx(
                'w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2',
                t.input,
              )}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={clsx(
              'w-full py-3 px-6 text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed',
              t.btn,
              t.btnText,
              t.btnRadius,
            )}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking...
              </span>
            ) : (
              'View Gallery'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
