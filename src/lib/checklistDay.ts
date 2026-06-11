import { subDays } from 'date-fns'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'

export const CHECKLIST_RESET_TZ = 'Asia/Kolkata'
const RESET_HOUR = 3

/** Checklist "today" rolls over at 3:00 AM India time. */
export function getChecklistDateString(now: Date = new Date()): string {
  const zoned = toZonedTime(now, CHECKLIST_RESET_TZ)
  const day = zoned.getHours() < RESET_HOUR ? subDays(zoned, 1) : zoned
  return formatInTimeZone(day, CHECKLIST_RESET_TZ, 'yyyy-MM-dd')
}

export function parseChecklistDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

export function getChecklistDate(now: Date = new Date()): Date {
  return parseChecklistDate(getChecklistDateString(now))
}

export function isChecklistToday(date: Date): boolean {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}` === getChecklistDateString()
}

export function formatChecklistDateLabel(date: Date): string {
  return isChecklistToday(date) ? 'Today' : date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
