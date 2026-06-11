import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  corsHeaders,
  refreshTokenIfNeeded,
  getAuthUser,
  getAdmin,
  getAllTaskLists,
  googleApi,
} from '../_shared/google.ts'

async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<string | null> {
  const { error } = await googleApi(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    accessToken,
    { method: 'DELETE' }
  )
  return error
}

async function deleteGoogleTask(
  accessToken: string,
  taskListId: string,
  taskId: string
): Promise<string | null> {
  const { error } = await googleApi(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    accessToken,
    { method: 'DELETE' }
  )
  return error
}

async function runInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>
) {
  for (let i = 0; i < items.length; i += batchSize) {
    await Promise.all(items.slice(i, i + batchSize).map(fn))
  }
}

function isNotFoundError(err: string) {
  return err.includes('404') || err.includes('Not Found') || err.includes('notFound')
}

async function deleteAllGoogleTasks(
  accessToken: string,
  errors: string[]
): Promise<number> {
  let deleted = 0
  const lists = await getAllTaskLists(accessToken)

  for (const list of lists) {
    let pageToken: string | undefined

    while (true) {
      const params = new URLSearchParams({
        showCompleted: 'true',
        showHidden: 'true',
        maxResults: '100',
      })
      if (pageToken) params.set('pageToken', pageToken)

      const { data, error } = await googleApi<{
        items?: { id: string }[]
        nextPageToken?: string
      }>(
        `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(list.id)}/tasks?${params}`,
        accessToken
      )

      if (error) {
        if (errors.length < 5) errors.push(`Tasks list "${list.title}": ${error}`)
        break
      }

      const items = (data?.items ?? []).filter((t) => t.id)
      await runInBatches(items, 20, async (task) => {
        const err = await deleteGoogleTask(accessToken, list.id, task.id)
        if (!err || isNotFoundError(err)) {
          deleted++
        } else if (errors.length < 5) {
          errors.push(`Tasks delete: ${err}`)
        }
      })

      pageToken = data?.nextPageToken
      if (!pageToken) break
    }
  }

  return deleted
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const user = await getAuthUser(req)
    const admin = getAdmin()
    const now = new Date().toISOString()
    const today = new Date().toISOString().split('T')[0]
    const errors: string[] = []
    let googleCalendarDeleted = 0
    let googleTasksDeleted = 0

    const { data: integration } = await admin
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google_calendar')
      .maybeSingle()

    if (integration) {
      const accessToken = await refreshTokenIfNeeded(integration, admin, user.id)
      const defaultCalendarId = integration.calendar_id ?? 'primary'

      const deletedEventIds = new Set<string>()
      const calendarDeletes: { calId: string; eventId: string }[] = []

      const { data: calendarMaps } = await admin
        .from('calendar_sync_map')
        .select('google_event_id, google_calendar_id')
        .eq('user_id', user.id)

      for (const map of calendarMaps ?? []) {
        if (!map.google_event_id || deletedEventIds.has(map.google_event_id)) continue
        calendarDeletes.push({
          calId: map.google_calendar_id ?? defaultCalendarId,
          eventId: map.google_event_id,
        })
        deletedEventIds.add(map.google_event_id)
      }

      const { data: linkedTasks } = await admin
        .from('tasks')
        .select('google_event_id, google_calendar_id')
        .eq('user_id', user.id)
        .not('google_event_id', 'is', null)

      for (const task of linkedTasks ?? []) {
        if (!task.google_event_id || deletedEventIds.has(task.google_event_id)) continue
        calendarDeletes.push({
          calId: task.google_calendar_id ?? defaultCalendarId,
          eventId: task.google_event_id,
        })
        deletedEventIds.add(task.google_event_id)
      }

      await runInBatches(calendarDeletes, 15, async ({ calId, eventId }) => {
        const err = await deleteCalendarEvent(accessToken, calId, eventId)
        if (err && !isNotFoundError(err)) {
          if (errors.length < 5) errors.push(`Calendar delete: ${err}`)
        } else {
          googleCalendarDeleted++
        }
      })

      googleTasksDeleted = await deleteAllGoogleTasks(accessToken, errors)
    }

    const { data: googleLinkedTasks } = await admin
      .from('tasks')
      .update({ deleted_at: now })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .or('google_task_id.not.is.null,google_event_id.not.is.null')
      .select('id')

    const { data: scheduledTasks } = await admin
      .from('tasks')
      .update({ deleted_at: now })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .not('scheduled_at', 'is', null)
      .select('id')

    const { data: overdueDueTasks } = await admin
      .from('tasks')
      .update({ deleted_at: now })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .neq('status', 'done')
      .lt('due_date', today)
      .is('scheduled_at', null)
      .select('id')

    const { data: overdueChecklist } = await admin
      .from('daily_checklist_items')
      .update({ deleted_at: now })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .eq('completed', false)
      .lt('date', today)
      .select('id')

    await admin
      .from('tasks')
      .update({
        scheduled_at: null,
        google_event_id: null,
        google_calendar_id: null,
        google_task_id: null,
        google_task_list_id: null,
      })
      .eq('user_id', user.id)
      .is('deleted_at', null)

    await admin
      .from('daily_checklist_items')
      .update({ scheduled_at: null, google_event_id: null })
      .eq('user_id', user.id)
      .is('deleted_at', null)

    await admin.from('calendar_sync_map').delete().eq('user_id', user.id)
    await admin.from('google_tasks_sync_map').delete().eq('user_id', user.id)

    const taskIds = new Set([
      ...(googleLinkedTasks ?? []).map((t) => t.id),
      ...(scheduledTasks ?? []).map((t) => t.id),
      ...(overdueDueTasks ?? []).map((t) => t.id),
    ])

    return new Response(
      JSON.stringify({
        success: true,
        tasksRemoved: taskIds.size,
        checklistRemoved: overdueChecklist?.length ?? 0,
        googleCalendarDeleted,
        googleTasksDeleted,
        syncMapsCleared: true,
        googleConnected: Boolean(integration),
        syncPaused: false,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
