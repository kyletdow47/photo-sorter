'use client'

import { useState } from 'react'
import { FolderPlus } from 'lucide-react'
import { Button } from '@/components/common'
import { ProjectCard } from './ProjectCard'
import { NewProjectModal } from './NewProjectModal'
import type { Project, UserTier } from '@/types/supabase'

export interface DashboardShellProps {
  projects: Project[]
  photoCounts: Record<string, number>
  workspaceId: string
  activeProjectCount: number
  tier: UserTier
}

export function DashboardShell({
  projects,
  photoCounts,
  workspaceId,
  activeProjectCount,
  tier,
}: DashboardShellProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-view1-border bg-background/80 backdrop-blur-sm">
        <div className="px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="pl-12 lg:pl-0">
            <h1 className="text-xl font-semibold text-white">Projects</h1>
            <p className="text-sm text-muted mt-0.5">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <FolderPlus className="w-4 h-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Projects grid */}
      <div className="px-6 lg:px-8 py-8">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FolderPlus className="w-16 h-16 text-muted mx-auto mb-6" />
            <h2 className="text-white/60 font-medium mb-2">No projects yet</h2>
            <p className="text-muted text-sm mb-6 max-w-xs">
              Create your first project to start sorting and delivering photos.
            </p>
            <Button onClick={() => setModalOpen(true)} className="gap-2">
              <FolderPlus className="w-4 h-4" />
              New Project
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                photoCount={photoCounts[project.id] ?? 0}
              />
            ))}
          </div>
        )}
      </div>

      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        workspaceId={workspaceId}
        activeProjectCount={activeProjectCount}
        tier={tier}
      />
    </div>
  )
}
