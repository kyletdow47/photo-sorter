import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params
  const body = await request.json() as { email?: string; token?: string }
  const { email, token } = body

  if (!email || !token) {
    return NextResponse.json({ error: 'Email and access code are required.' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: access } = await supabase
    .from('gallery_access')
    .select('*')
    .eq('project_id', projectId)
    .eq('email', email.trim().toLowerCase())
    .eq('token', token.trim())
    .single()

  if (!access) {
    return NextResponse.json({ error: 'Invalid email or access code.' }, { status: 401 })
  }

  if (access.expires_at && new Date(access.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This access link has expired.' }, { status: 401 })
  }

  // Mark accessed_at
  await supabase
    .from('gallery_access')
    .update({ accessed_at: new Date().toISOString() })
    .eq('id', access.id)

  return NextResponse.json({ token: access.token })
}
