'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, Mail } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function ResetPage() {
  const { user, resetPassword, updatePassword, signOut } = useAuth()
  const router = useRouter()

  // Request-reset state
  const [email, setEmail] = useState('')
  const [requestSent, setRequestSent] = useState(false)

  // Update-password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSettingNewPassword = !!user

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await resetPassword(email)
      setRequestSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      await updatePassword(newPassword)
      await signOut()
      router.push('/auth/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
      setLoading(false)
    }
  }

  if (requestSent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl bg-surface border border-view1-border p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
            <Mail className="h-6 w-6 text-accent" />
          </div>
          <h2 className="text-xl font-bold text-white">Check your email</h2>
          <p className="text-sm text-muted">
            We&apos;ve sent a password reset link to <strong className="text-white">{email}</strong>.
          </p>
          <Link href="/auth/login" className="block text-sm font-medium text-accent hover:text-accent/80">
            Back to sign in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-surface border border-view1-border p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <Camera className="w-5 h-5 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isSettingNewPassword ? 'Set new password' : 'Reset your password'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isSettingNewPassword
              ? 'Choose a strong password for your account'
              : 'Enter your email and we\'ll send you a reset link'}
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {isSettingNewPassword ? (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-white/70">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-view1-border bg-background px-3 py-2.5 text-sm text-white placeholder-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Min. 8 characters"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-white/70">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-view1-border bg-background px-3 py-2.5 text-sm text-white placeholder-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Re-enter password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating…
                </span>
              ) : (
                'Update password'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/70">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-view1-border bg-background px-3 py-2.5 text-sm text-white placeholder-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending…
                </span>
              ) : (
                'Send reset link'
              )}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-muted">
          Remember your password?{' '}
          <Link href="/auth/login" className="font-medium text-accent hover:text-accent/80">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
