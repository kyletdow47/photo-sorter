import { createClient } from '@/lib/supabase/server'
import type { GalleryAccessType } from '@/types/supabase'

const DEFAULT_EXPIRY_DAYS = 30

function generateToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  for (const byte of array) {
    result += chars[byte % chars.length]
  }
  return result
}

export interface ShareLinkOptions {
  expiryDays?: number
}

export interface ShareLinkResult {
  url: string
  token: string
  expiresAt: Date
}

/**
 * Generates a gallery share link for a specific email address.
 * Creates a gallery_access row with a unique token.
 */
export async function generateShareLink(
  projectId: string,
  email: string,
  accessType: GalleryAccessType,
  options: ShareLinkOptions = {}
): Promise<ShareLinkResult> {
  const { expiryDays = DEFAULT_EXPIRY_DAYS } = options

  const token = generateToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiryDays)

  const supabase = await createClient()

  const { error } = await supabase.from('gallery_access').insert({
    project_id: projectId,
    email: email.trim().toLowerCase(),
    token,
    access_type: accessType,
    expires_at: expiresAt.toISOString(),
  })

  if (error) {
    throw new Error(`Failed to create gallery access: ${error.message}`)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const url = `${appUrl}/gallery/${projectId}?token=${token}`

  return { url, token, expiresAt }
}
