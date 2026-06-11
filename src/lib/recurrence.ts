import { RRule } from 'rrule'
import { addDays, startOfDay, isBefore, parseISO } from 'date-fns'

export function parseRRule(rule: string, dtstart?: Date): RRule | null {
  try {
    return RRule.fromString(rule.includes('DTSTART') ? rule : `DTSTART:${(dtstart ?? new Date()).toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n${rule}`)
  } catch {
    try {
      return RRule.fromString(rule)
    } catch {
      return null
    }
  }
}

export function isOverdue(scheduledAt: string | null, completed: boolean, status?: string): boolean {
  if (completed || status === 'done') return false
  if (!scheduledAt) return false
  return isBefore(parseISO(scheduledAt), new Date())
}

export function generateOccurrences(
  rule: string,
  from: Date,
  to: Date,
  dtstart?: Date
): Date[] {
  const rrule = parseRRule(rule, dtstart)
  if (!rrule) return []
  return rrule.between(startOfDay(from), addDays(to, 1), true)
}

export const RECURRENCE_PRESETS = [
  { label: 'Every day', value: 'FREQ=DAILY' },
  { label: 'Weekdays', value: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
  { label: 'Weekly', value: 'FREQ=WEEKLY' },
  { label: 'Monthly', value: 'FREQ=MONTHLY' },
] as const
