'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { Archive, Images, MoreVertical, Settings, Trash2 } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import type { Project, ProjectStatus } from '@/types/supabase'

const PRESET_COLORS: Record<string, string> = {
  Wedding: 'bg-pink-500/20 text-pink-300',
  Portrait: 'bg-green-500/20 text-green-300',
  Event: 'bg-yellow-500/20 text-yellow-300',
  Product: 'bg-purple-500/20 text-purple-300',
  'Real Estate': 'bg-blue-500/20 text-blue-300',
  Custom: 'bg-gray-500/20 text-gray-300',
}

const STATUS_DOT: Record<ProjectStatus, string> = {
  active: 'bg-green-500',
  archived: 'bg-gray-500',
  published: 'bg-blue-500',
}

const GRADIENT_FALLBACKS = [
  'from-violet-500/30 to-blue-500/30',
  'from-pink-500/30 to-rose-500/30',
  'from-amber-500/30 to-orange-500/30',
  'from-teal-500/30 to-cyan-500/30',
  'from-indigo-500/30 to-purple-500/30',
]

function getGradient(id: string): string {
  const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return GRADIENT_FALLBACKS[sum % GRADIENT_FALLBACKS.length]
}

export interface ProjectCardProps {
  project: Project
  photoCount?: number
}

export function ProjectCard({ project, photoCount = 0 }: ProjectCardProps) {
  const router = useRouter()
  const { removeProject, archiveProject } = useProjectStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function handleCardClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-menu]')) return
    router.push(`/dashboard/project/${project.id}`)
  }

  async function handleArchive(e: React.MouseEvent) {
    e.stopPropagation()
    setMenuOpen(false)
    try {
      await archiveProject(project.id)
    } catch (err) {
      console.error('Failed to archive project:', err)
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return
    setMenuOpen(false)
    setDeleting(true)
    try {
      await removeProject(project.id)
    } catch (err) {
      console.error('Failed to delete project:', err)
      setDeleting(false)
    }
  }

  function handleSettings(e: React.MouseEvent) {
    e.stopPropagation()
    setMenuOpen(false)
    router.push(`/dashboard/project/${project.id}/settings`)
  }

  const presetColor = project.preset
    ? (PRESET_COLORS[project.preset] ?? 'bg-gray-500/20 text-gray-300')
    : null

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open project ${project.name}`}
      className={clsx(
        'group relative rounded-xl border border-view1-border bg-surface cursor-pointer',
        'hover:border-white/20 transition-all duration-150 overflow-hidden',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background',
        deleting && 'opacity-50 pointer-events-none',
      )}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') router.push(`/dashboard/project/${project.id}`)
      }}
    >
      {/* Cover / Gradient */}
      <div
        className={clsx(
          'aspect-video w-full bg-gradient-to-br relative overflow-hidden',
          !project.cover_image_url && getGradient(project.id),
        )}
      >
        {project.cover_image_url && (
          <img
            src={project.cover_image_url}
            alt={project.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Status badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/40 rounded-full px-2 py-1">
          <span className={clsx('w-1.5 h-1.5 rounded-full', STATUS_DOT[project.status])} />
          <span className="text-[10px] text-white/70 capitalize">{project.status}</span>
        </div>

        {/* Options menu */}
        <div data-menu className="absolute top-2 right-2">
          <button
            type="button"
            aria-label="Project options"
            aria-expanded={menuOpen}
            className="p-1.5 rounded-lg bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((prev) => !prev)
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                }}
              />
              <div
                data-menu
                className="absolute right-0 top-8 z-20 w-44 bg-surface border border-view1-border rounded-xl shadow-xl overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  onClick={handleSettings}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                {project.status !== 'archived' && (
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    onClick={handleArchive}
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </button>
                )}
                <div className="h-px bg-view1-border mx-2" />
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-white text-sm leading-snug truncate">{project.name}</h3>

        {presetColor && (
          <span className={clsx('inline-block text-[10px] font-medium px-2 py-0.5 rounded-full', presetColor)}>
            {project.preset}
          </span>
        )}

        <div className="flex items-center gap-2 text-xs text-white/40">
          <Images className="w-3.5 h-3.5" />
          <span>
            {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
          </span>
          <span className="ml-auto">
            {new Date(project.updated_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  )
}
