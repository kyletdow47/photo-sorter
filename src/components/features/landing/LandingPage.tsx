'use client'

import { useState, useEffect } from 'react'
import {
  Zap,
  Globe,
  CreditCard,
  Upload,
  Cpu,
  Share2,
  CheckCircle,
  XCircle,
  
  
  Check,
} from 'lucide-react'
import { WaitlistModal } from './WaitlistModal'

interface WaitlistResponse {
  error?: string
  count?: number
  success?: boolean
}

const FEATURES = [
  {
    icon: Zap,
    title: 'AI Sorting',
    description:
      'SigLIP zero-shot AI automatically categorizes portraits, venues, details, and candids — without any manual tagging.',
  },
  {
    icon: Globe,
    title: 'Client Delivery',
    description:
      'Send password-protected galleries with watermarking and download controls. Clients love it; no app required.',
  },
  {
    icon: CreditCard,
    title: 'Get Paid',
    description:
      'Integrated Stripe billing and Connect. Invoice your client, collect payment, and receive payouts — all in one place.',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: Upload,
    title: 'Upload',
    description: 'Drag and drop your RAW or JPEG files. We handle chunked uploads for even the largest shoots.',
  },
  {
    step: '02',
    icon: Cpu,
    title: 'AI Sorts',
    description: 'Our AI classifies every shot in minutes — ceremony, reception, portraits, details, and more.',
  },
  {
    step: '03',
    icon: Share2,
    title: 'Share Gallery',
    description: 'Send a branded, watermarked gallery link to your client. They select their favourites.',
  },
  {
    step: '04',
    icon: CheckCircle,
    title: 'Get Paid',
    description: 'Invoice and collect payment automatically. Your payout lands in your bank account.',
  },
]

const OLD_WAY = [
  'Manually cull 3,000 RAW files in Lightroom',
  'Export, rename, and upload to a file-sharing link',
  'Days of back-and-forth revisions over email',
  'Chase clients for invoice payments',
  'Track shoots across spreadsheets and Dropbox',
]

const NEW_WAY = [
  'AI categorizes every shot in minutes',
  'One-click branded gallery ready to share',
  'Client selects favourites in a beautiful UI',
  'Automated invoicing and Stripe payouts',
  'Everything in one dashboard, zero chaos',
]

const PRICING = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying it out',
    features: ['Up to 500 photos / month', '1 active gallery', 'Basic AI sorting', 'Community support'],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$39',
    period: '/ mo',
    description: 'For working photographers',
    features: [
      'Up to 10,000 photos / month',
      'Unlimited galleries',
      'Watermarking & download controls',
      'Client selection tools',
      'Email support',
    ],
    cta: 'Join Waitlist',
    highlight: true,
  },
  {
    name: 'Business',
    price: '$79',
    period: '/ mo',
    description: 'For studios and agencies',
    features: [
      'Unlimited photos',
      'Stripe Connect payouts',
      'White-label galleries',
      'Team seats',
      'Priority support',
    ],
    cta: 'Join Waitlist',
    highlight: false,
  },
]

