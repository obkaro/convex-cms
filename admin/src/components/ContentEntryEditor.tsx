import { useState, useCallback, useEffect, useRef } from 'react'
import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { useApi } from '../embed/contexts/ApiContext'
import { VersionHistory } from './VersionHistory'
import type { FieldDefinition, FieldError } from './fields/types'
import { parseServerError, isRetryableError } from '../utils'
import { useSettingsConfig } from '../contexts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
import {
  EditorToolbar,
  EditorContentPanel,
  EditorPropertiesPanel,
  ScheduleModal,
  PublishConfirmModal,
  DeleteConfirmModal,
} from './editor'
import { Sheet, SheetContent, SheetTitle } from './ui/sheet'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer'

// --- Utility functions ---

function formatDateTimeLocal(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function parseDateTimeLocal(value: string): number {
  return new Date(value).getTime()
}

function formatDateOnly(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function transformDataForUI(
  data: Record<string, unknown>,
  fields: FieldDefinition[]
): Record<string, unknown> {
  const transformed = { ...data }
  for (const field of fields) {
    const value = data[field.name]
    if (
      (field.type === 'date' || field.type === 'datetime') &&
      typeof value === 'number'
    ) {
      transformed[field.name] =
        field.type === 'datetime'
          ? formatDateTimeLocal(value)
          : formatDateOnly(value)
    }
  }
  return transformed
}

function transformDataForBackend(
  data: Record<string, unknown>,
  fields: FieldDefinition[]
): Record<string, unknown> {
  const transformed = { ...data }
  for (const field of fields) {
    const value = data[field.name]
    if (field.type === 'date' || field.type === 'datetime') {
      if (typeof value === 'string' && value) {
        transformed[field.name] = new Date(value).getTime()
      } else if (!value) {
        transformed[field.name] = null
      }
    }
  }
  return transformed
}

// --- Types ---

export interface ContentType {
  _id: string
  name: string
  displayName: string
  description?: string
  fields: FieldDefinition[]
  titleField?: string
  slugField?: string
  singleton?: boolean
  isActive: boolean
}

export interface ContentEntry {
  _id: string
  contentTypeName: string
  slug: string
  status: 'draft' | 'published' | 'scheduled' | 'archived'
  data: Record<string, unknown>
  version: number
  scheduledPublishAt?: number
  firstPublishedAt?: number
  lastPublishedAt?: number
}

interface ContentEntryEditorProps {
  contentType: ContentType
  entry?: ContentEntry
  onSave?: (entry: ContentEntry) => void
  onCancel?: () => void
  onDelete?: () => void
  onNavigateToEntry?: (entryId: string) => void
  onNavigateToNewEntry?: () => void
  siblingEntries?: Array<{ _id: string; title: string }>
  autosaveEnabled?: boolean
  autosaveInterval?: number
  canDelete?: boolean
}

// --- Main Component ---

export function ContentEntryEditor({
  contentType,
  entry,
  onSave,
  onCancel,
  onDelete,
  onNavigateToEntry,
  onNavigateToNewEntry,
  siblingEntries,
  autosaveEnabled = true,
  autosaveInterval = 30000,
  canDelete: canDeleteProp = false,
}: ContentEntryEditorProps) {
  const { settings } = useSettingsConfig()

  // --- Initial data ---

  const getInitialData = useCallback(() => {
    if (entry) {
      return transformDataForUI({ ...entry.data }, contentType.fields)
    }

    const defaults: Record<string, unknown> = {}
    for (const field of contentType.fields) {
      if (field.defaultValue !== undefined) {
        defaults[field.name] = field.defaultValue
      } else {
        switch (field.type) {
          case 'text':
          case 'richText':
            defaults[field.name] = ''
            break
          case 'boolean':
            defaults[field.name] = false
            break
          case 'number':
          case 'date':
          case 'datetime':
          case 'reference':
          case 'media':
          case 'json':
            defaults[field.name] = null
            break
          case 'select':
            defaults[field.name] = ''
            break
          case 'multiSelect':
            defaults[field.name] = []
            break
        }
      }
    }
    return defaults
  }, [contentType.fields, entry])

  // --- State ---

  const [formData, setFormData] = useState<Record<string, unknown>>(getInitialData)
  const [fieldErrors, setFieldErrors] = useState<Record<string, FieldError>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [_lastSavedData, setLastSavedData] = useState<Record<string, unknown> | null>(
    entry ? { ...entry.data } : null
  )
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [autosaveError, setAutosaveError] = useState<string | null>(null)
  const [autosaveRetryCount, setAutosaveRetryCount] = useState(0)
  const maxAutosaveRetries = 3

  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleDateTime, setScheduleDateTime] = useState<string>(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return formatDateTimeLocal(tomorrow.getTime())
  })
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'publish' | 'unpublish' | null>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showMobileProperties, setShowMobileProperties] = useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const formDataRef = useRef(formData)
  formDataRef.current = formData

  // --- Mutations ---

  const api = useApi()
  const createEntry = useMutation(api.createEntry)
  const updateEntry = useMutation(api.updateEntry)
  const publishEntry = useMutation(api.publishEntry)
  const unpublishEntry = useMutation(api.unpublishEntry)
  const scheduleEntry = useMutation(api.scheduleEntry)
  const cancelScheduleEntry = useMutation(api.cancelScheduledEntry)
  const deleteEntryMutation = useMutation(api.deleteEntry)
  const duplicateEntryMutation = useMutation(api.duplicateEntry)

  // --- Effects ---

  useEffect(() => {
    const newData = getInitialData()
    setFormData(newData)
    setFieldErrors({})
    setIsDirty(false)
    setLastSavedData(entry ? { ...entry.data } : null)
  }, [entry?._id, getInitialData])

  // --- Field handling ---

  const handleFieldChange = useCallback((fieldName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }))
    setIsDirty(true)
    setFieldErrors((prev) => {
      if (prev[fieldName]) {
        const { [fieldName]: _removed, ...rest } = prev
        return rest
      }
      return prev
    })
  }, [])

  // --- Validation ---

  const validateForm = useCallback(async (): Promise<boolean> => {
    const errors: Record<string, FieldError> = {}

    for (const field of contentType.fields) {
      const value = formData[field.name]

      if (field.required) {
        const isEmpty =
          value === null ||
          value === undefined ||
          value === '' ||
          (Array.isArray(value) && value.length === 0)

        if (isEmpty) {
          errors[field.name] = { message: `${field.label} is required`, code: 'REQUIRED' }
          continue
        }
      }

      if (value !== null && value !== undefined && value !== '') {
        switch (field.type) {
          case 'text': {
            const strValue = String(value)
            const opts = field.options
            if (opts?.minLength && strValue.length < opts.minLength) {
              errors[field.name] = { message: `Minimum ${opts.minLength} characters required`, code: 'MIN_LENGTH' }
            } else if (opts?.maxLength && strValue.length > opts.maxLength) {
              errors[field.name] = { message: `Maximum ${opts.maxLength} characters allowed`, code: 'MAX_LENGTH' }
            } else if (opts?.pattern) {
              const regex = new RegExp(opts.pattern)
              if (!regex.test(strValue)) {
                errors[field.name] = { message: 'Value does not match the required format', code: 'PATTERN_MISMATCH' }
              }
            }
            break
          }
          case 'number': {
            const numValue = Number(value)
            const opts = field.options
            if (isNaN(numValue)) {
              errors[field.name] = { message: 'Must be a valid number', code: 'INVALID_TYPE' }
            } else {
              if (opts?.min !== undefined && numValue < opts.min) {
                errors[field.name] = { message: `Minimum value is ${opts.min}`, code: 'MIN_VALUE' }
              } else if (opts?.max !== undefined && numValue > opts.max) {
                errors[field.name] = { message: `Maximum value is ${opts.max}`, code: 'MAX_VALUE' }
              } else if (opts?.precision === 0 && !Number.isInteger(numValue)) {
                errors[field.name] = { message: 'Must be a whole number', code: 'NOT_INTEGER' }
              }
            }
            break
          }
          case 'select': {
            const opts = field.options
            if (opts?.options && !opts.options.some((o) => o.value === value)) {
              errors[field.name] = { message: 'Please select a valid option', code: 'INVALID_OPTION' }
            }
            break
          }
          case 'multiSelect': {
            const opts = field.options
            if (Array.isArray(value) && opts?.options) {
              const validValues = opts.options.map((o) => o.value)
              const invalid = value.filter((v) => !validValues.includes(String(v)))
              if (invalid.length > 0) {
                errors[field.name] = { message: 'Contains invalid options', code: 'INVALID_OPTION' }
              }
            }
            break
          }
        }
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [contentType.fields, formData])

  // --- Autosave ---

  const autosaveDraft = useCallback(
    async (retryAttempt = 0) => {
      if (!isDirty || !entry) return
      if (entry.status !== 'draft') return

      try {
        setAutosaveStatus('saving')
        setAutosaveError(null)

        await updateEntry({
          id: entry._id,
          data: transformDataForBackend(formDataRef.current, contentType.fields),
        })

        setLastSavedData({ ...formDataRef.current })
        setAutosaveStatus('saved')
        setIsDirty(false)
        setAutosaveRetryCount(0)
        setTimeout(() => setAutosaveStatus('idle'), 3000)
      } catch (error) {
        console.error('Autosave failed:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to save'
        const canRetry = isRetryableError(error) && retryAttempt < maxAutosaveRetries

        if (canRetry) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryAttempt), 10000)
          setAutosaveStatus('error')
          setAutosaveError(`Save failed, retrying in ${Math.round(retryDelay / 1000)}s...`)
          setAutosaveRetryCount(retryAttempt + 1)
          setTimeout(() => autosaveDraft(retryAttempt + 1), retryDelay)
        } else {
          setAutosaveStatus('error')
          setAutosaveError(errorMessage)
          setAutosaveRetryCount(0)
        }
      }
    },
    [isDirty, entry, updateEntry, maxAutosaveRetries]
  )

  const handleAutosaveRetry = useCallback(() => {
    setAutosaveRetryCount(0)
    autosaveDraft(0)
  }, [autosaveDraft])

  useEffect(() => {
    if (!autosaveEnabled || !entry || entry.status !== 'draft') return
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    if (isDirty) {
      autosaveTimerRef.current = setTimeout(() => autosaveDraft(), autosaveInterval)
    }
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    }
  }, [autosaveEnabled, autosaveInterval, isDirty, entry, autosaveDraft])

  // --- Handlers ---

  const handleSubmit = useCallback(async () => {
    const isValid = await validateForm()
    if (!isValid) return

    setIsSubmitting(true)
    try {
      let savedEntry: ContentEntry
      const dataForBackend = transformDataForBackend(formData, contentType.fields)

      if (entry) {
        savedEntry = (await updateEntry({ id: entry._id, data: dataForBackend })) as ContentEntry
      } else {
        savedEntry = (await createEntry({
          contentTypeName: contentType.name,
          data: dataForBackend,
        })) as ContentEntry
      }

      setIsDirty(false)
      setLastSavedData({ ...formData })
      toast.success('Changes saved')
      onSave?.(savedEntry)
    } catch (error) {
      const { fieldErrors: serverFieldErrors, generalError } = parseServerError(error)
      const message = generalError ?? (error instanceof Error ? error.message : 'Failed to save entry')
      toast.error('Failed to save', { description: message })
      if (Object.keys(serverFieldErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...serverFieldErrors }))
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [validateForm, entry, formData, contentType.fields, contentType.name, contentType._id, createEntry, updateEntry, onSave])

  const handleCancel = useCallback(() => {
    if (isDirty) {
      setShowUnsavedWarning(true)
      return
    }
    onCancel?.()
  }, [isDirty, onCancel])

  const handleConfirmLeave = useCallback(() => {
    setShowUnsavedWarning(false)
    onCancel?.()
  }, [onCancel])

  const handlePublishClick = useCallback(() => {
    setConfirmAction('publish')
    setShowConfirmModal(true)
  }, [])

  const handleUnpublishClick = useCallback(() => {
    setConfirmAction('unpublish')
    setShowConfirmModal(true)
  }, [])

  const handleConfirmAction = useCallback(async () => {
    if (!entry || !confirmAction) return
    setShowConfirmModal(false)
    setIsPublishing(true)
    setPublishError(null)

    try {
      if (confirmAction === 'publish') {
        const publishedEntry = (await publishEntry({ id: entry._id, changeDescription: 'Published from editor' })) as ContentEntry
        toast.success('Entry published')
        onSave?.(publishedEntry)
      } else {
        const draftEntry = (await unpublishEntry({ id: entry._id })) as ContentEntry
        toast.success('Entry unpublished')
        onSave?.(draftEntry)
      }
    } catch (error) {
      toast.error(`Failed to ${confirmAction}`, { description: error instanceof Error ? error.message : undefined })
    } finally {
      setIsPublishing(false)
      setConfirmAction(null)
    }
  }, [entry, confirmAction, publishEntry, unpublishEntry, onSave])

  const handlePublishNow = useCallback(async () => {
    if (!entry) return
    setIsPublishing(true)
    try {
      const publishedEntry = (await publishEntry({ id: entry._id, changeDescription: 'Published from editor' })) as ContentEntry
      toast.success('Entry published')
      onSave?.(publishedEntry)
    } catch (error) {
      toast.error('Failed to publish', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setIsPublishing(false)
    }
  }, [entry, publishEntry, onSave])

  const handleSchedule = useCallback(async () => {
    if (!entry) return
    const publishAt = parseDateTimeLocal(scheduleDateTime)
    if (publishAt < Date.now() + 60 * 1000) {
      setPublishError('Schedule time must be at least 1 minute in the future')
      return
    }
    setIsPublishing(true)
    setPublishError(null)
    try {
      const scheduledEntry = (await scheduleEntry({ id: entry._id, publishAt })) as ContentEntry
      setShowScheduleModal(false)
      onSave?.(scheduledEntry)
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : 'Failed to schedule')
    } finally {
      setIsPublishing(false)
    }
  }, [entry, scheduleDateTime, scheduleEntry, onSave])

  const handleCancelSchedule = useCallback(async () => {
    if (!entry) return
    setIsPublishing(true)
    setPublishError(null)
    try {
      const draftEntry = (await cancelScheduleEntry({ id: entry._id })) as ContentEntry
      onSave?.(draftEntry)
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : 'Failed to cancel schedule')
    } finally {
      setIsPublishing(false)
    }
  }, [entry, cancelScheduleEntry, onSave])

  const handleDeleteClick = useCallback(() => {
    setDeleteError(null)
    setShowDeleteModal(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!entry) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteEntryMutation({ id: entry._id, hardDelete: false })
      setShowDeleteModal(false)
      onDelete?.()
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete entry')
    } finally {
      setIsDeleting(false)
    }
  }, [entry, deleteEntryMutation, onDelete])

  const handleDuplicate = useCallback(async () => {
    if (!entry) return
    setIsDuplicating(true)
    try {
      const duplicatedEntry = (await duplicateEntryMutation({ sourceEntryId: entry._id })) as ContentEntry
      toast.success('Entry duplicated')
      onSave?.(duplicatedEntry)
    } catch (error) {
      toast.error('Failed to duplicate', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setIsDuplicating(false)
    }
  }, [entry, duplicateEntryMutation, onSave])

  const handleArchive = useCallback(async () => {
    if (!entry) return
    setIsArchiving(true)
    try {
      const archivedEntry = (await updateEntry({ id: entry._id, status: 'archived' })) as ContentEntry
      toast.success('Entry archived')
      onSave?.(archivedEntry)
    } catch (error) {
      toast.error('Failed to archive', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setIsArchiving(false)
    }
  }, [entry, updateEntry, onSave])

  // --- Derived ---

  const entryTitle = contentType.titleField
    ? (formData[contentType.titleField] as string) || undefined
    : undefined

  const hasScheduling = !!settings?.features.scheduling
  const hasVersioning = !!settings?.features.versioning

  // --- Render ---

  return (
    <div className="flex h-full flex-col">
      {/* Sticky Toolbar */}
      <EditorToolbar
        contentType={contentType}
        entry={entry}
        entryTitle={entryTitle}
        isDirty={isDirty}
        isSubmitting={isSubmitting}
        isPublishing={isPublishing}
        autosaveStatus={autosaveStatus}
        autosaveError={autosaveError}
        autosaveRetryCount={autosaveRetryCount}
        maxAutosaveRetries={maxAutosaveRetries}
        canDelete={canDeleteProp}
        hasScheduling={hasScheduling}
        onSave={handleSubmit}
        onCancel={handleCancel}
        onPublishClick={handlePublishClick}
        onUnpublishClick={handleUnpublishClick}
        onScheduleClick={() => setShowScheduleModal(true)}
        onCancelSchedule={handleCancelSchedule}
        onPublishNow={handlePublishNow}
        onDuplicate={handleDuplicate}
        onArchive={handleArchive}
        onDelete={handleDeleteClick}
        onAutosaveRetry={handleAutosaveRetry}
        onToggleProperties={() => setShowMobileProperties(true)}
        siblingEntries={siblingEntries}
        onNavigateToEntry={onNavigateToEntry}
        onNavigateToNewEntry={onNavigateToNewEntry}
      />

      {/* Unsaved changes warning */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes that will be lost if you leave.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLeave} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Two-panel layout — each panel scrolls independently */}
      <div className="flex min-h-0 flex-1">
        {/* Content panel — independent scroll */}
        <div className="min-w-0 flex-1 overflow-y-auto p-6">
          <EditorContentPanel
            fields={contentType.fields as FieldDefinition[]}
            formData={formData}
            fieldErrors={fieldErrors}
            isSubmitting={isSubmitting}
            onFieldChange={handleFieldChange}
          />
        </div>

        {/* Properties panel — independent scroll, desktop only */}
        {entry && (
          <aside className="hidden w-80 shrink-0 overflow-y-auto border-l p-6 lg:block">
            <EditorPropertiesPanel
              entry={entry}
              hasScheduling={hasScheduling}
              hasVersioning={hasVersioning}
              canDelete={canDeleteProp}
              isSubmitting={isSubmitting}
              isPublishing={isPublishing}
              isDuplicating={isDuplicating}
              isArchiving={isArchiving}
              isDeleting={isDeleting}
              onPublishClick={handlePublishClick}
              onUnpublishClick={handleUnpublishClick}
              onScheduleClick={() => setShowScheduleModal(true)}
              onCancelSchedule={handleCancelSchedule}
              onPublishNow={handlePublishNow}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onDelete={handleDeleteClick}
              onViewHistory={() => setShowVersionHistory(true)}
            />
          </aside>
        )}
      </div>

      {/* Mobile properties drawer (bottom sheet) */}
      {entry && (
        <Drawer open={showMobileProperties} onOpenChange={setShowMobileProperties}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Properties</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6">
              <EditorPropertiesPanel
                entry={entry}
                hasScheduling={hasScheduling}
                hasVersioning={hasVersioning}
                canDelete={canDeleteProp}
                isSubmitting={isSubmitting}
                isPublishing={isPublishing}
                isDuplicating={isDuplicating}
                isArchiving={isArchiving}
                isDeleting={isDeleting}
                onPublishClick={handlePublishClick}
                onUnpublishClick={handleUnpublishClick}
                onScheduleClick={() => setShowScheduleModal(true)}
                onCancelSchedule={handleCancelSchedule}
                onPublishNow={handlePublishNow}
                onDuplicate={handleDuplicate}
                onArchive={handleArchive}
                onDelete={handleDeleteClick}
                onViewHistory={() => setShowVersionHistory(true)}
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Version History sheet */}
      {hasVersioning && entry && (
        <Sheet open={showVersionHistory} onOpenChange={setShowVersionHistory}>
          <SheetContent side="right" className="w-96 sm:w-[420px]">
            <SheetTitle>Version History</SheetTitle>
            <VersionHistory
              entryId={entry._id}
              currentVersion={entry.version}
              onRollbackComplete={() => setShowVersionHistory(false)}
              onClose={() => setShowVersionHistory(false)}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Modals */}
      {hasScheduling && (
        <ScheduleModal
          open={showScheduleModal}
          onOpenChange={setShowScheduleModal}
          scheduleDateTime={scheduleDateTime}
          onScheduleDateTimeChange={setScheduleDateTime}
          onSchedule={handleSchedule}
          isPublishing={isPublishing}
          publishError={publishError}
          minDateTime={formatDateTimeLocal(Date.now() + 60 * 1000)}
        />
      )}

      <PublishConfirmModal
        open={showConfirmModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowConfirmModal(false)
            setConfirmAction(null)
          }
        }}
        action={confirmAction}
        onConfirm={handleConfirmAction}
        isPublishing={isPublishing}
      />

      <DeleteConfirmModal
        open={showDeleteModal}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setShowDeleteModal(false)
            setDeleteError(null)
          }
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        error={deleteError}
      />
    </div>
  )
}
