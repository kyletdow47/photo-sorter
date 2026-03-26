import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

export type PricingModel = 'flat_fee' | 'per_photo'

export interface GalleryCheckoutOptions {
  projectId: string
  clientEmail: string
  pricingModel: PricingModel
  flatFeeAmount?: number
  perPhotoAmount?: number
  photoCount?: number
  connectedAccountId: string
  applicationFeeAmount: number
  successUrl: string
  cancelUrl: string
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase service role credentials')
  }
  return createClient(url, key)
}

export async function createGalleryCheckout(
  options: GalleryCheckoutOptions
): Promise<string> {
  const {
    projectId,
    clientEmail,
    pricingModel,
    flatFeeAmount,
    perPhotoAmount,
    photoCount,
    connectedAccountId,
    applicationFeeAmount,
    successUrl,
    cancelUrl,
  } = options

  let lineItems: { price_data: { currency: string; product_data: { name: string }; unit_amount: number }; quantity: number }[]

  if (pricingModel === 'flat_fee') {
    if (!flatFeeAmount || flatFeeAmount <= 0) {
      throw new Error('flatFeeAmount is required for flat_fee pricing model')
    }
    lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Gallery Access' },
          unit_amount: flatFeeAmount,
        },
        quantity: 1,
      },
    ]
  } else {
    if (!perPhotoAmount || perPhotoAmount <= 0 || !photoCount || photoCount <= 0) {
      throw new Error('perPhotoAmount and photoCount are required for per_photo pricing model')
    }
    lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Photo Downloads' },
          unit_amount: perPhotoAmount,
        },
        quantity: photoCount,
      },
    ]
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: clientEmail,
    mode: 'payment',
    line_items: lineItems,
    payment_intent_data: {
      application_fee_amount: applicationFeeAmount,
      transfer_data: { destination: connectedAccountId },
    },
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: { projectId, pricingModel },
  })

  if (!session.url) {
    throw new Error('Stripe checkout session URL is missing')
  }

  // Store the pending session in DB for idempotency tracking
  try {
    const supabase = getServiceSupabase()
    await supabase.from('stripe_events').insert({
      stripe_event_id: `checkout_${session.id}`,
      event_type: 'checkout.session.created',
      processed: false,
    })
  } catch {
    // Non-fatal: DB insert failure should not block checkout
  }

  return session.url
}