export function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null)

  // Inline waitlist section state
  const [inlineEmail, setInlineEmail] = useState('')
  const [inlineStatus, setInlineStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [inlineError, setInlineError] = useState('')

  useEffect(() => {
    function fetchCount() {
      fetch('/api/waitlist')
        .then((r) => r.json())
        .then((d: { count?: number }) => {
          if (typeof d.count === 'number') setWaitlistCount(d.count)
        })
        .catch(() => {
          // Non-critical — count simply won't show
        })
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30_000)
    return () => clearInterval(interval)
  }, [])

  async function handleInlineSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setInlineStatus('loading')
    setInlineError('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inlineEmail }),
      })

      const data = await res.json() as WaitlistResponse

      if (!res.ok) {
        setInlineStatus('error')
        setInlineError(data.error ?? 'Something went wrong')
        return
      }

      setInlineStatus('success')
      if (typeof data.count === 'number') setWaitlistCount(data.count)
      setInlineEmail('')
    } catch {
      setInlineStatus('error')
      setInlineError('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <WaitlistModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-40 border-b border-view1-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <span className="text-white font-semibold text-lg tracking-tight">
            View1 <span className="text-accent">Studio</span>
          </span>
          <div className="flex items-center gap-3">
            <a
              href="/auth/login"
              className="text-sm font-medium text-white/60 hover:text-white transition-colors"
            >
              Log in
            </a>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-accent text-black font-semibold text-sm rounded-lg px-4 py-2 hover:bg-green-300 transition-colors"
            >
              Join Waitlist
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-accent/10 text-accent text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6 border border-accent/20">
            Coming Soon
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6">
            Sort 1,000 photos in{' '}
            <span className="text-accent">minutes</span>,<br className="hidden sm:block" /> not hours.
          </h1>
          <p className="text-lg sm:text-xl text-muted max-w-xl mx-auto mb-10">
            AI-powered sorting, client delivery, and payments — all in one platform built for professional
            photographers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-accent text-black font-semibold rounded-xl px-8 py-4 text-lg hover:bg-green-300 transition-colors"
            >
              Join the Waitlist
            </button>
            <a
              href="#how-it-works"
              className="border border-view1-border text-white rounded-xl px-8 py-4 text-lg hover:border-white/40 transition-colors"
            >
              See how it works
            </a>
          </div>
          {waitlistCount !== null && waitlistCount > 0 && (
            <p className="mt-6 text-muted text-sm">
              <span className="text-accent font-semibold">{waitlistCount.toLocaleString()}</span> photographers
              already waiting
            </p>
          )}
        </div>
      </section>

      {/* ── Problem ──────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-surface/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">The old way is broken.</h2>
          <p className="text-muted text-center mb-12 max-w-xl mx-auto">
            Photographers spend more time on admin than on their craft. View1 changes that.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Old Way */}
            <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-6">
              <h3 className="text-red-400 font-semibold text-lg mb-4 flex items-center gap-2">
                <XCircle size={20} /> The Old Way
              </h3>
              <ul className="space-y-3">
                {OLD_WAY.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-white/70 text-sm">
                    <XCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* New Way */}
            <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6">
              <h3 className="text-accent font-semibold text-lg mb-4 flex items-center gap-2">
                <CheckCircle size={20} /> The View1 Way
              </h3>
              <ul className="space-y-3">
                {NEW_WAY.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-white/70 text-sm">
                    <CheckCircle className="text-accent shrink-0 mt-0.5" size={16} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">Everything you need.</h2>
          <p className="text-muted text-center mb-12 max-w-xl mx-auto">
            Three powerful tools, one seamless workflow.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-surface border border-view1-border rounded-2xl p-6 hover:border-accent/40 transition-colors"
              >
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="text-accent" size={20} />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
                <p className="text-muted text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 bg-surface/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">How it works.</h2>
          <p className="text-muted text-center mb-12 max-w-xl mx-auto">
            From upload to payment in four simple steps.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, description }) => (
              <div key={step} className="relative">
                <div className="text-accent/20 font-bold text-5xl absolute -top-2 -left-1 select-none">
                  {step}
                </div>
                <div className="relative bg-surface border border-view1-border rounded-2xl p-6 pt-8">
                  <Icon className="text-accent mb-3" size={24} />
                  <h3 className="text-white font-semibold mb-2">{title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">Simple pricing.</h2>
          <p className="text-muted text-center mb-12 max-w-xl mx-auto">
            Start free. Scale as you grow. No surprises.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {PRICING.map(({ name, price, period, description, features, cta, highlight }) => (
              <div
                key={name}
                className={`relative rounded-2xl p-6 border ${
                  highlight
                    ? 'bg-accent/5 border-accent/40 shadow-lg shadow-accent/5'
                    : 'bg-surface border-view1-border'
                }`}
              >
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-black text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-white font-semibold text-lg">{name}</h3>
                  <p className="text-muted text-sm">{description}</p>
                </div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-white">{price}</span>
                  <span className="text-muted text-sm">{period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-white/70 text-sm">
                      <Check className="text-accent shrink-0" size={14} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className={`w-full rounded-xl px-4 py-3 font-semibold text-sm transition-colors ${
                    highlight
                      ? 'bg-accent text-black hover:bg-green-300'
                      : 'border border-view1-border text-white hover:border-white/40'
                  }`}
                >
                  {cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Waitlist ─────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 bg-surface/30">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Be first to know.</h2>
          <p className="text-muted mb-8">
            We&apos;re launching soon. Drop your email and we&apos;ll notify you the moment doors open.
          </p>

          {inlineStatus === 'success' ? (
            <div className="bg-accent/5 border border-accent/20 rounded-2xl p-8">
              <CheckCircle className="text-accent mx-auto mb-3" size={40} />
              <p className="text-white font-semibold text-lg">You&apos;re on the list!</p>
              {waitlistCount !== null && (
                <p className="text-muted mt-2 text-sm">
                  <span className="text-accent font-semibold">{waitlistCount.toLocaleString()}</span> photographers
                  already waiting
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleInlineSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={inlineEmail}
                onChange={(e) => setInlineEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="flex-1 bg-surface border border-view1-border rounded-xl px-4 py-3 text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
              />
              <button
                type="submit"
                disabled={inlineStatus === 'loading'}
                className="bg-accent text-black font-semibold rounded-xl px-6 py-3 hover:bg-green-300 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {inlineStatus === 'loading' ? 'Joining...' : 'Join Waitlist'}
              </button>
            </form>
          )}

          {inlineStatus === 'error' && (
            <p className="text-red-400 text-sm mt-3">{inlineError}</p>
          )}

          {waitlistCount !== null && waitlistCount > 0 && inlineStatus !== 'success' && (
            <p className="text-muted text-sm mt-4">
              Join{' '}
              <span className="text-accent font-semibold">{waitlistCount.toLocaleString()}</span> photographers
              already on the list
            </p>
          )}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-view1-border py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-muted text-sm">
            © {new Date().getFullYear()} View1 Studio. All rights reserved.
          </span>
          <nav className="flex items-center gap-6 flex-wrap justify-center">
            <a href="/privacy" className="text-muted hover:text-white text-sm transition-colors focus:outline-none focus:underline focus:text-white">
              Privacy
            </a>
            <a href="/terms" className="text-muted hover:text-white text-sm transition-colors focus:outline-none focus:underline focus:text-white">
              Terms
            </a>
            <a
              href="https://twitter.com/view1studio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
              aria-label="View1 Studio on X / Twitter"
            >
              <Share2 size={18} />
            </a>
            <a
              href="https://linkedin.com/company/view1studio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
              aria-label="View1 Studio on LinkedIn"
            >
              <Share2 size={18} />
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
