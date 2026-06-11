import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Sop } from '@/types/database'

export function useSops() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['sops'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sops')
        .select('*')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data as Sop[]
    },
    enabled: !!user,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sops'] })

  const addSop = useMutation({
    mutationFn: async ({ title, content }: { title: string; content?: string }) => {
      const { error } = await supabase.from('sops').insert({
        user_id: user!.id,
        title,
        content: content ?? '',
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const updateSop = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Sop> & { id: string }) => {
      const { error } = await supabase.from('sops').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const deleteSop = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sops').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return { ...query, addSop, updateSop, deleteSop }
}
