import { supabase } from '@/lib/supabase'

export async function createCollaboratorUser(input: {
  email: string
  password: string
  displayName?: string
}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: {
      email: input.email,
      password: input.password,
      display_name: input.displayName,
    },
  })

  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data.user as { id: string; email: string }
}
