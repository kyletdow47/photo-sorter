import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { GalleryView } from '@/components/features/gallery/GalleryView'
import { AccessGate } from '@/components/features/gallery/AccessGate'
import type { Project, Media, GalleryTheme, Profile } from '@/types/supabase'

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase service role credentials')
  return createServiceClient(url, key)
}

interface GalleryPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string; paid?: string; session_id?: string }>
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
  const { token, paid, session_id } = await searchParams
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

  // Resolve photographer name for paywall display
  let photographerName: string | undefined
  const serviceSupabase = getServiceSupabase()

  const { data: workspace } = await serviceSupabase
    .from('workspaces')
    .select('owner_id, name')
    .eq('id', typedProject.workspace_id)
    .single()

  if (workspace) {
    const { data: photographerProfile } = await serviceSupabase
      .from('profiles')
      .select('display_name')
      .eq('id', workspace.owner_id)
      .single()

    photographerName =
      (photographerProfile as Pick<Profile, 'display_name'> | null)?.display_name ??
      (workspace as { name: string }).name
  }

  // Verify payment when returning from Stripe checkout
  let hasPaid = false
  if (paid === 'true' && session_id && typedProject.pricing_model !== 'free') {
    try {
      const stripeSession = await stripe.checkout.sessions.retrieve(session_id)

      if (
        stripeSession.payment_status === 'paid' &&
        stripeSession.metadata?.projectId === id
      ) {
        hasPaid = true

        const clientEmail =
          stripeSession.customer_email ?? stripeSession.customer_details?.email ?? ''

        // Idempotent: only create records if they don't exist yet
        const { data: existingAccess } = await serviceSupabase
          .from('gallery_access')
          .select('token')
          .eq('project_id', id)
          .eq('email', clientEmail)
          .eq('access_type', 'full')
          .maybeSingle()

        if (!existingAccess) {
          const { error: accessError } = await serviceSupabase
            .from('gallery_access')
            .insert({ project_id: id, email: clientEmail, access_type: 'full' })

          if (accessError) {
            console.error('Failed to create gallery_access on return:', accessError)
          }

          const { error: invoiceError } = await serviceSupabase.from('invoices').insert({
            project_id: id,
            client_email: clientEmail,
            amount_cents: stripeSession.amount_total ?? 0,
            currency: typedProject.currency,
            status: 'paid' as const,
            stripe_payment_intent_id:
              typeof stripeSession.payment_intent === 'string'
                ? stripeSession.payment_intent
                : null,
            stripe_checkout_session_id: session_id,
            paid_at: new Date().toISOString(),
          })

          if (invoiceError) {
            console.error('Failed to create invoice on return:', invoiceError)
          }
        }
      }
    } catch (err) {
      console.error('Failed to verify payment session:', err)
    }
  }

  return (
    <GalleryView
      project={typedProject}
      media={(media ?? []) as Media[]}
      theme={typedProject.gallery_theme as GalleryTheme}
      accessToken={token}
      hasPaid={hasPaid}
      photographerName={photographerName}
    />
  )
}
