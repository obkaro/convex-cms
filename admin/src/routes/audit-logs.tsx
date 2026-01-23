import { useState, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AuditLogEntry } from '../components/AuditLogEntry'
import { CmsPageHeader } from '~/components/cmsds/CmsPageHeader'
import { CmsToolbar } from '~/components/cmsds/CmsToolbar'
import { CmsEmptyState } from '~/components/cmsds/CmsEmptyState'
import { CmsSurface } from '~/components/cmsds/CmsSurface'
import { CmsButton } from '~/components/cmsds/CmsButton'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { ScrollArea } from '~/components/ui/scroll-area'
import { cn } from '~/lib/cn'
import {
  History,
  FileText,
  FolderOpen,
  Image,
  Folder,
  Settings,
  ChevronRight,
} from 'lucide-react'

export const Route = createFileRoute('/audit-logs')({
  component: AuditLogsPage,
})

type ResourceType =
  | 'contentEntry'
  | 'contentType'
  | 'mediaAsset'
  | 'mediaFolder'
  | 'settings'
type ActionType =
  | 'created'
  | 'updated'
  | 'published'
  | 'unpublished'
  | 'deleted'
  | 'restored'
  | 'duplicated'
  | 'scheduled'
  | 'locked'
  | 'unlocked'
  | 'rolledBack'
  | 'migrated'

interface AuditLog {
  _id: string
  resourceType: ResourceType
  resourceId: string
  action: ActionType
  userId?: string
  contentTypeName?: string
  changes?: Record<string, unknown>
  previousState?: Record<string, unknown>
  newState?: Record<string, unknown>
  metadata?: Record<string, unknown>
  _creationTime: number
}

const RESOURCE_TYPES: { value: ResourceType | ''; label: string }[] = [
  { value: '', label: 'All Resources' },
  { value: 'contentEntry', label: 'Content Entries' },
  { value: 'contentType', label: 'Content Types' },
  { value: 'mediaAsset', label: 'Media Assets' },
  { value: 'mediaFolder', label: 'Media Folders' },
  { value: 'settings', label: 'Settings' },
]

