import { describe, it, expect } from 'vitest'
import {
  PLANS,
  getPlan,
  getApplicationFeePercent,
  formatPrice,
  isWithinLimit,
  type PlanTier,
} from './plans'

describe('PLANS', () => {
  it('defines all three tiers', () => {
    expect(PLANS.free).toBeDefined()
    expect(PLANS.pro).toBeDefined()
    expect(PLANS.business).toBeDefined()
  })

  describe('free tier', () => {
    const plan = PLANS.free

    it('has no monthly price', () => {
      expect(plan.priceMonthly).toBeNull()
    })

    it('limits projects to 3', () => {
      expect(plan.limits.maxProjects).toBe(3)
    })

    it('limits storage to 500MB', () => {
      expect(plan.limits.storageBytes).toBe(500 * 1024 * 1024)
    })

    it('has 3 gallery themes', () => {
      expect(plan.limits.galleryThemes).toBe(3)
    })

    it('allows watermarked downloads', () => {
      expect(plan.limits.watermarkedDownloads).toBe(true)
    })

    it('does not allow full-res downloads', () => {
      expect(plan.limits.fullResDownloads).toBe(false)
    })

    it('does not allow custom branding', () => {
      expect(plan.limits.customBranding).toBe(false)
    })

    it('does not include priority support', () => {
      expect(plan.limits.prioritySupport).toBe(false)
    })

    it('does not include API access', () => {
      expect(plan.limits.apiAccess).toBe(false)
    })
  })

  describe('pro tier', () => {
    const plan = PLANS.pro

    it('costs $39/mo (3900 cents)', () => {
      expect(plan.priceMonthly).toBe(3900)
    })

    it('has unlimited projects', () => {
      expect(plan.limits.maxProjects).toBeNull()
    })

    it('has 50GB storage', () => {
      expect(plan.limits.storageBytes).toBe(50 * 1024 * 1024 * 1024)
    })

    it('has 4 gallery themes', () => {
      expect(plan.limits.galleryThemes).toBe(4)
    })

    it('allows full-res downloads', () => {
      expect(plan.limits.fullResDownloads).toBe(true)
    })

    it('includes custom branding', () => {
      expect(plan.limits.customBranding).toBe(true)
    })

    it('does not include priority support', () => {
      expect(plan.limits.prioritySupport).toBe(false)
    })
  })

  describe('business tier', () => {
    const plan = PLANS.business

    it('costs $99/mo (9900 cents)', () => {
      expect(plan.priceMonthly).toBe(9900)
    })

    it('has unlimited projects', () => {
      expect(plan.limits.maxProjects).toBeNull()
    })

    it('includes priority support', () => {
      expect(plan.limits.prioritySupport).toBe(true)
    })

    it('includes API access', () => {
      expect(plan.limits.apiAccess).toBe(true)
    })

    it('has unlimited team members', () => {
      expect(plan.limits.teamMembers).toBeNull()
    })
  })
})

describe('getPlan', () => {
  it('returns the correct plan for each tier', () => {
    const tiers: PlanTier[] = ['free', 'pro', 'business']
    for (const tier of tiers) {
      expect(getPlan(tier)).toBe(PLANS[tier])
    }
  })
})

describe('getApplicationFeePercent', () => {
  it('charges 5% for free tier', () => {
    expect(getApplicationFeePercent('free')).toBe(5)
  })

  it('charges 3% for pro tier', () => {
    expect(getApplicationFeePercent('pro')).toBe(3)
  })

  it('charges 2% for business tier', () => {
    expect(getApplicationFeePercent('business')).toBe(2)
  })
})

describe('formatPrice', () => {
  it('returns "Free" for null price', () => {
    expect(formatPrice(null)).toBe('Free')
  })

  it('formats 3900 cents as "$39/mo"', () => {
    expect(formatPrice(3900)).toBe('$39/mo')
  })

  it('formats 9900 cents as "$99/mo"', () => {
    expect(formatPrice(9900)).toBe('$99/mo')
  })
})

describe('isWithinLimit', () => {
  describe('project limits', () => {
    it('returns true when under the project limit', () => {
      expect(isWithinLimit('free', 'projects', 2)).toBe(true)
    })

    it('returns false when at the project limit', () => {
      expect(isWithinLimit('free', 'projects', 3)).toBe(false)
    })

    it('returns false when over the project limit', () => {
      expect(isWithinLimit('free', 'projects', 10)).toBe(false)
    })

    it('always returns true for unlimited tiers', () => {
      expect(isWithinLimit('pro', 'projects', 9999)).toBe(true)
      expect(isWithinLimit('business', 'projects', 9999)).toBe(true)
    })
  })

  describe('storage limits', () => {
    it('returns true when under the storage limit', () => {
      expect(isWithinLimit('free', 'storage', 100 * 1024 * 1024)).toBe(true)
    })

    it('returns false when at or over the storage limit', () => {
      expect(isWithinLimit('free', 'storage', 500 * 1024 * 1024)).toBe(false)
      expect(isWithinLimit('free', 'storage', 600 * 1024 * 1024)).toBe(false)
    })
  })
})
