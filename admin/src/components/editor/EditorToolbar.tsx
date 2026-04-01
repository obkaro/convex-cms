import type { ContentType, ContentEntry } from '../ContentEntryEditor'
import { AutosaveIndicator, type AutosaveStatus } from './AutosaveIndicator'
import { CmsStatusBadge } from '../cmsds/CmsStatusBadge'
import { Spinner } from '../ui/spinner'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '../ui/dropdown-menu'
import { ScrollArea } from '../ui/scroll-area'
import { ArrowLeft, MoreHorizontal, Clock, Settings2, ChevronDown, Plus, Check } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface SiblingEntry {
  _id: string
  title: string
}

interface EditorToolbarProps {
  contentType: ContentType
  entry?: ContentEntry
  entryTitle?: string
  isDirty: boolean
  isSubmitting: boolean
  isPublishing: boolean
  autosaveStatus: AutosaveStatus
  autosaveError?: string | null
  autosaveRetryCount: number
  maxAutosaveRetries: number
  canDelete: boolean
  hasScheduling: boolean
  siblingEntries?: SiblingEntry[]
  onSave: () => void
  onCancel: () => void
  onPublishClick: () => void
  onUnpublishClick: () => void
  onScheduleClick: () => void
  onCancelSchedule: () => void
  onPublishNow: () => void
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
  onAutosaveRetry: () => void
  onToggleProperties?: () => void
  onNavigateToEntry?: (entryId: string) => void
  onNavigateToNewEntry?: () => void
}

export function EditorToolbar({
  contentType,
  entry,
  entryTitle,
  isDirty,
  isSubmitting,
  isPublishing,
  autosaveStatus,
  autosaveError,
  autosaveRetryCount,
  maxAutosaveRetries,
  canDelete,
  hasScheduling,
  siblingEntries,
  onSave,
  onCancel,
  onPublishClick,
  onUnpublishClick,
  onScheduleClick,
  onCancelSchedule,
  onPublishNow,
  onDuplicate,
  onArchive,
  onDelete,
  onAutosaveRetry,
  onToggleProperties,
  onNavigateToEntry,
  onNavigateToNewEntry,
}: EditorToolbarProps) {
  const isBusy = isSubmitting || isPublishing
  const hasSiblings = siblingEntries && siblingEntries.length > 0

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Left: back nav + entry switcher + status */}
      <div className="flex min-w-0 items-center gap-2">
        <Button type="button" variant="ghost" size="icon" onClick={onCancel} className="shrink-0">
          <ArrowLeft />
        </Button>

        {/* Entry switcher dropdown */}
        {entry && hasSiblings && onNavigateToEntry ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold leading-tight">
                    {entryTitle || contentType.displayName}
                  </h1>
                  <span className="text-xs text-muted-foreground">{contentType.displayName}</span>
                </div>
                <ChevronDown className="shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {contentType.displayName} entries
              </DropdownMenuLabel>
              <ScrollArea className="max-h-64">
                <DropdownMenuGroup>
                  {siblingEntries.map((sibling) => (
                    <DropdownMenuItem
                      key={sibling._id}
                      onClick={() => onNavigateToEntry(sibling._id)}
                      className={cn(
                        'flex items-center justify-between gap-2',
                        sibling._id === entry._id && 'bg-accent'
                      )}
                    >
                      <span className="truncate">{sibling.title}</span>
                      {sibling._id === entry._id && (
                        <Check className="shrink-0 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </ScrollArea>
              {onNavigateToNewEntry && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onNavigateToNewEntry}>
                    <Plus data-icon="inline-start" />
                    New {contentType.displayName}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">
              {entryTitle || (entry ? 'Edit' : 'Create') + ' ' + contentType.displayName}
            </h1>
            {entryTitle && (
              <span className="text-xs text-muted-foreground">{contentType.displayName}</span>
            )}
          </div>
        )}

        {entry && <CmsStatusBadge status={entry.status} />}

        {/* New entry button (shown when no dropdown or on create page) */}
        {!hasSiblings && onNavigateToNewEntry && entry && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onNavigateToNewEntry}
            className="shrink-0 text-muted-foreground"
          >
            <Plus data-icon="inline-start" />
            New
          </Button>
        )}
      </div>

      {/* Center: autosave */}
      <AutosaveIndicator
        status={autosaveStatus}
        error={autosaveError}
        retryCount={autosaveRetryCount}
        maxRetries={maxAutosaveRetries}
        isDirty={isDirty}
        onRetry={onAutosaveRetry}
      />

      {/* Right: primary actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onSave}
          disabled={isBusy}
        >
          {isSubmitting && <Spinner data-icon="inline-start" />}
          Save
        </Button>

        {entry && entry.status === 'draft' && (
          <Button
            type="button"
            onClick={onPublishClick}
            disabled={isBusy}
          >
            {isPublishing && <Spinner data-icon="inline-start" />}
            Publish
          </Button>
        )}

        {entry && entry.status === 'scheduled' && (
          <Button
            type="button"
            onClick={onPublishNow}
            disabled={isBusy}
          >
            {isPublishing && <Spinner data-icon="inline-start" />}
            Publish Now
          </Button>
        )}

        {entry && entry.status === 'published' && (
          <Button
            type="button"
            variant="outline"
            onClick={onUnpublishClick}
            disabled={isBusy}
          >
            Unpublish
          </Button>
        )}

        {entry && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                {entry.status === 'draft' && hasScheduling && (
                  <DropdownMenuItem onClick={onScheduleClick}>
                    <Clock data-icon="inline-start" />
                    Schedule
                  </DropdownMenuItem>
                )}
                {entry.status === 'scheduled' && hasScheduling && (
                  <DropdownMenuItem onClick={onCancelSchedule}>
                    Cancel Schedule
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onDuplicate}>
                  Duplicate
                </DropdownMenuItem>
                {(entry.status === 'draft' || entry.status === 'scheduled') && (
                  <DropdownMenuItem onClick={onArchive}>
                    Archive
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Mobile: toggle properties panel */}
        {onToggleProperties && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onToggleProperties}
            className="lg:hidden"
          >
            <Settings2 />
          </Button>
        )}
      </div>
    </div>
  )
}
