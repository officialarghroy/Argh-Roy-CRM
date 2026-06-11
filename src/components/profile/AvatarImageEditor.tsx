import { ImageCropEditor } from '@/components/ui/ImageCropEditor'

interface AvatarImageEditorProps {
  imageSrc: string
  onClose: () => void
  onSave: (file: File) => void
}

export function AvatarImageEditor({ imageSrc, onClose, onSave }: AvatarImageEditorProps) {
  return (
    <ImageCropEditor
      imageSrc={imageSrc}
      shape="circle"
      title="Adjust profile picture"
      saveLabel="Save picture"
      fileName="avatar.jpg"
      onClose={onClose}
      onSave={onSave}
    />
  )
}
