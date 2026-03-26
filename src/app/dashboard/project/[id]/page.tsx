import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMedia } from '@/lib/queries/media'
import { getProject } from '@/lib/queries/projects'
import { WorkspaceView } from '@/components/features/workspace/WorkspaceView'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const [project, media] = await Promise.all([
    getProject(supabase, id),
    getMedia(supabase, id),
  ])

  if (!project) {
    notFound()
  }

  return <WorkspaceView project={project} initialMedia={media} />
}
