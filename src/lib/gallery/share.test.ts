import { describe, expect, it, vi, beforeEach } from 'vitest'
import { generateShareLink } from './share'

// Mock the supabase server client
const mockInsert = vi.fn()
const mockFrom = vi.fn(() => ({ insert: mockInsert }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}))

// Mock crypto.getRandomValues
const mockGetRandomValues = vi.fn((array: Uint8Array) => {
  for (let i = 0; i < array.length; i++) {
    array[i] = i % 62
  }
  return array
})
Object.defineProperty(globalThis, 'crypto', {
  value: { getRandomValues: mockGetRandomValues },
  writable: true,
})

describe('generateShareLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ data: null, error: null })
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
  })

  it('returns a URL with the project ID and token', async () => {
    const result = await generateShareLink('proj-abc', 'client@example.com', 'full')
    expect(result.url).toContain('/gallery/proj-abc?token=')
    expect(result.token).toBeTruthy()
    expect(result.token.length).toBe(32)
  })

  it('URL starts with NEXT_PUBLIC_APP_URL', async () => {
    const result = await generateShareLink('proj-abc', 'client@example.com', 'preview')
    expect(result.url).toStartWith('https://app.example.com/gallery/proj-abc')
  })

  it('falls back to localhost when APP_URL is not set', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    const result = await generateShareLink('proj-abc', 'client@example.com', 'full')
    expect(result.url).toStartWith('http://localhost:3000/gallery/proj-abc')
  })

  it('sets expiry ~30 days in the future by default', async () => {
    const before = Date.now()
    const result = await generateShareLink('proj-abc', 'client@example.com', 'full')
    const after = Date.now()

    const expMs = result.expiresAt.getTime()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    expect(expMs).toBeGreaterThanOrEqual(before + thirtyDays - 1000)
    expect(expMs).toBeLessThanOrEqual(after + thirtyDays + 1000)
  })

  it('respects custom expiryDays', async () => {
    const before = Date.now()
    const result = await generateShareLink('proj-abc', 'client@example.com', 'preview', {
      expiryDays: 7,
    })
    const after = Date.now()
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + sevenDays - 1000)
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(after + sevenDays + 1000)
  })

  it('inserts a row into gallery_access with correct fields', async () => {
    await generateShareLink('proj-xyz', 'USER@Example.COM', 'full')
    expect(mockFrom).toHaveBeenCalledWith('gallery_access')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'proj-xyz',
        email: 'user@example.com', // lowercased + trimmed
        access_type: 'full',
      })
    )
  })

  it('throws an error when Supabase insert fails', async () => {
    mockInsert.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })
    await expect(
      generateShareLink('proj-abc', 'client@example.com', 'full')
    ).rejects.toThrow('Failed to create gallery access: DB error')
  })
})
