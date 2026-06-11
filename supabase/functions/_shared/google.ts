import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function googleApi<T>(
  url: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  const text = await res.text()
  let data: Record<string, unknown> = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = {}
    }
  }
  if (!res.ok) {
    const msg = data?.error?.message ?? data?.error ?? res.statusText
    return { data: null, error: String(msg) }
  }
  return { data: data as T, error: null }
}

export async function refreshTokenIfNeeded(
  integration: {
    access_token: string
    refresh_token: string | null
    token_expires_at: string | null
  },
  admin: SupabaseClient,
  userId: string
): Promise<string> {
  if (!integration.refresh_token) return integration.access_token
  if (integration.token_expires_at && new Date(integration.token_expires_at) > new Date()) {
    return integration.access_token
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: integration.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const tokens = await res.json()
  if (tokens.access_token) {
    await admin.from('user_integrations').update({
      access_token: tokens.access_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    }).eq('user_id', userId).eq('provider', 'google_calendar')
    return tokens.access_token
  }
  throw new Error('Failed to refresh Google token. Please reconnect in Settings.')
}

export async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('Missing authorization')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return user
}

export function getAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

export type GoogleTaskList = { id: string; title: string }

export async function getAllTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
  const { data, error } = await googleApi<{ items?: GoogleTaskList[] }>(
    'https://tasks.googleapis.com/tasks/v1/users/@me/lists',
    accessToken
  )
  if (error) throw new Error(`Google Tasks API: ${error}`)
  return data?.items ?? []
}

export function pickTaskListForPush(lists: GoogleTaskList[]): string {
  const preferred = lists.find((list) => {
    const title = list.title.toLowerCase()
    return title === 'my tasks' || title === 'tasks' || title === 'default'
  })
  const list = preferred ?? lists[0]
  if (!list?.id) throw new Error('No Google Tasks list found. Create a list in Google Tasks first.')
  return list.id
}

/** @deprecated use getAllTaskLists + pickTaskListForPush */
export async function getDefaultTaskListId(accessToken: string): Promise<string> {
  const lists = await getAllTaskLists(accessToken)
  return pickTaskListForPush(lists)
}
