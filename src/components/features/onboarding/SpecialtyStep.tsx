'use client'

import { clsx } from 'clsx'
import { Heart, User, Calendar, Package, Home, MoreHorizontal } from 'lucide-react'

export type PhotographySpecialty = 'wedding' | 'portrait' | 'event' | 'product' | 'real_estate' | 'other'

export interface SpecialtyData {
  specialty: PhotographySpecialty | ''
}

interface SpecialtyOption {
  value: PhotographySpecialty
  label: string
  icon: React.ElementType
}

const SPECIALTIES: SpecialtyOption[] = [
  { value: 'wedding', label: 'Wedding', icon: Heart },
  { value: 'portrait', label: 'Portrait', icon: User },
  { value: 'event', label: 'Event', icon: Calendar },
  { value: 'product', label: 'Product', icon: Package },
  { value: 'real_estate', label: 'Real Estate', icon: Home },
  { value: 'other', label: 'Other', icon: MoreHorizontal },
]

interface SpecialtyStepProps {
  data: SpecialtyData
  errors: Partial<Record<keyof SpecialtyData, string>>
  onChange: (data: Partial<SpecialtyData>) => void
}

export function SpecialtyStep({ data, errors, onChange }: SpecialtyStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">What do you shoot?</h2>
        <p className="text-muted">We&apos;ll tailor your AI categories to your specialty</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SPECIALTIES.map(({ value, label, icon: Icon }) => {
          const selected = data.specialty === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ specialty: value })}
              className={clsx(
                'flex flex-col items-center justify-center gap-3 rounded-xl border p-5 transition-all',
                'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background',
                selected
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-view1-border bg-surface text-muted hover:border-white/20 hover:text-white'
              )}
              aria-pressed={selected}
            >
              <Icon size={28} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          )
        })}
      </div>

      {errors.specialty && (
        <p className="text-xs text-red-500 text-center" role="alert">
          {errors.specialty}
        </p>
      )}
    </div>
  )
}
