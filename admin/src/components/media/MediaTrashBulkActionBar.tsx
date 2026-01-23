import { CmsButton } from '~/components/cmsds/CmsButton'
import { RotateCcw, Trash2, X } from 'lucide-react'

interface MediaTrashBulkActionBarProps {
  selectedCount: number
  onClear: () => void
  onRestore: () => void
  onPermanentDelete: () => void
  isRestoring?: boolean
  isDeleting?: boolean
}

export function MediaTrashBulkActionBar({
  selectedCount,
  onClear,
  onRestore,
  onPermanentDelete,
  isRestoring,
  isDeleting,
}: MediaTrashBulkActionBarProps) {
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
          <CmsButton
            variant="secondary"
            onClick={onRestore}
            loading={isRestoring}
            disabled={isDeleting}
          >
            <RotateCcw className="mr-2 size-4" />
            Restore
          </CmsButton>
          <CmsButton
            variant="danger"
            onClick={onPermanentDelete}
            loading={isDeleting}
            disabled={isRestoring}
          >
            <Trash2 className="mr-2 size-4" />
            Delete Forever
          </CmsButton>
        </div>
      </div>
    </div>
  )
}
