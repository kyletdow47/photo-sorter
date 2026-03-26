'use client'

import { useRef } from 'react'
import { Camera } from 'lucide-react'
import { Input } from '@/components/common/Input'
import { Avatar } from '@/components/common/Avatar'

export interface WelcomeData {
  displayName: string
  businessName: string
  avatarFile?: File
  avatarPreview?: string
}

interface WelcomeStepProps {
  data: WelcomeData
  errors: Partial<Record<keyof WelcomeData, string>>
  onChange: (data: Partial<WelcomeData>) => void
}

export function WelcomeStep({ data, errors, onChange }: WelcomeStepProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    onChange({ avatarFile: file, avatarPreview: preview })
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Welcome to View1 Studio</h2>
        <p className="text-muted">Let&apos;s set up your photographer profile</p>
      </div>

      {/* Avatar upload */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative group rounded-full focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
          aria-label="Upload avatar"
        >
          <Avatar
            src={data.avatarPreview}
            name={data.displayName || 'You'}
            size="lg"
            className="w-20 h-20 text-xl"
          />
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={20} className="text-white" />
          </div>
        </button>
        <span className="text-xs text-muted">Upload profile photo (optional)</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      <div className="space-y-4">
        <Input
          label="Your name"
          placeholder="Jane Smith"
          value={data.displayName}
          onChange={(e) => onChange({ displayName: e.target.value })}
          error={errors.displayName}
          autoComplete="name"
        />
        <Input
          label="Business name"
          placeholder="Jane Smith Photography"
          value={data.businessName}
          onChange={(e) => onChange({ businessName: e.target.value })}
          error={errors.businessName}
          autoComplete="organization"
        />
      </div>
    </div>
  )
}
