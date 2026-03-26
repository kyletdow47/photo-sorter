import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type { PlanTier } from '@/lib/stripe/plans'

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase service role credentials')
  }
  return createClient(url, key)
}

async function isEventProcessed(supabase: ReturnType<typeof getServiceSupabase>, eventId: string): Promise<boolean> {
  const { data } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('stripe_event_id', eventId)
    .eq('processed', true)
    .maybeSingle()
  return data !== null
}

async function markEventProcessed(supabase: ReturnType<typeof getServiceSupabase>, eventId: string, eventType: string): Promise<void> {
  await supabase.from('stripe_events').upsert({
    stripe_event_id: eventId,
    event_type: eventType,
    processed: true,
    processed_at: new Date().toISOString(),
  })
}

function tierFromPriceId(priceId: string | null | undefined): PlanTier {
  if (!priceId) return 'free'
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro'
  if (priceId === process.env.STRIPE_PRICE_BUSINESS) return 'business'
  return 'free'
}

async function handleCheckoutSessionCompleted(
  supabase: ReturnType<typeof getServiceSupabase>,
  session: Stripe.Checkout.Session
): Promise<void> {
  if (session.mode === 'subscription' && session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
    const priceId = subscription.items.data[0]?.price.id
    const tier = tierFromPriceId(priceId)

    await supabase
      .from('profiles')
      .update({
        subscription_tier: tier,
        subscription_status: subscription.status,
        stripe_subscription_id: subscription.id,
      })
      .eq('stripe_customer_id', session.customer as string)
  }

  if (session.mode === 'payment' && session.metadata?.projectId) {
    await supabase.from('gallery_payments').insert({
      project_id: session.metadata.projectId,
      stripe_session_id: session.id,
      amount: session.amount_total,
      currency: session.currency,
      status: 'paid',
      client_email: session.customer_email,
      paid_at: new Date().toISOString(),
    })
  }
}

async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof getServiceSupabase>,
  subscription: Stripe.Subscription
): Promise<void> {
  const priceId = subscription.items.data[0]?.price.id
  const tier = tierFromPriceId(priceId)

  await supabase
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_status: subscription.status,
    })
    .eq('stripe_subscription_id', subscription.id)
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof getServiceSupabase>,
  subscription: Stripe.Subscription
): Promise<void> {
  await supabase
    .from('profiles')
    .update({
      subscription_tier: 'free',
      subscription_status: 'canceled',
      stripe_subscription_id: null,
    })
    .eq('stripe_subscription_id', subscription.id)
}

async function handleInvoicePaymentFailed(
  supabase: ReturnType<typeof getServiceSupabase>,
  invoice: Stripe.Invoice
): Promise<void> {
  if (!invoice.subscription) return
  await supabase
    .from('profiles')
    .update({ subscription_status: 'past_due' })
    .eq('stripe_subscription_id', invoice.subscription as string)
}

async function handleAccountUpdated(
  supabase: ReturnType<typeof getServiceSupabase>,
  account: Stripe.Account
): Promise<void> {
  await supabase
    .from('profiles')
    .update({ stripe_connect_enabled: account.charges_enabled })
    .eq('stripe_connect_account_id', account.id)
}

async function handlePaymentIntentSucceeded(
  supabase: ReturnType<typeof getServiceSupabase>,
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  if (!paymentIntent.invoice) return
  await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntent.id,
    })
    .eq('stripe_invoice_id', paymentIntent.invoice as string)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Idempotency check
  const alreadyProcessed = await isEventProcessed(supabase, event.id)
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, skipped: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(supabase, event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice)
        break

      case 'account.updated':
        await handleAccountUpdated(supabase, event.data.object as Stripe.Account)
        break

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(supabase, event.data.object as Stripe.PaymentIntent)
        break

      default:
        // Unhandled event type — log and acknowledge
        console.log(`Unhandled Stripe event type: ${event.type}`)
    }

    await markEventProcessed(supabase, event.id, event.type)
    return NextResponse.json({ received: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Failed to process Stripe event ${event.id} (${event.type}):`, message)
    return NextResponse.json({ error: 'Internal processing error' }, { status: 500 })
  }
}
