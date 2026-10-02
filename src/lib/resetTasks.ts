import { supabase } from '@/lib/supabase'
import { pauseGoogleSync } from '@/lib/googleCalendar'

export interface ResetTasksResult {
  tasks_removed: number
  completions_removed: number
  history_removed: number
}

/**
 * Permanently clears the signed-in user's CRM tasks and task-only history.
 * Google sync is paused first so remote tasks cannot immediately reappear.
 */
export async function resetAllTasks(): Promise<ResetTasksResult> {
  pauseGoogleSync()

  const { data, error } = await supabase.rpc('reset_my_tasks')
  if (error) throw new Error(error.message)

  return data as ResetTasksResult
}
