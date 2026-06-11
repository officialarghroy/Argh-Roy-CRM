import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { logActivity } from '@/lib/activity'
import { triggerGoogleSync } from '@/lib/googleCalendar'
import type { Task, TaskStatus } from '@/types/database'

export function useTasks(
  filters?: { projectId?: string; status?: TaskStatus; includeDeleted?: boolean; includeArchived?: boolean },
  options?: { enabled?: boolean }
) {
  const { user, googleSyncEnabled } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      let q = supabase
        .from('tasks')
        .select('*, project:projects(id, name, slug)')
        .order('position')

      if (!filters?.includeDeleted) q = q.is('deleted_at', null)
      if (!filters?.includeArchived) q = q.is('archived_at', null)
      if (filters?.projectId) q = q.eq('project_id', filters.projectId)
      if (filters?.status) q = q.eq('status', filters.status)

      const { data, error } = await q
      if (error) throw error
      return data as Task[]
    },
    enabled: !!user && (options?.enabled ?? true) && (filters?.projectId === undefined || !!filters.projectId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    queryClient.invalidateQueries({ queryKey: ['activity'] })
  }

  const addTask = useMutation({
    mutationFn: async (task: {
      title: string
      project_id?: string | null
      section_id?: string | null
      status?: TaskStatus
      link_url?: string | null
      scheduled_at?: string | null
      duration_minutes?: number
      recurrence_rule?: string | null
      is_recurring_template?: boolean
      due_date?: string | null
    }) => {
      const position = query.data?.length ?? 0
      const { data, error } = await supabase.from('tasks').insert({
        user_id: user!.id,
        title: task.title,
        project_id: task.project_id ?? null,
        section_id: task.section_id ?? null,
        status: task.status ?? 'todo',
        link_url: task.link_url ?? null,
        scheduled_at: task.scheduled_at ?? null,
        duration_minutes: task.duration_minutes ?? 30,
        recurrence_rule: task.recurrence_rule ?? null,
        is_recurring_template: task.is_recurring_template ?? false,
        due_date: task.due_date ?? null,
        position,
      }).select().single()
      if (error) throw error
      await logActivity('task', data.id, 'created', { title: task.title })
      return data
    },
    onSuccess: () => { invalidate(); if (googleSyncEnabled) triggerGoogleSync('full') },
  })

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const payload: Record<string, unknown> = { ...updates }
      if (updates.status === 'done' && !updates.completed_at) {
        payload.completed_at = new Date().toISOString()
        await supabase.from('task_completions').insert({
          user_id: user!.id,
          task_id: id,
          completed_at: payload.completed_at,
        })
        await logActivity('task', id, 'completed', { title: updates.title })
      }
      if (updates.status && updates.status !== 'done') {
        payload.completed_at = null
      }
      const { error } = await supabase.from('tasks').update(payload).eq('id', id)
      if (error) throw error
      if (updates.status !== 'done') {
        await logActivity('task', id, 'updated', payload as Record<string, unknown>)
      }
    },
    onSuccess: () => { invalidate(); if (googleSyncEnabled) triggerGoogleSync('full') },
  })

  const softDeleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      await logActivity('task', id, 'deleted')
    },
    onSuccess: () => { invalidate(); if (googleSyncEnabled) triggerGoogleSync('full') },
  })

  const restoreTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: null })
        .eq('id', id)
      if (error) throw error
      await logActivity('task', id, 'restored')
    },
    onSuccess: () => { invalidate(); if (googleSyncEnabled) triggerGoogleSync('full') },
  })

  const archiveTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      await logActivity('task', id, 'archived')
    },
    onSuccess: () => { invalidate(); if (googleSyncEnabled) triggerGoogleSync('full') },
  })

  return {
    ...query,
    addTask,
    updateTask,
    deleteTask: softDeleteTask,
    restoreTask,
    archiveTask,
  }
}
