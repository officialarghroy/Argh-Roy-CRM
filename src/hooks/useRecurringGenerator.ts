import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { generateRecurringTaskInstances } from '@/lib/generateRecurringTasks'

export function useRecurringGenerator() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    generateRecurringTaskInstances(user.id).catch(console.error)
  }, [user])
}
