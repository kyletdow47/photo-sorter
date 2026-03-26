import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useProjectStore } from './projectStore'
import type { Project } from '@/types/supabase'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

// Mock query functions
const mockGetProjects = vi.fn()
const mockCreateProject = vi.fn()
const mockUpdateProject = vi.fn()
const mockDeleteProject = vi.fn()

vi.mock('@/lib/queries/projects', () => ({
  getProjects: (...args: unknown[]) => mockGetProjects(...args),
  createProject: (...args: unknown[]) => mockCreateProject(...args),
  updateProject: (...args: unknown[]) => mockUpdateProject(...args),
  deleteProject: (...args: unknown[]) => mockDeleteProject(...args),
}))

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'proj-1',
  workspace_id: 'ws-1',
  name: 'Test Project',
  preset: null,
  status: 'active',
  cover_image_url: null,
  gallery_public: false,
  gallery_theme: 'dark',
  pricing_model: 'free',
  flat_fee_cents: null,
  per_photo_cents: null,
  currency: 'usd',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('useProjectStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useProjectStore.setState({
      projects: [],
      currentProject: null,
      loading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  it('initializes with empty state', () => {
    const state = useProjectStore.getState()
    expect(state.projects).toEqual([])
    expect(state.currentProject).toBeNull()
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('fetchProjects sets projects on success', async () => {
    const projects = [makeProject({ id: 'p1' }), makeProject({ id: 'p2' })]
    mockGetProjects.mockResolvedValueOnce(projects)

    await useProjectStore.getState().fetchProjects('ws-1')

    const state = useProjectStore.getState()
    expect(state.projects).toEqual(projects)
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('fetchProjects sets error on failure', async () => {
    mockGetProjects.mockRejectedValueOnce(new Error('Network error'))

    await useProjectStore.getState().fetchProjects('ws-1')

    const state = useProjectStore.getState()
    expect(state.projects).toEqual([])
    expect(state.loading).toBe(false)
    expect(state.error).toContain('Network error')
  })

  it('addProject prepends project to list', async () => {
    const existing = makeProject({ id: 'p1', name: 'Existing' })
    useProjectStore.setState({ projects: [existing] })

    const created = makeProject({ id: 'p2', name: 'New Project' })
    mockCreateProject.mockResolvedValueOnce(created)

    const result = await useProjectStore.getState().addProject({
      workspace_id: 'ws-1',
      name: 'New Project',
      preset: null,
      status: 'active',
      cover_image_url: null,
      gallery_public: false,
      gallery_theme: 'dark',
      pricing_model: 'free',
      flat_fee_cents: null,
      per_photo_cents: null,
      currency: 'usd',
    })

    const state = useProjectStore.getState()
    expect(state.projects[0]).toEqual(created)
    expect(state.projects[1]).toEqual(existing)
    expect(result).toEqual(created)
  })

  it('editProject updates project in list', async () => {
    const project = makeProject({ id: 'p1', name: 'Old Name' })
    useProjectStore.setState({ projects: [project] })

    const updated = { ...project, name: 'New Name' }
    mockUpdateProject.mockResolvedValueOnce(updated)

    await useProjectStore.getState().editProject('p1', { name: 'New Name' })

    expect(useProjectStore.getState().projects[0].name).toBe('New Name')
  })

  it('editProject updates currentProject if it matches', async () => {
    const project = makeProject({ id: 'p1', name: 'Old Name' })
    useProjectStore.setState({ projects: [project], currentProject: project })

    const updated = { ...project, name: 'New Name' }
    mockUpdateProject.mockResolvedValueOnce(updated)

    await useProjectStore.getState().editProject('p1', { name: 'New Name' })

    expect(useProjectStore.getState().currentProject?.name).toBe('New Name')
  })

  it('removeProject removes from list', async () => {
    const p1 = makeProject({ id: 'p1' })
    const p2 = makeProject({ id: 'p2' })
    useProjectStore.setState({ projects: [p1, p2] })
    mockDeleteProject.mockResolvedValueOnce(undefined)

    await useProjectStore.getState().removeProject('p1')

    const state = useProjectStore.getState()
    expect(state.projects).toHaveLength(1)
    expect(state.projects[0].id).toBe('p2')
  })

  it('archiveProject updates status to archived', async () => {
    const project = makeProject({ id: 'p1', status: 'active' })
    useProjectStore.setState({ projects: [project] })

    const archived = { ...project, status: 'archived' as const }
    mockUpdateProject.mockResolvedValueOnce(archived)

    await useProjectStore.getState().archiveProject('p1')

    expect(useProjectStore.getState().projects[0].status).toBe('archived')
  })

  it('setCurrentProject updates currentProject', () => {
    const project = makeProject()
    useProjectStore.getState().setCurrentProject(project)
    expect(useProjectStore.getState().currentProject).toEqual(project)
  })

  it('setCurrentProject can set null', () => {
    const project = makeProject()
    useProjectStore.setState({ currentProject: project })
    useProjectStore.getState().setCurrentProject(null)
    expect(useProjectStore.getState().currentProject).toBeNull()
  })
})
