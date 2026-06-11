import type { Profile, UserRole } from '@/types/database'

export function getUserRole(profile: Profile | null | undefined): UserRole {
  return profile?.role === 'collaborator' ? 'collaborator' : 'admin'
}

export function isAdmin(profile: Profile | null | undefined): boolean {
  return getUserRole(profile) === 'admin'
}

export function isCollaborator(profile: Profile | null | undefined): boolean {
  return getUserRole(profile) === 'collaborator'
}

/** Full app UI (checklist, tasks, dashboard, etc.) — admin or flagged collaborator */
export function hasFullAccess(profile: Profile | null | undefined): boolean {
  if (!profile) return false
  return isAdmin(profile) || profile.full_access === true
}

export function canAccessCalendar(profile: Profile | null | undefined): boolean {
  if (!profile) return false
  if (!hasFullAccess(profile)) return false
  return profile.calendar_access !== false
}

export function canUseGoogleSync(profile: Profile | null | undefined): boolean {
  if (!profile) return false
  return profile.google_sync_enabled !== false
}
