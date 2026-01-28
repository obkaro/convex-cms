import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { useApi } from '~/embed/contexts/ApiContext'
import { BulkOperationModal } from './BulkOperationModal'
import { CmsButton } from '~/components/cmsds/CmsButton'
import { Badge } from '~/components/ui/badge'
import { X } from 'lucide-react'

type BulkAction = 'publish' | 'unpublish' | 'delete' | 'archive'

interface BulkActionBarProps {
  selectedIds: string[]
  onClearSelection: () => void
  onOperationComplete?: () => void
}

export function BulkActionBar({
  selectedIds,
  onClearSelection,
  onOperationComplete,
}: BulkActionBarProps) {
  const api = useApi()
  const [activeAction, setActiveAction] = useState<BulkAction | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{
    succeeded: number
    failed: number
    errors?: string[]
  } | null>(null)

  const bulkPublish = useMutation(api.bulkPublish)
  const bulkUnpublish = useMutation(api.bulkUnpublish)
  const bulkDelete = useMutation(api.bulkDelete)
  const bulkUpdate = useMutation(api.bulkUpdate)

  const handleAction = useCallback((action: BulkAction) => {
    setActiveAction(action)
    setResult(null)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!activeAction || selectedIds.length === 0) return

    setIsProcessing(true)
    setResult(null)

    try {
      let response: {
        succeeded: number
        failed: number
        errors?: { id: string; error: string }[]
      }

      switch (activeAction) {
        case 'publish':
          response = await bulkPublish({
            ids: selectedIds,
            changeDescription: 'Bulk published from admin',
          })
          break
        case 'unpublish':
          response = await bulkUnpublish({
            ids: selectedIds,
          })
          break
        case 'delete':
          response = await bulkDelete({
            ids: selectedIds,
            hardDelete: false,
          })
          break
        case 'archive':
          response = await bulkUpdate({
            ids: selectedIds,
            status: 'archived',
          })
          break
        default:
          throw new Error(`Unknown action: ${activeAction}`)
      }

      setResult({
        succeeded: response.succeeded,
        failed: response.failed,
        errors: response.errors?.map((e) => `${e.id}: ${e.error}`),
      })

      if (response.failed === 0) {
        setTimeout(() => {
          setActiveAction(null)
          onClearSelection()
          onOperationComplete?.()
        }, 1500)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Operation failed'
      setResult({
        succeeded: 0,
        failed: selectedIds.length,
        errors: [message],
      })
    } finally {
      setIsProcessing(false)
    }
  }, [
    activeAction,
    selectedIds,
    bulkPublish,
    bulkUnpublish,
    bulkDelete,
    bulkUpdate,
    onClearSelection,
    onOperationComplete,
  ])

  const handleCancel = useCallback(() => {
    setActiveAction(null)
    setResult(null)
  }, [])

  if (selectedIds.length === 0) {
    return null
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-6 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm font-semibold">
              {selectedIds.length}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {selectedIds.length === 1 ? 'item' : 'items'} selected
            </span>
            <button
              type="button"
              onClick={onClearSelection}
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3" />
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            <CmsButton
              variant="success"
              size="sm"
              onClick={() => handleAction('publish')}
            >
              Publish
            </CmsButton>
            <CmsButton
              variant="warning"
              size="sm"
              onClick={() => handleAction('unpublish')}
            >
              Unpublish
            </CmsButton>
            <CmsButton
              variant="secondary"
              size="sm"
              onClick={() => handleAction('archive')}
            >
              Archive
            </CmsButton>
            <CmsButton
              variant="danger"
              size="sm"
              onClick={() => handleAction('delete')}
            >
              Delete
            </CmsButton>
          </div>
        </div>
      </div>

      {activeAction && (
        <BulkOperationModal
          action={activeAction}
          count={selectedIds.length}
          isProcessing={isProcessing}
          result={result}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  )
}
