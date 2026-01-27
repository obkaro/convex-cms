import { useState, useCallback, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { FieldWrapper } from './FieldWrapper'
import type { BaseFieldProps } from './types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Badge } from '~/components/ui/badge'
import { CmsButton } from '~/components/cmsds/CmsButton'
import { CmsStatusBadge, type ContentStatus } from '~/components/cmsds/CmsStatusBadge'
import { CmsEmptyState } from '~/components/cmsds/CmsEmptyState'
import { cn } from '~/lib/cn'
import { FileText, Link2, X, Check, Plus } from 'lucide-react'

export interface ReferenceFieldProps extends BaseFieldProps<string | string[] | null> {
  placeholder?: string
}

function getEntryDisplayTitle(entry: {
  data?: Record<string, unknown>
  slug?: string
  _id: string
}): string {
  const titleFields = ['title', 'name', 'heading', 'label']
  for (const field of titleFields) {
    const value = entry.data?.[field]
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }
  return entry.slug || entry._id
}

export function ReferenceField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id,
  placeholder = 'Select content...',
}: ReferenceFieldProps) {
  const fieldId = id || `field-${field.name}`
  const [showPicker, setShowPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('')

  const allowedContentTypes = field.options?.allowedContentTypes ?? []
  const allowMultiple = field.options?.multiple ?? false

  const selectedIds = useMemo(() => {
    if (!value) return []
    return Array.isArray(value) ? value : [value]
  }, [value])

  const contentTypes = useQuery(api.admin.listContentTypes, {
    isActive: true,
    includeEntryCounts: false,
  })

  const filteredContentTypes = useMemo(() => {
    if (!contentTypes?.page) return []
    if (allowedContentTypes.length === 0) return contentTypes.page
    return contentTypes.page.filter(
      (ct) =>
        allowedContentTypes.includes(ct.name) ||
        allowedContentTypes.includes(ct._id)
    )
  }, [contentTypes?.page, allowedContentTypes])

  const selectedEntry = useQuery(
    api.admin.getEntry,
    selectedIds.length === 1 ? { id: selectedIds[0] } : 'skip'
  )

  const selectedEntries = useQuery(
    api.admin.listEntries,
    selectedIds.length > 1
      ? {
          paginationOpts: { numItems: 100, cursor: null },
        }
      : 'skip'
  )

  const multipleSelectedEntries = useMemo(() => {
    if (!selectedEntries?.page || selectedIds.length <= 1) return []
    return selectedEntries.page.filter((entry) => selectedIds.includes(entry._id))
  }, [selectedEntries?.page, selectedIds])

  const entriesResult = useQuery(
    api.admin.listEntries,
    showPicker
      ? {
          contentTypeName: contentTypeFilter || undefined,
          search: searchQuery || undefined,
          paginationOpts: { numItems: 50, cursor: null },
        }
      : 'skip'
  )

  const filteredEntries = useMemo(() => {
    if (!entriesResult?.page) return []
    if (allowedContentTypes.length === 0) return entriesResult.page

    const allowedNames = filteredContentTypes.map((ct) => ct.name)
    return entriesResult.page.filter((entry) =>
      allowedNames.includes(entry.contentTypeName)
    )
  }, [entriesResult?.page, allowedContentTypes, filteredContentTypes])

  const getContentTypeDisplayName = useCallback(
    (contentTypeName: string) => {
      const ct = contentTypes?.page?.find((c) => c.name === contentTypeName)
      return ct?.displayName || ct?.name || 'Unknown'
    },
    [contentTypes?.page]
  )

  const handleSelect = useCallback(
    (entryId: string) => {
      if (allowMultiple) {
        if (selectedIds.includes(entryId)) {
          const newIds = selectedIds.filter((id) => id !== entryId)
          onChange(newIds.length > 0 ? newIds : null)
        } else {
          onChange([...selectedIds, entryId])
        }
      } else {
        onChange(entryId)
        setShowPicker(false)
      }
    },
    [allowMultiple, selectedIds, onChange]
  )

  const handleRemove = useCallback(
    (entryId: string) => {
      if (allowMultiple) {
        const newIds = selectedIds.filter((id) => id !== entryId)
        onChange(newIds.length > 0 ? newIds : null)
      } else {
        onChange(null)
      }
    },
    [allowMultiple, selectedIds, onChange]
  )

  const handleClear = useCallback(() => {
    onChange(null)
  }, [onChange])

  const renderSelectedEntry = (
    entry: {
      _id: string
      data?: Record<string, unknown>
      slug?: string
      status: string
      contentTypeName: string
    },
    showRemove = true
  ) => (
    <div
      key={entry._id}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <FileText className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {getEntryDisplayTitle(entry)}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {getContentTypeDisplayName(entry.contentTypeName)}
          </span>
          <CmsStatusBadge status={entry.status as ContentStatus} />
        </div>
      </div>
      {showRemove && !disabled && !readOnly && (
        <CmsButton
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation()
            handleRemove(entry._id)
          }}
          title="Remove reference"
        >
          <X className="size-4" />
        </CmsButton>
      )}
    </div>
  )

  return (
    <FieldWrapper field={field} error={error} className={className} id={fieldId}>
      <div className="space-y-2">
        {selectedIds.length > 0 ? (
          <div className="space-y-2">
            {selectedIds.length === 1 && selectedEntry && renderSelectedEntry(selectedEntry)}

            {selectedIds.length > 1 && multipleSelectedEntries.length > 0 && (
              <div className="space-y-2">
                {multipleSelectedEntries.map((entry) => renderSelectedEntry(entry))}
              </div>
            )}

            {!disabled && !readOnly && (
              <div className="flex items-center gap-2">
                <CmsButton
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPicker(true)}
                >
                  <Plus className="size-4" />
                  {allowMultiple ? 'Add more' : 'Change'}
                </CmsButton>
                {selectedIds.length > 1 && (
                  <CmsButton variant="ghost" size="sm" onClick={handleClear}>
                    Clear all
                  </CmsButton>
                )}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            className={cn(
              'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 text-center transition-colors',
              'hover:border-primary/50 hover:bg-muted/50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            onClick={() => setShowPicker(true)}
            disabled={disabled || readOnly}
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Link2 className="size-5 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">{placeholder}</span>
            <span className="text-xs text-muted-foreground">
              Click to select {allowMultiple ? 'content entries' : 'a content entry'}
            </span>
          </button>
        )}
      </div>

      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Select Content</DialogTitle>
          </DialogHeader>

          <Command className="border-none">
            <div className="flex items-center gap-2 border-b px-3 pb-2">
              <CommandInput
                placeholder="Search entries..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="border-none shadow-none focus:ring-0"
              />
              {filteredContentTypes.length > 1 && (
                <Select
                  value={contentTypeFilter || 'all'}
                  onValueChange={(v) => setContentTypeFilter(v === 'all' ? '' : v)}
                >
                  <SelectTrigger className="h-8 w-[120px] shrink-0">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {filteredContentTypes.map((ct) => (
                      <SelectItem key={ct._id} value={ct._id}>
                        {ct.displayName || ct.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <CommandList className="max-h-[300px]">
              {entriesResult === undefined ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="size-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
                  <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : filteredEntries.length > 0 ? (
                <CommandGroup>
                  {filteredEntries.map((entry) => {
                    const isSelected = selectedIds.includes(entry._id)
                    return (
                      <CommandItem
                        key={entry._id}
                        value={entry._id}
                        onSelect={() => handleSelect(entry._id)}
                        className="cursor-pointer"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted">
                          <FileText className="size-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {getEntryDisplayTitle(entry)}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {getContentTypeDisplayName(entry.contentTypeName)}
                            </span>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'px-1.5 py-0 text-[10px]',
                                entry.status === 'published' && 'status-published',
                                entry.status === 'draft' && 'status-draft',
                                entry.status === 'scheduled' && 'status-scheduled',
                                entry.status === 'archived' && 'status-archived'
                              )}
                            >
                              {entry.status}
                            </Badge>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="size-4 shrink-0 text-primary" />
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ) : (
                <CommandEmpty>
                  <CmsEmptyState
                    icon={<Link2 className="size-6" />}
                    title="No content found"
                    description={
                      searchQuery
                        ? 'Try adjusting your search'
                        : 'Create some content entries first'
                    }
                    className="py-6"
                  />
                </CommandEmpty>
              )}
            </CommandList>
          </Command>

          <DialogFooter className="border-t px-4 py-3">
            {allowMultiple && selectedIds.length > 0 && (
              <span className="mr-auto text-sm text-muted-foreground">
                {selectedIds.length} selected
              </span>
            )}
            <CmsButton variant="secondary" onClick={() => setShowPicker(false)}>
              {allowMultiple ? 'Done' : 'Cancel'}
            </CmsButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FieldWrapper>
  )
}
