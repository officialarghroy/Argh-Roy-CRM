import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { DailyChecklist } from '@/pages/DailyChecklist'

export function HomePage() {
  const { hasFullAccess } = useAuth()
  if (!hasFullAccess) return <Navigate to="/projects" replace />
  return <DailyChecklist />
}
