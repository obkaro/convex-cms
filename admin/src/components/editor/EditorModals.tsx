import { CmsDialog, CmsConfirmDialog } from '../cmsds/CmsDialog'
import { CmsButton } from '../cmsds/CmsButton'
import { Input } from '../ui/input'

interface ScheduleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scheduleDateTime: string
  onScheduleDateTimeChange: (value: string) => void
  onSchedule: () => void
  isPublishing: boolean
  publishError?: string | null
  minDateTime: string
}

export function ScheduleModal({
  open,
  onOpenChange,
  scheduleDateTime,
  onScheduleDateTimeChange,
  onSchedule,
  isPublishing,
  publishError,
  minDateTime,
}: ScheduleModalProps) {
  return (
    <CmsDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Schedule Publication"
      size="sm"
      footer={
        <>
          <CmsButton variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </CmsButton>
          <CmsButton variant="primary" onClick={onSchedule} loading={isPublishing}>
            Schedule
          </CmsButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Choose when this content should be automatically published:
        </p>
        <Input
          type="datetime-local"
          value={scheduleDateTime}
          onChange={(e) => onScheduleDateTimeChange(e.target.value)}
          min={minDateTime}
        />
        {publishError && (
          <p className="text-sm text-destructive">{publishError}</p>
        )}
      </div>
    </CmsDialog>
  )
}

interface PublishConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: 'publish' | 'unpublish' | null
  onConfirm: () => void
  isPublishing: boolean
}

export function PublishConfirmModal({
  open,
  onOpenChange,
  action,
  onConfirm,
  isPublishing,
}: PublishConfirmModalProps) {
  return (
    <CmsConfirmDialog
      open={open && action !== null}
      onOpenChange={onOpenChange}
      title={action === 'publish' ? 'Confirm Publish' : 'Confirm Unpublish'}
      description={
        action === 'publish'
          ? 'Are you sure you want to publish this entry? It will become publicly visible.'
          : 'Are you sure you want to unpublish this entry? It will no longer be publicly visible.'
      }
      confirmLabel={action === 'publish' ? 'Publish' : 'Unpublish'}
      variant={action === 'publish' ? 'primary' : 'warning'}
      onConfirm={onConfirm}
      isLoading={isPublishing}
    />
  )
}

interface DeleteConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isDeleting: boolean
  error?: string | null
}

export function DeleteConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  error,
}: DeleteConfirmModalProps) {
  return (
    <CmsConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Entry"
      description="Are you sure you want to delete this entry? It will be moved to the trash and can be restored within the retention period."
      confirmLabel="Delete"
      variant="danger"
      onConfirm={onConfirm}
      isLoading={isDeleting}
      error={error}
    />
  )
}
