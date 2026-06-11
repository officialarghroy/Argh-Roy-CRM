import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ActivityLogEntry } from '@/types/database'

export interface ActivityFilters {
  entityType?: ActivityLogEntry['entity_type']
  action?: ActivityLogEntry['action']
}

export function useActivity(limit = 50, filters?: ActivityFilters) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['activity', limit, filters],
    queryFn: async () => {
      let q = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (filters?.entityType) q = q.eq('entity_type', filters.entityType)
      if (filters?.action) q = q.eq('action', filters.action)

      const { data, error } = await q
      if (error) throw error
      return data as ActivityLogEntry[]
    },
    enabled: !!user,
  })
}

export function useHistorySearch(query: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['history-search', query],
    queryFn: async () => {
      if (!query.trim()) return { tasks: [], activity: [] }

      const [tasksRes, activityRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*, project:projects(name)')
          .textSearch('search_vector', query, { type: 'websearch' })
          .limit(20),
        supabase
          .from('activity_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      return {
        tasks: tasksRes.data ?? [],
        activity: activityRes.data ?? [],
      }
    },
    enabled: !!user && query.trim().length > 1,
  })
}
