export type ImageCropShape = 'circle' | 'square'

export interface ImageCropState {
  zoom: number
  panX: number
  panY: number
  rotation: number
}

export const DEFAULT_IMAGE_CROP: ImageCropState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  rotation: 0,
}

export type AvatarCropState = ImageCropState
export const DEFAULT_AVATAR_CROP = DEFAULT_IMAGE_CROP

function getRotatedSize(width: number, height: number, rotation: number) {
  const quarterTurns = ((rotation % 360) + 360) % 360
  if (quarterTurns === 90 || quarterTurns === 270) {
    return { width: height, height: width }
  }
  return { width, height }
}

function getCoverScale(viewportSize: number, width: number, height: number) {
  return Math.max(viewportSize / width, viewportSize / height)
}

function clipViewport(ctx: CanvasRenderingContext2D, viewportSize: number, shape: ImageCropShape) {
  const center = viewportSize / 2
  if (shape === 'circle') {
    ctx.beginPath()
    ctx.arc(center, center, center, 0, Math.PI * 2)
    ctx.clip()
    return
  }
  ctx.beginPath()
  ctx.rect(0, 0, viewportSize, viewportSize)
  ctx.clip()
}

export function drawImageCrop(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  state: ImageCropState,
  viewportSize: number,
  shape: ImageCropShape,
  panScale = 1
) {
  const { width, height } = getRotatedSize(image.width, image.height, state.rotation)
  const baseScale = getCoverScale(viewportSize, width, height)
  const scale = baseScale * state.zoom
  const center = viewportSize / 2

  ctx.clearRect(0, 0, viewportSize, viewportSize)
  ctx.save()
  clipViewport(ctx, viewportSize, shape)
  ctx.translate(center + state.panX * panScale, center + state.panY * panScale)
  ctx.rotate((state.rotation * Math.PI) / 180)
  ctx.drawImage(
    image,
    (-image.width * scale) / 2,
    (-image.height * scale) / 2,
    image.width * scale,
    image.height * scale
  )
  ctx.restore()
}

export function drawAvatarCrop(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  state: ImageCropState,
  viewportSize: number,
  panScale = 1
) {
  drawImageCrop(ctx, image, state, viewportSize, 'circle', panScale)
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to load image'))
    image.src = src
  })
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  if (src.startsWith('blob:') || src.startsWith('data:')) {
    return loadImageElement(src)
  }

  const response = await fetch(src)
  if (!response.ok) throw new Error('Failed to load image')
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    return await loadImageElement(objectUrl)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function exportImageCrop(
  image: HTMLImageElement,
  state: ImageCropState,
  viewportSize: number,
  shape: ImageCropShape,
  outputSize = 512
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  const panScale = outputSize / viewportSize
  drawImageCrop(ctx, image, state, outputSize, shape, panScale)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to export image'))),
      'image/jpeg',
      0.92
    )
  })
}

export async function exportAvatarCrop(
  image: HTMLImageElement,
  state: ImageCropState,
  viewportSize: number,
  outputSize = 512
): Promise<Blob> {
  return exportImageCrop(image, state, viewportSize, 'circle', outputSize)
}
