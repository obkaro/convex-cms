import { CmsDialog } from '~/components/cmsds/CmsDialog'
import { CmsButton } from '~/components/cmsds/CmsButton'
import { AlertTriangle } from 'lucide-react'

interface VersionRollbackModalProps {
  targetVersion: number
  currentVersion: number
  isLoading: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function VersionRollbackModal({
  targetVersion,
  currentVersion,
  isLoading,
  error,
  onConfirm,
  onCancel,
}: VersionRollbackModalProps) {
  return (
    <CmsDialog
      open={true}
      onOpenChange={(open) => !open && !isLoading && onCancel()}
      title="Confirm Rollback"
      size="sm"
      footer={
        <>
          <CmsButton variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </CmsButton>
          <CmsButton variant="warning" onClick={onConfirm} loading={isLoading}>
            Rollback to v{targetVersion}
          </CmsButton>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          You are about to rollback from{' '}
          <span className="font-semibold text-foreground">
            version {currentVersion}
          </span>{' '}
          to{' '}
          <span className="font-semibold text-foreground">
            version {targetVersion}
          </span>
          .
        </p>

        <div className="diff-modified rounded-lg border p-3">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-diff-modified" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-diff-modified">
                This action will:
              </p>
              <ul className="space-y-1 text-sm text-diff-modified-foreground">
                <li>
                  • Create a new version with the content from version{' '}
                  {targetVersion}
                </li>
                <li>• The current version will be preserved in history</li>
                <li>• Any unsaved changes will be lost</li>
              </ul>
            </div>
          </div>
        </div>

        {error && (
          <div className="diff-removed rounded-lg border px-3 py-2 text-sm">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}
      </div>
    </CmsDialog>
  )
}
