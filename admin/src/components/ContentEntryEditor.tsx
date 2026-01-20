import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { FieldRenderer } from './fields/FieldRenderer';
import type { FieldDefinition, FieldError } from './fields/types';
import { parseServerError, isRetryableError } from '~/utils';

/**
 * Format a timestamp as a datetime-local input value.
 */
function formatDateTimeLocal(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parse a datetime-local input value to a timestamp.
 */
function parseDateTimeLocal(value: string): number {
  return new Date(value).getTime();
}

/**
 * Content type definition from the backend.
 */
export interface ContentType {
  _id: string;
  name: string;
  displayName: string;
  description?: string;
  fields: FieldDefinition[];
  titleField?: string;
  slugField?: string;
  singleton?: boolean;
  isActive: boolean;
}

/**
 * Content entry from the backend.
 */
export interface ContentEntry {
  _id: string;
  contentTypeId: string;
  slug: string;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  data: Record<string, unknown>;
  version: number;
  scheduledPublishAt?: number;
  firstPublishedAt?: number;
  lastPublishedAt?: number;
}

/**
 * Props for the ContentEntryEditor component.
 */
interface ContentEntryEditorProps {
  /** The content type to create/edit entries for */
  contentType: ContentType;
  /** Optional existing entry to edit (undefined for new entries) */
  entry?: ContentEntry;
  /** Callback when the entry is saved successfully */
  onSave?: (entry: ContentEntry) => void;
  /** Callback when the user cancels editing */
  onCancel?: () => void;
  /** Callback when the entry is deleted successfully */
  onDelete?: () => void;
  /** Whether autosave is enabled (default: true) */
  autosaveEnabled?: boolean;
  /** Autosave interval in milliseconds (default: 30000 = 30 seconds) */
  autosaveInterval?: number;
  /** Whether the user can delete this entry */
  canDelete?: boolean;
}

/**
 * ContentEntryEditor renders a dynamic form based on a content type schema.
 *
 * Features:
 * - Dynamic field rendering based on content type definition
 * - Real-time validation with error display
 * - Autosave draft functionality
 * - Form submission with validation
 * - Unsaved changes detection
 */
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
  // Initialize form data from entry or defaults
  const getInitialData = useCallback(() => {
    if (entry) {
      return { ...entry.data };
    }

    // Build default values from field definitions
    const defaults: Record<string, unknown> = {};
    for (const field of contentType.fields) {
      if (field.defaultValue !== undefined) {
        defaults[field.name] = field.defaultValue;
      } else {
        // Set type-appropriate empty values
        switch (field.type) {
          case 'text':
          case 'richText':
            defaults[field.name] = '';
            break;
          case 'boolean':
            defaults[field.name] = false;
            break;
          case 'number':
          case 'date':
          case 'datetime':
          case 'reference':
          case 'media':
          case 'json':
            defaults[field.name] = null;
            break;
          case 'select':
            defaults[field.name] = '';
            break;
          case 'multiSelect':
            defaults[field.name] = [];
            break;
        }
      }
    }
    return defaults;
  }, [contentType.fields, entry]);

  // Form state
  const [formData, setFormData] = useState<Record<string, unknown>>(getInitialData);
  const [fieldErrors, setFieldErrors] = useState<Record<string, FieldError>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<Record<string, unknown> | null>(
    entry ? { ...entry.data } : null
  );
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [autosaveRetryCount, setAutosaveRetryCount] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const maxAutosaveRetries = 3;

  // Refs for autosave
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // Convex mutations (using wrapper functions)
  const createEntry = useMutation(api.entries.create);
  const updateEntry = useMutation(api.entries.update);
  const publishEntry = useMutation(api.entries.publish);
  const unpublishEntry = useMutation(api.entries.unpublish);
  const scheduleEntry = useMutation(api.entries.schedule);
  const cancelScheduleEntry = useMutation(api.entries.cancelSchedule);
  const deleteEntryMutation = useMutation(api.entries.remove);

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState<string>(() => {
    // Default to tomorrow at 9 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return formatDateTimeLocal(tomorrow.getTime());
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Reset form when entry changes
  useEffect(() => {
    const newData = getInitialData();
    setFormData(newData);
    setFieldErrors({});
    setIsDirty(false);
    setLastSavedData(entry ? { ...entry.data } : null);
    setSubmitError(null);
  }, [entry?._id, getInitialData]);

  // Handle field value change
  const handleFieldChange = useCallback((fieldName: string, value: unknown) => {
    setFormData(prev => {
      const updated = { ...prev, [fieldName]: value };
      return updated;
    });
    setIsDirty(true);

    // Clear field error when user modifies the field
    setFieldErrors(prev => {
      if (prev[fieldName]) {
        const { [fieldName]: removed, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, []);

  // Validate form data against the content type schema
  const validateForm = useCallback(async (): Promise<boolean> => {
    const errors: Record<string, FieldError> = {};

    // Client-side validation for required fields and basic type checks
    for (const field of contentType.fields) {
      const value = formData[field.name];

      // Required field check
      if (field.required) {
        const isEmpty =
          value === null ||
          value === undefined ||
          value === '' ||
          (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
          errors[field.name] = {
            message: `${field.label} is required`,
            code: 'REQUIRED',
          };
          continue;
        }
      }

      // Type-specific validation
      if (value !== null && value !== undefined && value !== '') {
        switch (field.type) {
          case 'text': {
            const strValue = String(value);
            const opts = field.options;
            if (opts?.minLength && strValue.length < opts.minLength) {
              errors[field.name] = {
                message: `Minimum ${opts.minLength} characters required`,
                code: 'MIN_LENGTH',
              };
            } else if (opts?.maxLength && strValue.length > opts.maxLength) {
              errors[field.name] = {
                message: `Maximum ${opts.maxLength} characters allowed`,
                code: 'MAX_LENGTH',
              };
            } else if (opts?.pattern) {
              const regex = new RegExp(opts.pattern);
              if (!regex.test(strValue)) {
                errors[field.name] = {
                  message: 'Value does not match the required format',
                  code: 'PATTERN_MISMATCH',
                };
              }
            }
            break;
          }

          case 'number': {
            const numValue = Number(value);
            const opts = field.options;
            if (isNaN(numValue)) {
              errors[field.name] = {
                message: 'Must be a valid number',
                code: 'INVALID_TYPE',
              };
            } else {
              if (opts?.min !== undefined && numValue < opts.min) {
                errors[field.name] = {
                  message: `Minimum value is ${opts.min}`,
                  code: 'MIN_VALUE',
                };
              } else if (opts?.max !== undefined && numValue > opts.max) {
                errors[field.name] = {
                  message: `Maximum value is ${opts.max}`,
                  code: 'MAX_VALUE',
                };
              } else if (opts?.precision === 0 && !Number.isInteger(numValue)) {
                errors[field.name] = {
                  message: 'Must be a whole number',
                  code: 'NOT_INTEGER',
                };
              }
            }
            break;
          }

          case 'select': {
            const opts = field.options;
            if (opts?.options && !opts.options.some(o => o.value === value)) {
              errors[field.name] = {
                message: 'Please select a valid option',
                code: 'INVALID_OPTION',
              };
            }
            break;
          }

          case 'multiSelect': {
            const opts = field.options;
            if (Array.isArray(value) && opts?.options) {
              const validValues = opts.options.map(o => o.value);
              const invalid = value.filter(v => !validValues.includes(String(v)));
              if (invalid.length > 0) {
                errors[field.name] = {
                  message: 'Contains invalid options',
                  code: 'INVALID_OPTION',
                };
              }
            }
            break;
          }
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [contentType.fields, formData]);

  // Autosave draft with retry logic
  const autosaveDraft = useCallback(async (retryAttempt = 0) => {
    if (!isDirty || !entry) return;

    // Only autosave if this is an existing draft entry
    if (entry.status !== 'draft') return;

    try {
      setAutosaveStatus('saving');
      setAutosaveError(null);

      await updateEntry({
        id: entry._id,
        data: formDataRef.current,
      });

      setLastSavedData({ ...formDataRef.current });
      setAutosaveStatus('saved');
      setIsDirty(false);
      setAutosaveRetryCount(0);

      // Reset status after a delay
      setTimeout(() => {
        setAutosaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Autosave failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to save';
      const canRetry = isRetryableError(error) && retryAttempt < maxAutosaveRetries;

      if (canRetry) {
        // Schedule automatic retry with exponential backoff
        const retryDelay = Math.min(1000 * Math.pow(2, retryAttempt), 10000);
        setAutosaveStatus('error');
        setAutosaveError(`Save failed, retrying in ${Math.round(retryDelay / 1000)}s...`);
        setAutosaveRetryCount(retryAttempt + 1);

        setTimeout(() => {
          autosaveDraft(retryAttempt + 1);
        }, retryDelay);
      } else {
        // Max retries reached or non-retryable error
        setAutosaveStatus('error');
        setAutosaveError(errorMessage);
        setAutosaveRetryCount(0);
      }
    }
  }, [isDirty, entry, updateEntry, maxAutosaveRetries]);

  // Manual retry handler for autosave
  const handleAutosaveRetry = useCallback(() => {
    setAutosaveRetryCount(0);
    autosaveDraft(0);
  }, [autosaveDraft]);

  // Set up autosave timer
  useEffect(() => {
    if (!autosaveEnabled || !entry || entry.status !== 'draft') {
      return;
    }

    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    // Set new timer if dirty
    if (isDirty) {
      autosaveTimerRef.current = setTimeout(() => {
        autosaveDraft();
      }, autosaveInterval);
    }

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [autosaveEnabled, autosaveInterval, isDirty, entry, autosaveDraft]);

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'publish' | 'unpublish' | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Handle publish with confirmation
  const handlePublishClick = useCallback(() => {
    setConfirmAction('publish');
    setShowConfirmModal(true);
  }, []);

  // Handle unpublish with confirmation
  const handleUnpublishClick = useCallback(() => {
    setConfirmAction('unpublish');
    setShowConfirmModal(true);
  }, []);

  // Execute confirmed action
  const handleConfirmAction = useCallback(async () => {
    if (!entry || !confirmAction) return;

    setShowConfirmModal(false);
    setIsPublishing(true);
    setPublishError(null);

    try {
      if (confirmAction === 'publish') {
        const publishedEntry = await publishEntry({
          id: entry._id,
          changeDescription: 'Published from editor',
        }) as ContentEntry;
        onSave?.(publishedEntry);
      } else {
        const draftEntry = await unpublishEntry({
          id: entry._id,
        }) as ContentEntry;
        onSave?.(draftEntry);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to ${confirmAction}`;
      setPublishError(message);
    } finally {
      setIsPublishing(false);
      setConfirmAction(null);
    }
  }, [entry, confirmAction, publishEntry, unpublishEntry, onSave]);

  // Handle publish (direct call for scheduled entries that want to publish now)
  const handlePublish = useCallback(async () => {
    if (!entry) return;

    setIsPublishing(true);
    setPublishError(null);

    try {
      const publishedEntry = await publishEntry({
        id: entry._id,
        changeDescription: 'Published from editor',
      }) as ContentEntry;
      onSave?.(publishedEntry);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish';
      setPublishError(message);
    } finally {
      setIsPublishing(false);
    }
  }, [entry, publishEntry, onSave]);

  // Handle unpublish
  const handleUnpublish = useCallback(async () => {
    if (!entry) return;

    setIsPublishing(true);
    setPublishError(null);

    try {
      const draftEntry = await unpublishEntry({
        id: entry._id,
      }) as ContentEntry;
      onSave?.(draftEntry);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unpublish';
      setPublishError(message);
    } finally {
      setIsPublishing(false);
    }
  }, [entry, unpublishEntry, onSave]);

  // Handle schedule
  const handleSchedule = useCallback(async () => {
    if (!entry) return;

    const publishAt = parseDateTimeLocal(scheduleDateTime);
    const minimumTime = Date.now() + 60 * 1000; // 1 minute from now

    if (publishAt < minimumTime) {
      setPublishError('Schedule time must be at least 1 minute in the future');
      return;
    }

    setIsPublishing(true);
    setPublishError(null);

    try {
      const scheduledEntry = await scheduleEntry({
        id: entry._id,
        publishAt,
      }) as ContentEntry;
      setShowScheduleModal(false);
      onSave?.(scheduledEntry);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to schedule';
      setPublishError(message);
    } finally {
      setIsPublishing(false);
    }
  }, [entry, scheduleDateTime, scheduleEntry, onSave]);

  // Handle cancel schedule
  const handleCancelSchedule = useCallback(async () => {
    if (!entry) return;

    setIsPublishing(true);
    setPublishError(null);

    try {
      const draftEntry = await cancelScheduleEntry({
        id: entry._id,
      }) as ContentEntry;
      onSave?.(draftEntry);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel schedule';
      setPublishError(message);
    } finally {
      setIsPublishing(false);
    }
  }, [entry, cancelScheduleEntry, onSave]);

  // Handle delete click - opens confirmation modal
  const handleDeleteClick = useCallback(() => {
    setDeleteError(null);
    setShowDeleteModal(true);
  }, []);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!entry) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteEntryMutation({
        id: entry._id,
        hardDelete: false, // Soft delete - moves to trash
      });
      setShowDeleteModal(false);
      onDelete?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete entry';
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  }, [entry, deleteEntryMutation, onDelete]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate form
    const isValid = await validateForm();
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      let savedEntry: ContentEntry;

      if (entry) {
        // Update existing entry
        savedEntry = await updateEntry({
          id: entry._id,
          data: formData,
        }) as ContentEntry;
      } else {
        // Create new entry
        savedEntry = await createEntry({
          contentTypeId: contentType._id,
          data: formData,
        }) as ContentEntry;
      }

      setIsDirty(false);
      setLastSavedData({ ...formData });
      onSave?.(savedEntry);
    } catch (error) {
      // Parse server error for field-level errors and general message
      const { fieldErrors: serverFieldErrors, generalError } = parseServerError(error);
      const message = generalError ?? (error instanceof Error ? error.message : 'Failed to save entry');

      setSubmitError(message);

      // Apply any field-level errors from the server
      if (Object.keys(serverFieldErrors).length > 0) {
        setFieldErrors(prev => ({ ...prev, ...serverFieldErrors }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, entry, formData, contentType._id, createEntry, updateEntry, onSave]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (!confirmed) return;
    }
    onCancel?.();
  }, [isDirty, onCancel]);

  // Get autosave status display
  const getAutosaveStatusText = () => {
    switch (autosaveStatus) {
      case 'saving':
        return autosaveRetryCount > 0 ? `Retrying (${autosaveRetryCount}/${maxAutosaveRetries})...` : 'Saving...';
      case 'saved':
        return 'Draft saved';
      case 'error':
        return autosaveError ?? 'Autosave failed';
      default:
        return null;
    }
  };

  return (
    <form className="entry-editor" onSubmit={handleSubmit}>
      <div className="entry-editor-header">
        <div className="entry-editor-title">
          <h2>{entry ? 'Edit' : 'Create'} {contentType.displayName}</h2>
          {entry && (
            <span className={`entry-status entry-status--${entry.status}`}>
              {entry.status}
            </span>
          )}
        </div>

        <div className="entry-editor-actions">
          {autosaveStatus !== 'idle' && (
            <div className="autosave-status-container">
              <span
                className={`autosave-status autosave-status--${autosaveStatus}`}
                data-testid="autosave-status"
              >
                {getAutosaveStatusText()}
              </span>
              {autosaveStatus === 'error' && autosaveRetryCount === 0 && (
                <button
                  type="button"
                  className="autosave-retry-btn"
                  onClick={handleAutosaveRetry}
                  title="Retry saving"
                  data-testid="autosave-retry-button"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {isDirty && (
            <span className="unsaved-indicator">Unsaved changes</span>
          )}
        </div>
      </div>

      {(submitError || publishError) && (
        <div className="entry-editor-error" role="alert">
          <strong>Error:</strong> {submitError || publishError}
        </div>
      )}

      <div className="entry-editor-fields">
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

      <div className="entry-editor-footer">
        <div className="entry-editor-footer-left">
          {/* Delete button - only shown for existing entries with permission */}
          {entry && canDeleteProp && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDeleteClick}
              disabled={isSubmitting || isPublishing || isDeleting}
              data-testid="delete-button"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}

          {entry && (
            <div className="entry-meta-info">
              <span className="entry-version">Version {entry.version}</span>

              {/* Publish timestamps */}
              {entry.lastPublishedAt && (
                <span className="entry-publish-info" data-testid="last-published-time">
                  Last published: {new Date(entry.lastPublishedAt).toLocaleString()}
                </span>
              )}
              {entry.firstPublishedAt && entry.firstPublishedAt !== entry.lastPublishedAt && (
                <span className="entry-publish-info entry-publish-info--first">
                  First published: {new Date(entry.firstPublishedAt).toLocaleString()}
                </span>
              )}

              {/* Scheduled time */}
              {entry.status === 'scheduled' && entry.scheduledPublishAt && (
                <span className="entry-scheduled-time" data-testid="scheduled-time">
                  Scheduled for {new Date(entry.scheduledPublishAt).toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="entry-editor-footer-right">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={isSubmitting || isPublishing}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || isPublishing}
          >
            {isSubmitting ? 'Saving...' : entry ? 'Save Changes' : 'Create Entry'}
          </button>

          {/* Publishing actions - only shown for existing entries */}
          {entry && (
            <>
              {/* Draft: Show Publish and Schedule buttons */}
              {entry.status === 'draft' && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowScheduleModal(true)}
                    disabled={isSubmitting || isPublishing}
                  >
                    Schedule
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handlePublishClick}
                    disabled={isSubmitting || isPublishing}
                    data-testid="publish-button"
                  >
                    {isPublishing ? 'Publishing...' : 'Publish Now'}
                  </button>
                </>
              )}

              {/* Scheduled: Show Cancel Schedule and Publish Now buttons */}
              {entry.status === 'scheduled' && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancelSchedule}
                    disabled={isSubmitting || isPublishing}
                  >
                    Cancel Schedule
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handlePublish}
                    disabled={isSubmitting || isPublishing}
                  >
                    {isPublishing ? 'Publishing...' : 'Publish Now'}
                  </button>
                </>
              )}

              {/* Published: Show Unpublish button */}
              {entry.status === 'published' && (
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={handleUnpublishClick}
                  disabled={isSubmitting || isPublishing}
                  data-testid="unpublish-button"
                >
                  {isPublishing ? 'Unpublishing...' : 'Unpublish'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Schedule Publication</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowScheduleModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>Choose when this content should be automatically published:</p>
              <input
                type="datetime-local"
                className="schedule-datetime-input"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                min={formatDateTimeLocal(Date.now() + 60 * 1000)}
              />
              {publishError && (
                <p className="schedule-error">{publishError}</p>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowScheduleModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSchedule}
                disabled={isPublishing}
              >
                {isPublishing ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish/Unpublish Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowConfirmModal(false);
            setConfirmAction(null);
          }}
          data-testid="confirm-modal-overlay"
        >
          <div className="modal" onClick={(e) => e.stopPropagation()} data-testid="confirm-modal">
            <div className="modal-header">
              <h3>{confirmAction === 'publish' ? 'Confirm Publish' : 'Confirm Unpublish'}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              {confirmAction === 'publish' ? (
                <p>
                  Are you sure you want to publish this entry? It will become publicly visible.
                </p>
              ) : (
                <p>
                  Are you sure you want to unpublish this entry? It will no longer be publicly visible.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
                data-testid="confirm-cancel-button"
              >
                Cancel
              </button>
              <button
                type="button"
                className={confirmAction === 'publish' ? 'btn btn-success' : 'btn btn-warning'}
                onClick={handleConfirmAction}
                disabled={isPublishing}
                data-testid="confirm-action-button"
              >
                {confirmAction === 'publish' ? 'Publish' : 'Unpublish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!isDeleting) {
              setShowDeleteModal(false);
              setDeleteError(null);
            }
          }}
          data-testid="delete-modal-overlay"
        >
          <div className="modal" onClick={(e) => e.stopPropagation()} data-testid="delete-modal">
            <div className="modal-header">
              <h3>Delete Entry</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  if (!isDeleting) {
                    setShowDeleteModal(false);
                    setDeleteError(null);
                  }
                }}
                disabled={isDeleting}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete this entry? It will be moved to the trash
                and can be restored within the retention period.
              </p>
              {deleteError && (
                <p className="entry-editor-error" style={{ marginTop: '1rem' }}>
                  {deleteError}
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                data-testid="delete-cancel-button"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                data-testid="delete-confirm-button"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
