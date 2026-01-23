import { useState, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { CmsPageHeader } from '~/components/cmsds/CmsPageHeader'
import { CmsToolbar } from '~/components/cmsds/CmsToolbar'
import { CmsEmptyState } from '~/components/cmsds/CmsEmptyState'
import { CmsSurface } from '~/components/cmsds/CmsSurface'
import { CmsButton } from '~/components/cmsds/CmsButton'
import { CmsConfirmDialog } from '~/components/cmsds/CmsDialog'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Checkbox } from '~/components/ui/checkbox'
import { Badge } from '~/components/ui/badge'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { cn } from '~/lib/cn'
import { Search, Trash2, RotateCcw, AlertTriangle, X } from 'lucide-react'

export const Route = createFileRoute('/trash')({
  component: TrashPage,
})

interface TrashItem {
  _id: string
  contentTypeId?: string
  contentTypeName?: string
  slug?: string
  name?: string
  title?: string
  status?: string
  deletedAt: number
  deletedBy?: string
  data?: Record<string, unknown>
}

function TrashPage() {
  const [selectedContentType, setSelectedContentType] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false)
  const [isEmptying, setIsEmptying] = useState(false)
  const [emptyError, setEmptyError] = useState<string | null>(null)

  const trashQuery = useQuery(api.trash.list, {
    contentTypeId: selectedContentType || undefined,
    search: searchQuery || undefined,
    paginationOpts: { numItems: 50, cursor: null },
  })

  const configQuery = useQuery(api.trash.getConfig, {})
  const statsQuery = useQuery(api.trash.getStats, {})
  const contentTypesQuery = useQuery(api.contentTypes.list, {})

  const contentTypes = contentTypesQuery?.page ?? []

  const restoreMutation = useMutation(api.bulkOperations.bulkRestore)
  const emptyMutation = useMutation(api.trash.empty)

  const trashItems = (trashQuery?.page ?? []) as TrashItem[]
  const isLoading = trashQuery === undefined
  const config = configQuery
  const stats = statsQuery

  const handleSelectItem = useCallback((itemId: string, selected: boolean) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(itemId)
      } else {
        next.delete(itemId)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedItems.size === trashItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(trashItems.map((item) => item._id)))
    }
  }, [selectedItems.size, trashItems])

  const handleRestore = useCallback(
    async (ids: string[]) => {
      setIsRestoring(true)
      setRestoreError(null)

      try {
        await restoreMutation({ ids })
        setSelectedItems((prev) => {
          const next = new Set(prev)
          ids.forEach((id) => next.delete(id))
          return next
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to restore'
        setRestoreError(message)
      } finally {
        setIsRestoring(false)
      }
    },
    [restoreMutation]
  )

  const handleEmptyTrash = useCallback(async () => {
    setIsEmptying(true)
    setEmptyError(null)

    try {
      await emptyMutation({})
      setShowEmptyConfirm(false)
      setSelectedItems(new Set())
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to empty trash'
      setEmptyError(message)
    } finally {
      setIsEmptying(false)
    }
  }, [emptyMutation])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getDaysUntilDeletion = (deletedAt: number) => {
    if (!config?.retentionDays) return null
    const expiresAt = deletedAt + config.retentionDays * 24 * 60 * 60 * 1000
    const daysLeft = Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000))
    return Math.max(0, daysLeft)
  }

  const getItemTitle = (item: TrashItem) => {
    if (item.title) return item.title
    if (item.name) return item.name
    if (item.data) {
      const titleField = item.data.title || item.data.name
      if (titleField && typeof titleField === 'string') return titleField
    }
    return item.slug || item._id
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <CmsPageHeader
          title="Trash"
          description={`Deleted items are kept for ${config?.retentionDays ?? 30} days before permanent deletion`}
        />
        {trashItems.length > 0 && (
          <CmsButton variant="danger" onClick={() => setShowEmptyConfirm(true)}>
            <Trash2 className="size-4" />
            Empty Trash
          </CmsButton>
        )}
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2">
          <CmsSurface elevation="base" className="p-4">
            <p className="text-2xl font-semibold text-foreground">
              {stats.totalCount ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">Items in Trash</p>
          </CmsSurface>
          <CmsSurface elevation="base" className="p-4">
            <p className="text-2xl font-semibold text-foreground">
              {stats.expiredCount ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">Expired</p>
          </CmsSurface>
        </div>
      )}

      <CmsToolbar
        left={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search deleted items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9"
              />
            </div>
            <Select
              value={selectedContentType || 'all'}
              onValueChange={(v) => setSelectedContentType(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Content Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Content Types</SelectItem>
                {contentTypes.map((type) => (
                  <SelectItem key={type._id} value={type._id}>
                    {type.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {restoreError && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription className="flex items-center justify-between">
            {restoreError}
            <CmsButton
              variant="ghost"
              size="icon-sm"
              onClick={() => setRestoreError(null)}
            >
              <X className="size-4" />
            </CmsButton>
          </AlertDescription>
        </Alert>
      )}

      {emptyError && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription className="flex items-center justify-between">
            {emptyError}
            <CmsButton
              variant="ghost"
              size="icon-sm"
              onClick={() => setEmptyError(null)}
            >
              <X className="size-4" />
            </CmsButton>
          </AlertDescription>
        </Alert>
      )}

      {selectedItems.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <span className="text-sm font-medium">
            {selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'} selected
          </span>
          <CmsButton
            variant="primary"
            size="sm"
            onClick={() => handleRestore(Array.from(selectedItems))}
            loading={isRestoring}
          >
            <RotateCcw className="size-4" />
            Restore Selected
          </CmsButton>
          <CmsButton
            variant="secondary"
            size="sm"
            onClick={() => setSelectedItems(new Set())}
          >
            Clear Selection
          </CmsButton>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading trash...</p>
        </div>
      ) : trashItems.length === 0 ? (
        <CmsEmptyState
          icon={<Trash2 className="size-6" />}
          title="Trash is empty"
          description="Deleted items will appear here"
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="w-10 p-3 text-left">
                  <Checkbox
                    checked={
                      selectedItems.size === trashItems.length && trashItems.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                  Name
                </th>
                <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                  Type
                </th>
                <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                  Deleted
                </th>
                <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                  Expires In
                </th>
                <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {trashItems.map((item) => {
                const daysLeft = getDaysUntilDeletion(item.deletedAt)

                return (
                  <tr
                    key={item._id}
                    className={cn(
                      'border-b last:border-0 transition-colors hover:bg-muted/50',
                      selectedItems.has(item._id) && 'bg-primary/5'
                    )}
                  >
                    <td className="p-3">
                      <Checkbox
                        checked={selectedItems.has(item._id)}
                        onCheckedChange={(checked) =>
                          handleSelectItem(item._id, checked as boolean)
                        }
                      />
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-foreground">
                        {getItemTitle(item)}
                      </span>
                      {item.slug && (
                        <span className="block text-xs text-muted-foreground">
                          {item.slug}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {item.contentTypeName || 'Unknown'}
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(item.deletedAt)}
                      </span>
                      {item.deletedBy && (
                        <span className="block text-xs text-muted-foreground">
                          by {item.deletedBy}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {daysLeft !== null && (
                        <Badge
                          variant={daysLeft <= 3 ? 'destructive' : 'secondary'}
                          className="font-normal"
                        >
                          {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <CmsButton
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore([item._id])}
                        loading={isRestoring}
                      >
                        <RotateCcw className="size-4" />
                        Restore
                      </CmsButton>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <CmsConfirmDialog
        open={showEmptyConfirm}
        onOpenChange={setShowEmptyConfirm}
        title="Empty Trash"
        description="This will permanently delete all items in the trash. This action cannot be undone."
        confirmLabel={isEmptying ? 'Deleting...' : 'Empty Trash'}
        onConfirm={handleEmptyTrash}
        variant="danger"
        loading={isEmptying}
      />
    </div>
  )
}
