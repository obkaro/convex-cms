import { useState, useCallback, useEffect, useRef } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { FieldRenderer } from './fields/FieldRenderer'
import { VersionHistory } from './VersionHistory'
import type { FieldDefinition, FieldError } from './fields/types'
import { parseServerError, isRetryableError } from '~/utils'
import { CmsButton } from '~/components/cmsds/CmsButton'
import { CmsStatusBadge } from '~/components/cmsds/CmsStatusBadge'
import { CmsDialog, CmsConfirmDialog } from '~/components/cmsds/CmsDialog'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  History,
  Clock,
} from 'lucide-react'
import { cn } from '~/lib/cn'

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
  contentTypeId: string
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
  autosaveEnabled?: boolean
  autosaveInterval?: number
  canDelete?: boolean
}

export function ContentEntryEditor({
  contentType,
  entry,
  onSave,
  onCancel,
  onDelete,
  autosaveEnabled = true,
  autosaveInterval = 30000,
  canDelete: canDeleteProp = false,
}: ContentEntryEditorProps) {
  const getInitialData = useCallback(() => {
    if (entry) {
      return { ...entry.data }
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

  const [formData, setFormData] =
    useState<Record<string, unknown>>(getInitialData)
  const [fieldErrors, setFieldErrors] = useState<Record<string, FieldError>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSavedData, setLastSavedData] = useState<Record<
    string,
    unknown
  > | null>(entry ? { ...entry.data } : null)
  const [autosaveStatus, setAutosaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [autosaveError, setAutosaveError] = useState<string | null>(null)
  const [autosaveRetryCount, setAutosaveRetryCount] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const maxAutosaveRetries = 3

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const formDataRef = useRef(formData)
  formDataRef.current = formData

  const createEntry = useMutation(api.entries.create)
  const updateEntry = useMutation(api.entries.update)
  const publishEntry = useMutation(api.entries.publish)
  const unpublishEntry = useMutation(api.entries.unpublish)
  const scheduleEntry = useMutation(api.entries.schedule)
  const cancelScheduleEntry = useMutation(api.entries.cancelSchedule)
  const deleteEntryMutation = useMutation(api.entries.remove)
  const duplicateEntryMutation = useMutation(api.entries.duplicate)

  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleDateTime, setScheduleDateTime] = useState<string>(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return formatDateTimeLocal(tomorrow.getTime())
  })
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  useEffect(() => {
    const newData = getInitialData()
    setFormData(newData)
    setFieldErrors({})
    setIsDirty(false)
    setLastSavedData(entry ? { ...entry.data } : null)
    setSubmitError(null)
  }, [entry?._id, getInitialData])

  const handleFieldChange = useCallback((fieldName: string, value: unknown) => {
    setFormData((prev) => {
      const updated = { ...prev, [fieldName]: value }
      return updated
    })
    setIsDirty(true)

    setFieldErrors((prev) => {
      if (prev[fieldName]) {
        const { [fieldName]: _removed, ...rest } = prev
        return rest
      }
      return prev
    })
  }, [])

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
          errors[field.name] = {
            message: `${field.label} is required`,
            code: 'REQUIRED',
          }
          continue
        }
      }

      if (value !== null && value !== undefined && value !== '') {
        switch (field.type) {
          case 'text': {
            const strValue = String(value)
            const opts = field.options
            if (opts?.minLength && strValue.length < opts.minLength) {
              errors[field.name] = {
                message: `Minimum ${opts.minLength} characters required`,
                code: 'MIN_LENGTH',
              }
            } else if (opts?.maxLength && strValue.length > opts.maxLength) {
              errors[field.name] = {
                message: `Maximum ${opts.maxLength} characters allowed`,
                code: 'MAX_LENGTH',
              }
            } else if (opts?.pattern) {
              const regex = new RegExp(opts.pattern)
              if (!regex.test(strValue)) {
                errors[field.name] = {
                  message: 'Value does not match the required format',
                  code: 'PATTERN_MISMATCH',
                }
              }
            }
            break
          }

          case 'number': {
            const numValue = Number(value)
            const opts = field.options
            if (isNaN(numValue)) {
              errors[field.name] = {
                message: 'Must be a valid number',
                code: 'INVALID_TYPE',
              }
            } else {
              if (opts?.min !== undefined && numValue < opts.min) {
                errors[field.name] = {
                  message: `Minimum value is ${opts.min}`,
                  code: 'MIN_VALUE',
                }
              } else if (opts?.max !== undefined && numValue > opts.max) {
                errors[field.name] = {
                  message: `Maximum value is ${opts.max}`,
                  code: 'MAX_VALUE',
                }
              } else if (opts?.precision === 0 && !Number.isInteger(numValue)) {
                errors[field.name] = {
                  message: 'Must be a whole number',
                  code: 'NOT_INTEGER',
                }
              }
            }
            break
          }

          case 'select': {
            const opts = field.options
            if (opts?.options && !opts.options.some((o) => o.value === value)) {
              errors[field.name] = {
                message: 'Please select a valid option',
                code: 'INVALID_OPTION',
              }
            }
            break
          }

          case 'multiSelect': {
            const opts = field.options
            if (Array.isArray(value) && opts?.options) {
              const validValues = opts.options.map((o) => o.value)
              const invalid = value.filter(
                (v) => !validValues.includes(String(v))
              )
              if (invalid.length > 0) {
                errors[field.name] = {
                  message: 'Contains invalid options',
                  code: 'INVALID_OPTION',
                }
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

  const autosaveDraft = useCallback(
    async (retryAttempt = 0) => {
      if (!isDirty || !entry) return

      if (entry.status !== 'draft') return

      try {
        setAutosaveStatus('saving')
        setAutosaveError(null)

        await updateEntry({
          id: entry._id,
          data: formDataRef.current,
        })

        setLastSavedData({ ...formDataRef.current })
        setAutosaveStatus('saved')
        setIsDirty(false)
        setAutosaveRetryCount(0)

        setTimeout(() => {
          setAutosaveStatus('idle')
        }, 3000)
      } catch (error) {
        console.error('Autosave failed:', error)

        const errorMessage =
          error instanceof Error ? error.message : 'Failed to save'
        const canRetry =
          isRetryableError(error) && retryAttempt < maxAutosaveRetries

        if (canRetry) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryAttempt), 10000)
          setAutosaveStatus('error')
          setAutosaveError(
            `Save failed, retrying in ${Math.round(retryDelay / 1000)}s...`
          )
          setAutosaveRetryCount(retryAttempt + 1)

          setTimeout(() => {
            autosaveDraft(retryAttempt + 1)
          }, retryDelay)
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
    if (!autosaveEnabled || !entry || entry.status !== 'draft') {
      return
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    if (isDirty) {
      autosaveTimerRef.current = setTimeout(() => {
        autosaveDraft()
      }, autosaveInterval)
    }

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [autosaveEnabled, autosaveInterval, isDirty, entry, autosaveDraft])

  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<
    'publish' | 'unpublish' | null
  >(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)

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
        const publishedEntry = (await publishEntry({
          id: entry._id,
          changeDescription: 'Published from editor',
        })) as ContentEntry
        onSave?.(publishedEntry)
      } else {
        const draftEntry = (await unpublishEntry({
          id: entry._id,
        })) as ContentEntry
        onSave?.(draftEntry)
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Failed to ${confirmAction}`
      setPublishError(message)
    } finally {
      setIsPublishing(false)
      setConfirmAction(null)
    }
  }, [entry, confirmAction, publishEntry, unpublishEntry, onSave])

  const handlePublish = useCallback(async () => {
    if (!entry) return

    setIsPublishing(true)
    setPublishError(null)

    try {
      const publishedEntry = (await publishEntry({
        id: entry._id,
        changeDescription: 'Published from editor',
      })) as ContentEntry
      onSave?.(publishedEntry)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to publish'
      setPublishError(message)
    } finally {
      setIsPublishing(false)
    }
  }, [entry, publishEntry, onSave])

  const handleUnpublish = useCallback(async () => {
    if (!entry) return

    setIsPublishing(true)
    setPublishError(null)

    try {
      const draftEntry = (await unpublishEntry({
        id: entry._id,
      })) as ContentEntry
      onSave?.(draftEntry)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to unpublish'
      setPublishError(message)
    } finally {
      setIsPublishing(false)
    }
  }, [entry, unpublishEntry, onSave])

  const handleSchedule = useCallback(async () => {
    if (!entry) return

    const publishAt = parseDateTimeLocal(scheduleDateTime)
    const minimumTime = Date.now() + 60 * 1000

    if (publishAt < minimumTime) {
      setPublishError('Schedule time must be at least 1 minute in the future')
      return
    }

    setIsPublishing(true)
    setPublishError(null)

    try {
      const scheduledEntry = (await scheduleEntry({
        id: entry._id,
        publishAt,
      })) as ContentEntry
      setShowScheduleModal(false)
      onSave?.(scheduledEntry)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to schedule'
      setPublishError(message)
    } finally {
      setIsPublishing(false)
    }
  }, [entry, scheduleDateTime, scheduleEntry, onSave])

  const handleCancelSchedule = useCallback(async () => {
    if (!entry) return

    setIsPublishing(true)
    setPublishError(null)

    try {
      const draftEntry = (await cancelScheduleEntry({
        id: entry._id,
      })) as ContentEntry
      onSave?.(draftEntry)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to cancel schedule'
      setPublishError(message)
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
      await deleteEntryMutation({
        id: entry._id,
        hardDelete: false,
      })
      setShowDeleteModal(false)
      onDelete?.()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete entry'
      setDeleteError(message)
    } finally {
      setIsDeleting(false)
    }
  }, [entry, deleteEntryMutation, onDelete])

  const handleDuplicate = useCallback(async () => {
    if (!entry) return

    setIsDuplicating(true)
    setSubmitError(null)

    try {
      const duplicatedEntry = (await duplicateEntryMutation({
        sourceEntryId: entry._id,
      })) as ContentEntry
      onSave?.(duplicatedEntry)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to duplicate entry'
      setSubmitError(message)
    } finally {
      setIsDuplicating(false)
    }
  }, [entry, duplicateEntryMutation, onSave])

  const handleArchive = useCallback(async () => {
    if (!entry) return

    setIsArchiving(true)
    setSubmitError(null)

    try {
      const archivedEntry = (await updateEntry({
        id: entry._id,
        status: 'archived',
      })) as ContentEntry
      onSave?.(archivedEntry)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to archive entry'
      setSubmitError(message)
    } finally {
      setIsArchiving(false)
    }
  }, [entry, updateEntry, onSave])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setSubmitError(null)

      const isValid = await validateForm()
      if (!isValid) {
        return
      }

      setIsSubmitting(true)

      try {
        let savedEntry: ContentEntry

        if (entry) {
          savedEntry = (await updateEntry({
            id: entry._id,
            data: formData,
          })) as ContentEntry
        } else {
          savedEntry = (await createEntry({
            contentTypeId: contentType._id,
            data: formData,
          })) as ContentEntry
        }

        setIsDirty(false)
        setLastSavedData({ ...formData })
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
        onSave?.(savedEntry)
      } catch (error) {
        const { fieldErrors: serverFieldErrors, generalError } =
          parseServerError(error)
        const message =
          generalError ??
          (error instanceof Error ? error.message : 'Failed to save entry')

        setSubmitError(message)

        if (Object.keys(serverFieldErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...serverFieldErrors }))
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      validateForm,
      entry,
      formData,
      contentType._id,
      createEntry,
      updateEntry,
      onSave,
    ]
  )

  const handleCancel = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      )
      if (!confirmed) return
    }
    onCancel?.()
  }, [isDirty, onCancel])

  const getAutosaveStatusText = () => {
    switch (autosaveStatus) {
      case 'saving':
        return autosaveRetryCount > 0
          ? `Retrying (${autosaveRetryCount}/${maxAutosaveRetries})...`
          : 'Saving...'
      case 'saved':
        return 'Draft saved'
      case 'error':
        return autosaveError ?? 'Autosave failed'
      default:
        return null
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">
            {entry ? 'Edit' : 'Create'} {contentType.displayName}
          </h2>
          {entry && <CmsStatusBadge status={entry.status} />}
        </div>

        <div className="flex items-center gap-3">
          {autosaveStatus !== 'idle' && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex items-center gap-1.5 text-sm',
                  autosaveStatus === 'saving' && 'text-muted-foreground',
                  autosaveStatus === 'saved' && 'text-emerald-600',
                  autosaveStatus === 'error' && 'text-red-600'
                )}
                data-testid="autosave-status"
              >
                {autosaveStatus === 'saving' && (
                  <Loader2 className="size-3 animate-spin" />
                )}
                {autosaveStatus === 'saved' && (
                  <CheckCircle className="size-3" />
                )}
                {autosaveStatus === 'error' && (
                  <AlertCircle className="size-3" />
                )}
                {getAutosaveStatusText()}
              </span>
              {autosaveStatus === 'error' && autosaveRetryCount === 0 && (
                <button
                  type="button"
                  onClick={handleAutosaveRetry}
                  className="text-sm text-primary hover:underline"
                  data-testid="autosave-retry-button"
                >
                  <RefreshCw className="size-3" />
                </button>
              )}
            </div>
          )}

          {isDirty && (
            <span className="text-sm text-amber-600">Unsaved changes</span>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <div
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          <CheckCircle className="size-4" />
          Changes saved successfully
        </div>
      )}

      {(submitError || publishError) && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <span className="font-medium">Error:</span> {submitError || publishError}
        </div>
      )}

      {/* Fields */}
      <div className="space-y-4">
        {contentType.fields.map((field) => (
          <FieldRenderer
            key={field.name}
            field={field}
            value={formData[field.name]}
            onChange={(value) => handleFieldChange(field.name, value)}
            error={fieldErrors[field.name]}
            disabled={isSubmitting}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {entry && canDeleteProp && (
            <CmsButton
              type="button"
              variant="danger"
              onClick={handleDeleteClick}
              disabled={
                isSubmitting ||
                isPublishing ||
                isDeleting ||
                isDuplicating
              }
              loading={isDeleting}
              data-testid="delete-button"
            >
              Delete
            </CmsButton>
          )}

          {entry && (
            <CmsButton
              type="button"
              variant="secondary"
              onClick={handleDuplicate}
              disabled={
                isSubmitting ||
                isPublishing ||
                isDeleting ||
                isDuplicating ||
                isArchiving
              }
              loading={isDuplicating}
              data-testid="duplicate-button"
            >
              Duplicate
            </CmsButton>
          )}

          {entry &&
            (entry.status === 'draft' || entry.status === 'scheduled') && (
              <CmsButton
                type="button"
                variant="secondary"
                onClick={handleArchive}
                disabled={
                  isSubmitting ||
                  isPublishing ||
                  isDeleting ||
                  isDuplicating ||
                  isArchiving
                }
                loading={isArchiving}
                data-testid="archive-button"
              >
                Archive
              </CmsButton>
            )}

          {entry && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="font-mono">
                v{entry.version}
              </Badge>
              <button
                type="button"
                onClick={() => setShowVersionHistory(true)}
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <History className="size-3" />
                History
              </button>

              {entry.lastPublishedAt && (
                <span
                  className="text-xs"
                  data-testid="last-published-time"
                >
                  Last published:{' '}
                  {new Date(entry.lastPublishedAt).toLocaleString()}
                </span>
              )}

              {entry.status === 'scheduled' && entry.scheduledPublishAt && (
                <span
                  className="flex items-center gap-1 text-xs text-blue-600"
                  data-testid="scheduled-time"
                >
                  <Clock className="size-3" />
                  Scheduled:{' '}
                  {new Date(entry.scheduledPublishAt).toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CmsButton
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting || isPublishing}
          >
            Cancel
          </CmsButton>

          <CmsButton
            type="submit"
            variant="primary"
            disabled={isSubmitting || isPublishing}
            loading={isSubmitting}
          >
            {entry ? 'Save Changes' : 'Create Entry'}
          </CmsButton>

          {entry && (
            <>
              {entry.status === 'draft' && (
                <>
                  <CmsButton
                    type="button"
                    variant="secondary"
                    onClick={() => setShowScheduleModal(true)}
                    disabled={isSubmitting || isPublishing}
                  >
                    Schedule
                  </CmsButton>
                  <CmsButton
                    type="button"
                    variant="success"
                    onClick={handlePublishClick}
                    disabled={isSubmitting || isPublishing}
                    loading={isPublishing}
                    data-testid="publish-button"
                  >
                    Publish Now
                  </CmsButton>
                </>
              )}

              {entry.status === 'scheduled' && (
                <>
                  <CmsButton
                    type="button"
                    variant="secondary"
                    onClick={handleCancelSchedule}
                    disabled={isSubmitting || isPublishing}
                  >
                    Cancel Schedule
                  </CmsButton>
                  <CmsButton
                    type="button"
                    variant="success"
                    onClick={handlePublish}
                    disabled={isSubmitting || isPublishing}
                    loading={isPublishing}
                  >
                    Publish Now
                  </CmsButton>
                </>
              )}

              {entry.status === 'published' && (
                <CmsButton
                  type="button"
                  variant="warning"
                  onClick={handleUnpublishClick}
                  disabled={isSubmitting || isPublishing}
                  loading={isPublishing}
                  data-testid="unpublish-button"
                >
                  Unpublish
                </CmsButton>
              )}
            </>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      <CmsDialog
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
        title="Schedule Publication"
        size="sm"
        footer={
          <>
            <CmsButton
              variant="outline"
              onClick={() => setShowScheduleModal(false)}
            >
              Cancel
            </CmsButton>
            <CmsButton
              variant="primary"
              onClick={handleSchedule}
              loading={isPublishing}
            >
              Schedule
            </CmsButton>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose when this content should be automatically published:
          </p>
          <Input
            type="datetime-local"
            value={scheduleDateTime}
            onChange={(e) => setScheduleDateTime(e.target.value)}
            min={formatDateTimeLocal(Date.now() + 60 * 1000)}
          />
          {publishError && (
            <p className="text-sm text-destructive">{publishError}</p>
          )}
        </div>
      </CmsDialog>

      {/* Publish/Unpublish Confirmation Modal */}
      <CmsConfirmDialog
        open={showConfirmModal && confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowConfirmModal(false)
            setConfirmAction(null)
          }
        }}
        title={
          confirmAction === 'publish' ? 'Confirm Publish' : 'Confirm Unpublish'
        }
        description={
          confirmAction === 'publish'
            ? 'Are you sure you want to publish this entry? It will become publicly visible.'
            : 'Are you sure you want to unpublish this entry? It will no longer be publicly visible.'
        }
        confirmLabel={confirmAction === 'publish' ? 'Publish' : 'Unpublish'}
        variant={confirmAction === 'publish' ? 'primary' : 'warning'}
        onConfirm={handleConfirmAction}
        isLoading={isPublishing}
      />

      {/* Delete Confirmation Modal */}
      <CmsConfirmDialog
        open={showDeleteModal}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setShowDeleteModal(false)
            setDeleteError(null)
          }
        }}
        title="Delete Entry"
        description="Are you sure you want to delete this entry? It will be moved to the trash and can be restored within the retention period."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        error={deleteError}
      />

      {/* Version History Panel */}
      {showVersionHistory && entry && (
        <div className="fixed inset-y-0 right-0 z-50 w-96 shadow-xl">
          <VersionHistory
            entryId={entry._id}
            currentVersion={entry.version}
            onRollbackComplete={() => {
              setShowVersionHistory(false)
            }}
            onClose={() => setShowVersionHistory(false)}
          />
        </div>
      )}
    </form>
  )
}
