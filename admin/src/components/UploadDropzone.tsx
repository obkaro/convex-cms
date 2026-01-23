import { useState, useRef, useCallback } from 'react'
import { useMediaUploadQueue, type UploadQueueFile, type UploadQueueFileStatus } from '@convex-cms/core/react'
import type { FunctionReference } from 'convex/server'

export interface UploadDropzoneProps {
  onUploadComplete: (files: UploadedFile[]) => void
  currentFolderId?: string
  generateUploadUrl: FunctionReference<"mutation">
  createAsset: FunctionReference<"mutation">
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
  return allowedTypes.some(allowed => {
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
      const uploadedFiles: UploadedFile[] = results.map(f => ({
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

  const validateFile = useCallback((file: File): string | null => {
    if (maxFileSize && file.size > maxFileSize) {
      return `File exceeds maximum size of ${formatFileSize(maxFileSize)}`
    }
    if (allowedMimeTypes.length > 0 && !isMimeTypeAllowed(file.type, allowedMimeTypes)) {
      return `File type ${file.type || 'unknown'} is not allowed`
    }
    return null
  }, [maxFileSize, allowedMimeTypes])

  const addFiles = useCallback((files: FileList | File[]) => {
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
  }, [validateFile, queue])

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files)
    }
  }, [addFiles])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addFiles(e.target.files)
      e.target.value = ''
    }
  }, [addFiles])

  const getStatusIcon = (status: UploadQueueFileStatus) => {
    switch (status) {
      case 'complete':
        return (
          <svg className="upload-status-icon upload-status-icon--success" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )
      case 'error':
      case 'cancelled':
        return (
          <svg className="upload-status-icon upload-status-icon--error" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )
      case 'uploading':
        return (
          <div className="upload-status-icon upload-status-icon--loading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
          </div>
        )
      default:
        return (
          <svg className="upload-status-icon upload-status-icon--pending" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
          </svg>
        )
    }
  }

  const completedCount = queue.files.filter(f => f.status === 'complete').length
  const errorCount = queue.files.filter(f => f.status === 'error' || f.status === 'cancelled').length
  const hasCompletedOrFailed = completedCount > 0 || errorCount > 0

  return (
    <div className="upload-dropzone-container">
      {/* Validation Errors */}
      {validationErrors.size > 0 && (
        <div className="upload-validation-errors">
          {Array.from(validationErrors.entries()).map(([filename, error]) => (
            <div key={filename} className="upload-validation-error">
              <strong>{filename}:</strong> {error}
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => setValidationErrors(new Map())}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Dropzone Area */}
      {!queue.isUploading && queue.files.length === 0 && (
        <div
          className={`upload-dropzone-area ${isDragActive ? 'upload-dropzone-area--active' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="upload-dropzone-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="upload-dropzone-text">
            {isDragActive ? 'Drop files here' : 'Drag and drop files here'}
          </p>
          <span className="upload-dropzone-hint">or click to browse</span>
          <span className="upload-dropzone-info">
            Supports images, videos, documents, and more
            {maxFileSize && ` (max ${formatFileSize(maxFileSize)} per file)`}
          </span>
        </div>
      )}

      {/* File Queue */}
      {queue.files.length > 0 && (
        <div className="upload-queue">
          {/* Queue Header */}
          <div className="upload-queue-header">
            <div className="upload-queue-summary">
              <span className="upload-queue-count">
                {queue.files.length} file{queue.files.length !== 1 ? 's' : ''}
              </span>
              {queue.isUploading && (
                <span className="upload-queue-progress">
                  {queue.overallProgress}% complete
                </span>
              )}
              {!queue.isUploading && hasCompletedOrFailed && (
                <span className="upload-queue-stats">
                  {completedCount > 0 && <span className="upload-stat upload-stat--success">{completedCount} completed</span>}
                  {errorCount > 0 && <span className="upload-stat upload-stat--error">{errorCount} failed</span>}
                </span>
              )}
            </div>
            <div className="upload-queue-actions">
              {!queue.isUploading && (
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Add More
                </button>
              )}
              {queue.isUploading && (
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={queue.cancelAll}
                >
                  Cancel All
                </button>
              )}
              {hasCompletedOrFailed && !queue.isUploading && (
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={queue.clearCompleted}
                >
                  Clear Done
                </button>
              )}
            </div>
          </div>

          {/* Overall Progress Bar */}
          {queue.isUploading && (
            <div className="upload-overall-progress">
              <div
                className="upload-overall-progress-bar"
                style={{ width: `${queue.overallProgress}%` }}
              />
            </div>
          )}

          {/* File List */}
          <div className="upload-file-list">
            {queue.files.map((uploadFile: UploadQueueFile) => (
              <div
                key={uploadFile.id}
                className={`upload-file-item upload-file-item--${uploadFile.status}`}
              >
                <div className="upload-file-icon">
                  {getStatusIcon(uploadFile.status)}
                </div>

                <div className="upload-file-info">
                  <span className="upload-file-name" title={uploadFile.file.name}>
                    {uploadFile.file.name}
                  </span>
                  <span className="upload-file-size">
                    {formatFileSize(uploadFile.file.size)}
                  </span>
                  {uploadFile.error && (
                    <span className="upload-file-error">{uploadFile.error}</span>
                  )}
                </div>

                {/* Progress Bar */}
                {uploadFile.status === 'uploading' && (
                  <div className="upload-file-progress">
                    <div
                      className="upload-file-progress-bar"
                      style={{ width: `${uploadFile.progress}%` }}
                    />
                    <span className="upload-file-progress-text">
                      {uploadFile.progress}%
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="upload-file-actions">
                  {uploadFile.status === 'pending' && !queue.isUploading && (
                    <button
                      type="button"
                      className="upload-file-action"
                      onClick={() => queue.cancelFile(uploadFile.id)}
                      title="Remove"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                  {(uploadFile.status === 'uploading' || uploadFile.status === 'pending') && queue.isUploading && (
                    <button
                      type="button"
                      className="upload-file-action"
                      onClick={() => queue.cancelFile(uploadFile.id)}
                      title="Cancel"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                  {(uploadFile.status === 'error' || uploadFile.status === 'cancelled') && !queue.isUploading && (
                    <button
                      type="button"
                      className="upload-file-action upload-file-action--retry"
                      onClick={() => queue.retryFile(uploadFile.id)}
                      title="Retry"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept={allowedMimeTypes.length > 0 ? allowedMimeTypes.join(',') : undefined}
      />
    </div>
  )
}
