import { useCallback, useEffect, useRef, useState } from 'react'
import { HiOutlineRefresh, HiOutlineZoomIn, HiOutlineZoomOut } from 'react-icons/hi'
import {
  DEFAULT_IMAGE_CROP,
  drawImageCrop,
  exportImageCrop,
  loadImage,
  type ImageCropShape,
  type ImageCropState,
} from '@/lib/imageCrop'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

const VIEWPORT_SIZE = 280

interface ImageCropEditorProps {
  imageSrc: string
  shape?: ImageCropShape
  title: string
  description?: string
  saveLabel?: string
  fileName?: string
  onClose: () => void
  onSave: (file: File) => void
}

export function ImageCropEditor({
  imageSrc,
  shape = 'circle',
  title,
  description = 'Drag to reposition. Use zoom and rotate to frame your image.',
  saveLabel = 'Save image',
  fileName = 'image.jpg',
  onClose,
  onSave,
}: ImageCropEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

  const [crop, setCrop] = useState<ImageCropState>(DEFAULT_IMAGE_CROP)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawImageCrop(ctx, image, crop, VIEWPORT_SIZE, shape)
  }, [crop, shape])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setCrop(DEFAULT_IMAGE_CROP)

    loadImage(imageSrc)
      .then((image) => {
        if (cancelled) return
        imageRef.current = image
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load this image. Try uploading again.')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [imageSrc])

  useEffect(() => {
    redraw()
  }, [redraw, loading])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (loading) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      panX: crop.panX,
      panY: crop.panY,
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag) return
    setCrop((current) => ({
      ...current,
      panX: drag.panX + (event.clientX - drag.x),
      panY: drag.panY + (event.clientY - drag.y),
    }))
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId)
      dragRef.current = null
    }
  }

  const rotate = (delta: number) => {
    setCrop((current) => ({
      ...current,
      rotation: (current.rotation + delta + 360) % 360,
    }))
  }

  const handleSave = async () => {
    const image = imageRef.current
    if (!image) return
    setSaving(true)
    setError('')
    try {
      const blob = await exportImageCrop(image, crop, VIEWPORT_SIZE, shape)
      onSave(new File([blob], fileName, { type: 'image/jpeg' }))
    } catch {
      setError('Failed to save image. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-crop-editor-title"
    >
      <div className="glass-card w-full max-w-md max-h-[90dvh] overflow-y-auto p-5 sm:p-6">
        <div className="mb-5">
          <h2 id="image-crop-editor-title" className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>

        <div className="mx-auto mb-5 flex justify-center">
          <div
            className={cn(
              'border border-white/18 p-1 shadow-lg shadow-black/50',
              shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
            )}
          >
            <canvas
              ref={canvasRef}
              width={VIEWPORT_SIZE}
              height={VIEWPORT_SIZE}
              className={cn(
                'block h-[min(280px,70vw)] w-[min(280px,70vw)] cursor-grab touch-none active:cursor-grabbing',
                shape === 'circle' ? 'rounded-full' : 'rounded-xl'
              )}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          </div>
        </div>

        {loading ? (
          <p className="mb-5 text-center text-sm text-muted">Loading image...</p>
        ) : (
          <div className="mb-5 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted">Zoom</span>
                <span className="text-foreground">{Math.round(crop.zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-lg p-2 text-muted hover:bg-white/8 hover:text-foreground"
                  onClick={() => setCrop((c) => ({ ...c, zoom: Math.max(1, c.zoom - 0.1) }))}
                  aria-label="Zoom out"
                >
                  <HiOutlineZoomOut className="h-5 w-5" />
                </button>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={crop.zoom}
                  onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))}
                  className="h-2 flex-1 accent-accent"
                />
                <button
                  type="button"
                  className="rounded-lg p-2 text-muted hover:bg-white/8 hover:text-foreground"
                  onClick={() => setCrop((c) => ({ ...c, zoom: Math.min(3, c.zoom + 0.1) }))}
                  aria-label="Zoom in"
                >
                  <HiOutlineZoomIn className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => rotate(-90)}>
                <HiOutlineRefresh className="h-4 w-4 -scale-x-100" />
                Rotate left
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => rotate(90)}>
                <HiOutlineRefresh className="h-4 w-4" />
                Rotate right
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCrop(DEFAULT_IMAGE_CROP)}
              >
                Reset
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading || saving || Boolean(error)}>
            {saving ? 'Saving...' : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
