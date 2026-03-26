'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Modal } from '@/components/common'
import { useProjectStore } from '@/stores/projectStore'
import type { UserTier } from '@/types/supabase'

const FREE_TIER_LIMIT = 3

const PRESETS = ['Wedding', 'Portrait', 'Event', 'Product', 'Real Estate', 'Custom'] as const

type Preset = (typeof PRESETS)[number]

export interface NewProjectModalProps {
  open: boolean
  onClose: () => void
  workspaceId: string
  activeProjectCount: number
  tier: UserTier
}

export function NewProjectModal({
  open,
  onClose,
  workspaceId,
  activeProjectCount,
  tier,
}: NewProjectModalProps) {
  const router = useRouter()
  const { addProject } = useProjectStore()
  const [name, setName] = useState('')
  const [preset, setPreset] = useState<Preset | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAtLimit = tier === 'free' && activeProjectCount >= FREE_TIER_LIMIT

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Project name is required')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const project = await addProject({
        workspace_id: workspaceId,
        name: name.trim(),
        preset: preset || null,
        status: 'active',
        cover_image_url: null,
        gallery_public: false,
        gallery_theme: 'dark',
        pricing_model: 'free',
        flat_fee_cents: null,
        per_photo_cents: null,
        currency: 'usd',
      })
      setName('')
      setPreset('')
      onClose()
      router.push(`/dashboard/project/${project.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setName('')
    setPreset('')
    setError(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Project">
      {isAtLimit ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 text-sm text-amber-300">
            <p className="font-medium mb-1">Free plan limit reached</p>
            <p className="text-amber-400/80">
              You&apos;ve reached the {FREE_TIER_LIMIT} active project limit on the Free plan.
              Upgrade to Pro for unlimited projects.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleClose()
                router.push('/dashboard/billing')
              }}
            >
              Upgrade to Pro
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Smith Wedding 2026"
            autoFocus
            required
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/80">Preset</label>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={[
                    'rounded-lg border px-3 py-2 text-sm text-center transition-colors focus:outline-none focus:ring-2 focus:ring-accent',
                    preset === p
                      ? 'border-accent bg-accent/10 text-white'
                      : 'border-view1-border bg-surface text-white/60 hover:border-white/20 hover:text-white/80',
                  ].join(' ')}
                  onClick={() => setPreset((prev) => (prev === p ? '' : p))}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading} disabled={!name.trim()}>
              Create Project
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
