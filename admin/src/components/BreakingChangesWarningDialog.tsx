import { AlertTriangle } from 'lucide-react'
import { CmsDialog } from './cmsds/CmsDialog'
import { CmsButton } from './cmsds/CmsButton'

interface BreakingChangesWarningDialogProps {
  isOpen: boolean
  onClose: () => void
  breakingChanges: string[]
  onForceUpdate: () => void
  onCancel: () => void
  isLoading: boolean
}

export function BreakingChangesWarningDialog({
  isOpen,
  onClose,
  breakingChanges,
  onForceUpdate,
  onCancel,
  isLoading,
}: BreakingChangesWarningDialogProps) {
  const handleCancel = () => {
    onCancel()
    onClose()
  }

  return (
    <CmsDialog
      open={isOpen}
      onOpenChange={(open) => !open && !isLoading && handleCancel()}
      title="Breaking Changes Detected"
      size="lg"
      footer={
        <>
          <CmsButton variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </CmsButton>
          <CmsButton variant="danger" onClick={onForceUpdate} loading={isLoading}>
            Force Update
          </CmsButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="diff-modified flex items-start gap-3 rounded-lg border p-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-diff-modified" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-diff-modified">
              These changes may affect existing content
            </p>
            <p className="text-sm text-diff-modified-foreground">
              The following changes could cause data loss or validation errors for existing entries.
              Review carefully before proceeding.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">
            {breakingChanges.length} breaking change{breakingChanges.length !== 1 ? 's' : ''} detected:
          </p>
          <ul className="flex flex-col gap-2">
            {breakingChanges.map((change, index) => (
              <li
                key={index}
                className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
              >
                <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-warning" />
                <span className="text-muted-foreground">{change}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          Click "Force Update" to apply these changes anyway, or "Cancel" to go back and modify your changes.
        </p>
      </div>
    </CmsDialog>
  )
}
