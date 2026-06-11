import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { slugify } from '@/lib/utils'
import type { Project, ProjectWithStats } from '@/types/database'

export function useProjects() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error

      const { data: tasks } = await supabase.from('tasks').select('project_id, status')

      const withStats: ProjectWithStats[] = (projects as Project[]).map((p) => {
        const projectTasks = tasks?.filter((t) => t.project_id === p.id) ?? []
        return {
          ...p,
          total_tasks: projectTasks.length,
          completed_tasks: projectTasks.filter((t) => t.status === 'done').length,
        }
      })

      return withStats
    },
    enabled: !!user,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] })
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }

  const addProject = useMutation({
    mutationFn: async ({ name, logo_url }: { name: string; logo_url?: string | null }) => {
      const slug = slugify(name)
      const { data, error } = await supabase.from('projects').insert({
        user_id: user!.id,
        name,
        slug,
        logo_url: logo_url ?? null,
      }).select().single()
      if (error) throw error
      return data as Project
    },
    onSuccess: invalidate,
  })

  const updateProject = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { error } = await supabase.from('projects').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return { ...query, addProject, updateProject, deleteProject }
}

export function useProject(slug: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['project', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .single()
      if (error) throw error
      return data as Project
    },
    enabled: !!user && !!slug,
  })
}
