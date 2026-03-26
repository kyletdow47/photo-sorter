'use client'

import { clsx } from 'clsx'
import { Check } from 'lucide-react'
import type { UserTier } from '@/types/supabase'

export type PlanChoice = UserTier

export interface PlanData {
  plan: PlanChoice
}

interface PlanOption {
  value: PlanChoice
  label: string
  price: string
  period: string
  features: string[]
  cta: string
  highlight?: boolean
}

const PLANS: PlanOption[] = [
  {
    value: 'free',
    label: 'Free',
    price: '$0',
    period: 'forever',
    cta: 'Start free',
    features: [
      'Up to 500 photos / month',
      '1 active project',
      'AI auto-categorisation',
      'Basic gallery delivery',
    ],
  },
  {
    value: 'pro',
    label: 'Pro',
    price: '$39',
    period: 'per month',
    cta: 'Start Pro',
    highlight: true,
    features: [
      'Unlimited photos',
      'Unlimited projects',
      'AI auto-categorisation',
      'Watermarked client galleries',
      'Download controls & licensing',
      'Stripe payments',
    ],
  },
  {
    value: 'business',
    label: 'Business',
    price: '$99',
    period: 'per month',
    cta: 'Start Business',
    features: [
      'Everything in Pro',
      'Team workspaces',
      'Priority AI processing',
      'Custom domain galleries',
      'Advanced analytics',
      'Dedicated support',
    ],
  },
]

interface PlanStepProps {
  data: PlanData
  errors: Partial<Record<keyof PlanData, string>>
  onChange: (data: Partial<PlanData>) => void
}

export function PlanStep({ data, onChange }: PlanStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Choose your plan</h2>
        <p className="text-muted">You can change or upgrade at any time</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const selected = data.plan === plan.value
          return (
            <button
              key={plan.value}
              type="button"
              onClick={() => onChange({ plan: plan.value })}
              className={clsx(
                'relative flex flex-col rounded-xl border p-5 text-left transition-all',
                'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background',
                selected
                  ? 'border-accent bg-accent/10'
                  : 'border-view1-border bg-surface hover:border-white/20',
                plan.highlight && !selected && 'border-white/20'
              )}
              aria-pressed={selected}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-background">
                  Most popular
                </span>
              )}

              <div className="mb-4">
                <p className={clsx('text-sm font-medium mb-1', selected ? 'text-accent' : 'text-muted')}>
                  {plan.label}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-xs text-muted">/ {plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-white/80">
                    <Check size={13} className="mt-0.5 shrink-0 text-accent" />
                    {feature}
                  </li>
                ))}
              </ul>

              {selected && (
                <div className="mt-4 rounded-lg bg-accent/20 border border-accent/40 py-1.5 text-center text-xs font-medium text-accent">
                  Selected
                </div>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-center text-xs text-muted">
        Paid plans connect to Stripe checkout after onboarding.
      </p>
    </div>
  )
}
