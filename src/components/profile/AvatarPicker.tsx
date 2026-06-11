import { useEffect, useRef, useState } from 'react'
import { HiOutlineAdjustments, HiOutlineTrash } from 'react-icons/hi'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { uploadAvatar } from '@/lib/storage'
import { AvatarImageEditor } from '@/components/profile/AvatarImageEditor'

interface AvatarPickerProps {
  userId: string
  displayName: string
  avatarUrl: string
  onAvatarUrlChange: (url: string) => void
  onError?: (message: string) => void
}

export function AvatarPicker({
  userId,
  displayName,
  avatarUrl,
  onAvatarUrlChange,
  onError,
}: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  const [editorSrc, setEditorSrc] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  const openEditor = (src: string) => {
    setEditorSrc(src)
  }

  const closeEditor = () => {
    setEditorSrc(null)
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFileSelect = (file: File | null) => {
    if (!file) return
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const objectUrl = URL.createObjectURL(file)
    previewUrlRef.current = objectUrl
    openEditor(objectUrl)
  }

  const handleEditorSave = async (file: File) => {
    setUploading(true)
    try {
      const url = await uploadAvatar(userId, file)
      onAvatarUrlChange(url)
      closeEditor()
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleAdjust = () => {
    if (!avatarUrl) return
    const cacheBusted = avatarUrl.includes('?') ? `${avatarUrl}&edit=${Date.now()}` : `${avatarUrl}?edit=${Date.now()}`
    openEditor(cacheBusted)
  }

  const handleRemove = () => {
    onAvatarUrlChange('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar src={avatarUrl} name={displayName || 'User'} size="lg" className="h-20 w-20 text-lg" />

        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            />
            <span className="inline-flex items-center gap-2 rounded-lg glass-inset px-3 py-1.5 text-sm transition-colors hover:bg-white/5">
              {uploading ? 'Uploading...' : avatarUrl ? 'Change image' : 'Upload image'}
            </span>
          </label>

          {avatarUrl && (
            <>
              <Button type="button" variant="secondary" size="sm" onClick={handleAdjust} disabled={uploading}>
                <HiOutlineAdjustments className="h-4 w-4" />
                Adjust
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={uploading}>
                <HiOutlineTrash className="h-4 w-4" />
                Remove
              </Button>
            </>
          )}
        </div>
      </div>

      {editorSrc && (
        <AvatarImageEditor
          imageSrc={editorSrc}
          onClose={closeEditor}
          onSave={handleEditorSave}
        />
      )}
    </>
  )
}
