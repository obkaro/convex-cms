import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useApi } from '../../embed/contexts/ApiContext'
import { CmsDialog } from '../cmsds/CmsDialog'
import { CmsButton } from '../cmsds/CmsButton'
import { cn } from '../../lib/cn'
import { Folder, Home, ChevronRight } from 'lucide-react'

interface MediaMoveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetIds: string[]
  currentFolderId?: string
  onMoved?: () => void
}

interface FolderTreeItem {
  _id: string
  name: string
  parentId?: string
  depth: number
}

export function MediaMoveModal({
  open,
  onOpenChange,
  assetIds,
  currentFolderId,
  onMoved,
}: MediaMoveModalProps) {
  const api = useApi()
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(
    undefined
  )
  const [isMoving, setIsMoving] = useState(false)
  const [error, setError] = useState('')

  const folderTree = useQuery(api.getMediaFolderTree, {})
  const moveAssets = useMutation(api.moveMediaAssets)

  const sortedFolders = useMemo(() => {
    if (!folderTree) return []

    const buildTree = (
      parentId: string | undefined,
      depth: number
    ): FolderTreeItem[] => {
      const children = folderTree.filter((f) => f.parentId === parentId)
      return children.flatMap((folder) => [
        { ...folder, depth },
        ...buildTree(folder._id, depth + 1),
      ])
    }

    return buildTree(undefined, 0)
  }, [folderTree])

  const handleMove = async () => {
    if (assetIds.length === 0) return

    setIsMoving(true)
    setError('')

    try {
      await moveAssets({
        assetIds,
        targetFolderId: selectedFolderId,
      })
      onMoved?.()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move files')
    } finally {
      setIsMoving(false)
    }
  }

  const isCurrentFolder = selectedFolderId === currentFolderId
  const isRootSelected = selectedFolderId === undefined

  return (
    <CmsDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Move Files"
      description={`Select a destination folder for ${assetIds.length} ${assetIds.length === 1 ? 'file' : 'files'}`}
      size="sm"
      footer={
        <>
          <CmsButton
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMoving}
          >
            Cancel
          </CmsButton>
          <CmsButton
            onClick={handleMove}
            loading={isMoving}
            disabled={isCurrentFolder}
          >
            Move Here
          </CmsButton>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="max-h-[300px] overflow-y-auto rounded-md border">
          {/* Root folder option */}
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
              isRootSelected && 'bg-primary/10 text-primary',
              currentFolderId === undefined && 'opacity-50'
            )}
            onClick={() => setSelectedFolderId(undefined)}
          >
            <Home className="size-4" />
            <span className="font-medium">Root (All Files)</span>
            {currentFolderId === undefined && (
              <span className="ml-auto text-xs text-muted-foreground">
                Current
              </span>
            )}
          </button>

          {/* Folder tree */}
          {sortedFolders.map((folder) => {
            const isCurrent = folder._id === currentFolderId
            const isSelected = folder._id === selectedFolderId

            return (
              <button
                key={folder._id}
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                  isSelected && 'bg-primary/10 text-primary',
                  isCurrent && 'opacity-50'
                )}
                style={{ paddingLeft: `${12 + folder.depth * 20}px` }}
                onClick={() => setSelectedFolderId(folder._id)}
              >
                {folder.depth > 0 && (
                  <ChevronRight className="size-3 text-muted-foreground" />
                )}
                <Folder className="size-4 text-amber-500" />
                <span className="truncate">{folder.name}</span>
                {isCurrent && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    Current
                  </span>
                )}
              </button>
            )
          })}

          {sortedFolders.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No folders yet. Create folders to organize your files.
            </div>
          )}
        </div>

        {isCurrentFolder && (
          <p className="text-xs text-muted-foreground">
            Files are already in this folder
          </p>
        )}
      </div>
    </CmsDialog>
  )
}
