import { useQuery } from '@tanstack/react-query'
import { addMinutes, parseISO, startOfMonth, endOfMonth, addMonths } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { isOverdue } from '@/lib/recurrence'
import type { CalendarEvent, Task } from '@/types/database'

export function useCalendarEvents(viewDate: Date, options?: { enabled?: boolean }) {
  const { user } = useAuth()
  const rangeStart = startOfMonth(addMonths(viewDate, -1))
  const rangeEnd = endOfMonth(addMonths(viewDate, 1))

  return useQuery({
    queryKey: ['calendar-events', rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: async () => {
      const [tasksRes, checklistRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*, project:projects(name)')
          .is('deleted_at', null)
          .not('scheduled_at', 'is', null)
          .gte('scheduled_at', rangeStart.toISOString())
          .lte('scheduled_at', rangeEnd.toISOString()),
        supabase
          .from('daily_checklist_items')
          .select('*')
          .is('deleted_at', null)
          .not('scheduled_at', 'is', null)
          .gte('scheduled_at', rangeStart.toISOString())
          .lte('scheduled_at', rangeEnd.toISOString()),
      ])

      const events: CalendarEvent[] = []

      for (const task of (tasksRes.data ?? []) as Task[]) {
        if (!task.scheduled_at) continue
        const start = parseISO(task.scheduled_at)
        const end = addMinutes(start, task.duration_minutes ?? 30)
        events.push({
          id: `task-${task.id}`,
          title: task.title,
          start,
          end,
          type: 'task',
          status: task.status,
          overdue: isOverdue(task.scheduled_at, task.status === 'done', task.status),
          projectName: (task.project as { name?: string } | null)?.name,
          resourceId: task.id,
        })
      }

      for (const item of checklistRes.data ?? []) {
        if (!item.scheduled_at) continue
        const start = parseISO(item.scheduled_at)
        const end = addMinutes(start, 15)
        events.push({
          id: `checklist-${item.id}`,
          title: item.title,
          start,
          end,
          type: 'checklist',
          completed: item.completed,
          overdue: isOverdue(item.scheduled_at, item.completed),
          resourceId: item.id,
        })
      }

      return events
    },
    enabled: !!user && (options?.enabled ?? true),
  })
}
