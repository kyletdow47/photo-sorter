export type PlanTier = 'free' | 'pro' | 'business'

export interface PlanLimits {
  maxProjects: number | null
  storageBytes: number
  galleryThemes: number
  watermarkedDownloads: boolean
  fullResDownloads: boolean
  customBranding: boolean
  prioritySupport: boolean
  apiAccess: boolean
  teamMembers: number | null
}

export interface Plan {
  id: PlanTier
  name: string
  priceMonthly: number | null
  stripePriceId: string | null
  description: string
  limits: PlanLimits
}

const GB = 1024 * 1024 * 1024
const MB = 1024 * 1024

export const PLANS: Record<PlanTier, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: null,
    stripePriceId: null,
    description: 'Get started with AI-powered photo sorting',
    limits: {
      maxProjects: 3,
      storageBytes: 500 * MB,
      galleryThemes: 3,
      watermarkedDownloads: true,
      fullResDownloads: false,
      customBranding: false,
      prioritySupport: false,
      apiAccess: false,
      teamMembers: 1,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 3900,
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
    description: 'Unlimited projects and full-res client delivery',
    limits: {
      maxProjects: null,
      storageBytes: 50 * GB,
      galleryThemes: 4,
      watermarkedDownloads: true,
      fullResDownloads: true,
      customBranding: true,
      prioritySupport: false,
      apiAccess: false,
      teamMembers: 1,
    },
  },
  business: {
    id: 'business',
    name: 'Business',
    priceMonthly: 9900,
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS ?? null,
    description: 'Everything in Pro plus team collaboration and API access',
    limits: {
      maxProjects: null,
      storageBytes: 500 * GB,
      galleryThemes: 4,
      watermarkedDownloads: true,
      fullResDownloads: true,
      customBranding: true,
      prioritySupport: true,
      apiAccess: true,
      teamMembers: null,
    },
  },
}

export function getPlan(tier: PlanTier): Plan {
  return PLANS[tier]
}

export function getApplicationFeePercent(tier: PlanTier): number {
  switch (tier) {
    case 'free':
      return 5
    case 'pro':
      return 3
    case 'business':
      return 2
  }
}

export function formatPrice(cents: number | null): string {
  if (cents === null) return 'Free'
  return `$${(cents / 100).toFixed(0)}/mo`
}

export function isWithinLimit(
  tier: PlanTier,
  resource: 'projects' | 'storage',
  current: number
): boolean {
  const plan = getPlan(tier)
  if (resource === 'projects') {
    return plan.limits.maxProjects === null || current < plan.limits.maxProjects
  }
  return current < plan.limits.storageBytes
}
