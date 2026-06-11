import { supabase } from '@/lib/supabase'

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const path = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) {
    throw new Error('Upload failed. Make sure the avatars bucket exists in Supabase.')
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}

export async function uploadProjectLogo(
  userId: string,
  projectId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${userId}/${projectId}.${ext}`

  const { error } = await supabase.storage
    .from('project-logos')
    .upload(path, file, { upsert: true })

  if (error) {
    throw new Error('Upload failed. Make sure the project-logos bucket exists in Supabase.')
  }

  const { data } = supabase.storage.from('project-logos').getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}
