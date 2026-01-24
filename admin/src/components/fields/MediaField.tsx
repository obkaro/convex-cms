import { useState, useCallback } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
// IDs are strings when crossing component boundaries
import { FieldWrapper } from './FieldWrapper'
import type { BaseFieldProps } from './types'
import { UploadDropzone, type UploadedFile } from '../UploadDropzone'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { CmsButton } from '~/components/cmsds/CmsButton'
import { CmsEmptyState } from '~/components/cmsds/CmsEmptyState'
import { cn } from '~/lib/cn'
import {
  Image,
  Video,
  Music,
  FileText,
  File,
  Pencil,
  X,
  Upload,
  FolderOpen,
  Search,
  Check,
} from 'lucide-react'

export interface MediaFieldProps extends BaseFieldProps<string | null> {
  placeholder?: string
}

function getMediaTypeIcon(type: string, className = 'size-6') {
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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function MediaField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id,
  placeholder = 'Select media...',
}: MediaFieldProps) {
  const fieldId = id || `field-${field.name}`
  const [showPicker, setShowPicker] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('browse')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')

  const allowedMimeTypes = field.options?.allowedMimeTypes ?? []

  const selectedAsset = useQuery(
    api.media.getAsset,
    value ? { id: value } : 'skip'
  )

  const assetsResult = useQuery(
    api.media.listAssets,
    showPicker
      ? {
          type: typeFilter
            ? (typeFilter as 'image' | 'video' | 'audio' | 'document' | 'other')
            : undefined,
          search: searchQuery || undefined,
          paginationOpts: { numItems: 50, cursor: null },
        }
      : 'skip'
  )

  const handleSelect = useCallback(
    (assetId: string) => {
      onChange(assetId)
      setShowPicker(false)
    },
    [onChange]
  )

  const handleClear = useCallback(() => {
    onChange(null)
  }, [onChange])

  const handleUploadComplete = useCallback((_results: UploadedFile[]) => {
    setActiveTab('browse')
  }, [])

  const filteredAssets = assetsResult?.page?.filter((asset) => {
    if (allowedMimeTypes.length === 0) return true
    return allowedMimeTypes.some((pattern) => {
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -1)
        return asset.mimeType?.startsWith(prefix)
      }
      return asset.mimeType === pattern
    })
  })

  return (
    <FieldWrapper field={field} error={error} className={className} id={fieldId}>
      <div className="space-y-2">
        {value && selectedAsset ? (
          (() => {
            const selectedMediaType = getMediaTypeFromMimeType(selectedAsset.mimeType)
            return (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {selectedMediaType === 'image' && selectedAsset.url ? (
                    <img
                      src={selectedAsset.url}
                      alt={selectedAsset.title || selectedAsset.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="text-muted-foreground">
                      {getMediaTypeIcon(selectedMediaType)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-medium text-foreground"
                    title={selectedAsset.name}
                  >
                    {selectedAsset.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{selectedMediaType}</span>
                    <span>•</span>
                    <span>{formatFileSize(selectedAsset.size ?? 0)}</span>
                  </div>
                </div>
            {!disabled && !readOnly && (
              <div className="flex shrink-0 items-center gap-1">
                <CmsButton
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowPicker(true)}
                  title="Change media"
                >
                  <Pencil className="size-4" />
                </CmsButton>
                <CmsButton
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleClear}
                  title="Remove media"
                >
                  <X className="size-4" />
                </CmsButton>
              </div>
            )}
          </div>
            )
          })()
        ) : (
          <button
            type="button"
            className={cn(
              'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 text-center transition-colors',
              'hover:border-primary/50 hover:bg-muted/50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            onClick={() => setShowPicker(true)}
            disabled={disabled || readOnly}
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Image className="size-5 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">{placeholder}</span>
            <span className="text-xs text-muted-foreground">
              Click to browse or upload media
            </span>
          </button>
        )}
      </div>

      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Media</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="browse" className="flex-1 gap-2">
                <FolderOpen className="size-4" />
                Browse Library
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex-1 gap-2">
                <Upload className="size-4" />
                Upload New
              </TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="mt-4 space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={typeFilter || 'all'}
                  onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="document">Documents</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {assetsResult === undefined ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
                  <p className="mt-2 text-sm text-muted-foreground">Loading media...</p>
                </div>
              ) : filteredAssets && filteredAssets.length > 0 ? (
                <div className="grid max-h-[300px] grid-cols-4 gap-2 overflow-y-auto">
                  {filteredAssets.map((asset) => {
                    const assetMediaType = getMediaTypeFromMimeType(asset.mimeType)
                    return (
                    <button
                      key={asset._id}
                      type="button"
                      className={cn(
                        'group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-all',
                        'hover:border-primary hover:shadow-sm',
                        value === asset._id && 'border-primary ring-2 ring-primary/20'
                      )}
                      onClick={() => handleSelect(asset._id)}
                    >
                      <div className="aspect-square bg-muted">
                        {assetMediaType === 'image' && asset.url ? (
                          <img
                            src={asset.url}
                            alt={asset.title || asset.name}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            {getMediaTypeIcon(assetMediaType)}
                          </div>
                        )}
                      </div>
                      <div className="p-1.5">
                        <p
                          className="truncate text-xs font-medium"
                          title={asset.name}
                        >
                          {asset.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatFileSize(asset.size ?? 0)}
                        </p>
                      </div>
                      {value === asset._id && (
                        <div className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3" />
                        </div>
                      )}
                    </button>
                    )
                  })}
                </div>
              ) : (
                <CmsEmptyState
                  icon={<Image className="size-6" />}
                  title="No media found"
                  description="Upload some media to get started"
                  action={{
                    label: 'Upload Media',
                    onClick: () => setActiveTab('upload'),
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="upload" className="mt-4">
              <UploadDropzone
                generateUploadUrl={api.media.generateUploadUrl}
                createAsset={api.media.createAsset}
                onUploadComplete={handleUploadComplete}
                allowedMimeTypes={allowedMimeTypes}
                maxFileSize={field.options?.maxFileSize}
                maxConcurrentUploads={3}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <CmsButton variant="secondary" onClick={() => setShowPicker(false)}>
              Cancel
            </CmsButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FieldWrapper>
  )
}
