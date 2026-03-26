import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GalleryView } from '@/components/features/gallery/GalleryView'
import { AccessGate } from '@/components/features/gallery/AccessGate'
import type { Project, Media, GalleryTheme } from '@/types/supabase'

interface GalleryPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

export async function generateMetadata({ params }: GalleryPageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', id)
    .single()

  return {
    title: project?.name ?? 'Gallery',
    description: 'Photo gallery',
  }
}

export default async function GalleryPage({ params, searchParams }: GalleryPageProps) {
  const { id } = await params
  const { token } = await searchParams
  const supabase = await createClient()

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (projectError || !project) {
    notFound()
  }

  const typedProject = project as Project

  // Private gallery: require token
  if (!typedProject.gallery_public) {
    if (!token) {
      return <AccessGate projectId={id} theme={typedProject.gallery_theme as GalleryTheme} />
    }

    // Validate token
    const { data: access } = await supabase
      .from('gallery_access')
      .select('*')
      .eq('project_id', id)
      .eq('token', token)
      .single()

    if (!access) {
      return <AccessGate projectId={id} theme={typedProject.gallery_theme as GalleryTheme} invalidToken />
    }

    const isExpired = access.expires_at && new Date(access.expires_at) < new Date()
    if (isExpired) {
      return <AccessGate projectId={id} theme={typedProject.gallery_theme as GalleryTheme} invalidToken />
    }
  }

  const { data: media } = await supabase
    .from('media')
    .select('*')
    .eq('project_id', id)
    .order('sort_order', { ascending: true })

  return (
    <GalleryView
      project={typedProject}
      media={(media ?? []) as Media[]}
      theme={typedProject.gallery_theme as GalleryTheme}
      accessToken={token}
    />
  )
}
