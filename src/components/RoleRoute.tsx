import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { DEFAULT_SIDEBAR_PREFS, type SidebarPrefs } from '@/types/database'

interface RoleRouteProps {
  children: React.ReactNode
  /** Requires full app access (admin or full_access collaborator) */
  fullAccessOnly?: boolean
  /** Requires calendar permission */
  calendarOnly?: boolean
  /** Requires this sidebar pref to be enabled */
  requireSidebarKey?: keyof SidebarPrefs
  redirectTo?: string
}

export function RoleRoute({
  children,
  fullAccessOnly = false,
  calendarOnly = false,
  requireSidebarKey,
  redirectTo = '/projects',
}: RoleRouteProps) {
  const { loading, hasFullAccess, canAccessCalendar, profile } = useAuth()
  const prefs = { ...DEFAULT_SIDEBAR_PREFS, ...profile?.sidebar_prefs }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted">
        Loading...
      </div>
    )
  }

  if (fullAccessOnly && !hasFullAccess) {
    return <Navigate to={redirectTo} replace />
  }

  if (calendarOnly && !canAccessCalendar) {
    return <Navigate to="/dashboard" replace />
  }

  if (requireSidebarKey && prefs[requireSidebarKey] === false) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
