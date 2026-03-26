export type MediaOrientation = 'landscape' | 'portrait' | 'square'

export interface MediaItem {
  id: string
  thumbnail_url?: string | null
  filename: string
  ai_category?: string | null
  ai_confidence?: number | null
  orientation?: MediaOrientation | null
  selected?: boolean
}
