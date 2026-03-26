import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { getApplicationFeePercent } from './plans'
import type { PlanTier } from './plans'

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase service role credentials')
  }
  return createClient(url, key)
}

export async function createConnectAccount(userId: string): Promise<string> {
  const account = await stripe.accounts.create({
    type: 'express',
    metadata: { userId },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  })

  const supabase = getServiceSupabase()
  const { error } = await supabase
    .from('profiles')
    .update({ stripe_connect_account_id: account.id, stripe_connect_enabled: false })
    .eq('id', userId)

  if (error) {
    throw new Error(`Failed to store Connect account ID: ${error.message}`)
  }

  return account.id
}

export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<string> {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  })

  return link.url
}

export async function createPaymentIntent(
  amount: number,
  currency: string,
  connectedAccountId: string,
  tier: PlanTier
): Promise<Stripe.PaymentIntent> {
  const feePercent = getApplicationFeePercent(tier)
  const applicationFeeAmount = Math.round(amount * (feePercent / 100))

  return stripe.paymentIntents.create({
    amount,
    currency,
    application_fee_amount: applicationFeeAmount,
    transfer_data: {
      destination: connectedAccountId,
    },
  })
}

export async function getConnectAccount(accountId: string): Promise<Stripe.Account> {
  return stripe.accounts.retrieve(accountId)
}
