import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createGalleryCheckout } from '@/lib/stripe/checkout'
import { getApplicationFeePercent } from '@/lib/stripe/plans'
import type { PlanTier } from '@/lib/stripe/plans'
import type { Project, Profile } from '@/types/supabase'

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase service role credentials')
  }
  return createClient(url, key)
}

interface CheckoutRequestBody {
  email: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: projectId } = await params

  let body: CheckoutRequestBody
  try {
    body = (await req.json()) as CheckoutRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { email } = body
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Fetch the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: 'Gallery not found.' }, { status: 404 })
  }

  const typedProject = project as Project

  if (typedProject.pricing_model === 'free') {
    return NextResponse.json({ error: 'This gallery is free to access.' }, { status: 400 })
  }

  // Get the photographer profile via workspace
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', typedProject.workspace_id)
    .single()

  if (workspaceError || !workspace) {
    return NextResponse.json({ error: 'Unable to resolve gallery owner.' }, { status: 500 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_account_id, tier')
    .eq('id', workspace.owner_id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Photographer profile not found.' }, { status: 500 })
  }

  const typedProfile = profile as Pick<Profile, 'stripe_account_id' | 'tier'>

  if (!typedProfile.stripe_account_id) {
    return NextResponse.json(
      { error: 'Photographer has not connected a Stripe account.' },
      { status: 422 }
    )
  }

  const tier = (typedProfile.tier ?? 'free') as PlanTier
  const feePercent = getApplicationFeePercent(tier)

  // Calculate the total charge amount
  let totalAmountCents: number
  if (typedProject.pricing_model === 'flat_fee') {
    if (!typedProject.flat_fee_cents || typedProject.flat_fee_cents <= 0) {
      return NextResponse.json({ error: 'Invalid flat fee configuration.' }, { status: 422 })
    }
    totalAmountCents = typedProject.flat_fee_cents
  } else {
    // per_photo: we charge for all photos; download route enforces per-photo tracking
    if (!typedProject.per_photo_cents || typedProject.per_photo_cents <= 0) {
      return NextResponse.json({ error: 'Invalid per-photo pricing configuration.' }, { status: 422 })
    }

    const { count, error: countError } = await supabase
      .from('media')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)

    if (countError || !count || count === 0) {
      return NextResponse.json({ error: 'No photos found in this gallery.' }, { status: 422 })
    }

    totalAmountCents = typedProject.per_photo_cents * count
  }

  const applicationFeeAmount = Math.round(totalAmountCents * (feePercent / 100))

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const successUrl = `${appUrl}/gallery/${projectId}?paid=true`
  const cancelUrl = `${appUrl}/gallery/${projectId}`

  try {
    const checkoutUrl = await createGalleryCheckout({
      projectId,
      clientEmail: email,
      pricingModel: typedProject.pricing_model as 'flat_fee' | 'per_photo',
      flatFeeAmount: typedProject.flat_fee_cents ?? undefined,
      perPhotoAmount: typedProject.per_photo_cents ?? undefined,
      photoCount:
        typedProject.pricing_model === 'per_photo'
          ? Math.round(totalAmountCents / (typedProject.per_photo_cents ?? 1))
          : undefined,
      connectedAccountId: typedProfile.stripe_account_id,
      applicationFeeAmount,
      successUrl,
      cancelUrl,
    })

    return NextResponse.json({ url: checkoutUrl })
  } catch (err) {
    console.error('Gallery checkout error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session.' }, { status: 500 })
  }
}
