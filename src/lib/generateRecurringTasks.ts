import { addDays, startOfDay, setHours, setMinutes, isBefore } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { generateOccurrences } from '@/lib/recurrence'
import type { Task } from '@/types/database'

export async function generateRecurringTaskInstances(userId: string) {
  const { data: templates } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('is_recurring_template', true)
    .is('deleted_at', null)

  if (!templates?.length) return

  const now = new Date()
  const windowStart = addDays(startOfDay(now), -30)
  const windowEnd = addDays(now, 14)

  for (const template of templates as Task[]) {
    if (!template.recurrence_rule) continue

    const occurrences = generateOccurrences(
      template.recurrence_rule,
      windowStart,
      windowEnd,
      new Date(template.created_at)
    )

    for (const occ of occurrences) {
      const scheduledAt = template.scheduled_at
        ? setMinutes(setHours(occ, new Date(template.scheduled_at).getHours()), new Date(template.scheduled_at).getMinutes())
        : occ

      const { data: existing } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', userId)
        .eq('recurrence_parent_id', template.id)
        .gte('scheduled_at', startOfDay(scheduledAt).toISOString())
        .lt('scheduled_at', addDays(startOfDay(scheduledAt), 1).toISOString())
        .maybeSingle()

      if (existing) continue

      const isPast = isBefore(scheduledAt, now)

      await supabase.from('tasks').insert({
        user_id: userId,
        title: template.title,
        project_id: template.project_id,
        recurrence_parent_id: template.id,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: template.duration_minutes ?? 30,
        status: isPast ? 'todo' : 'scheduled',
        position: 0,
      })
    }
  }

}
