import { useState, useRef, useCallback } from 'react'
import {
  useMediaUploadQueue,
  type UploadQueueFile,
  type UploadQueueFileStatus,
} from 'convex-cms/react'
import type { FunctionReference } from 'convex/server'
import { CmsButton } from '~/components/cmsds/CmsButton'
import { cn } from '~/lib/cn'
import { Upload, Check, X, RefreshCw, AlertCircle } from 'lucide-react'

export interface UploadDropzoneProps {
  onUploadComplete: (files: UploadedFile[]) => void
  currentFolderId?: string
  generateUploadUrl: FunctionReference<'mutation'>
  createAsset: FunctionReference<'mutation'>
  maxFileSize?: number
  allowedMimeTypes?: string[]
  maxConcurrentUploads?: number
  onClose?: () => void
  onError?: (error: string, filename: string) => void
}

export interface UploadedFile {
  filename: string
  storageId: string
  success: boolean
  error?: string
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function isMimeTypeAllowed(mimeType: string, allowedTypes: string[]): boolean {
  if (allowedTypes.length === 0) return true
  return allowedTypes.some((allowed) => {
    if (allowed.endsWith('/*')) {
      const category = allowed.slice(0, -2)
      return mimeType.startsWith(category + '/')
    }
    return mimeType === allowed
  })
}

export function UploadDropzone({
  onUploadComplete,
  currentFolderId,
  generateUploadUrl,
  createAsset,
  maxFileSize,
  allowedMimeTypes = [],
  maxConcurrentUploads = 3,
  onError,
}: UploadDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Map<string, string>>(new Map())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const queue = useMediaUploadQueue({
    getUploadUrl: generateUploadUrl,
    createAsset: createAsset,
    maxConcurrent: maxConcurrentUploads,
    metadata: currentFolderId ? { parentId: currentFolderId } : undefined,
    onComplete: (results) => {
      const uploadedFiles: UploadedFile[] = results.map((f) => ({
        filename: f.file.name,
        storageId: f.result ? String((f.result as { _id?: string })._id || '') : '',
        success: f.status === 'complete',
        error: f.error,
      }))
      onUploadComplete(uploadedFiles)
    },
    onError: (file) => {
      onError?.(file.error || 'Upload failed', file.file.name)
    },
  })

  const validateFile = useCallback(
    (file: File): string | null => {
      if (maxFileSize && file.size > maxFileSize) {
        return `File exceeds maximum size of ${formatFileSize(maxFileSize)}`
      }
      if (allowedMimeTypes.length > 0 && !isMimeTypeAllowed(file.type, allowedMimeTypes)) {
        return `File type ${file.type || 'unknown'} is not allowed`
      }
      return null
    },
    [maxFileSize, allowedMimeTypes]
  )

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      const errors = new Map<string, string>()
      const validFiles: File[] = []

      for (const file of fileArray) {
        const error = validateFile(file)
        if (error) {
          errors.set(file.name, error)
        } else {
          validFiles.push(file)
        }
      }

      setValidationErrors(errors)
      if (validFiles.length > 0) {
        queue.addFiles(validFiles)
      }
    },
    [validateFile, queue]
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)
      if (e.dataTransfer.files?.length) {
        addFiles(e.dataTransfer.files)
      }
    },
    [addFiles]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        addFiles(e.target.files)
        e.target.value = ''
      }
    },
    [addFiles]
  )

  const getStatusIcon = (status: UploadQueueFileStatus) => {
    switch (status) {
      case 'complete':
        return <Check className="size-4 text-emerald-500" />
      case 'error':
      case 'cancelled':
        return <X className="size-4 text-red-500" />
      case 'uploading':
        return (
          <div className="size-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
        )
      default:
        return <div className="size-4 rounded-full border-2 border-muted" />
    }
  }

  const completedCount = queue.files.filter((f) => f.status === 'complete').length
  const errorCount = queue.files.filter(
    (f) => f.status === 'error' || f.status === 'cancelled'
  ).length
  const hasCompletedOrFailed = completedCount > 0 || errorCount > 0

  return (
    <div className="space-y-4">
      {validationErrors.size > 0 && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="flex-1 space-y-1">
              {Array.from(validationErrors.entries()).map(([filename, error]) => (
                <p key={filename} className="text-sm text-destructive">
                  <span className="font-medium">{filename}:</span> {error}
                </p>
              ))}
            </div>
          </div>
          <CmsButton
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setValidationErrors(new Map())}
          >
            Dismiss
          </CmsButton>
        </div>
      )}

      {!queue.isUploading && queue.files.length === 0 && (
        <div
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Upload className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {isDragActive ? 'Drop files here' : 'Drag and drop files here'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Supports images, videos, documents, and more
            {maxFileSize && ` (max ${formatFileSize(maxFileSize)} per file)`}
          </p>
        </div>
      )}

      {queue.files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">
                {queue.files.length} file{queue.files.length !== 1 ? 's' : ''}
              </span>
              {queue.isUploading && (
                <span className="text-muted-foreground">
                  {queue.overallProgress}% complete
                </span>
              )}
              {!queue.isUploading && hasCompletedOrFailed && (
                <div className="flex items-center gap-2">
                  {completedCount > 0 && (
                    <span className="text-emerald-600">{completedCount} completed</span>
                  )}
                  {errorCount > 0 && (
                    <span className="text-red-500">{errorCount} failed</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!queue.isUploading && (
                <CmsButton
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Add More
                </CmsButton>
              )}
              {queue.isUploading && (
                <CmsButton variant="outline" size="sm" onClick={queue.cancelAll}>
                  Cancel All
                </CmsButton>
              )}
              {hasCompletedOrFailed && !queue.isUploading && (
                <CmsButton variant="ghost" size="sm" onClick={queue.clearCompleted}>
                  Clear Done
                </CmsButton>
              )}
            </div>
          </div>

          {queue.isUploading && (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${queue.overallProgress}%` }}
              />
            </div>
          )}

          <div className="space-y-2">
            {queue.files.map((uploadFile: UploadQueueFile) => (
              <div
                key={uploadFile.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border bg-card p-3',
                  uploadFile.status === 'error' && 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20',
                  uploadFile.status === 'complete' && 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20'
                )}
              >
                <div className="shrink-0">{getStatusIcon(uploadFile.status)}</div>

                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-medium"
                    title={uploadFile.file.name}
                  >
                    {uploadFile.file.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(uploadFile.file.size)}
                    </span>
                    {uploadFile.error && (
                      <span className="text-xs text-red-500">{uploadFile.error}</span>
                    )}
                  </div>
                </div>

                {uploadFile.status === 'uploading' && (
                  <div className="flex w-20 items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${uploadFile.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {uploadFile.progress}%
                    </span>
                  </div>
                )}

                <div className="shrink-0">
                  {uploadFile.status === 'pending' && !queue.isUploading && (
                    <CmsButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => queue.cancelFile(uploadFile.id)}
                      title="Remove"
                    >
                      <X className="size-4" />
                    </CmsButton>
                  )}
                  {(uploadFile.status === 'uploading' || uploadFile.status === 'pending') &&
                    queue.isUploading && (
                      <CmsButton
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => queue.cancelFile(uploadFile.id)}
                        title="Cancel"
                      >
                        <X className="size-4" />
                      </CmsButton>
                    )}
                  {(uploadFile.status === 'error' || uploadFile.status === 'cancelled') &&
                    !queue.isUploading && (
                      <CmsButton
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => queue.retryFile(uploadFile.id)}
                        title="Retry"
                      >
                        <RefreshCw className="size-4" />
                      </CmsButton>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        accept={allowedMimeTypes.length > 0 ? allowedMimeTypes.join(',') : undefined}
      />
    </div>
  )
}
