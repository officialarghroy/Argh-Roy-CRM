import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const REDIRECT_URI = `${window.location.origin}/settings/google-callback`

export const isGoogleCalendarConfigured = Boolean(GOOGLE_CLIENT_ID)

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
].join(' ')

const SYNC_PAUSED_KEY = 'google_sync_paused'

type SyncDirection = 'push' | 'pull' | 'full'

let afterSyncCallbacks: Array<(direction: SyncDirection) => void> = []

export function onAfterGoogleSync(fn: (direction: SyncDirection) => void) {
  afterSyncCallbacks.push(fn)
  return () => {
    afterSyncCallbacks = afterSyncCallbacks.filter((f) => f !== fn)
  }
}

function notifySyncComplete(direction: SyncDirection) {
  afterSyncCallbacks.forEach((fn) => fn(direction))
}

export function getGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

async function parseFunctionError(error: unknown, data?: { error?: string } | null): Promise<string> {
  if (data?.error) return data.error

  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string }
      if (body?.error) return body.error
    } catch {
      // Response body may not be JSON
    }
  }

  if (error instanceof Error && error.message !== 'Edge Function returned a non-2xx status code') {
    return error.message
  }

  return 'Request failed. Check that you are signed in and try connecting again from Settings.'
}

export async function exchangeGoogleCode(code: string) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Your CRM session expired. Sign in again, then reconnect Google from Settings.')
  }

  const { data, error } = await supabase.functions.invoke('google-oauth', {
    body: { code, redirect_uri: REDIRECT_URI },
  })

  if (error) {
    const message = await parseFunctionError(error, data as { error?: string } | null)
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  localStorage.removeItem(SYNC_PAUSED_KEY)
  return data
}

export async function syncGoogle(
  direction: 'push' | 'pull' | 'full' = 'full',
  options?: { setupWatch?: boolean; incremental?: boolean }
) {
  const { data, error } = await supabase.functions.invoke('google-sync', {
    body: {
      direction,
      setup_watch: options?.setupWatch ?? false,
      incremental: options?.incremental ?? direction === 'pull',
    },
  })

  if (error) {
    console.error('[Google sync] invoke error:', error)
    const message = await parseFunctionError(error, data as { error?: string } | null)
    throw new Error(message)
  }
  if (data?.error) {
    console.error('[Google sync] server error:', data.error)
    throw new Error(data.error)
  }

  notifySyncComplete(direction)

  return data as {
    success: boolean
    calendar: { pushed: number; pulled: number }
    tasks: { pushed: number; pulled: number }
    errors?: string[]
  }
}

/** @deprecated use syncGoogle */
export const syncGoogleCalendar = syncGoogle

export function pauseGoogleSync() {
  localStorage.setItem(SYNC_PAUSED_KEY, '1')
}

export function isGoogleSyncPaused(): boolean {
  return localStorage.getItem(SYNC_PAUSED_KEY) === '1'
}

export async function resumeGoogleSync() {
  localStorage.removeItem(SYNC_PAUSED_KEY)
  await supabase
    .from('user_integrations')
    .update({ sync_enabled: true, tasks_sync_enabled: true })
    .eq('provider', 'google_calendar')
}

const LOCAL_EDIT_COOLDOWN_MS = 60_000
let localEditUntil = 0

let syncChain: Promise<void> = Promise.resolve()
let pendingDirection: SyncDirection | null = null

/** Skip background pulls after a local CRM edit so Google can accept the push. */
export function markLocalGoogleEdit() {
  localEditUntil = Date.now() + LOCAL_EDIT_COOLDOWN_MS
}

export function isGooglePullBlocked(): boolean {
  return Date.now() < localEditUntil
}

/** Extend pull block when completing a task locally. */
export function markTaskCompletedLocally() {
  localEditUntil = Date.now() + LOCAL_EDIT_COOLDOWN_MS
}

function mergeDirections(current: SyncDirection, incoming: SyncDirection): SyncDirection {
  if (incoming === 'full') return 'full'
  if (current === 'full') return 'full'
  if (incoming === 'push' || current === 'push') return 'push'
  return 'pull'
}

/** Runs Google sync immediately; concurrent calls are queued and merged. */
export function runGoogleSync(direction: SyncDirection = 'push'): Promise<void> {
  if (isGoogleSyncPaused()) return Promise.resolve()

  pendingDirection = pendingDirection
    ? mergeDirections(pendingDirection, direction)
    : direction

  syncChain = syncChain.then(async () => {
    while (pendingDirection) {
      const next = pendingDirection
      pendingDirection = null
      if (next === 'pull' && isGooglePullBlocked()) continue
      try {
        await syncGoogle(next, { incremental: next === 'pull' })
      } catch (err) {
        console.error('[Google sync] failed:', err)
      }
    }
  })

  return syncChain
}

/** Push local CRM changes to Google. Use `full` only for manual/initial sync. */
export function triggerGoogleSync(direction: SyncDirection = 'push') {
  if (direction === 'push') markLocalGoogleEdit()
  void runGoogleSync(direction)
}

export function triggerGoogleSyncAfterCompletion() {
  markTaskCompletedLocally()
  void runGoogleSync('push')
}

export async function getGoogleIntegration() {
  const { data, error } = await supabase
    .from('user_integrations')
    .select('id, provider, calendar_id, google_task_list_id, sync_enabled, tasks_sync_enabled, last_synced_at, created_at')
    .eq('provider', 'google_calendar')
    .maybeSingle()
  if (error) console.error('[Google] integration fetch error:', error)
  return data
}

export async function disconnectGoogle() {
  await supabase.from('user_integrations').delete().eq('provider', 'google_calendar')
  await supabase.from('calendar_sync_map').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('google_tasks_sync_map').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}
