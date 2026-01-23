import { CmsButton } from '~/components/cmsds/CmsButton'
import { FolderInput, Trash2, X } from 'lucide-react'

interface MediaBulkActionBarProps {
  selectedCount: number
  onClear: () => void
  onMove: () => void
  onDelete: () => void
  isDeleting?: boolean
}

export function MediaBulkActionBar({
  selectedCount,
  onClear,
  onMove,
  onDelete,
  isDeleting,
}: MediaBulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? 'file' : 'files'} selected
          </span>
          <CmsButton variant="ghost" size="sm" onClick={onClear}>
            <X className="mr-1 size-4" />
            Clear
          </CmsButton>
        </div>

        <div className="flex items-center gap-2">
          <CmsButton variant="secondary" onClick={onMove} disabled={isDeleting}>
            <FolderInput className="mr-2 size-4" />
            Move to...
          </CmsButton>
          <CmsButton
            variant="destructive"
            onClick={onDelete}
            loading={isDeleting}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </CmsButton>
        </div>
      </div>
    </div>
  )
}
