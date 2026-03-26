import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getActiveProjectCount,
  getMediaCountForProject,
  getProjects,
  getWorkspaces,
} from '@/lib/queries/projects'
import { DashboardShell } from '@/components/features/workspace/DashboardShell'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch profile for tier info
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single()

  // Fetch or create workspace
  const workspaces = await getWorkspaces(supabase, user.id)
  let workspaceId: string

  if (workspaces.length === 0) {
    // Auto-create a default workspace for new users
    const { data: created, error } = await supabase
      .from('workspaces')
      .insert({
        owner_id: user.id,
        name: 'My Workspace',
        slug: `workspace-${user.id.slice(0, 8)}`,
      })
      .select('id')
      .single()

    if (error || !created) {
      throw new Error('Failed to create workspace')
    }
    workspaceId = created.id
  } else {
    workspaceId = workspaces[0].id
  }

  const [projects, activeCount] = await Promise.all([
    getProjects(supabase, workspaceId),
    getActiveProjectCount(supabase, workspaceId),
  ])

  // Fetch photo counts for all projects in parallel
  const countEntries = await Promise.all(
    projects.map(async (p) => {
      const count = await getMediaCountForProject(supabase, p.id)
      return [p.id, count] as const
    }),
  )
  const photoCounts = Object.fromEntries(countEntries)

  return (
    <DashboardShell
      projects={projects}
      photoCounts={photoCounts}
      workspaceId={workspaceId}
      activeProjectCount={activeCount}
      tier={profile?.tier ?? 'free'}
    />
  )
}
