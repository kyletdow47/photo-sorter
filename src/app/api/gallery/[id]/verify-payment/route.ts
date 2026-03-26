import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import type { Project } from '@/types/supabase'

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase service role credentials')
  }
  return createClient(url, key)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: projectId } = await params
  const sessionId = req.nextUrl.searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id is required.' }, { status: 400 })
  }

  // Retrieve the Stripe session
  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch (err) {
    console.error('Failed to retrieve Stripe session:', err)
    return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 400 })
  }

  // Verify the session belongs to this project
  if (session.metadata?.projectId !== projectId) {
    return NextResponse.json({ error: 'Session does not match this gallery.' }, { status: 403 })
  }

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ paid: false })
  }

  const clientEmail = session.customer_email ?? session.customer_details?.email ?? ''
  const supabase = getServiceSupabase()

  // Check if we already created a gallery_access record for this session
  const { data: existingAccess } = await supabase
    .from('gallery_access')
    .select('token')
    .eq('project_id', projectId)
    .eq('email', clientEmail)
    .eq('access_type', 'full')
    .maybeSingle()

  if (existingAccess?.token) {
    return NextResponse.json({ paid: true, accessToken: existingAccess.token })
  }

  // Create gallery_access record with full access
  const { data: newAccess, error: accessError } = await supabase
    .from('gallery_access')
    .insert({
      project_id: projectId,
      email: clientEmail,
      access_type: 'full',
    })
    .select('token')
    .single()

  if (accessError || !newAccess) {
    console.error('Failed to create gallery access record:', accessError)
    return NextResponse.json({ error: 'Failed to grant gallery access.' }, { status: 500 })
  }

  // Create invoice record
  const { data: project } = await supabase
    .from('projects')
    .select('currency')
    .eq('id', projectId)
    .single()

  const typedProject = project as Pick<Project, 'currency'> | null
  const amountTotal = session.amount_total ?? 0

  const { error: invoiceError } = await supabase.from('invoices').insert({
    project_id: projectId,
    client_email: clientEmail,
    amount_cents: amountTotal,
    currency: typedProject?.currency ?? 'usd',
    status: 'paid' as const,
    stripe_payment_intent_id:
      typeof session.payment_intent === 'string' ? session.payment_intent : null,
    stripe_checkout_session_id: sessionId,
    paid_at: new Date().toISOString(),
  })

  if (invoiceError) {
    console.error('Failed to create invoice record:', invoiceError)
    // Non-fatal: access has been granted; invoice failure should not block client
  }

  return NextResponse.json({ paid: true, accessToken: newAccess.token })
}
