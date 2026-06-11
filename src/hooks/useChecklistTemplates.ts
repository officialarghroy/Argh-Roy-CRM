import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { logActivity } from '@/lib/activity'
import type { ChecklistTemplate } from '@/types/database'

export function useChecklistTemplates() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .order('position')
      if (error) throw error
      return data as ChecklistTemplate[]
    },
    enabled: !!user,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['checklist-templates'] })

  const addTemplate = useMutation({
    mutationFn: async (input: { title: string; scheduled_time?: string; recurrence_rule?: string }) => {
      const position = query.data?.length ?? 0
      const { data, error } = await supabase.from('checklist_templates').insert({
        user_id: user!.id,
        title: input.title,
        scheduled_time: input.scheduled_time ?? null,
        recurrence_rule: input.recurrence_rule ?? 'FREQ=DAILY',
        position,
      }).select().single()
      if (error) throw error
      await logActivity('checklist_template', data.id, 'created', { title: input.title })
    },
    onSuccess: invalidate,
  })

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChecklistTemplate> & { id: string }) => {
      const { error } = await supabase.from('checklist_templates').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('checklist_templates').update({ active: false }).eq('id', id)
      if (error) throw error
      await logActivity('checklist_template', id, 'deleted')
    },
    onSuccess: invalidate,
  })

  return { ...query, addTemplate, updateTemplate, deleteTemplate }
}
