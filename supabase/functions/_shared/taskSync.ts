export interface GoogleTaskPayload {
  id?: string
  title?: string
  notes?: string
  status?: string
  due?: string
  deleted?: boolean
  updated?: string
}

export interface CrmTaskSnapshot {
  updated_at: string
  status: string
}

export interface TaskSyncMeta {
  last_pushed_at?: string | null
}

const TIMESTAMP_BUFFER_MS = 1000

export function googleTaskStatusToCrm(status?: string): 'done' | 'todo' {
  return status === 'completed' ? 'done' : 'todo'
}

export function crmStatusToGoogle(status: string): 'completed' | 'needsAction' {
  return status === 'done' ? 'completed' : 'needsAction'
}

/** Apply Google changes only when Google is newer than CRM (with completion protection). */
export function shouldApplyGoogleTaskUpdate(
  crmTask: CrmTaskSnapshot | null,
  gTask: GoogleTaskPayload,
  syncMeta?: TaskSyncMeta | null
): boolean {
  if (!crmTask) return true

  const googleDone = gTask.status === 'completed'
  const crmDone = crmTask.status === 'done'
  const googleTs = gTask.updated ? new Date(gTask.updated).getTime() : 0
  const crmTs = new Date(crmTask.updated_at).getTime()
  const lastPushTs = syncMeta?.last_pushed_at ? new Date(syncMeta.last_pushed_at).getTime() : 0

  // CRM marked done — don't let stale Google "incomplete" overwrite until push lands
  if (crmDone && !googleDone) {
    if (crmTs > lastPushTs) return false
    if (lastPushTs > 0 && googleTs <= lastPushTs + TIMESTAMP_BUFFER_MS) return false
    if (googleTs > crmTs + TIMESTAMP_BUFFER_MS && googleTs > lastPushTs) return true
    return false
  }

  // Google marked done — always accept if Google is newer
  if (googleDone && !crmDone && googleTs >= crmTs - TIMESTAMP_BUFFER_MS) return true

  if (googleTs > crmTs + TIMESTAMP_BUFFER_MS) return true
  if (crmTs > googleTs + TIMESTAMP_BUFFER_MS) return false

  if (googleDone && !crmDone) return true
  if (crmDone && !googleDone) return false

  return googleTs >= crmTs
}

export function buildCrmTaskUpdateFromGoogle(gTask: GoogleTaskPayload): Record<string, unknown> {
  const dueDate = gTask.due ? gTask.due.split('T')[0] : null
  const scheduledAt = gTask.due ?? null
  const status = googleTaskStatusToCrm(gTask.status)

  return {
    title: gTask.title,
    description: gTask.notes ?? null,
    due_date: dueDate,
    scheduled_at: scheduledAt,
    status,
    completed_at: status === 'done' ? new Date().toISOString() : null,
  }
}
