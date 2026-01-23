import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useMemo, useCallback } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import type { ReactNode } from 'react'
import { UploadDropzone, type UploadedFile } from '../components/UploadDropzone'

export const Route = createFileRoute('/media')({
  component: MediaPage,
})

// Media type icons
const MediaTypeIcons: Record<string, ReactNode> = {
  image: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21,15 16,10 5,21"/>
    </svg>
  ),
  video: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="23,7 16,12 23,17 23,7"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  ),
  audio: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>
  ),
  document: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  other: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
      <polyline points="13 2 13 9 20 9"/>
    </svg>
  ),
  folder: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Format date
function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
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

type MediaType = 'image' | 'video' | 'audio' | 'document' | 'other'

function MediaPage() {
  // State
  const [currentFolderId, setCurrentFolderId] = useState<Id<'media_folders'> | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<MediaType | ''>('')
  const [selectedAssets, setSelectedAssets] = useState<Set<Id<'media_assets'>>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [folderError, setFolderError] = useState('')
  const [uploadResults, setUploadResults] = useState<UploadedFile[] | null>(null)

  // Queries
  const assetsResult = useQuery(api.media.listAssets, {
    folderId: currentFolderId,
    type: typeFilter || undefined,
    search: searchQuery || undefined,
    paginationOpts: { numItems: 100, cursor: null },
  })

  const folders = useQuery(api.media.listFolders, {
    parentId: currentFolderId,
  })

  const currentFolder = useQuery(
    api.media.getFolder,
    currentFolderId ? { id: currentFolderId } : 'skip'
  )

  const folderTree = useQuery(api.media.getFolderTree, {})

  // Mutations
  const createFolder = useMutation(api.media.createFolder)

  // Build breadcrumb path
  const breadcrumbPath = useMemo(() => {
    if (!currentFolderId || !folderTree) return []

    type FolderItem = (typeof folderTree)[number]
    const path: FolderItem[] = []
    let folder: FolderItem | undefined = folderTree.find(f => f._id === currentFolderId)

    while (folder) {
      path.unshift(folder)
      const parentId = folder.parentId
      folder = parentId ? folderTree.find(f => f._id === parentId) : undefined
    }

    return path
  }, [currentFolderId, folderTree])

  // Handlers
  const handleFolderClick = useCallback((folderId: Id<'media_folders'>) => {
    setCurrentFolderId(folderId)
    setSearchQuery('')
  }, [])

  const handleNavigateUp = useCallback(() => {
    if (currentFolder?.parentId) {
      setCurrentFolderId(currentFolder.parentId as Id<'media_folders'>)
    } else {
      setCurrentFolderId(undefined)
    }
  }, [currentFolder])

  const handleNavigateToRoot = useCallback(() => {
    setCurrentFolderId(undefined)
    setSearchQuery('')
  }, [])

  const handleAssetSelect = useCallback((assetId: Id<'media_assets'>) => {
    setSelectedAssets(prev => {
      const next = new Set(prev)
      if (next.has(assetId)) {
        next.delete(assetId)
      } else {
        next.add(assetId)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (!assetsResult?.page) return
    setSelectedAssets(new Set(assetsResult.page.map(a => a._id as Id<'media_assets'>)))
  }, [assetsResult?.page])

  const handleDeselectAll = useCallback(() => {
    setSelectedAssets(new Set())
  }, [])

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      setFolderError('Folder name is required')
      return
    }

    setIsCreatingFolder(true)
    setFolderError('')

    try {
      await createFolder({
        name: newFolderName.trim(),
        parentId: currentFolderId,
      })
      setShowNewFolderModal(false)
      setNewFolderName('')
    } catch (error) {
      setFolderError(error instanceof Error ? error.message : 'Failed to create folder')
    } finally {
      setIsCreatingFolder(false)
    }
  }, [newFolderName, currentFolderId, createFolder])

  const handleUploadComplete = useCallback((results: UploadedFile[]) => {
    setUploadResults(results)
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    if (failCount === 0) {
      // All successful, close modal after brief delay
      setTimeout(() => {
        setShowUploadModal(false)
        setUploadResults(null)
      }, 1000)
    }
    // If there were failures, keep modal open to show errors
  }, [])

  // Loading state
  const isLoading = assetsResult === undefined || folders === undefined

  return (
    <div className="page media-page">
      <header className="page-header">
        <h1>Media Library</h1>
        <p className="page-description">
          Upload, organize, and manage media assets for your content.
        </p>
      </header>

      {/* Breadcrumb Navigation */}
      <nav className="media-breadcrumb" aria-label="Folder navigation">
        <button
          className={`media-breadcrumb-item ${!currentFolderId ? 'active' : ''}`}
          onClick={handleNavigateToRoot}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>All Files</span>
        </button>
        {breadcrumbPath.map((folder, index) => (
          <span key={folder._id} className="media-breadcrumb-segment">
            <span className="media-breadcrumb-separator">/</span>
            <button
              className={`media-breadcrumb-item ${index === breadcrumbPath.length - 1 ? 'active' : ''}`}
              onClick={() => handleFolderClick(folder._id as Id<'media_folders'>)}
            >
              {folder.name}
            </button>
          </span>
        ))}
      </nav>

      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="toolbar-left">
          {/* Search */}
          <div className="search-input-wrapper">
            <input
              type="search"
              className="search-input"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          {/* Type Filter */}
          <select
            className="media-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MediaType | '')}
          >
            <option value="">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="document">Documents</option>
            <option value="other">Other</option>
          </select>

          {/* Selection Mode Toggle */}
          {assetsResult?.page && assetsResult.page.length > 0 && (
            <label className="toolbar-checkbox">
              <input
                type="checkbox"
                checked={isSelectionMode}
                onChange={(e) => {
                  setIsSelectionMode(e.target.checked)
                  if (!e.target.checked) {
                    setSelectedAssets(new Set())
                  }
                }}
              />
              Selection Mode
            </label>
          )}
        </div>

        <div className="toolbar-right">
          {/* Selection Actions */}
          {isSelectionMode && selectedAssets.size > 0 && (
            <span className="selection-count">
              {selectedAssets.size} selected
            </span>
          )}

          {isSelectionMode && (
            <>
              <button className="btn btn-secondary btn-small" onClick={handleSelectAll}>
                Select All
              </button>
              <button className="btn btn-secondary btn-small" onClick={handleDeselectAll}>
                Clear
              </button>
            </>
          )}

          {/* Navigate Up Button */}
          {currentFolderId && (
            <button className="btn btn-secondary" onClick={handleNavigateUp}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              Up
            </button>
          )}

          <button className="btn btn-secondary" onClick={() => setShowNewFolderModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              <line x1="12" y1="11" x2="12" y2="17"/>
              <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
            New Folder
          </button>

          <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload Files
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading media library...</p>
        </div>
      ) : (
        <>
          {/* Folders Grid */}
          {folders && folders.length > 0 && !searchQuery && (
            <section className="media-folders-section">
              <h3 className="media-section-title">Folders</h3>
              <div className="media-folders-grid">
                {folders.map((folder) => (
                  <button
                    key={folder._id}
                    className="media-folder-card"
                    onClick={() => handleFolderClick(folder._id as Id<'media_folders'>)}
                  >
                    <div className="media-folder-icon">
                      {MediaTypeIcons.folder}
                    </div>
                    <div className="media-folder-info">
                      <span className="media-folder-name">{folder.name}</span>
                      {folder.description && (
                        <span className="media-folder-description">{folder.description}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Assets Grid */}
          {assetsResult?.page && assetsResult.page.length > 0 ? (
            <section className="media-assets-section">
              {folders && folders.length > 0 && !searchQuery && (
                <h3 className="media-section-title">Files</h3>
              )}
              <div className="media-assets-grid">
                {assetsResult.page.map((asset) => {
                  const assetId = asset._id as Id<'media_assets'>
                  return (
                    <div
                      key={asset._id}
                      className={`media-asset-card ${isSelectionMode ? 'selectable' : ''} ${selectedAssets.has(assetId) ? 'selected' : ''}`}
                      onClick={() => isSelectionMode && handleAssetSelect(assetId)}
                    >
                      {isSelectionMode && (
                        <div className="media-asset-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedAssets.has(assetId)}
                            onChange={() => handleAssetSelect(assetId)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}

                      <div className="media-asset-thumbnail">
                        {asset.type === 'image' && asset.url ? (
                          <img src={asset.url} alt={asset.title || asset.filename} />
                        ) : (
                          <div className="media-asset-type-icon">
                            {MediaTypeIcons[asset.type] || MediaTypeIcons.other}
                          </div>
                        )}
                      </div>

                      <div className="media-asset-info">
                        <span className="media-asset-filename" title={asset.filename}>
                          {asset.filename}
                        </span>
                        <div className="media-asset-meta">
                          <span className="media-asset-type">{asset.type}</span>
                          <span className="media-asset-size">{formatFileSize(asset.size)}</span>
                        </div>
                        <span className="media-asset-date">{formatDate(asset._creationTime)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination info */}
              {!assetsResult.isDone && (
                <div className="media-pagination-info">
                  <p>Showing {assetsResult.page.length} files. More files available.</p>
                </div>
              )}
            </section>
          ) : (
            /* Empty State */
            !folders?.length && (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21,15 16,10 5,21"/>
                  </svg>
                </div>
                <h3>No media assets yet</h3>
                <p>Upload images, videos, documents, and other files to use in your content.</p>
                <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                  Upload Files
                </button>
              </div>
            )
          )}

          {/* Empty search state */}
          {searchQuery && assetsResult?.page.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <h3>No results found</h3>
              <p>No files match "{searchQuery}". Try a different search term.</p>
              <button className="btn btn-secondary" onClick={() => setSearchQuery('')}>
                Clear Search
              </button>
            </div>
          )}
        </>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="modal-overlay" onClick={() => setShowNewFolderModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Folder</h3>
              <button className="modal-close" onClick={() => setShowNewFolderModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="field-wrapper">
                <label className="field-label" htmlFor="folder-name">Folder Name</label>
                <input
                  id="folder-name"
                  type="text"
                  className={`field-input ${folderError ? 'field-input--error' : ''}`}
                  value={newFolderName}
                  onChange={(e) => {
                    setNewFolderName(e.target.value)
                    setFolderError('')
                  }}
                  placeholder="Enter folder name"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isCreatingFolder) {
                      handleCreateFolder()
                    }
                  }}
                />
                {folderError && <span className="field-error">{folderError}</span>}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowNewFolderModal(false)}
                disabled={isCreatingFolder}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateFolder}
                disabled={isCreatingFolder || !newFolderName.trim()}
              >
                {isCreatingFolder ? 'Creating...' : 'Create Folder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={(e) => {
          // Only close if clicking the overlay itself, not children
          if (e.target === e.currentTarget) {
            setShowUploadModal(false)
            setUploadResults(null)
          }
        }}>
          <div className="modal modal-upload-enhanced" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Files</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadResults(null)
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <UploadDropzone
                currentFolderId={currentFolderId}
                generateUploadUrl={api.media.generateUploadUrl}
                createAsset={api.media.createAsset}
                onUploadComplete={handleUploadComplete}
                maxFileSize={50 * 1024 * 1024}
                maxConcurrentUploads={3}
                onClose={() => {
                  setShowUploadModal(false)
                  setUploadResults(null)
                }}
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadResults(null)
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
