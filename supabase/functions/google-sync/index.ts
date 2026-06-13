import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  corsHeaders,
  refreshTokenIfNeeded,
  getAuthUser,
  getAdmin,
  getAllTaskLists,
  pickTaskListForPush,
  googleApi,
} from '../_shared/google.ts'
import {
  buildCrmTaskUpdateFromGoogle,
  crmStatusToGoogle,
  shouldApplyGoogleTaskUpdate,
  type GoogleTaskPayload,
} from '../_shared/taskSync.ts'

interface CrmTask {
  id: string
  user_id: string
  title: string
  description: string | null
  status: string
  scheduled_at: string | null
  due_date: string | null
  duration_minutes: number | null
  deleted_at: string | null
  is_recurring_template: boolean
  completed_at: string | null
  google_task_id: string | null
}

interface GoogleEvent {
  id: string
  status?: string
  summary?: string
  description?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
}

interface GoogleTask extends GoogleTaskPayload {
  id: string
}

function toGoogleDue(task: CrmTask): string | undefined {
  if (task.scheduled_at) return new Date(task.scheduled_at).toISOString()
  if (task.due_date) return `${task.due_date}T00:00:00.000Z`
  return undefined
}

async function syncCalendarPush(
  admin: ReturnType<typeof createClient>,
  userId: string,
  accessToken: string,
  calendarId: string,
  errors: string[]
) {
  let pushed = 0
  const { data: tasks } = await admin
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .eq('is_recurring_template', false)
    .not('scheduled_at', 'is', null)

  for (const task of (tasks ?? []) as CrmTask[]) {
    const { data: existing } = await admin
      .from('calendar_sync_map')
      .select('google_event_id')
      .eq('user_id', userId)
      .eq('entity_type', 'task')
      .eq('entity_id', task.id)
      .maybeSingle()

    const start = new Date(task.scheduled_at!)
    const end = new Date(start.getTime() + (task.duration_minutes ?? 30) * 60000)
    const eventBody = {
      summary: task.title,
      description: task.description ?? '',
      start: { dateTime: start.toISOString(), timeZone: 'UTC' },
      end: { dateTime: end.toISOString(), timeZone: 'UTC' },
    }

    if (existing?.google_event_id) {
      const { error } = await googleApi(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${existing.google_event_id}`,
        accessToken,
        { method: 'PATCH', body: JSON.stringify(eventBody) }
      )
      if (error) errors.push(`Calendar update: ${error}`)
    } else {
      const { data: event, error } = await googleApi<GoogleEvent>(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        accessToken,
        { method: 'POST', body: JSON.stringify(eventBody) }
      )
      if (error) {
        errors.push(`Calendar create: ${error}`)
        continue
      }
      if (event?.id) {
        await admin.from('calendar_sync_map').upsert({
          user_id: userId,
          entity_type: 'task',
          entity_id: task.id,
          google_event_id: event.id,
          google_calendar_id: calendarId,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'user_id,entity_type,entity_id' })
        await admin.from('tasks').update({
          google_event_id: event.id,
          google_calendar_id: calendarId,
        }).eq('id', task.id)
        pushed++
      }
    }
  }
  return pushed
}

async function syncCalendarPull(
  admin: ReturnType<typeof createClient>,
  userId: string,
  accessToken: string,
  calendarId: string,
  errors: string[]
) {
  let pulled = 0
  const now = new Date()
  const timeMin = new Date(now.getTime() - 30 * 86400000).toISOString()
  const timeMax = new Date(now.getTime() + 90 * 86400000).toISOString()

  const { data, error } = await googleApi<{ items?: GoogleEvent[] }>(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&showDeleted=true&maxResults=250`,
    accessToken
  )
  if (error) {
    errors.push(`Calendar pull: ${error}`)
    return 0
  }

  for (const gEvent of data?.items ?? []) {
    if (!gEvent.id) continue

    const { data: mapped } = await admin
      .from('calendar_sync_map')
      .select('entity_id')
      .eq('user_id', userId)
      .eq('google_event_id', gEvent.id)
      .maybeSingle()

    if (gEvent.status === 'cancelled') {
      if (mapped) {
        await admin.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', mapped.entity_id)
      }
      continue
    }

    const scheduledAt = gEvent.start?.dateTime
      ?? (gEvent.start?.date ? `${gEvent.start.date}T09:00:00.000Z` : null)

    if (!scheduledAt) continue

    if (mapped) {
      const { data: crmTask } = await admin
        .from('tasks')
        .select('status')
        .eq('id', mapped.entity_id)
        .maybeSingle()

      const calendarUpdate: Record<string, unknown> = {
        title: gEvent.summary ?? 'Untitled',
        scheduled_at: scheduledAt,
        description: gEvent.description ?? null,
      }
      if (crmTask?.status !== 'done') {
        calendarUpdate.updated_at = new Date().toISOString()
      }
      await admin.from('tasks').update(calendarUpdate).eq('id', mapped.entity_id)
    } else {
      const { data: newTask, error: insertErr } = await admin.from('tasks').insert({
        user_id: userId,
        title: gEvent.summary ?? 'From Google Calendar',
        description: gEvent.description ?? null,
        scheduled_at: scheduledAt,
        status: 'scheduled',
        google_event_id: gEvent.id,
        google_calendar_id: calendarId,
      }).select().single()

      if (insertErr) {
        errors.push(`Calendar import insert: ${insertErr.message}`)
        continue
      }
      if (newTask) {
        await admin.from('calendar_sync_map').insert({
          user_id: userId,
          entity_type: 'task',
          entity_id: newTask.id,
          google_event_id: gEvent.id,
          google_calendar_id: calendarId,
        })
        pulled++
      }
    }
  }
  return pulled
}

async function updateTaskSyncMap(
  admin: ReturnType<typeof createClient>,
  userId: string,
  entityId: string,
  googleTask: GoogleTask,
  pushed: boolean
) {
  const now = new Date().toISOString()
  const patch: Record<string, string> = {
    last_synced_at: now,
  }
  if (googleTask.updated) patch.google_updated_at = googleTask.updated
  if (pushed) patch.last_pushed_at = now

  await admin.from('google_tasks_sync_map').update(patch)
    .eq('user_id', userId)
    .eq('entity_id', entityId)
}

async function syncTasksPush(
  admin: ReturnType<typeof createClient>,
  userId: string,
  accessToken: string,
  taskListId: string,
  errors: string[]
) {
  let pushed = 0
  const { data: tasks } = await admin
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .eq('is_recurring_template', false)

  for (const task of (tasks ?? []) as CrmTask[]) {
    let googleTaskId: string | null = null

    const { data: existing } = await admin
      .from('google_tasks_sync_map')
      .select('google_task_id')
      .eq('user_id', userId)
      .eq('entity_id', task.id)
      .maybeSingle()

    googleTaskId = existing?.google_task_id ?? task.google_task_id ?? null

    const taskBody: Record<string, unknown> = {
      title: task.title,
      notes: task.description ?? '',
      status: crmStatusToGoogle(task.status),
    }
    const due = toGoogleDue(task)
    if (due) taskBody.due = due
    if (task.status === 'done') {
      taskBody.completed = task.completed_at ?? new Date().toISOString()
    }

    if (googleTaskId) {
      const { data: gTask, error } = await googleApi<GoogleTask>(
        `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${googleTaskId}`,
        accessToken,
        { method: 'PATCH', body: JSON.stringify(taskBody) }
      )
      if (error) {
        errors.push(`Tasks update: ${error}`)
      } else if (gTask) {
        if (!existing?.google_task_id) {
          const now = new Date().toISOString()
          await admin.from('google_tasks_sync_map').upsert({
            user_id: userId,
            entity_id: task.id,
            google_task_id: gTask.id,
            google_task_list_id: taskListId,
            last_synced_at: now,
            last_pushed_at: now,
            google_updated_at: gTask.updated ?? now,
          }, { onConflict: 'user_id,entity_id' })
        } else {
          await updateTaskSyncMap(admin, userId, task.id, gTask, true)
        }
        await admin.from('tasks').update({
          google_task_id: gTask.id,
          google_task_list_id: taskListId,
        }).eq('id', task.id)
        pushed++
      }
    } else {
      const { data: gTask, error } = await googleApi<GoogleTask>(
        `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
        accessToken,
        { method: 'POST', body: JSON.stringify(taskBody) }
      )
      if (error) {
        errors.push(`Tasks create: ${error}`)
        continue
      }
      if (gTask?.id) {
        const now = new Date().toISOString()
        await admin.from('google_tasks_sync_map').upsert({
          user_id: userId,
          entity_id: task.id,
          google_task_id: gTask.id,
          google_task_list_id: taskListId,
          last_synced_at: now,
          last_pushed_at: now,
          google_updated_at: gTask.updated ?? now,
        }, { onConflict: 'user_id,entity_id' })
        await admin.from('tasks').update({
          google_task_id: gTask.id,
          google_task_list_id: taskListId,
        }).eq('id', task.id)
        pushed++
      }
    }
  }

  const { data: maps } = await admin
    .from('google_tasks_sync_map')
    .select('entity_id, google_task_id')
    .eq('user_id', userId)

  for (const map of maps ?? []) {
    const { data: t } = await admin.from('tasks').select('deleted_at').eq('id', map.entity_id).single()
    if (t?.deleted_at && map.google_task_id) {
      await googleApi(
        `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${map.google_task_id}`,
        accessToken,
        { method: 'DELETE' }
      )
    }
  }

  return pushed
}

async function syncTasksPull(
  admin: ReturnType<typeof createClient>,
  userId: string,
  accessToken: string,
  taskListId: string,
  errors: string[],
  options?: { updatedMin?: string | null }
) {
  let pulled = 0
  let url = `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?showCompleted=true&showDeleted=true&showHidden=true&maxResults=100`
  if (options?.updatedMin) {
    url += `&updatedMin=${encodeURIComponent(options.updatedMin)}`
  }

  const { data, error } = await googleApi<{ items?: GoogleTask[] }>(url, accessToken)
  if (error) {
    errors.push(`Tasks pull: ${error}`)
    return 0
  }

  for (const gTask of data?.items ?? []) {
    if (!gTask.id) continue

    const { data: mapped } = await admin
      .from('google_tasks_sync_map')
      .select('entity_id, last_pushed_at')
      .eq('user_id', userId)
      .eq('google_task_id', gTask.id)
      .eq('google_task_list_id', taskListId)
      .maybeSingle()

    if (gTask.deleted === true) {
      if (mapped) {
        await admin.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', mapped.entity_id)
      }
      continue
    }

    if (!gTask.title) continue

    if (mapped) {
      const { data: crmTask } = await admin
        .from('tasks')
        .select('updated_at, status')
        .eq('id', mapped.entity_id)
        .maybeSingle()

      if (!shouldApplyGoogleTaskUpdate(crmTask, gTask, { last_pushed_at: mapped.last_pushed_at })) continue

      await admin.from('tasks').update(buildCrmTaskUpdateFromGoogle(gTask)).eq('id', mapped.entity_id)
      await updateTaskSyncMap(admin, userId, mapped.entity_id, gTask, false)
    } else {
      const status = gTask.status === 'completed' ? 'done' : 'todo'
      const dueDate = gTask.due ? gTask.due.split('T')[0] : null
      const scheduledAt = gTask.due ?? null

      const { data: newTask, error: insertErr } = await admin.from('tasks').insert({
        user_id: userId,
        title: gTask.title,
        description: gTask.notes ?? null,
        due_date: dueDate,
        scheduled_at: scheduledAt,
        status,
        completed_at: status === 'done' ? new Date().toISOString() : null,
        google_task_id: gTask.id,
        google_task_list_id: taskListId,
      }).select().single()

      if (insertErr) {
        errors.push(`Tasks import insert: ${insertErr.message}`)
        continue
      }
      if (newTask) {
        await admin.from('google_tasks_sync_map').insert({
          user_id: userId,
          entity_id: newTask.id,
          google_task_id: gTask.id,
          google_task_list_id: taskListId,
          google_updated_at: gTask.updated ?? new Date().toISOString(),
        })
        pulled++
      }
    }
  }
  return pulled
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const user = await getAuthUser(req)
    const admin = getAdmin()
    const body = await req.json().catch(() => ({}))
    const direction = body.direction ?? 'full'
    const incremental = body.incremental === true
    const errors: string[] = []

    const { data: integration } = await admin
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google_calendar')
      .single()

    if (!integration) throw new Error('Google not connected. Go to Settings and connect.')

    const accessToken = await refreshTokenIfNeeded(integration, admin, user.id)
    const calendarId = integration.calendar_id ?? 'primary'

    const taskLists = await getAllTaskLists(accessToken)
    let taskListId = integration.google_task_list_id
    if (!taskListId) {
      taskListId = pickTaskListForPush(taskLists)
      await admin.from('user_integrations').update({ google_task_list_id: taskListId }).eq('id', integration.id)
    }

    let calendarPushed = 0
    let calendarPulled = 0
    let tasksPushed = 0
    let tasksPulled = 0

    if (direction === 'push' || direction === 'full') {
      calendarPushed = await syncCalendarPush(admin, user.id, accessToken, calendarId, errors)
      if (integration.tasks_sync_enabled !== false) {
        tasksPushed = await syncTasksPush(admin, user.id, accessToken, taskListId, errors)
      }
    }

    if (direction === 'pull' || direction === 'full') {
      calendarPulled = await syncCalendarPull(admin, user.id, accessToken, calendarId, errors)
      if (integration.tasks_sync_enabled !== false) {
        const updatedMin = incremental ? (integration.last_synced_at ?? null) : null
        tasksPulled = await syncTasksPull(
          admin,
          user.id,
          accessToken,
          taskListId,
          errors,
          { updatedMin }
        )
      }
    }

    await admin.from('user_integrations').update({
      last_synced_at: new Date().toISOString(),
    }).eq('id', integration.id)

    if (errors.length > 0 && calendarPushed + calendarPulled + tasksPushed + tasksPulled === 0) {
      throw new Error(errors[0])
    }

    return new Response(
      JSON.stringify({
        success: true,
        calendar: { pushed: calendarPushed, pulled: calendarPulled },
        tasks: { pushed: tasksPushed, pulled: tasksPulled },
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
