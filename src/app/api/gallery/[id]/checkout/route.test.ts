import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Supabase service client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

// Mock Stripe checkout helper
vi.mock('@/lib/stripe/checkout', () => ({
  createGalleryCheckout: vi.fn(),
}))

// Mock plans helper
vi.mock('@/lib/stripe/plans', () => ({
  getApplicationFeePercent: vi.fn((tier: string) => {
    if (tier === 'free') return 5
    if (tier === 'pro') return 3
    if (tier === 'business') return 2
    return 5
  }),
}))

import { createClient } from '@supabase/supabase-js'
import { createGalleryCheckout } from '@/lib/stripe/checkout'
import { POST } from './route'

const mockCreateClient = vi.mocked(createClient)
const mockCreateGalleryCheckout = vi.mocked(createGalleryCheckout)

function makeRequest(projectId: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/gallery/${projectId}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
})

describe('POST /api/gallery/[id]/checkout', () => {
  it('returns 400 when email is missing', async () => {
    const req = makeRequest('proj-1', {})
    const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/email/i)
  })

  it('returns 404 when project is not found', async () => {
    const supabaseMock = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        head: true,
        count: 'exact',
      }),
    }
    mockCreateClient.mockReturnValue(supabaseMock as unknown as ReturnType<typeof createClient>)

    const req = makeRequest('missing-id', { email: 'client@example.com' })
    const res = await POST(req, { params: Promise.resolve({ id: 'missing-id' }) })
    expect(res.status).toBe(404)
  })

  it('returns 400 for free pricing model', async () => {
    const project = {
      id: 'proj-1',
      pricing_model: 'free',
      workspace_id: 'ws-1',
      flat_fee_cents: null,
      per_photo_cents: null,
      currency: 'usd',
    }

    const supabaseMock = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: project, error: null }),
      }),
    }
    mockCreateClient.mockReturnValue(supabaseMock as unknown as ReturnType<typeof createClient>)

    const req = makeRequest('proj-1', { email: 'client@example.com' })
    const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/free/i)
  })

  it('calculates application fee correctly for flat_fee on free tier (5%)', async () => {
    const project = {
      id: 'proj-1',
      pricing_model: 'flat_fee',
      workspace_id: 'ws-1',
      flat_fee_cents: 10000, // $100
      per_photo_cents: null,
      currency: 'usd',
    }
    const workspace = { owner_id: 'user-1' }
    const profile = { stripe_account_id: 'acct_test', tier: 'free' }

    let callCount = 0
    const supabaseMock = {
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) return Promise.resolve({ data: project, error: null })
          if (callCount === 2) return Promise.resolve({ data: workspace, error: null })
          return Promise.resolve({ data: profile, error: null })
        }),
      })),
    }
    mockCreateClient.mockReturnValue(supabaseMock as unknown as ReturnType<typeof createClient>)
    mockCreateGalleryCheckout.mockResolvedValue('https://checkout.stripe.com/test')

    const req = makeRequest('proj-1', { email: 'client@example.com' })
    await POST(req, { params: Promise.resolve({ id: 'proj-1' }) })

    expect(mockCreateGalleryCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationFeeAmount: 500, // 5% of 10000 = 500
        connectedAccountId: 'acct_test',
        pricingModel: 'flat_fee',
        flatFeeAmount: 10000,
      })
    )
  })

  it('calculates application fee correctly for pro tier (3%)', async () => {
    const project = {
      id: 'proj-2',
      pricing_model: 'flat_fee',
      workspace_id: 'ws-2',
      flat_fee_cents: 20000, // $200
      per_photo_cents: null,
      currency: 'usd',
    }
    const workspace = { owner_id: 'user-2' }
    const profile = { stripe_account_id: 'acct_pro', tier: 'pro' }

    let callCount = 0
    const supabaseMock = {
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) return Promise.resolve({ data: project, error: null })
          if (callCount === 2) return Promise.resolve({ data: workspace, error: null })
          return Promise.resolve({ data: profile, error: null })
        }),
      })),
    }
    mockCreateClient.mockReturnValue(supabaseMock as unknown as ReturnType<typeof createClient>)
    mockCreateGalleryCheckout.mockResolvedValue('https://checkout.stripe.com/test')

    const req = makeRequest('proj-2', { email: 'client@example.com' })
    await POST(req, { params: Promise.resolve({ id: 'proj-2' }) })

    expect(mockCreateGalleryCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationFeeAmount: 600, // 3% of 20000 = 600
      })
    )
  })

  it('returns checkout URL on success', async () => {
    const project = {
      id: 'proj-3',
      pricing_model: 'flat_fee',
      workspace_id: 'ws-3',
      flat_fee_cents: 5000,
      per_photo_cents: null,
      currency: 'usd',
    }
    const workspace = { owner_id: 'user-3' }
    const profile = { stripe_account_id: 'acct_biz', tier: 'business' }

    let callCount = 0
    const supabaseMock = {
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) return Promise.resolve({ data: project, error: null })
          if (callCount === 2) return Promise.resolve({ data: workspace, error: null })
          return Promise.resolve({ data: profile, error: null })
        }),
      })),
    }
    mockCreateClient.mockReturnValue(supabaseMock as unknown as ReturnType<typeof createClient>)
    mockCreateGalleryCheckout.mockResolvedValue('https://checkout.stripe.com/pay/session_abc')

    const req = makeRequest('proj-3', { email: 'buyer@example.com' })
    const res = await POST(req, { params: Promise.resolve({ id: 'proj-3' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toBe('https://checkout.stripe.com/pay/session_abc')
  })
})
