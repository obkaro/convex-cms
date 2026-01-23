import { useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '~/components/ui/dialog'
import { CmsButton } from '~/components/cmsds/CmsButton'
import { cn } from '~/lib/cn'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Trash2,
  Image,
  Video,
  Music,
  FileText,
  File,
  Copy,
} from 'lucide-react'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

export interface MediaAsset {
  _id: string
  _creationTime: number
  name: string
  title?: string
  description?: string
  altText?: string
  mimeType?: string
  size?: number
  width?: number
  height?: number
  url: string | null
  tags?: string[]
}

type MediaType = 'image' | 'video' | 'audio' | 'document' | 'other'

function getMediaTypeFromMimeType(mimeType?: string): MediaType {
  if (!mimeType) return 'other'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (
    mimeType === 'application/pdf' ||
    mimeType.includes('document') ||
    mimeType.includes('sheet') ||
    mimeType.includes('presentation') ||
    mimeType.startsWith('text/')
  ) {
    return 'document'
  }
  return 'other'
}

interface MediaPreviewModalProps {
  asset: MediaAsset | null
  assets: MediaAsset[]
  currentIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (index: number) => void
  onEdit?: (asset: MediaAsset) => void
  onDelete?: (asset: MediaAsset) => void
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getMediaTypeIcon(type: string, className = 'size-16') {
  const iconProps = { className }
  switch (type) {
    case 'image':
      return <Image {...iconProps} />
    case 'video':
      return <Video {...iconProps} />
    case 'audio':
      return <Music {...iconProps} />
    case 'document':
      return <FileText {...iconProps} />
    default:
      return <File {...iconProps} />
  }
}

export function MediaPreviewModal({
  asset,
  assets,
  currentIndex,
  open,
  onOpenChange,
  onNavigate,
  onEdit,
  onDelete,
}: MediaPreviewModalProps) {
  const canNavigatePrev = currentIndex > 0
  const canNavigateNext = currentIndex < assets.length - 1

  const handlePrev = useCallback(() => {
    if (canNavigatePrev) {
      onNavigate(currentIndex - 1)
    }
  }, [canNavigatePrev, currentIndex, onNavigate])

  const handleNext = useCallback(() => {
    if (canNavigateNext) {
      onNavigate(currentIndex + 1)
    }
  }, [canNavigateNext, currentIndex, onNavigate])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          handlePrev()
          break
        case 'ArrowRight':
          e.preventDefault()
          handleNext()
          break
        case 'Escape':
          e.preventDefault()
          onOpenChange(false)
          break
      }
    },
    [open, handlePrev, handleNext, onOpenChange]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleDownload = useCallback(() => {
    if (!asset?.url) return

    const link = document.createElement('a')
    link.href = asset.url
    link.download = asset.name
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [asset])

  const handleCopyUrl = useCallback(async () => {
    if (!asset?.url) return
    await navigator.clipboard.writeText(asset.url)
  }, [asset])

  if (!asset) return null

  const mediaType = getMediaTypeFromMimeType(asset.mimeType)
  const isImage = mediaType === 'image'
  const hasUrl = Boolean(asset.url)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[90vh] w-[95vw] max-w-[1400px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1400px]"
        showCloseButton={false}
      >
        <VisuallyHidden>
          <DialogTitle>Preview: {asset.name}</DialogTitle>
        </VisuallyHidden>

        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <h2 className="truncate text-lg font-semibold" title={asset.name}>
              {asset.name}
            </h2>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} of {assets.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <CmsButton
              variant="ghost"
              size="icon"
              onClick={handleCopyUrl}
              disabled={!asset.url}
              title="Copy URL"
            >
              <Copy className="size-4" />
            </CmsButton>
            <CmsButton
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              disabled={!asset.url}
              title="Download"
            >
              <Download className="size-4" />
            </CmsButton>
            {onEdit && (
              <CmsButton
                variant="ghost"
                size="icon"
                onClick={() => onEdit(asset)}
                title="Edit"
              >
                <Pencil className="size-4" />
              </CmsButton>
            )}
            {onDelete && (
              <CmsButton
                variant="ghost"
                size="icon"
                onClick={() => onDelete(asset)}
                title="Delete"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </CmsButton>
            )}
            <CmsButton
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              title="Close (Esc)"
            >
              <X className="size-4" />
            </CmsButton>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex min-h-0 flex-1">
          {/* Preview area */}
          <div className="relative flex flex-1 items-center justify-center bg-zinc-950">
            {/* Navigation buttons */}
            {canNavigatePrev && (
              <button
                onClick={handlePrev}
                className="absolute left-4 z-10 flex size-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                title="Previous (←)"
              >
                <ChevronLeft className="size-6" />
              </button>
            )}

            {canNavigateNext && (
              <button
                onClick={handleNext}
                className="absolute right-4 z-10 flex size-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                title="Next (→)"
              >
                <ChevronRight className="size-6" />
              </button>
            )}

            {/* Image preview */}
            {isImage && hasUrl ? (
              <img
                src={asset.url!}
                alt={asset.altText || asset.title || asset.name}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-zinc-400">
                {getMediaTypeIcon(mediaType)}
                <p className="text-sm">
                  {isImage && !hasUrl
                    ? 'Image URL not available'
                    : 'Preview not available for this file type'}
                </p>
                {hasUrl && (
                  <CmsButton variant="secondary" onClick={handleDownload}>
                    <Download className="mr-2 size-4" />
                    Download to view
                  </CmsButton>
                )}
              </div>
            )}
          </div>

          {/* Info sidebar */}
          <div className="w-72 shrink-0 overflow-y-auto border-l bg-background">
            <div className="space-y-4 p-4">
              <h3 className="font-semibold">File Information</h3>

              <InfoRow label="Filename" value={asset.name} />
              {asset.title && <InfoRow label="Title" value={asset.title} />}
              {asset.description && (
                <InfoRow label="Description" value={asset.description} />
              )}
              {asset.altText && <InfoRow label="Alt Text" value={asset.altText} />}

              <div className="border-t pt-4">
                <InfoRow label="Type" value={mediaType} capitalize />
                {asset.mimeType && <InfoRow label="MIME Type" value={asset.mimeType} />}
                <InfoRow label="Size" value={formatFileSize(asset.size)} />
                {asset.width && asset.height && (
                  <InfoRow
                    label="Dimensions"
                    value={`${asset.width} × ${asset.height} px`}
                  />
                )}
              </div>

              <div className="border-t pt-4">
                <InfoRow label="Uploaded" value={formatDate(asset._creationTime)} />
              </div>

              {asset.tags && asset.tags.length > 0 && (
                <div className="border-t pt-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function InfoRow({
  label,
  value,
  capitalize,
}: {
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn('break-words text-sm', capitalize && 'capitalize')}>
        {value}
      </p>
    </div>
  )
}
