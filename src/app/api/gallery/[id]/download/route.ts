import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createClient } from '@/lib/supabase/server'
import type { Media, GalleryDownloadInsert } from '@/types/supabase'

interface RouteParams {
  params: Promise<{ id: string }>
}

async function validateAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  token?: string
): Promise<boolean> {
  const { data: project } = await supabase
    .from('projects')
    .select('gallery_public')
    .eq('id', projectId)
    .single()

  if (!project) return false
  if (project.gallery_public) return true
  if (!token) return false

  const { data: access } = await supabase
    .from('gallery_access')
    .select('*')
    .eq('project_id', projectId)
    .eq('token', token)
    .single()

  if (!access) return false
  if (access.expires_at && new Date(access.expires_at) < new Date()) return false

  return true
}

async function logDownload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  email: string,
  downloadType: 'single' | 'zip' | 'all',
  mediaId?: string
) {
  const row: GalleryDownloadInsert = {
    project_id: projectId,
    media_id: mediaId ?? null,
    email,
    download_type: downloadType,
  }
  await supabase.from('gallery_downloads').insert(row)
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params
  const { searchParams } = request.nextUrl
  const token = searchParams.get('token') ?? undefined
  const mediaId = searchParams.get('mediaId') ?? undefined
  const downloadType = searchParams.get('type') as 'zip' | 'all' | null

  const supabase = await createClient()

  const hasAccess = await validateAccess(supabase, projectId, token)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Single photo download
  if (mediaId) {
    const { data: media } = await supabase
      .from('media')
      .select('*')
      .eq('id', mediaId)
      .eq('project_id', projectId)
      .single()

    if (!media) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const typedMedia = media as Media

    // Log the download (fire and forget)
    logDownload(supabase, projectId, 'anonymous', 'single', mediaId).catch(() => {})

    // Redirect to Cloudflare URL if available, otherwise stream from Supabase storage
    if (typedMedia.cloudflare_image_id) {
      const cfAccountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID
      const url = `https://imagedelivery.net/${cfAccountId}/${typedMedia.cloudflare_image_id}/public`
      return NextResponse.redirect(url)
    }

    const { data: signedUrlData } = await supabase.storage
      .from('media')
      .createSignedUrl(typedMedia.storage_path, 300)

    if (!signedUrlData?.signedUrl) {
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
    }

    return NextResponse.redirect(signedUrlData.signedUrl)
  }

  // ZIP download (all photos)
  if (downloadType === 'zip' || downloadType === 'all') {
    const { data: allMedia } = await supabase
      .from('media')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    if (!allMedia || allMedia.length === 0) {
      return NextResponse.json({ error: 'No photos found' }, { status: 404 })
    }

    const typedMedia = allMedia as Media[]
    const zip = new JSZip()

    await Promise.all(
      typedMedia.map(async (item) => {
        const { data: signedUrlData } = await supabase.storage
          .from('media')
          .createSignedUrl(item.storage_path, 300)

        if (!signedUrlData?.signedUrl) return

        const response = await fetch(signedUrlData.signedUrl)
        if (!response.ok) return

        const buffer = await response.arrayBuffer()
        zip.file(item.filename, buffer)
      })
    )

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    logDownload(supabase, projectId, 'anonymous', 'zip').catch(() => {})

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="gallery-${projectId}.zip"`,
      },
    })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
