'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { PLANS, formatPrice, type PlanTier } from '@/lib/stripe/plans'
import { Button } from '@/components/common'

interface ProfileData {
  subscription_tier: PlanTier
  subscription_status: string | null
  stripe_customer_id: string | null
  stripe_connect_account_id: string | null
  stripe_connect_enabled: boolean | null
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  past_due: 'Past Due',
  canceled: 'Canceled',
  trialing: 'Trialing',
  incomplete: 'Incomplete',
}

function UsageBar({ label, current, max }: { label: string; current: number; max: number | null }) {
  const percent = max === null ? 0 : Math.min((current / max) * 100, 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">
          {max === null ? `${current} / Unlimited` : `${current} / ${max}`}
        </span>
      </div>
      {max !== null && (
        <div className="h-2 rounded-full bg-surface overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default function BillingPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [connectLoading, setConnectLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Not authenticated')
          return
        }

        const { data, error: dbError } = await supabase
          .from('profiles')
          .select('subscription_tier, subscription_status, stripe_customer_id, stripe_connect_account_id, stripe_connect_enabled')
          .eq('id', user.id)
          .single()

        if (dbError) throw dbError
        setProfile(data as ProfileData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load billing info')
      } finally {
        setLoading(false)
      }
    }

    void loadProfile()
  }, [supabase])

  async function handleUpgrade(planId: PlanTier) {
    if (planId === 'free') return
    const plan = PLANS[planId]
    if (!plan.stripePriceId) {
      setError('Plan not yet available for purchase')
      return
    }

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.stripePriceId }),
      })
      const { url, error: apiError } = (await response.json()) as { url?: string; error?: string }
      if (apiError || !url) throw new Error(apiError ?? 'No checkout URL returned')
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout')
    }
  }

  async function handleBillingPortal() {
    setPortalLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' })
      const { url, error: apiError } = (await response.json()) as { url?: string; error?: string }
      if (apiError || !url) throw new Error(apiError ?? 'No portal URL returned')
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal')
    } finally {
      setPortalLoading(false)
    }
  }

  async function handleConnectOnboarding() {
    setConnectLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/billing/connect', { method: 'POST' })
      const { url, error: apiError } = (await response.json()) as { url?: string; error?: string }
      if (apiError || !url) throw new Error(apiError ?? 'No onboarding URL returned')
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Connect onboarding')
    } finally {
      setConnectLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading billing info...</div>
      </div>
    )
  }

  const currentTier: PlanTier = profile?.subscription_tier ?? 'free'
  const currentPlan = PLANS[currentTier]
  const subscriptionStatus = profile?.subscription_status

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing &amp; Plans</h1>
        <p className="text-muted-foreground mt-1">Manage your subscription and payment settings</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Current Plan */}
      <section className="bg-surface rounded-xl border border-view1-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Current Plan</h2>
            <p className="text-muted-foreground text-sm">{currentPlan.description}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-accent">{currentPlan.name}</div>
            <div className="text-sm text-muted-foreground">{formatPrice(currentPlan.priceMonthly)}</div>
          </div>
        </div>

        {subscriptionStatus && subscriptionStatus !== 'active' && (
          <div className="px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
            Subscription status: {STATUS_LABELS[subscriptionStatus] ?? subscriptionStatus}
          </div>
        )}

        {/* Usage stats */}
        <div className="space-y-3 pt-2">
          <UsageBar
            label="Projects"
            current={0}
            max={currentPlan.limits.maxProjects}
          />
          <UsageBar
            label="Storage"
            current={0}
            max={currentPlan.limits.storageBytes}
          />
        </div>

        <div className="flex gap-3 pt-2">
          {profile?.stripe_customer_id && (
            <Button
              variant="outline"
              onClick={() => void handleBillingPortal()}
              disabled={portalLoading}
            >
              {portalLoading ? 'Opening...' : 'Manage Subscription'}
            </Button>
          )}
        </div>
      </section>

      {/* Plan Selection */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.values(PLANS) as typeof PLANS[PlanTier][]).map((plan) => {
            const isCurrent = plan.id === currentTier
            return (
              <div
                key={plan.id}
                className={`rounded-xl border p-5 space-y-4 transition-colors ${
                  isCurrent
                    ? 'border-accent bg-accent/5'
                    : 'border-view1-border bg-surface hover:border-accent/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{plan.name}</h3>
                    {isCurrent && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatPrice(plan.priceMonthly)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                </div>

                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>{plan.limits.maxProjects === null ? 'Unlimited projects' : `${plan.limits.maxProjects} projects`}</li>
                  <li>{plan.limits.storageBytes >= 1024 * 1024 * 1024
                    ? `${plan.limits.storageBytes / (1024 * 1024 * 1024)} GB storage`
                    : `${plan.limits.storageBytes / (1024 * 1024)} MB storage`}
                  </li>
                  <li>{plan.limits.galleryThemes} gallery themes</li>
                  {plan.limits.fullResDownloads && <li>Full-res downloads</li>}
                  {plan.limits.customBranding && <li>Custom branding</li>}
                  {plan.limits.prioritySupport && <li>Priority support</li>}
                  {plan.limits.apiAccess && <li>API access</li>}
                  {plan.limits.teamMembers === null && <li>Unlimited team members</li>}
                </ul>

                {!isCurrent && plan.id !== 'free' && (
                  <Button
                    className="w-full"
                    onClick={() => void handleUpgrade(plan.id)}
                  >
                    Upgrade to {plan.name}
                  </Button>
                )}
                {!isCurrent && plan.id === 'free' && (
                  <Button variant="outline" className="w-full" disabled>
                    Downgrade via portal
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Stripe Connect */}
      <section className="bg-surface rounded-xl border border-view1-border p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Photographer Payouts</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Connect your bank account to receive payments from clients directly.
          </p>
        </div>

        {profile?.stripe_connect_enabled ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-sm text-foreground">Payouts enabled</span>
          </div>
        ) : (
          <div className="space-y-3">
            {profile?.stripe_connect_account_id ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-sm text-muted-foreground">Onboarding in progress — complete setup to enable payouts</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-muted" />
                <span className="text-sm text-muted-foreground">Not set up yet</span>
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => void handleConnectOnboarding()}
              disabled={connectLoading}
            >
              {connectLoading
                ? 'Loading...'
                : profile?.stripe_connect_account_id
                ? 'Continue Onboarding'
                : 'Set Up Payouts'}
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
