import { useState, useRef, useCallback, useEffect } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

// LocalStorage key for persistent retry queue
const UPLOAD_RETRY_STORAGE_KEY = 'convex-cms-upload-retry-queue'

// Types for upload tracking
export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'complete' | 'error' | 'cancelled'

export interface UploadFile {
  id: string
  file: File
  status: UploadStatus
  progress: number // 0-100
  error?: string
  warning?: string // Non-critical warnings (e.g., dimension extraction failed)
  storageId?: string
  retryCount?: number
}

// Persistent retry data structure
interface PersistedUpload {
  id: string
  filename: string
  size: number
  mimeType: string
  error: string
  timestamp: number
  folderId?: string
}

export interface UploadDropzoneProps {
  onUploadComplete: (files: UploadedFile[]) => void
  currentFolderId?: Id<'media_folders'>
  generateUploadUrl: () => Promise<string>
  createAsset: (data: {
    storageId: Id<'_storage'>
    filename: string
    mimeType: string
    size: number
    type: 'image' | 'video' | 'audio' | 'document' | 'other'
    folderId?: Id<'media_folders'>
    width?: number
    height?: number
  }) => Promise<unknown>
  maxFileSize?: number // in bytes
  allowedMimeTypes?: string[] // e.g., ['image/*', 'video/*']
  maxConcurrentUploads?: number
  maxRetries?: number // Maximum automatic retry attempts for transient errors
  onClose?: () => void
  onError?: (error: string, filename: string) => void // Callback when an upload fails
}

export interface UploadedFile {
  filename: string
  storageId: string
  success: boolean
  error?: string
  warning?: string // Non-critical warnings
}

// Get media type from MIME type
function getMediaType(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('text') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation')
  ) return 'document'
  return 'other'
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Generate unique ID for file tracking
function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// Get image dimensions with timeout
function getImageDimensions(file: File, timeoutMs = 5000): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    let objectUrl: string | null = null

    const timeoutId = setTimeout(() => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      reject(new Error('Image dimension extraction timed out'))
    }, timeoutMs)

    img.onload = () => {
      clearTimeout(timeoutId)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    img.onerror = () => {
      clearTimeout(timeoutId)
      reject(new Error('Failed to load image for dimension extraction'))
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }

    objectUrl = URL.createObjectURL(file)
    img.src = objectUrl
  })
}

// Check if an error is transient (worth retrying)
function isTransientError(message: string): boolean {
  const transientPatterns = [
    'network',
    'timeout',
    'timed out',
    'connection',
    'fetch failed',
    'failed to fetch',
    'offline',
    'unavailable',
    'rate limit',
    'too many requests',
    '503',
    '504',
    '429',
    'aborted',
  ]
  const lowerMessage = message.toLowerCase()
  return transientPatterns.some(pattern => lowerMessage.includes(pattern))
}

// Persistent storage helpers for retry queue
function loadPersistedUploads(): PersistedUpload[] {
  try {
    const stored = localStorage.getItem(UPLOAD_RETRY_STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    // Filter out entries older than 24 hours
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000
    return (parsed as PersistedUpload[]).filter(u => u.timestamp > dayAgo)
  } catch {
    return []
  }
}

function savePersistedUploads(uploads: PersistedUpload[]): void {
  try {
    localStorage.setItem(UPLOAD_RETRY_STORAGE_KEY, JSON.stringify(uploads))
  } catch {
    // Storage full or unavailable - silently ignore
  }
}

function addToPersistedUploads(upload: PersistedUpload): void {
  const existing = loadPersistedUploads()
  // Avoid duplicates based on ID
  const filtered = existing.filter(u => u.id !== upload.id)
  savePersistedUploads([...filtered, upload])
}

function removeFromPersistedUploads(id: string): void {
  const existing = loadPersistedUploads()
  savePersistedUploads(existing.filter(u => u.id !== id))
}

function clearPersistedUploads(): void {
  try {
    localStorage.removeItem(UPLOAD_RETRY_STORAGE_KEY)
  } catch {
    // Silently ignore
  }
}

// Check if MIME type matches allowed patterns
function isMimeTypeAllowed(mimeType: string, allowedTypes: string[]): boolean {
  if (allowedTypes.length === 0) return true

  return allowedTypes.some(pattern => {
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -1)
      return mimeType.startsWith(prefix)
    }
    return mimeType === pattern
  })
}

