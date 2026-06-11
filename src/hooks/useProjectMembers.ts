import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ProjectMember, Profile } from '@/types/database'

export function useShareableUsers() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['shareable-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email, avatar_url, role, created_at')
        .neq('id', user!.id)
        .order('display_name')
      if (error) throw error
      return data as Pick<Profile, 'id' | 'display_name' | 'email' | 'avatar_url' | 'role' | 'created_at'>[]
    },
    enabled: !!user,
  })
}

/** @deprecated use useShareableUsers */
export const useCollaborators = useShareableUsers

export function useProjectMembers(projectId: string | undefined, isOwner: boolean) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select('*, profile:profiles(id, display_name, email, avatar_url)')
        .eq('project_id', projectId!)
        .order('created_at')
      if (error) throw error
      return data as ProjectMember[]
    },
    enabled: !!user && isOwner && !!projectId,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
    queryClient.invalidateQueries({ queryKey: ['projects'] })
  }

  const addMember = useMutation({
    mutationFn: async (memberUserId: string) => {
      const { error } = await supabase.from('project_members').insert({
        project_id: projectId!,
        user_id: memberUserId,
        added_by: user!.id,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('project_members').delete().eq('id', memberId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return { ...query, addMember, removeMember }
}
