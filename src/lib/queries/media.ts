import type { SupabaseClient } from '@supabase/supabase-js'
import type { Category, Media, MediaUpdate } from '@/types/supabase'

export async function getMedia(supabase: SupabaseClient, projectId: string): Promise<Media[]> {
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch media: ${error.message}`)
  return data ?? []
}

export async function updateMedia(
  supabase: SupabaseClient,
  id: string,
  update: MediaUpdate,
): Promise<Media> {
  const { data, error } = await supabase
    .from('media')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update media: ${error.message}`)
  return data
}

export async function deleteMedia(supabase: SupabaseClient, ids: string[]): Promise<void> {
  const { error } = await supabase.from('media').delete().in('id', ids)
  if (error) throw new Error(`Failed to delete media: ${error.message}`)
}

export async function getCategories(
  supabase: SupabaseClient,
  projectId: string,
): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to fetch categories: ${error.message}`)
  return data ?? []
}
