import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { ChecklistMode } from '@/types/database'

let modeColumnSupported: boolean | null = null

export function formatSupabaseError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as PostgrestError).message)
  }
  return 'Unknown error'
}

/** Detect whether migration 011 (checklist mode column) has been applied. */
export async function isChecklistModeSupported(): Promise<boolean> {
  if (modeColumnSupported !== null) return modeColumnSupported

  const { error } = await supabase.from('daily_checklist_items').select('mode').limit(1)
  modeColumnSupported = !error
  return modeColumnSupported
}

export async function generateChecklistForDate(dateStr: string, mode: ChecklistMode): Promise<void> {
  if (mode !== 'daily') {
    const supported = await isChecklistModeSupported()
    if (!supported) {
      throw new Error('Alpha Mode requires a database update. Run migration 011_alpha_checklist_mode.sql in Supabase.')
    }
  }

  const supported = await isChecklistModeSupported()
  const { error } = supported
    ? await supabase.rpc('generate_daily_checklist', { p_date: dateStr, p_mode: mode })
    : await supabase.rpc('generate_daily_checklist', { p_date: dateStr })

  if (error) {
    const message = formatSupabaseError(error)
    if (message.includes('get_checklist_date')) {
      throw new Error(
        'Checklist database setup is incomplete. Run migration 013_checklist_get_date_fix.sql in Supabase SQL Editor.'
      )
    }
    throw new Error(message)
  }
}

export async function fetchChecklistItems(dateStr: string, mode: ChecklistMode) {
  const supported = await isChecklistModeSupported()

  let query = supabase
    .from('daily_checklist_items')
    .select('*')
    .eq('date', dateStr)
    .is('deleted_at', null)
    .order('position')

  if (supported) {
    query = query.eq('mode', mode)
  } else if (mode !== 'daily') {
    throw new Error('Alpha Mode requires a database update. Run migration 011_alpha_checklist_mode.sql in Supabase.')
  }

  const { data, error } = await query
  if (error) throw new Error(formatSupabaseError(error))
  return data
}
