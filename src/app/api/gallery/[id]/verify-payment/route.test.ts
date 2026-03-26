import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Stripe
vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        retrieve: vi.fn(),
      },
    },
  },
}))

// Mock Supabase service client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { GET } from './route'

const mockCreateClient = vi.mocked(createClient)
const mockSessionRetrieve = vi.mocked(stripe.checkout.sessions.retrieve)

function makeRequest(projectId: string, sessionId?: string) {
  const url = new URL(`http://localhost/api/gallery/${projectId}/verify-payment`)
  if (sessionId) url.searchParams.set('session_id', sessionId)
  return new NextRequest(url.toString())
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
})

describe('GET /api/gallery/[id]/verify-payment', () => {
  it('returns 400 when session_id is missing', async () => {
    const req = makeRequest('proj-1')
    const res = await GET(req, { params: Promise.resolve({ id: 'proj-1' }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/session_id/i)
  })

  it('returns 400 when Stripe session retrieval fails', async () => {
    mockSessionRetrieve.mockRejectedValue(new Error('No such session'))

    const req = makeRequest('proj-1', 'cs_bad')
    const res = await GET(req, { params: Promise.resolve({ id: 'proj-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns { paid: false } when payment_status is not paid', async () => {
    mockSessionRetrieve.mockResolvedValue({
      payment_status: 'unpaid',
      metadata: { projectId: 'proj-1' },
      customer_email: 'client@example.com',
    } as unknown as Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>)

    const req = makeRequest('proj-1', 'cs_unpaid')
    const res = await GET(req, { params: Promise.resolve({ id: 'proj-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.paid).toBe(false)
  })

  it('returns 403 when session projectId does not match route id', async () => {
    mockSessionRetrieve.mockResolvedValue({
      payment_status: 'paid',
      metadata: { projectId: 'different-proj' },
      customer_email: 'client@example.com',
    } as unknown as Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>)

    const req = makeRequest('proj-1', 'cs_mismatch')
    const res = await GET(req, { params: Promise.resolve({ id: 'proj-1' }) })
    expect(res.status).toBe(403)
  })

  it('returns existing access token if gallery_access already exists', async () => {
    mockSessionRetrieve.mockResolvedValue({
      payment_status: 'paid',
      metadata: { projectId: 'proj-1' },
      customer_email: 'client@example.com',
      customer_details: null,
    } as unknown as Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>)

    const supabaseMock = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { token: 'existing-token-abc' }, error: null }),
      }),
    }
    mockCreateClient.mockReturnValue(supabaseMock as unknown as ReturnType<typeof createClient>)

    const req = makeRequest('proj-1', 'cs_paid')
    const res = await GET(req, { params: Promise.resolve({ id: 'proj-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.paid).toBe(true)
    expect(body.accessToken).toBe('existing-token-abc')
  })

  it('creates gallery_access and invoice records on first successful payment', async () => {
    mockSessionRetrieve.mockResolvedValue({
      payment_status: 'paid',
      metadata: { projectId: 'proj-2' },
      customer_email: 'newclient@example.com',
      customer_details: null,
      payment_intent: 'pi_test_123',
      amount_total: 9900,
    } as unknown as Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>)

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { token: 'new-token-xyz' }, error: null }),
    })

    const insertInvoiceMock = vi.fn().mockResolvedValue({ error: null })

    const supabaseMock = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'gallery_access') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: insertMock,
          }
        }
        if (table === 'invoices') {
          return { insert: insertInvoiceMock }
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { currency: 'usd' }, error: null }),
          }
        }
        return {}
      }),
    }
    mockCreateClient.mockReturnValue(supabaseMock as unknown as ReturnType<typeof createClient>)

    const req = makeRequest('proj-2', 'cs_new_payment')
    const res = await GET(req, { params: Promise.resolve({ id: 'proj-2' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.paid).toBe(true)
    expect(body.accessToken).toBe('new-token-xyz')

    // Verify insert was called for gallery_access
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'proj-2',
        email: 'newclient@example.com',
        access_type: 'full',
      })
    )

    // Verify invoice was created
    expect(insertInvoiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'proj-2',
        client_email: 'newclient@example.com',
        amount_cents: 9900,
        status: 'paid',
        stripe_payment_intent_id: 'pi_test_123',
        stripe_checkout_session_id: 'cs_new_payment',
      })
    )
  })
})