const ACTION_TYPES: { value: ActionType | ''; label: string }[] = [
  { value: '', label: 'All Actions' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished', label: 'Unpublished' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'restored', label: 'Restored' },
  { value: 'duplicated', label: 'Duplicated' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'locked', label: 'Locked' },
  { value: 'unlocked', label: 'Unlocked' },
  { value: 'rolledBack', label: 'Rolled Back' },
  { value: 'migrated', label: 'Migrated' },
]

const ACTION_COLORS: Record<ActionType, string> = {
  created: 'text-emerald-600 dark:text-emerald-500',
  updated: 'text-blue-600 dark:text-blue-500',
  published: 'text-emerald-600 dark:text-emerald-500',
  unpublished: 'text-amber-600 dark:text-amber-500',
  deleted: 'text-red-600 dark:text-red-500',
  restored: 'text-emerald-600 dark:text-emerald-500',
  duplicated: 'text-indigo-600 dark:text-indigo-500',
  scheduled: 'text-violet-600 dark:text-violet-500',
  locked: 'text-amber-600 dark:text-amber-500',
  unlocked: 'text-emerald-600 dark:text-emerald-500',
  rolledBack: 'text-orange-600 dark:text-orange-500',
  migrated: 'text-cyan-600 dark:text-cyan-500',
}

function AuditLogsPage() {
  const [filters, setFilters] = useState({
    resourceType: '' as ResourceType | '',
    action: '' as ActionType | '',
    userId: '',
    contentTypeName: '',
    dateRange: 'all' as 'all' | 'today' | 'week' | 'month',
  })
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [cursor, setCursor] = useState<string | undefined>()

  const getDateRange = useCallback(() => {
    const now = Date.now()
    switch (filters.dateRange) {
      case 'today': {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        return { startDate: startOfDay.getTime(), endDate: now }
      }
      case 'week': {
        return { startDate: now - 7 * 24 * 60 * 60 * 1000, endDate: now }
      }
      case 'month': {
        return { startDate: now - 30 * 24 * 60 * 60 * 1000, endDate: now }
      }
      default:
        return {}
    }
  }, [filters.dateRange])

  const dateRange = getDateRange()

  const logsQuery = useQuery(api.auditLogs.list, {
    resourceType: filters.resourceType || undefined,
    action: filters.action || undefined,
    userId: filters.userId || undefined,
    contentTypeName: filters.contentTypeName || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    limit: 50,
    cursor,
  })

  const statsQuery = useQuery(api.auditLogs.getStats, {
    resourceType: filters.resourceType || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  })

  const logs = (logsQuery?.logs ?? []) as AuditLog[]
  const nextCursor = logsQuery?.nextCursor
  const isLoading = logsQuery === undefined
  const stats = statsQuery

  const handleFilterChange = useCallback(
    (field: keyof typeof filters, value: string) => {
      setFilters((prev) => ({ ...prev, [field]: value }))
      setCursor(undefined)
    },
    []
  )

  const handleLoadMore = useCallback(() => {
    if (nextCursor) {
      setCursor(nextCursor)
    }
  }, [nextCursor])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getResourceIcon = (resourceType: ResourceType) => {
    const icons: Record<ResourceType, React.ReactNode> = {
      contentEntry: <FileText className="size-4" />,
      contentType: <FolderOpen className="size-4" />,
      mediaAsset: <Image className="size-4" />,
      mediaFolder: <Folder className="size-4" />,
      settings: <Settings className="size-4" />,
    }
    return icons[resourceType] || <FileText className="size-4" />
  }

  return (
    <div className="space-y-6 p-6">
      <CmsPageHeader
        title="Audit Logs"
        description="Track all changes across your content management system"
      />

      {stats && (
        <div className="grid gap-4 sm:grid-cols-5">
          <CmsSurface elevation="base" className="p-4">
            <p className="text-2xl font-semibold text-foreground">
              {stats.totalCount ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">Total Events</p>
          </CmsSurface>
          <CmsSurface elevation="base" className="p-4">
            <p className="text-2xl font-semibold text-emerald-600">
              {stats.actionCounts?.created ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">Created</p>
          </CmsSurface>
          <CmsSurface elevation="base" className="p-4">
            <p className="text-2xl font-semibold text-blue-600">
              {stats.actionCounts?.updated ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">Updated</p>
          </CmsSurface>
          <CmsSurface elevation="base" className="p-4">
            <p className="text-2xl font-semibold text-emerald-600">
              {stats.actionCounts?.published ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">Published</p>
          </CmsSurface>
          <CmsSurface elevation="base" className="p-4">
            <p className="text-2xl font-semibold text-red-600">
              {stats.actionCounts?.deleted ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">Deleted</p>
          </CmsSurface>
        </div>
      )}

      <CmsToolbar
        left={
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={filters.resourceType}
              onValueChange={(v) => handleFilterChange('resourceType', v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Resources" />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.action}
              onValueChange={(v) => handleFilterChange('action', v)}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.dateRange}
              onValueChange={(v) => handleFilterChange('dateRange', v)}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="text"
              placeholder="Filter by content type"
              value={filters.contentTypeName}
              onChange={(e) => handleFilterChange('contentTypeName', e.target.value)}
              className="w-48"
            />
          </div>
        }
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading audit logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <CmsEmptyState
          icon={<History className="size-6" />}
          title="No audit logs found"
          description="No audit logs found matching your filters."
        />
      ) : (
        <CmsSurface elevation="base" className="overflow-hidden">
          <ScrollArea className="max-h-[600px]">
            <div className="divide-y">
              {logs.map((log) => (
                <div
                  key={log._id}
                  className={cn(
                    'flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-muted/50',
                    selectedLog?._id === log._id && 'bg-primary/5'
                  )}
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    {getResourceIcon(log.resourceType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn('text-sm font-medium capitalize', ACTION_COLORS[log.action])}
                      >
                        {log.action}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {log.resourceType}
                      </span>
                      {log.contentTypeName && (
                        <span className="text-xs text-muted-foreground">
                          ({log.contentTypeName})
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(log._creationTime)}</span>
                      {log.userId && <span>by {log.userId}</span>}
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </div>
              ))}
            </div>
          </ScrollArea>

          {nextCursor && (
            <div className="border-t p-4">
              <CmsButton
                variant="secondary"
                className="w-full"
                onClick={handleLoadMore}
              >
                Load More
              </CmsButton>
            </div>
          )}
        </CmsSurface>
      )}

      {selectedLog && (
        <AuditLogEntry logId={selectedLog._id} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  )
}