export function UploadDropzone({
  onUploadComplete,
  currentFolderId,
  generateUploadUrl,
  createAsset,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  allowedMimeTypes = [],
  maxConcurrentUploads = 3,
  maxRetries = 2,
  onClose,
  onError,
}: UploadDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [uploadQueue, setUploadQueue] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [persistedFailures, setPersistedFailures] = useState<PersistedUpload[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())
  const activeUploadsRef = useRef(0)

  // Load persisted failures on mount
  useEffect(() => {
    setPersistedFailures(loadPersistedUploads())
  }, [])

  // Cleanup abort controllers on unmount
  useEffect(() => {
    return () => {
      abortControllersRef.current.forEach(controller => controller.abort())
      abortControllersRef.current.clear()
    }
  }, [])

  // Update file status in queue
  const updateFileStatus = useCallback((id: string, updates: Partial<UploadFile>) => {
    setUploadQueue(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }, [])

  // Validate file before adding to queue
  const validateFile = useCallback((file: File): string | null => {
    if (maxFileSize && file.size > maxFileSize) {
      return `File exceeds maximum size of ${formatFileSize(maxFileSize)}`
    }
    if (allowedMimeTypes.length > 0 && !isMimeTypeAllowed(file.type, allowedMimeTypes)) {
      return `File type ${file.type || 'unknown'} is not allowed`
    }
    return null
  }, [maxFileSize, allowedMimeTypes])

  // Upload a single file with progress tracking
  const uploadFile = useCallback(async (uploadFile: UploadFile): Promise<UploadedFile> => {
    const { id, file, retryCount = 0 } = uploadFile
    let warning: string | undefined

    // Create abort controller BEFORE any async operations
    const abortController = new AbortController()
    abortControllersRef.current.set(id, abortController)

    // Helper to check if cancelled
    const isCancelled = () => abortController.signal.aborted

    try {
      // Update status to uploading
      updateFileStatus(id, { status: 'uploading', progress: 0 })

      // Check for cancellation before URL generation
      if (isCancelled()) {
        throw new Error('Upload cancelled')
      }

      // Generate upload URL (can be cancelled)
      let uploadUrl: string
      try {
        uploadUrl = await generateUploadUrl()
      } catch (error) {
        if (isCancelled()) {
          throw new Error('Upload cancelled')
        }
        throw error
      }

      // Check for cancellation after URL generation
      if (isCancelled()) {
        throw new Error('Upload cancelled')
      }

      // Upload with XHR for progress tracking
      const storageId = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        // Track if XHR has already completed to prevent double-handling
        let completed = false

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && !completed) {
            const progress = Math.round((event.loaded / event.total) * 100)
            updateFileStatus(id, { progress })
          }
        })

        xhr.addEventListener('load', () => {
          if (completed) return
          completed = true

          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText)
              resolve(response.storageId)
            } catch {
              reject(new Error('Invalid response from server'))
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        })

        xhr.addEventListener('error', () => {
          if (completed) return
          completed = true
          reject(new Error('Network error during upload'))
        })

        xhr.addEventListener('abort', () => {
          if (completed) return
          completed = true
          reject(new Error('Upload cancelled'))
        })

        xhr.addEventListener('timeout', () => {
          if (completed) return
          completed = true
          reject(new Error('Upload timed out'))
        })

        // Handle abort signal - connect to XHR abort
        const abortHandler = () => {
          if (!completed) {
            xhr.abort()
          }
        }
        abortController.signal.addEventListener('abort', abortHandler)

        // Set a reasonable timeout (5 minutes for large files)
        xhr.timeout = 5 * 60 * 1000

        xhr.open('POST', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      // Check for cancellation after upload
      if (isCancelled()) {
        throw new Error('Upload cancelled')
      }

      // Update status to processing (creating asset record)
      updateFileStatus(id, { status: 'processing', progress: 100 })

      // Get image dimensions if applicable - with user notification on failure
      let width: number | undefined
      let height: number | undefined
      if (file.type.startsWith('image/')) {
        try {
          const dimensions = await getImageDimensions(file)
          width = dimensions.width
          height = dimensions.height
        } catch (dimError) {
          // Don't fail the upload, but warn the user
          warning = `Image dimensions could not be extracted: ${dimError instanceof Error ? dimError.message : 'Unknown error'}`
          updateFileStatus(id, { warning })
        }
      }

      // Check for cancellation before asset creation
      if (isCancelled()) {
        throw new Error('Upload cancelled')
      }

      // Create asset record
      await createAsset({
        storageId: storageId as Id<'_storage'>,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        type: getMediaType(file.type),
        folderId: currentFolderId,
        width,
        height,
      })

      // Update status to complete
      updateFileStatus(id, { status: 'complete', storageId, warning })

      // Remove from persisted failures if it was there
      removeFromPersistedUploads(id)

      // Cleanup abort controller
      abortControllersRef.current.delete(id)

      return {
        filename: file.name,
        storageId,
        success: true,
        warning,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      const wasCancelled = errorMessage === 'Upload cancelled' || isCancelled()

      // Check if we should auto-retry (for transient errors only)
      if (!wasCancelled && isTransientError(errorMessage) && retryCount < maxRetries) {
        // Schedule automatic retry with exponential backoff
        const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 10000)
        updateFileStatus(id, {
          status: 'pending',
          progress: 0,
          error: `Retrying in ${backoffMs / 1000}s... (${errorMessage})`,
          retryCount: retryCount + 1,
        })

        // Cleanup current abort controller
        abortControllersRef.current.delete(id)

        // Return a pending result - the queue processor will pick it up
        return {
          filename: file.name,
          storageId: '',
          success: false,
          error: `Auto-retrying: ${errorMessage}`,
        }
      }

      updateFileStatus(id, {
        status: wasCancelled ? 'cancelled' : 'error',
        error: errorMessage,
        retryCount,
      })

      // Notify parent of error
      if (!wasCancelled && onError) {
        onError(errorMessage, file.name)
      }

      // Persist failed upload for potential retry after page reload
      if (!wasCancelled) {
        addToPersistedUploads({
          id,
          filename: file.name,
          size: file.size,
          mimeType: file.type,
          error: errorMessage,
          timestamp: Date.now(),
          folderId: currentFolderId,
        })
        setPersistedFailures(loadPersistedUploads())
      }

      // Cleanup abort controller
      abortControllersRef.current.delete(id)

      return {
        filename: file.name,
        storageId: '',
        success: false,
        error: errorMessage,
      }
    }
  }, [generateUploadUrl, createAsset, currentFolderId, updateFileStatus, maxRetries, onError])

  // Process upload queue
  const processQueue = useCallback(async () => {
    const pendingFiles = uploadQueue.filter(f => f.status === 'pending')

    if (pendingFiles.length === 0 && activeUploadsRef.current === 0) {
      setIsUploading(false)

      // Collect results
      const results: UploadedFile[] = uploadQueue.map(f => ({
        filename: f.file.name,
        storageId: f.storageId || '',
        success: f.status === 'complete',
        error: f.error,
        warning: f.warning,
      }))

      // Notify completion after a brief delay to show final state
      setTimeout(() => {
        onUploadComplete(results)
      }, 500)

      return
    }

    // Start uploads up to max concurrent limit
    while (activeUploadsRef.current < maxConcurrentUploads && pendingFiles.length > 0) {
      const nextFile = pendingFiles.shift()
      if (!nextFile) break

      activeUploadsRef.current++

      uploadFile(nextFile).finally(() => {
        activeUploadsRef.current--
        // Continue processing queue
        processQueue()
      })
    }
  }, [uploadQueue, maxConcurrentUploads, uploadFile, onUploadComplete])

  // Start uploading when queue changes and not already uploading
  useEffect(() => {
    if (uploadQueue.length > 0 && !isUploading && uploadQueue.some(f => f.status === 'pending')) {
      setIsUploading(true)
      processQueue()
    }
  }, [uploadQueue, isUploading, processQueue])

  // Add files to queue
  const addFilesToQueue = useCallback((files: FileList | File[]) => {
    const newFiles: UploadFile[] = Array.from(files).map(file => {
      const error = validateFile(file)
      return {
        id: generateFileId(),
        file,
        status: error ? 'error' as const : 'pending' as const,
        progress: 0,
        error: error || undefined,
      }
    })

    setUploadQueue(prev => [...prev, ...newFiles])
  }, [validateFile])

  // Handle file input change
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      addFilesToQueue(files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [addFilesToQueue])

  // Handle drag events
  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    // Only deactivate if leaving the dropzone entirely
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDragActive(false)
    }
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragActive(false)

    const files = event.dataTransfer.files
    if (files && files.length > 0) {
      addFilesToQueue(files)
    }
  }, [addFilesToQueue])

  // Cancel a specific file upload
  const cancelUpload = useCallback((id: string) => {
    const controller = abortControllersRef.current.get(id)
    if (controller) {
      controller.abort()
    } else {
      // File is still pending, just mark as cancelled
      updateFileStatus(id, { status: 'cancelled', error: 'Upload cancelled' })
    }
  }, [updateFileStatus])

  // Cancel all uploads
  const cancelAllUploads = useCallback(() => {
    abortControllersRef.current.forEach(controller => controller.abort())
    setUploadQueue(prev => prev.map(f =>
      f.status === 'pending' || f.status === 'uploading'
        ? { ...f, status: 'cancelled' as const, error: 'Upload cancelled' }
        : f
    ))
  }, [])

  // Remove file from queue (only if not uploading)
  const removeFromQueue = useCallback((id: string) => {
    setUploadQueue(prev => prev.filter(f => f.id !== id))
  }, [])

  // Retry failed upload
  const retryUpload = useCallback((id: string) => {
    updateFileStatus(id, { status: 'pending', progress: 0, error: undefined, retryCount: 0 })
    // Remove from persisted failures since we're retrying now
    removeFromPersistedUploads(id)
    setPersistedFailures(loadPersistedUploads())
  }, [updateFileStatus])

  // Clear all persisted failures
  const clearPersistedFailures = useCallback(() => {
    clearPersistedUploads()
    setPersistedFailures([])
  }, [])

  // Dismiss a single persisted failure
  const dismissPersistedFailure = useCallback((id: string) => {
    removeFromPersistedUploads(id)
    setPersistedFailures(loadPersistedUploads())
  }, [])

  // Clear completed/failed uploads
  const clearCompleted = useCallback(() => {
    setUploadQueue(prev => prev.filter(f => f.status === 'pending' || f.status === 'uploading' || f.status === 'processing'))
  }, [])

  // Calculate overall progress
  const overallProgress = uploadQueue.length > 0
    ? Math.round(uploadQueue.reduce((sum, f) => sum + f.progress, 0) / uploadQueue.length)
    : 0

  const completedCount = uploadQueue.filter(f => f.status === 'complete').length
  const errorCount = uploadQueue.filter(f => f.status === 'error' || f.status === 'cancelled').length
  const hasCompletedOrFailed = completedCount > 0 || errorCount > 0

  // Get status icon for a file
  const getStatusIcon = (status: UploadStatus) => {
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
      case 'processing':
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

  return (
    <div className="upload-dropzone-container">
      {/* Dropzone Area */}
      {!isUploading && uploadQueue.length === 0 && (
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
      {uploadQueue.length > 0 && (
        <div className="upload-queue">
          {/* Queue Header */}
          <div className="upload-queue-header">
            <div className="upload-queue-summary">
              <span className="upload-queue-count">
                {uploadQueue.length} file{uploadQueue.length !== 1 ? 's' : ''}
              </span>
              {isUploading && (
                <span className="upload-queue-progress">
                  {overallProgress}% complete
                </span>
              )}
              {!isUploading && hasCompletedOrFailed && (
                <span className="upload-queue-stats">
                  {completedCount > 0 && <span className="upload-stat upload-stat--success">{completedCount} completed</span>}
                  {errorCount > 0 && <span className="upload-stat upload-stat--error">{errorCount} failed</span>}
                </span>
              )}
            </div>
            <div className="upload-queue-actions">
              {!isUploading && (
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Add More
                </button>
              )}
              {isUploading && (
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={cancelAllUploads}
                >
                  Cancel All
                </button>
              )}
              {hasCompletedOrFailed && !isUploading && (
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={clearCompleted}
                >
                  Clear Done
                </button>
              )}
            </div>
          </div>

          {/* Overall Progress Bar */}
          {isUploading && (
            <div className="upload-overall-progress">
              <div
                className="upload-overall-progress-bar"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          )}

          {/* File List */}
          <div className="upload-file-list">
            {uploadQueue.map((uploadFile) => (
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
                    {uploadFile.retryCount ? ` (retry ${uploadFile.retryCount})` : ''}
                  </span>
                  {uploadFile.error && (
                    <span className="upload-file-error">{uploadFile.error}</span>
                  )}
                  {uploadFile.warning && !uploadFile.error && (
                    <span className="upload-file-warning" title={uploadFile.warning}>
                      ⚠ {uploadFile.warning}
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                  <div className="upload-file-progress">
                    <div
                      className="upload-file-progress-bar"
                      style={{ width: `${uploadFile.progress}%` }}
                    />
                    <span className="upload-file-progress-text">
                      {uploadFile.status === 'processing' ? 'Processing...' : `${uploadFile.progress}%`}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="upload-file-actions">
                  {uploadFile.status === 'pending' && !isUploading && (
                    <button
                      type="button"
                      className="upload-file-action"
                      onClick={() => removeFromQueue(uploadFile.id)}
                      title="Remove"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                  {(uploadFile.status === 'uploading' || uploadFile.status === 'pending') && isUploading && (
                    <button
                      type="button"
                      className="upload-file-action"
                      onClick={() => cancelUpload(uploadFile.id)}
                      title="Cancel"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                  {(uploadFile.status === 'error' || uploadFile.status === 'cancelled') && !isUploading && (
                    <button
                      type="button"
                      className="upload-file-action upload-file-action--retry"
                      onClick={() => retryUpload(uploadFile.id)}
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

      {/* Persisted Failures (from previous sessions) */}
      {persistedFailures.length > 0 && uploadQueue.length === 0 && (
        <div className="upload-persisted-failures">
          <div className="upload-persisted-header">
            <span className="upload-persisted-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {persistedFailures.length} previous upload{persistedFailures.length !== 1 ? 's' : ''} failed
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={clearPersistedFailures}
            >
              Dismiss All
            </button>
          </div>
          <ul className="upload-persisted-list">
            {persistedFailures.map((failure) => (
              <li key={failure.id} className="upload-persisted-item">
                <div className="upload-persisted-info">
                  <span className="upload-persisted-filename">{failure.filename}</span>
                  <span className="upload-persisted-error">{failure.error}</span>
                </div>
                <button
                  type="button"
                  className="upload-file-action"
                  onClick={() => dismissPersistedFailure(failure.id)}
                  title="Dismiss"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          <p className="upload-persisted-hint">
            You can re-upload these files by dragging them here or clicking "browse".
          </p>
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
