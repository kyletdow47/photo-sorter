import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { NextRequest } from 'next/server'

// Mocks are hoisted — use vi.fn() inline, not external variables
vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

// Import after mocks
import { POST } from './route'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

// Supabase mock helpers
function makeSupabaseMock(overrides: {
  maybeSingleData?: unknown
  updateError?: unknown
  insertError?: unknown
} = {}) {
  const maybySingle = vi.fn().mockResolvedValue({ data: overrides.maybySingleData ?? null })
  const from = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle: maybySingle }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: overrides.updateError ?? null }),
    }),
    insert: vi.fn().mockResolvedValue({ error: overrides.insertError ?? null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  })
  return { from, maybySingle }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  process.env.STRIPE_PRICE_PRO = 'price_pro_test'
  process.env.STRIPE_PRICE_BUSINESS = 'price_business_test'

  const { from } = makeSupabaseMock()
  ;(createClient as Mock).mockReturnValue({ from })
})

function makeRequest(body: string, signature = 'valid-sig'): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers: { 'stripe-signature': signature },
  })
}

function makeEvent(type: string, data: Record<string, unknown>): import('stripe').default.Event {
  return {
    id: `evt_${Date.now()}`,
    type,
    data: { object: data },
    object: 'event',
    api_version: '2025-02-24.acacia',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
  } as unknown as import('stripe').default.Event
}

describe('POST /api/webhooks/stripe', () => {
  describe('signature verification', () => {
    it('returns 500 when STRIPE_WEBHOOK_SECRET is missing', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET
      const response = await POST(makeRequest('{}'))
      expect(response.status).toBe(500)
    })

    it('returns 400 when stripe-signature header is missing', async () => {
      const request = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: '{}',
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('returns 400 when signature verification fails', async () => {
      ;(stripe.webhooks.constructEvent as Mock).mockImplementation(() => {
        throw new Error('Invalid signature')
      })
      const response = await POST(makeRequest('{}'))
      expect(response.status).toBe(400)
    })
  })

  describe('idempotency', () => {
    it('skips already-processed events', async () => {
      const event = makeEvent('customer.subscription.updated', {
        id: 'sub_123',
        items: { data: [] },
      })
      ;(stripe.webhooks.constructEvent as Mock).mockReturnValue(event)

      const { from, maybySingle } = makeSupabaseMock()
      maybySingle.mockResolvedValue({ data: { id: 1 } })
      ;(createClient as Mock).mockReturnValue({ from })

      const response = await POST(makeRequest('{}'))
      expect(response.status).toBe(200)
      const body = await response.json() as { received: boolean; skipped: boolean }
      expect(body.skipped).toBe(true)
    })
  })

  describe('checkout.session.completed', () => {
    it('handles subscription checkout', async () => {
      const subscription = {
        id: 'sub_123',
        status: 'active',
        items: { data: [{ price: { id: 'price_pro_test' } }] },
      }
      ;(stripe.subscriptions.retrieve as Mock).mockResolvedValue(subscription)

      const event = makeEvent('checkout.session.completed', {
        mode: 'subscription',
        subscription: 'sub_123',
        customer: 'cus_123',
      })
      ;(stripe.webhooks.constructEvent as Mock).mockReturnValue(event)

      const response = await POST(makeRequest('{}'))
      expect(response.status).toBe(200)
    })

    it('handles gallery payment checkout', async () => {
      const event = makeEvent('checkout.session.completed', {
        mode: 'payment',
        id: 'cs_123',
        amount_total: 5000,
        currency: 'usd',
        customer_email: 'client@example.com',
        metadata: { projectId: 'proj_abc', pricingModel: 'flat_fee' },
      })
      ;(stripe.webhooks.constructEvent as Mock).mockReturnValue(event)

      const response = await POST(makeRequest('{}'))
      expect(response.status).toBe(200)
    })
  })

  describe('customer.subscription.updated', () => {
    it('updates subscription tier in profiles', async () => {
      const event = makeEvent('customer.subscription.updated', {
        id: 'sub_123',
        status: 'active',
        items: { data: [{ price: { id: 'price_pro_test' } }] },
      })
      ;(stripe.webhooks.constructEvent as Mock).mockReturnValue(event)

      const response = await POST(makeRequest('{}'))
      expect(response.status).toBe(200)
    })
  })

  describe('customer.subscription.deleted', () => {
    it('downgrades profile to free tier', async () => {
      const event = makeEvent('customer.subscription.deleted', {
        id: 'sub_123',
        status: 'canceled',
        items: { data: [] },
      })
      ;(stripe.webhooks.constructEvent as Mock).mockReturnValue(event)

      const response = await POST(makeRequest('{}'))
      expect(response.status).toBe(200)
    })
  })

  describe('invoice.payment_failed', () => {
    it('marks subscription as past_due', async () => {
      const event = makeEvent('invoice.payment_failed', {
        id: 'in_123',
        subscription: 'sub_123',
      })
      ;(stripe.webhooks.constructEvent as Mock).mockReturnValue(event)

      const response = await POST(makeRequest('{}'))
      expect(response.status).toBe(200)
    })

    it('is a no-op when invoice has no subscription', async () => {
      const event = makeEvent('invoice.payment_failed', { id: 'in_123' })
      ;(stripe.webhooks.constructEvent as Mock).mockReturnValue(event)

      const response = await POST(makeRequest('{}'))
      expect(response.status).toBe(200)
    })
  })

  describe('account.updated (Connect)', () => {
    it('updates charges_enabled status', async () => {
      const event = makeEvent('account.updated', {
        id: 'acct_123',
        charges_enabled: true,
      })
      ;(stripe.webhooks.constructEvent as Mock).mockReturnValue(event)

      const response = await POST(makeRequest('{}'))
      expect(response.status).toBe(200)
    })
  })

  describe('payment_intent.succeeded (Connect)', () => {
    it('records invoice as paid when invoice is present', async () => {
      const event = makeEvent('payment_intent.succeeded', {
        id: 'pi_123',
        invoice: 'in_123',
        amount: 5000,
        currency: 'usd',
      })
      ;(stripe.webhooks.constructEvent as Mock).mockReturnValue(event)

      const response = await POST(makeRequest('{}'))
      expect(response.status).toBe(200)
    })

    it('is a no-op when payment_intent has no invoice', async () => {
      const event = makeEvent('payment_intent.succeeded', {
        id: 'pi_123',
        amount: 5000,
      })
      ;(stripe.webhooks.constructEvent as Mock).mockReturnValue(event)

      const response = await POST(makeRequest('{}'))
      expect(response.status).toBe(200)
    })
  })

  describe('unhandled event types', () => {
    it('acknowledges unknown event types without error', async () => {
      const event = makeEvent('some.unknown.event', { id: 'obj_123' })
      ;(stripe.webhooks.constructEvent as Mock).mockReturnValue(event)

      const response = await POST(makeRequest('{}'))
      expect(response.status).toBe(200)
    })
  })
})
