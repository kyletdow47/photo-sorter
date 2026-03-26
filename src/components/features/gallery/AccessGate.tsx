'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { GalleryTheme } from '@/types/supabase'

interface AccessGateProps {
  projectId: string
  theme: GalleryTheme
  invalidToken?: boolean
}

const themeConfig: Record<
  GalleryTheme,
  {
    bg: string
    cardBg: string
    text: string
    muted: string
    accent: string
    inputBg: string
    inputBorder: string
    fontFamily: string
  }
> = {
  dark: {
    bg: '#0c0c0e',
    cardBg: '#1a1a1d',
    text: '#f0f0f0',
    muted: '#8a8a8a',
    accent: '#22c55e',
    inputBg: '#0c0c0e',
    inputBorder: '#2a2a2e',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  light: {
    bg: '#ffffff',
    cardBg: '#f9fafb',
    text: '#111827',
    muted: '#6b7280',
    accent: '#2563eb',
    inputBg: '#ffffff',
    inputBorder: '#d1d5db',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  minimal: {
    bg: '#f9fafb',
    cardBg: '#ffffff',
    text: '#1f2937',
    muted: '#9ca3af',
    accent: '#111827',
    inputBg: '#ffffff',
    inputBorder: '#e5e7eb',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  editorial: {
    bg: '#1c1917',
    cardBg: '#292524',
    text: '#fafaf9',
    muted: '#78716c',
    accent: '#e7c08a',
    inputBg: '#1c1917',
    inputBorder: '#3c3330',
    fontFamily: 'Georgia, Times New Roman, serif',
  },
}

export function AccessGate({ projectId, theme, invalidToken = false }: AccessGateProps) {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(invalidToken ? 'Invalid or expired access link.' : null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const cfg = themeConfig[theme]

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
      // Store token in sessionStorage for client-side persistence
      sessionStorage.setItem(`gallery_token_${projectId}`, data.token)
      router.push(`/gallery/${projectId}?token=${data.token}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: cfg.bg,
        fontFamily: cfg.fontFamily,
        padding: '2rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: cfg.cardBg,
          borderRadius: '0.75rem',
          padding: '2.5rem',
          border: `1px solid ${cfg.inputBorder}`,
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: theme === 'editorial' ? 400 : 700,
            color: cfg.text,
            marginBottom: '0.5rem',
            fontStyle: theme === 'editorial' ? 'italic' : 'normal',
          }}
        >
          Private Gallery
        </h1>
        <p style={{ fontSize: '0.875rem', color: cfg.muted, marginBottom: '2rem' }}>
          Enter your email and access code to view this gallery.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="access-email"
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: cfg.text,
                marginBottom: '0.375rem',
              }}
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
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                backgroundColor: cfg.inputBg,
                color: cfg.text,
                border: `1px solid ${cfg.inputBorder}`,
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="access-token"
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: cfg.text,
                marginBottom: '0.375rem',
              }}
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
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                backgroundColor: cfg.inputBg,
                color: cfg.text,
                border: `1px solid ${cfg.inputBorder}`,
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <p
              role="alert"
              style={{
                fontSize: '0.8125rem',
                color: '#ef4444',
                marginBottom: '1rem',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: cfg.accent,
              color: theme === 'dark' ? '#000' : theme === 'editorial' ? '#1c1917' : '#fff',
              border: 'none',
              borderRadius: theme === 'editorial' ? '0' : '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Checking...' : 'View Gallery'}
          </button>
        </form>
      </div>
    </div>
  )
}
