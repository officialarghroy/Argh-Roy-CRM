import { getAdmin } from '../_shared/google.ts'
import { refreshTokenIfNeeded } from '../_shared/google.ts'

// Google Calendar push notification endpoint
// Set GOOGLE_WEBHOOK_URL to: https://<project>.supabase.co/functions/v1/google-webhook

Deno.serve(async (req) => {
  const channelId = req.headers.get('X-Goog-Channel-ID')
  const resourceId = req.headers.get('X-Goog-Resource-ID')
  const resourceState = req.headers.get('X-Goog-Resource-State')

  if (resourceState === 'sync') {
    return new Response('OK', { status: 200 })
  }

  if (!channelId || !resourceId) {
    return new Response('Missing headers', { status: 400 })
  }

  try {
    const admin = getAdmin()
    const userId = channelId.replace('crm-', '')

    const { data: integration } = await admin
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google_calendar')
      .single()

    if (!integration) return new Response('OK', { status: 200 })

    const accessToken = await refreshTokenIfNeeded(integration, admin, userId)
    const calendarId = integration.calendar_id ?? 'primary'
    const taskListId = integration.google_task_list_id

    // Pull calendar changes
    const now = new Date()
    const timeMin = new Date(now.getTime() - 7 * 86400000).toISOString()
    const timeMax = new Date(now.getTime() + 30 * 86400000).toISOString()

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&updatedMin=${integration.last_synced_at ?? timeMin}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const { items: gEvents } = await res.json()

    for (const gEvent of gEvents ?? []) {
      if (!gEvent.id || gEvent.status === 'cancelled') continue

      const { data: mapped } = await admin
        .from('calendar_sync_map')
        .select('entity_id')
        .eq('google_event_id', gEvent.id)
        .maybeSingle()

      if (mapped) {
        await admin.from('tasks').update({
          title: gEvent.summary ?? 'Untitled',
          scheduled_at: gEvent.start?.dateTime ?? gEvent.start?.date,
          description: gEvent.description ?? null,
          updated_at: new Date().toISOString(),
        }).eq('id', mapped.entity_id)
      }
    }

    // Pull Google Tasks changes
    if (taskListId && integration.tasks_sync_enabled !== false) {
      const tasksRes = await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?updatedMin=${integration.last_synced_at ?? new Date(0).toISOString()}&showCompleted=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const { items: gTasks } = await tasksRes.json()

      for (const gTask of gTasks ?? []) {
        if (!gTask.id || gTask.deleted) continue

        const { data: mapped } = await admin
          .from('google_tasks_sync_map')
          .select('entity_id')
          .eq('google_task_id', gTask.id)
          .maybeSingle()

        if (mapped) {
          await admin.from('tasks').update({
            title: gTask.title,
            description: gTask.notes ?? null,
            status: gTask.status === 'completed' ? 'done' : 'todo',
            due_date: gTask.due ? gTask.due.split('T')[0] : null,
            updated_at: new Date().toISOString(),
          }).eq('id', mapped.entity_id)
        }
      }
    }

    await admin.from('user_integrations').update({
      last_synced_at: new Date().toISOString(),
    }).eq('id', integration.id)

    return new Response('OK', { status: 200 })
  } catch {
    return new Response('OK', { status: 200 })
  }
})
