import type { ContentEntry } from '../ContentEntryEditor'
import { CmsStatusBadge } from '../cmsds/CmsStatusBadge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Separator } from '../ui/separator'
import { Spinner } from '../ui/spinner'
import { Clock, Copy, Archive, Trash2, History } from 'lucide-react'

interface EditorPropertiesPanelProps {
  entry?: ContentEntry
  hasScheduling: boolean
  hasVersioning: boolean
  canDelete: boolean
  isSubmitting: boolean
  isPublishing: boolean
  isDuplicating: boolean
  isArchiving: boolean
  isDeleting: boolean
  onPublishClick: () => void
  onUnpublishClick: () => void
  onScheduleClick: () => void
  onCancelSchedule: () => void
  onPublishNow: () => void
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
  onViewHistory: () => void
}

export function EditorPropertiesPanel({
  entry,
  hasScheduling,
  hasVersioning,
  canDelete,
  isSubmitting,
  isPublishing,
  isDuplicating,
  isArchiving,
  isDeleting,
  onPublishClick,
  onUnpublishClick,
  onScheduleClick,
  onCancelSchedule,
  onPublishNow,
  onDuplicate,
  onArchive,
  onDelete,
  onViewHistory,
}: EditorPropertiesPanelProps) {
  if (!entry) return null

  const isBusy = isSubmitting || isPublishing || isDuplicating || isArchiving || isDeleting

  return (
    <div className="flex flex-col gap-4">
      {/* Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <CmsStatusBadge status={entry.status} />
          </div>
          {entry.version > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">{entry.version}</span>
              </div>
            </>
          )}
          {entry.lastPublishedAt && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Published</span>
              <span className="text-xs">{new Date(entry.lastPublishedAt).toLocaleDateString()}</span>
            </div>
          )}
          {entry.status === 'scheduled' && entry.scheduledPublishAt && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Scheduled</span>
              <span className="flex items-center gap-1 text-xs">
                <Clock className="size-3" />
                {new Date(entry.scheduledPublishAt).toLocaleString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publishing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Publishing</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {entry.status === 'draft' && (
            <>
              <Button className="w-full" onClick={onPublishClick} disabled={isBusy}>
                {isPublishing && <Spinner data-icon="inline-start" />}
                Publish Now
              </Button>
              {hasScheduling && (
                <Button variant="outline" className="w-full" onClick={onScheduleClick} disabled={isBusy}>
                  <Clock data-icon="inline-start" />
                  Schedule
                </Button>
              )}
            </>
          )}
          {entry.status === 'scheduled' && (
            <>
              <Button className="w-full" onClick={onPublishNow} disabled={isBusy}>
                {isPublishing && <Spinner data-icon="inline-start" />}
                Publish Now
              </Button>
              {hasScheduling && (
                <Button variant="outline" className="w-full" onClick={onCancelSchedule} disabled={isBusy}>
                  Cancel Schedule
                </Button>
              )}
            </>
          )}
          {entry.status === 'published' && (
            <Button variant="outline" className="w-full" onClick={onUnpublishClick} disabled={isBusy}>
              {isPublishing && <Spinner data-icon="inline-start" />}
              Unpublish
            </Button>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {hasVersioning && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">History</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={onViewHistory}>
              <History data-icon="inline-start" />
              Version {entry.version} — View history
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="flex flex-col gap-2 pt-6">
          <Button variant="outline" className="w-full" onClick={onDuplicate} disabled={isBusy}>
            {isDuplicating && <Spinner data-icon="inline-start" />}
            {!isDuplicating && <Copy data-icon="inline-start" />}
            Duplicate
          </Button>
          {(entry.status === 'draft' || entry.status === 'scheduled') && (
            <Button variant="outline" className="w-full" onClick={onArchive} disabled={isBusy}>
              {isArchiving && <Spinner data-icon="inline-start" />}
              {!isArchiving && <Archive data-icon="inline-start" />}
              Archive
            </Button>
          )}
          {canDelete && (
            <>
              <Separator />
              <Button variant="destructive" className="w-full" onClick={onDelete} disabled={isBusy}>
                {isDeleting && <Spinner data-icon="inline-start" />}
                {!isDeleting && <Trash2 data-icon="inline-start" />}
                Delete
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
