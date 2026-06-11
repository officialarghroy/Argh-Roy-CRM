import { useEffect, useRef, useState } from 'react'
import { HiOutlineAdjustments, HiOutlineCamera, HiOutlineTrash } from 'react-icons/hi'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ImageCropEditor } from '@/components/ui/ImageCropEditor'

interface ProjectLogoPickerProps {
  name: string
  logoUrl: string | null
  onLogoUrlChange: (url: string | null) => void
  onFileSelect?: (file: File | null) => void
  uploading?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'h-10 w-10 text-sm rounded-lg',
  md: 'h-14 w-14 text-lg rounded-xl',
  lg: 'h-20 w-20 text-2xl rounded-xl',
}

export function ProjectLogoPicker({
  name,
  logoUrl,
  onLogoUrlChange,
  onFileSelect,
  uploading = false,
  size = 'md',
  className,
}: ProjectLogoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  const [editorSrc, setEditorSrc] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  const closeEditor = () => {
    setEditorSrc(null)
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  const openEditor = (src: string) => {
    setEditorSrc(src)
  }

  const handleFileSelect = (file: File | null) => {
    if (!file) return
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const objectUrl = URL.createObjectURL(file)
    previewUrlRef.current = objectUrl
    openEditor(objectUrl)
  }

  const handleEditorSave = (file: File) => {
    onFileSelect?.(file)
    onLogoUrlChange(URL.createObjectURL(file))
    closeEditor()
  }

  const handleAdjust = () => {
    if (!logoUrl) return
    const cacheBusted = logoUrl.includes('?')
      ? `${logoUrl}&edit=${Date.now()}`
      : `${logoUrl}?edit=${Date.now()}`
    openEditor(cacheBusted)
  }

  const handleRemove = () => {
    onFileSelect?.(null)
    onLogoUrlChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <>
      <div className={cn('flex items-center gap-3', className)}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            'relative shrink-0 overflow-hidden border border-white/18 bg-white/[0.04] flex items-center justify-center font-bold text-accent hover:border-accent/50 transition-colors',
            sizes[size]
          )}
          aria-label="Upload project logo"
        >
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>{name.charAt(0).toUpperCase() || '?'}</span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
            <HiOutlineCamera className="h-5 w-5 text-white" />
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
        />

        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-sm text-accent hover:underline text-left disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : logoUrl ? 'Change logo' : 'Add logo'}
          </button>

          {logoUrl && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted hover:text-foreground justify-start"
                onClick={handleAdjust}
                disabled={uploading}
              >
                <HiOutlineAdjustments className="h-3.5 w-3.5" />
                Adjust
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted hover:text-danger justify-start"
                onClick={handleRemove}
                disabled={uploading}
              >
                <HiOutlineTrash className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          )}
        </div>
      </div>

      {editorSrc && (
        <ImageCropEditor
          imageSrc={editorSrc}
          shape="square"
          title="Adjust project logo"
          saveLabel="Save logo"
          fileName="project-logo.jpg"
          onClose={closeEditor}
          onSave={handleEditorSave}
        />
      )}
    </>
  )
}
