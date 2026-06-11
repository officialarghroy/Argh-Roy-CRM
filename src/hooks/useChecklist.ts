import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { logActivity } from '@/lib/activity'
import { triggerGoogleSync } from '@/lib/googleCalendar'
import type { DailyChecklistItem } from '@/types/database'

function scheduledTimeFromItem(scheduledAt: string | null): string | null {
  if (!scheduledAt) return null
  const date = new Date(scheduledAt)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}:00`
}

export function useChecklist(date: Date) {
  const { user, googleSyncEnabled } = useAuth()
  const queryClient = useQueryClient()
  const dateStr = format(date, 'yyyy-MM-dd')

  const query = useQuery({
    queryKey: ['checklist', dateStr],
    queryFn: async () => {
      await supabase.rpc('generate_daily_checklist', { p_date: dateStr })

      const { data, error } = await supabase
        .from('daily_checklist_items')
        .select('*')
        .eq('date', dateStr)
        .is('deleted_at', null)
        .order('position')
      if (error) throw error
      return data as DailyChecklistItem[]
    },
    enabled: !!user,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['checklist'] })
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    queryClient.invalidateQueries({ queryKey: ['activity'] })
  }

  const addItem = useMutation({
    mutationFn: async (title: string) => {
      const position = query.data?.length ?? 0
      const { data, error } = await supabase.from('daily_checklist_items').insert({
        user_id: user!.id,
        title,
        date: dateStr,
        position,
      }).select().single()
      if (error) throw error
      await logActivity('checklist', data.id, 'created', { title })
    },
    onSuccess: () => { invalidate(); if (googleSyncEnabled) triggerGoogleSync('full') },
  })

  const toggleItem = useMutation({
    mutationFn: async ({ id, completed, title }: { id: string; completed: boolean; title?: string }) => {
      const updates: Record<string, unknown> = {
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      }
      const { error } = await supabase.from('daily_checklist_items').update(updates).eq('id', id)
      if (error) throw error
      await logActivity('checklist', id, completed ? 'completed' : 'uncompleted', { title })
    },
    onSuccess: () => { invalidate(); if (googleSyncEnabled) triggerGoogleSync('full') },
  })

  const softDeleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('daily_checklist_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      await logActivity('checklist', id, 'deleted')
    },
    onSuccess: () => { invalidate(); if (googleSyncEnabled) triggerGoogleSync('full') },
  })

  const makeDaily = useMutation({
    mutationFn: async (item: DailyChecklistItem) => {
      const position = query.data?.filter((i) => i.template_id).length ?? 0
      const { data: template, error: templateError } = await supabase
        .from('checklist_templates')
        .insert({
          user_id: user!.id,
          title: item.title,
          recurrence_rule: 'FREQ=DAILY',
          scheduled_time: scheduledTimeFromItem(item.scheduled_at),
          position,
          active: true,
        })
        .select()
        .single()
      if (templateError) throw templateError

      const { error } = await supabase
        .from('daily_checklist_items')
        .update({ template_id: template.id })
        .eq('id', item.id)
      if (error) throw error
      await logActivity('checklist_template', template.id, 'created', { title: item.title })
    },
    onSuccess: () => { invalidate(); if (googleSyncEnabled) triggerGoogleSync('full') },
  })

  const removeDaily = useMutation({
    mutationFn: async (item: DailyChecklistItem) => {
      if (!item.template_id) return
      const { error: templateError } = await supabase
        .from('checklist_templates')
        .update({ active: false })
        .eq('id', item.template_id)
      if (templateError) throw templateError

      const { error } = await supabase
        .from('daily_checklist_items')
        .update({ template_id: null })
        .eq('id', item.id)
      if (error) throw error
      await logActivity('checklist_template', item.template_id, 'deleted')
    },
    onSuccess: () => { invalidate(); if (googleSyncEnabled) triggerGoogleSync('full') },
  })

  return {
    ...query,
    addItem,
    toggleItem,
    deleteItem: softDeleteItem,
    makeDaily,
    removeDaily,
    dateStr,
  }
}
