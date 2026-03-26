'use client'

import { clsx } from 'clsx'
import { FolderOpen } from 'lucide-react'
import { Input } from '@/components/common/Input'
import { Card } from '@/components/common/Card'

export type ProjectPreset = 'wedding' | 'portrait' | 'event' | 'product' | 'travel' | 'blank'

export interface FirstProjectData {
  projectName: string
  projectPreset: ProjectPreset
}

interface PresetOption {
  value: ProjectPreset
  label: string
  description: string
}

const PRESETS: PresetOption[] = [
  { value: 'wedding', label: 'Wedding', description: 'Ceremony, portraits, reception categories' },
  { value: 'portrait', label: 'Portrait', description: 'Hero shots, expressions, candids' },
  { value: 'event', label: 'Event', description: 'Keynotes, networking, moments' },
  { value: 'product', label: 'Product', description: 'Hero, detail, lifestyle shots' },
  { value: 'travel', label: 'Travel', description: 'Landscapes, culture, people' },
  { value: 'blank', label: 'Blank', description: 'Start with no preset categories' },
]

interface FirstProjectStepProps {
  data: FirstProjectData
  errors: Partial<Record<keyof FirstProjectData, string>>
  onChange: (data: Partial<FirstProjectData>) => void
}

export function FirstProjectStep({ data, errors, onChange }: FirstProjectStepProps) {
  const selectedPreset = PRESETS.find((p) => p.value === data.projectPreset)

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Create your first project</h2>
        <p className="text-muted">Projects keep your photos and client galleries organised</p>
      </div>

      <Input
        label="Project name"
        placeholder="Sarah & Tom — June 2026"
        value={data.projectName}
        onChange={(e) => onChange({ projectName: e.target.value })}
        error={errors.projectName}
      />

      <div className="space-y-3">
        <p className="text-sm font-medium text-white">Category preset</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESETS.map((preset) => {
            const selected = data.projectPreset === preset.value
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => onChange({ projectPreset: preset.value })}
                className={clsx(
                  'rounded-lg border px-3 py-2.5 text-left transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background',
                  selected
                    ? 'border-accent bg-accent/10'
                    : 'border-view1-border bg-surface hover:border-white/20'
                )}
                aria-pressed={selected}
              >
                <p className={clsx('text-sm font-medium', selected ? 'text-accent' : 'text-white')}>
                  {preset.label}
                </p>
                <p className="text-xs text-muted mt-0.5 leading-tight">{preset.description}</p>
              </button>
            )
          })}
        </div>
        {errors.projectPreset && (
          <p className="text-xs text-red-500" role="alert">
            {errors.projectPreset}
          </p>
        )}
      </div>

      {/* Preview card */}
      {data.projectName && (
        <Card variant="bordered" className="overflow-hidden">
          <Card.Content className="flex items-center gap-4">
            <div className="flex-shrink-0 rounded-lg bg-accent/10 p-3">
              <FolderOpen size={24} className="text-accent" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-white truncate">{data.projectName}</p>
              <p className="text-xs text-muted mt-0.5">
                {selectedPreset?.label ?? 'Blank'} preset &mdash; ready to upload
              </p>
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  )
}
