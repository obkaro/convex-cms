import { CmsDialog } from '~/components/cmsds/CmsDialog'
import { CmsButton } from '~/components/cmsds/CmsButton'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { cn as _cn } from '~/lib/cn'

type BulkAction = 'publish' | 'unpublish' | 'delete' | 'archive'

interface BulkOperationModalProps {
  action: BulkAction
  count: number
  isProcessing: boolean
  result: {
    succeeded: number
    failed: number
    errors?: string[]
  } | null
  onConfirm: () => void
  onCancel: () => void
}

const ACTION_CONFIG: Record<
  BulkAction,
  {
    title: string
    description: string
    warning?: string
    confirmLabel: string
    confirmVariant: 'success' | 'warning' | 'danger' | 'secondary'
  }
> = {
  publish: {
    title: 'Publish Items',
    description:
      'This will publish all selected items, making them publicly visible.',
    confirmLabel: 'Publish All',
    confirmVariant: 'success',
  },
  unpublish: {
    title: 'Unpublish Items',
    description:
      'This will unpublish all selected items, changing them back to draft status.',
    confirmLabel: 'Unpublish All',
    confirmVariant: 'warning',
  },
  delete: {
    title: 'Delete Items',
    description: 'This will move all selected items to trash.',
    warning: 'Items in trash can be restored within the retention period.',
    confirmLabel: 'Delete All',
    confirmVariant: 'danger',
  },
  archive: {
    title: 'Archive Items',
    description: 'This will archive all selected items.',
    confirmLabel: 'Archive All',
    confirmVariant: 'secondary',
  },
}

export function BulkOperationModal({
  action,
  count,
  isProcessing,
  result,
  onConfirm,
  onCancel,
}: BulkOperationModalProps) {
  const config = ACTION_CONFIG[action]

  return (
    <CmsDialog
      open={true}
      onOpenChange={(open) => !open && !isProcessing && onCancel()}
      title={config.title}
      size="sm"
      footer={
        result ? (
          <CmsButton variant="primary" onClick={onCancel}>
            {result.failed === 0 ? 'Done' : 'Close'}
          </CmsButton>
        ) : (
          <>
            <CmsButton
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
            >
              Cancel
            </CmsButton>
            <CmsButton
              variant={config.confirmVariant}
              onClick={onConfirm}
              loading={isProcessing}
            >
              {config.confirmLabel}
            </CmsButton>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-4">
          {result.failed === 0 ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle className="size-6" />
              </div>
              <p className="text-sm text-muted-foreground">
                Successfully processed{' '}
                <span className="font-semibold text-foreground">
                  {result.succeeded}
                </span>{' '}
                {result.succeeded === 1 ? 'item' : 'items'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                  <p className="text-2xl font-semibold text-emerald-700">
                    {result.succeeded}
                  </p>
                  <p className="text-xs text-emerald-600">Succeeded</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                  <p className="text-2xl font-semibold text-red-700">
                    {result.failed}
                  </p>
                  <p className="text-xs text-red-600">Failed</p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-2 text-sm font-medium text-amber-800">
                    Errors:
                  </p>
                  <ul className="space-y-1 text-xs text-amber-700">
                    {result.errors.slice(0, 5).map((error, index) => (
                      <li key={index} className="truncate">
                        • {error}
                      </li>
                    ))}
                    {result.errors.length > 5 && (
                      <li className="text-amber-600">
                        ...and {result.errors.length - 5} more errors
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            You are about to {action}{' '}
            <span className="font-semibold text-foreground">
              {count} {count === 1 ? 'item' : 'items'}
            </span>
            .
          </p>
          <p className="text-sm text-muted-foreground">{config.description}</p>
          {config.warning && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">
                <span className="font-medium">Note:</span> {config.warning}
              </p>
            </div>
          )}
        </div>
      )}
    </CmsDialog>
  )
}
