import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface RoleRouteProps {
  children: React.ReactNode
  /** Requires full app access (admin or full_access collaborator) */
  fullAccessOnly?: boolean
  /** Requires calendar permission */
  calendarOnly?: boolean
  redirectTo?: string
}

export function RoleRoute({
  children,
  fullAccessOnly = false,
  calendarOnly = false,
  redirectTo = '/projects',
}: RoleRouteProps) {
  const { loading, hasFullAccess, canAccessCalendar } = useAuth()

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

  return <>{children}</>
}
