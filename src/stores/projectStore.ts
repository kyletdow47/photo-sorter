'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
} from '@/lib/queries/projects'
import type { Project, ProjectInsert, ProjectUpdate } from '@/types/supabase'

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  loading: boolean
  error: string | null
  fetchProjects: (workspaceId: string) => Promise<void>
  setCurrentProject: (project: Project | null) => void
  addProject: (project: ProjectInsert) => Promise<Project>
  editProject: (id: string, update: ProjectUpdate) => Promise<void>
  removeProject: (id: string) => Promise<void>
  archiveProject: (id: string) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,

  async fetchProjects(workspaceId: string) {
    set({ loading: true, error: null })
    try {
      const supabase = createClient()
      const projects = await getProjects(supabase, workspaceId)
      set({ projects, loading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch projects'
      console.error('fetchProjects error:', error)
      set({ error: message, loading: false })
    }
  },

  setCurrentProject(project: Project | null) {
    set({ currentProject: project })
  },

  async addProject(project: ProjectInsert): Promise<Project> {
    const supabase = createClient()
    const created = await createProject(supabase, project)
    set((state) => ({ projects: [created, ...state.projects] }))
    return created
  },

  async editProject(id: string, update: ProjectUpdate) {
    const supabase = createClient()
    const updated = await updateProject(supabase, id, update)
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? updated : p)),
      currentProject: state.currentProject?.id === id ? updated : state.currentProject,
    }))
  },

  async removeProject(id: string) {
    const supabase = createClient()
    await deleteProject(supabase, id)
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    }))
  },

  async archiveProject(id: string) {
    const supabase = createClient()
    const updated = await updateProject(supabase, id, { status: 'archived' })
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? updated : p)),
      currentProject: state.currentProject?.id === id ? updated : state.currentProject,
    }))
  },
}))
