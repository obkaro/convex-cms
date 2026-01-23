import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useMemo, useCallback } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import { UploadDropzone, type UploadedFile } from '../components/UploadDropzone'
import { CmsPageHeader } from '~/components/cmsds/CmsPageHeader'
import { CmsToolbar } from '~/components/cmsds/CmsToolbar'
import { CmsEmptyState } from '~/components/cmsds/CmsEmptyState'
import { CmsSurface } from '~/components/cmsds/CmsSurface'
import { CmsButton } from '~/components/cmsds/CmsButton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Checkbox } from '~/components/ui/checkbox'
import { cn } from '~/lib/cn'
import {
  Image,
  Video,
  Music,
  FileText,
  File,
  Folder,
  Home,
  ChevronLeft,
  FolderPlus,
  Upload,
  Search,
  Check,
  X,
} from 'lucide-react'

export const Route = createFileRoute('/media')({
  component: MediaPage,
})

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
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
  })
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

function MediaPage() {
  const [currentFolderId, setCurrentFolderId] = useState<
    Id<'media_folders'> | undefined
  >(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<MediaType | ''>('')
  const [selectedAssets, setSelectedAssets] = useState<Set<Id<'media_assets'>>>(
    new Set()
  )
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [folderError, setFolderError] = useState('')

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

  const createFolder = useMutation(api.media.createFolder)

  const breadcrumbPath = useMemo(() => {
    if (!currentFolderId || !folderTree) return []

    type FolderItem = (typeof folderTree)[number]
    const path: FolderItem[] = []
    let folder: FolderItem | undefined = folderTree.find(
      (f) => f._id === currentFolderId
    )

    while (folder) {
      path.unshift(folder)
      const parentId = folder.parentId
      folder = parentId ? folderTree.find((f) => f._id === parentId) : undefined
    }

    return path
  }, [currentFolderId, folderTree])

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
    setSelectedAssets((prev) => {
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
    setSelectedAssets(
      new Set(assetsResult.page.map((a) => a._id as Id<'media_assets'>))
    )
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
      setFolderError(
        error instanceof Error ? error.message : 'Failed to create folder'
      )
    } finally {
      setIsCreatingFolder(false)
    }
  }, [newFolderName, currentFolderId, createFolder])

  const handleUploadComplete = useCallback((_results: UploadedFile[]) => {
    setShowUploadModal(false)
  }, [])

  const isLoading = assetsResult === undefined || folders === undefined

  return (
    <div className="space-y-6 p-6">
      <CmsPageHeader
        title="Media Library"
        description="Upload, organize, and manage media assets for your content."
      />

      <nav className="flex items-center gap-1" aria-label="Folder navigation">
        <button
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors',
            !currentFolderId
              ? 'bg-primary/10 font-medium text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          onClick={handleNavigateToRoot}
        >
          <Home className="size-4" />
          <span>All Files</span>
        </button>
        {breadcrumbPath.map((folder, index) => (
          <span key={folder._id} className="flex items-center">
            <span className="mx-1 text-muted-foreground">/</span>
            <button
              className={cn(
                'rounded-md px-2 py-1 text-sm transition-colors',
                index === breadcrumbPath.length - 1
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              onClick={() => handleFolderClick(folder._id as Id<'media_folders'>)}
            >
              {folder.name}
            </button>
          </span>
        ))}
      </nav>

      <CmsToolbar
        left={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9"
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-muted"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X className="size-4 text-muted-foreground" />
                </button>
              )}
            </div>

            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as MediaType | '')}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            {assetsResult?.page && assetsResult.page.length > 0 && (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={isSelectionMode}
                  onCheckedChange={(checked) => {
                    setIsSelectionMode(checked as boolean)
                    if (!checked) {
                      setSelectedAssets(new Set())
                    }
                  }}
                />
                Selection Mode
              </label>
            )}
          </div>
        }
        right={
          <div className="flex items-center gap-2">
            {isSelectionMode && selectedAssets.size > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedAssets.size} selected
              </span>
            )}

            {isSelectionMode && (
              <>
                <CmsButton variant="secondary" size="sm" onClick={handleSelectAll}>
                  Select All
                </CmsButton>
                <CmsButton variant="secondary" size="sm" onClick={handleDeselectAll}>
                  Clear
                </CmsButton>
              </>
            )}

            {currentFolderId && (
              <CmsButton variant="secondary" onClick={handleNavigateUp}>
                <ChevronLeft className="size-4" />
                Up
              </CmsButton>
            )}

            <CmsButton
              variant="secondary"
              onClick={() => setShowNewFolderModal(true)}
            >
              <FolderPlus className="size-4" />
              New Folder
            </CmsButton>

            <CmsButton onClick={() => setShowUploadModal(true)}>
              <Upload className="size-4" />
              Upload Files
            </CmsButton>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading media library...
          </p>
        </div>
      ) : (
        <>
          {folders && folders.length > 0 && !searchQuery && (
            <section>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                Folders
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {folders.map((folder) => (
                  <button
                    key={folder._id}
                    className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
                    onClick={() =>
                      handleFolderClick(folder._id as Id<'media_folders'>)
                    }
                  >
                    <Folder className="size-10 text-amber-500" />
                    <span className="truncate text-sm font-medium">
                      {folder.name}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {assetsResult?.page && assetsResult.page.length > 0 ? (
            <section>
              {folders && folders.length > 0 && !searchQuery && (
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                  Files
                </h3>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {assetsResult.page.map((asset) => {
                  const assetId = asset._id as Id<'media_assets'>
                  const isSelected = selectedAssets.has(assetId)

                  return (
                    <div
                      key={asset._id}
                      className={cn(
                        'group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-all',
                        isSelectionMode && 'cursor-pointer',
                        isSelected && 'border-primary ring-2 ring-primary/20'
                      )}
                      onClick={() => isSelectionMode && handleAssetSelect(assetId)}
                    >
                      {isSelectionMode && (
                        <div className="absolute left-2 top-2 z-10">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleAssetSelect(assetId)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white/80"
                          />
                        </div>
                      )}

                      {isSelected && (
                        <div className="absolute right-2 top-2 z-10 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3" />
                        </div>
                      )}

                      <div className="aspect-square bg-muted">
                        {asset.type === 'image' && asset.url ? (
                          <img
                            src={asset.url}
                            alt={asset.title || asset.filename}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            {getMediaTypeIcon(asset.type, 'size-10')}
                          </div>
                        )}
                      </div>

                      <div className="p-2">
                        <p
                          className="truncate text-sm font-medium"
                          title={asset.filename}
                        >
                          {asset.filename}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="capitalize">{asset.type}</span>
                          <span>•</span>
                          <span>{formatFileSize(asset.size)}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(asset._creationTime)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {!assetsResult.isDone && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Showing {assetsResult.page.length} files. More files available.
                </p>
              )}
            </section>
          ) : (
            !folders?.length && (
              <CmsEmptyState
                icon={<Image className="size-8" />}
                title="No media assets yet"
                description="Upload images, videos, documents, and other files to use in your content."
                action={{
                  label: 'Upload Files',
                  onClick: () => setShowUploadModal(true),
                }}
              />
            )
          )}

          {searchQuery && assetsResult?.page.length === 0 && (
            <CmsEmptyState
              icon={<Search className="size-8" />}
              title="No results found"
              description={`No files match "${searchQuery}". Try a different search term.`}
              action={{
                label: 'Clear Search',
                onClick: () => setSearchQuery(''),
                variant: 'secondary',
              }}
            />
          )}
        </>
      )}

      <Dialog open={showNewFolderModal} onOpenChange={setShowNewFolderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
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
              {folderError && (
                <p className="text-sm text-destructive">{folderError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <CmsButton
              variant="secondary"
              onClick={() => setShowNewFolderModal(false)}
              disabled={isCreatingFolder}
            >
              Cancel
            </CmsButton>
            <CmsButton
              onClick={handleCreateFolder}
              disabled={isCreatingFolder || !newFolderName.trim()}
              loading={isCreatingFolder}
            >
              Create Folder
            </CmsButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <UploadDropzone
              currentFolderId={currentFolderId}
              generateUploadUrl={api.media.generateUploadUrl}
              createAsset={api.media.createAsset}
              onUploadComplete={handleUploadComplete}
              maxFileSize={50 * 1024 * 1024}
              maxConcurrentUploads={3}
            />
          </div>
          <DialogFooter>
            <CmsButton variant="secondary" onClick={() => setShowUploadModal(false)}>
              Close
            </CmsButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
