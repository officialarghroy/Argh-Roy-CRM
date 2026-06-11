import { format } from 'date-fns'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface ResetCalendarResult {
  tasksRemoved: number
  checklistRemoved: number
  googleCalendarDeleted: number
  googleTasksDeleted: number
  syncMapsCleared: boolean
  googleConnected: boolean
  syncPaused?: boolean
  errors?: string[]
}

async function parseFunctionError(error: unknown, data?: { error?: string } | null): Promise<string> {
  if (data?.error) return data.error
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string }
      if (body?.error) return body.error
    } catch {
      // ignore
    }
    if (error.context.status === 404) {
      return 'Reset function not deployed. Run ./scripts/deploy-google.sh'
    }
  }
  if (error instanceof Error) return error.message
  return 'Reset failed'
}

async function resetCalendarLocal(): Promise<ResetCalendarResult> {
  const now = new Date().toISOString()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: googleLinkedTasks, error: linkedErr } = await supabase
    .from('tasks')
    .update({ deleted_at: now })
    .is('deleted_at', null)
    .or('google_task_id.not.is.null,google_event_id.not.is.null')
    .select('id')

  if (linkedErr) throw new Error(linkedErr.message)

  const { data: scheduledTasks, error: scheduledErr } = await supabase
    .from('tasks')
    .update({ deleted_at: now })
    .is('deleted_at', null)
    .not('scheduled_at', 'is', null)
    .select('id')

  if (scheduledErr) throw new Error(scheduledErr.message)

  const { data: overdueDueTasks, error: dueErr } = await supabase
    .from('tasks')
    .update({ deleted_at: now })
    .is('deleted_at', null)
    .neq('status', 'done')
    .lt('due_date', today)
    .is('scheduled_at', null)
    .select('id')

  if (dueErr) throw new Error(dueErr.message)

  const { data: overdueChecklist, error: checklistErr } = await supabase
    .from('daily_checklist_items')
    .update({ deleted_at: now })
    .is('deleted_at', null)
    .eq('completed', false)
    .lt('date', today)
    .select('id')

  if (checklistErr) throw new Error(checklistErr.message)

  const { error: clearTaskFieldsErr } = await supabase
    .from('tasks')
    .update({
      scheduled_at: null,
      google_event_id: null,
      google_calendar_id: null,
      google_task_id: null,
      google_task_list_id: null,
    })
    .is('deleted_at', null)

  if (clearTaskFieldsErr) throw new Error(clearTaskFieldsErr.message)

  await supabase
    .from('daily_checklist_items')
    .update({ scheduled_at: null, google_event_id: null })
    .is('deleted_at', null)

  await supabase.from('calendar_sync_map').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('google_tasks_sync_map').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  const taskIds = new Set([
    ...(googleLinkedTasks ?? []).map((t) => t.id),
    ...(scheduledTasks ?? []).map((t) => t.id),
    ...(overdueDueTasks ?? []).map((t) => t.id),
  ])

  return {
    tasksRemoved: taskIds.size,
    checklistRemoved: overdueChecklist?.length ?? 0,
    googleCalendarDeleted: 0,
    googleTasksDeleted: 0,
    syncMapsCleared: true,
    googleConnected: false,
    errors: ['Google remote delete skipped (CRM cleared only).'],
  }
}

/**
 * Deletes synced items from Google Calendar & Tasks, then soft-deletes CRM data and clears sync maps.
 */
export async function resetCalendarAndOverdue(): Promise<ResetCalendarResult> {
  const { data, error } = await supabase.functions.invoke('google-reset', {
    body: {},
  })

  if (error) {
    const message = await parseFunctionError(error, data as { error?: string } | null)
    if (
      message.includes('not deployed') ||
      message.includes('non-2xx') ||
      message.includes('Failed to send')
    ) {
      return resetCalendarLocal()
    }
    throw new Error(message)
  }

  if (data?.error) throw new Error(data.error)

  return data as ResetCalendarResult
}
