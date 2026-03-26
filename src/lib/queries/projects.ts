import type { SupabaseClient } from '@supabase/supabase-js'
import type { Project, ProjectInsert, ProjectUpdate, Workspace } from '@/types/supabase'

export async function getWorkspaces(
  supabase: SupabaseClient,
  userId: string,
): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch workspaces: ${error.message}`)
  return data ?? []
}

export async function getProjects(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch projects: ${error.message}`)
  return data ?? []
}

export async function getProject(
  supabase: SupabaseClient,
  id: string,
): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to fetch project: ${error.message}`)
  }
  return data
}

export async function createProject(
  supabase: SupabaseClient,
  project: ProjectInsert,
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create project: ${error.message}`)
  return data
}

export async function updateProject(
  supabase: SupabaseClient,
  id: string,
  update: ProjectUpdate,
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update project: ${error.message}`)
  return data
}

export async function deleteProject(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete project: ${error.message}`)
}

export async function getActiveProjectCount(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')

  if (error) throw new Error(`Failed to count projects: ${error.message}`)
  return count ?? 0
}

export async function getMediaCountForProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('media')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)

  if (error) throw new Error(`Failed to count media: ${error.message}`)
  return count ?? 0
}
