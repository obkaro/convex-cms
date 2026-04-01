import { useState, useCallback } from 'react'
import { useQuery } from 'convex/react'
import { useApi } from '../../embed/contexts/ApiContext'
import { FieldWrapper } from './FieldWrapper'
import type { BaseFieldProps } from './types'
import { UploadDropzone, type UploadedFile } from '../UploadDropzone'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '../ui/input-group'
import { Button } from '../ui/button'
import { CmsButton } from '../cmsds/CmsButton'
import { CmsEmptyState } from '../cmsds/CmsEmptyState'
import { cn } from '../../lib/cn'
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
  AlertTriangle,
  Expand,
  ArrowLeft,
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

function isUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://')
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
  const api = useApi()
  const fieldId = id || `field-${field.name}`
  const [showPicker, setShowPicker] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('browse')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [previewAsset, setPreviewAsset] = useState<any | null>(null)

  const allowedMimeTypes = field.options?.allowedMimeTypes ?? []

  const valueIsUrl = typeof value === 'string' && isUrl(value)

  const selectedAsset = useQuery(
    api.getMediaAsset,
    value && !valueIsUrl ? { id: value } : 'skip'
  )

  const assetsResult = useQuery(
    api.listMediaAssets,
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
      setPreviewAsset(null)
    },
    [onChange]
  )

  const handleClear = useCallback(() => {
    onChange(null)
  }, [onChange])

  const handleUploadComplete = useCallback((_results: UploadedFile[]) => {
    setActiveTab('browse')
  }, [])

  const handleClosePicker = useCallback(() => {
    setShowPicker(false)
    setPreviewAsset(null)
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
      <div className="flex flex-col gap-2">
        {value && valueIsUrl ? (
          <div className="flex items-center gap-3 rounded-lg border border-yellow-500/50 bg-yellow-500/5 p-3">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
              <img
                src={value}
                alt="Unlinked media"
                className="size-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 shrink-0 text-yellow-500" />
                <p className="truncate text-sm font-medium text-foreground">
                  Unlinked media
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                This image is stored as a URL, not a media library asset. Use the picker to relink it.
              </p>
            </div>
            {!disabled && !readOnly && (
              <div className="flex shrink-0 items-center gap-1">
                <CmsButton
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowPicker(true)}
                  title="Replace with media asset"
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
        ) : value && selectedAsset ? (
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
                    <span>·</span>
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

      <Dialog open={showPicker} onOpenChange={handleClosePicker}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {previewAsset ? (
                <button
                  type="button"
                  onClick={() => setPreviewAsset(null)}
                  className="flex items-center gap-2 text-left"
                >
                  <ArrowLeft className="size-4" />
                  Back to library
                </button>
              ) : (
                'Select Media'
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Preview mode */}
          {previewAsset ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center rounded-lg bg-muted/30 p-2">
                {getMediaTypeFromMimeType(previewAsset.mimeType) === 'image' && previewAsset.url ? (
                  <img
                    src={previewAsset.url}
                    alt={previewAsset.title || previewAsset.name}
                    className="max-h-[60vh] rounded object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                    {getMediaTypeIcon(getMediaTypeFromMimeType(previewAsset.mimeType), 'size-12')}
                    <span className="text-sm">{previewAsset.name}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{previewAsset.name}</span>
                  <span className="mx-2">·</span>
                  <span>{formatFileSize(previewAsset.size ?? 0)}</span>
                </div>
                <Button onClick={() => handleSelect(previewAsset._id)}>
                  Select this file
                </Button>
              </div>
            </div>
          ) : (
            /* Browse / Upload mode */
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

              <TabsContent value="browse" className="mt-4 flex flex-col gap-4">
                <div className="flex gap-2">
                  <InputGroup className="flex-1">
                    <InputGroupAddon align="inline-start">
                      <InputGroupText><Search /></InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      type="search"
                      placeholder="Search files..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </InputGroup>
                  <Select
                    value={typeFilter || 'all'}
                    onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="image">Images</SelectItem>
                        <SelectItem value="video">Videos</SelectItem>
                        <SelectItem value="audio">Audio</SelectItem>
                        <SelectItem value="document">Documents</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {assetsResult === undefined ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    <p className="mt-2 text-sm text-muted-foreground">Loading media...</p>
                  </div>
                ) : filteredAssets && filteredAssets.length > 0 ? (
                  <div className="grid max-h-[420px] grid-cols-3 gap-3 overflow-y-auto pr-1">
                    {filteredAssets.map((asset) => {
                      const assetMediaType = getMediaTypeFromMimeType(asset.mimeType)
                      const isSelected = value === asset._id
                      return (
                        <div
                          key={asset._id}
                          className={cn(
                            'group relative rounded-lg border bg-card transition-all',
                            'hover:border-primary hover:shadow-sm',
                            isSelected && 'border-primary ring-2 ring-primary/20'
                          )}
                        >
                          {/* Image area — click to select */}
                          <button
                            type="button"
                            className="block w-full"
                            onClick={() => handleSelect(asset._id)}
                          >
                            <div
                              className="relative w-full overflow-hidden rounded-t-lg bg-muted"
                              style={{ paddingBottom: '100%' }}
                            >
                              {assetMediaType === 'image' && asset.url ? (
                                <img
                                  src={asset.url}
                                  alt={asset.title || asset.name}
                                  className="absolute inset-0 size-full object-cover"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                  {getMediaTypeIcon(assetMediaType)}
                                </div>
                              )}
                            </div>
                          </button>

                          {/* Expand button — preview before selecting */}
                          {assetMediaType === 'image' && asset.url && (
                            <button
                              type="button"
                              className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-md bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                setPreviewAsset(asset)
                              }}
                              title="Preview full size"
                            >
                              <Expand className="size-3.5" />
                            </button>
                          )}

                          {/* Selection indicator */}
                          {isSelected && (
                            <div className="absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="size-3" />
                            </div>
                          )}

                          {/* Filename */}
                          <div className="p-2">
                            <p className="truncate text-xs font-medium" title={asset.name}>
                              {asset.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatFileSize(asset.size ?? 0)}
                            </p>
                          </div>
                        </div>
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
                  generateUploadUrl={api.generateUploadUrl}
                  createAsset={api.createMediaAsset}
                  onUploadComplete={handleUploadComplete}
                  allowedMimeTypes={allowedMimeTypes}
                  maxFileSize={field.options?.maxFileSize}
                  maxConcurrentUploads={3}
                />
              </TabsContent>
            </Tabs>
          )}

          {!previewAsset && (
            <DialogFooter>
              <CmsButton variant="secondary" onClick={handleClosePicker}>
                Cancel
              </CmsButton>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </FieldWrapper>
  )
}
