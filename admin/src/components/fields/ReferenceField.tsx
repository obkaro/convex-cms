import { useState, useCallback, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { FieldWrapper } from './FieldWrapper';
import type { BaseFieldProps } from './types';

/**
 * Props for the ReferenceField component.
 */
export interface ReferenceFieldProps extends BaseFieldProps<string | string[] | null> {
  /** Placeholder text when no reference is selected */
  placeholder?: string;
}

/**
 * Get a display title for a content entry.
 * Falls back to slug or ID if no title is available.
 */
function getEntryDisplayTitle(entry: {
  data?: Record<string, unknown>;
  slug?: string;
  _id: string;
}): string {
  // Try common title fields
  const titleFields = ['title', 'name', 'heading', 'label'];
  for (const field of titleFields) {
    const value = entry.data?.[field];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  // Fall back to slug or ID
  return entry.slug || entry._id;
}

/**
 * Get status badge color class
 */
function getStatusClass(status: string): string {
  switch (status) {
    case 'published':
      return 'field-reference-status--published';
    case 'draft':
      return 'field-reference-status--draft';
    case 'scheduled':
      return 'field-reference-status--scheduled';
    case 'archived':
      return 'field-reference-status--archived';
    default:
      return '';
  }
}

/**
 * ReferenceField renders a reference picker that allows selecting content entries.
 *
 * The value stored is the content entry ID (string) for single references,
 * or an array of IDs for multiple references.
 *
 * Reference fields can be configured with:
 * - allowedContentTypes: Array of content type names/IDs that can be referenced
 * - multiple: Whether to allow selecting multiple entries
 */
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
  const fieldId = id || `field-${field.name}`;
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('');

  // Get field options
  const allowedContentTypes = field.options?.allowedContentTypes ?? [];
  const allowMultiple = field.options?.multiple ?? false;

  // Normalize value to array for easier handling
  const selectedIds = useMemo(() => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }, [value]);

  // Fetch all content types for the filter dropdown
  const contentTypes = useQuery(api.contentTypes.list, {
    isActive: true,
    includeEntryCounts: false,
  });

  // Filter content types by allowed list
  const filteredContentTypes = useMemo(() => {
    if (!contentTypes?.page) return [];
    if (allowedContentTypes.length === 0) return contentTypes.page;
    return contentTypes.page.filter(
      (ct) =>
        allowedContentTypes.includes(ct.name) ||
        allowedContentTypes.includes(ct._id)
    );
  }, [contentTypes?.page, allowedContentTypes]);

  // Fetch the selected entry details if we have a value
  const selectedEntry = useQuery(
    api.entries.get,
    selectedIds.length === 1 ? { id: selectedIds[0] } : 'skip'
  );

  // For multiple selections, we need to fetch each entry
  // Note: In a production app, you'd want a batch query
  const selectedEntries = useQuery(
    api.entries.list,
    selectedIds.length > 1
      ? {
          paginationOpts: { numItems: 100, cursor: null },
        }
      : 'skip'
  );

  // Filter selected entries by IDs when multiple
  const multipleSelectedEntries = useMemo(() => {
    if (!selectedEntries?.page || selectedIds.length <= 1) return [];
    return selectedEntries.page.filter((entry) =>
      selectedIds.includes(entry._id)
    );
  }, [selectedEntries?.page, selectedIds]);

  // Fetch available entries for the picker
  const entriesResult = useQuery(
    api.entries.list,
    showPicker
      ? {
          contentTypeId: contentTypeFilter || undefined,
          search: searchQuery || undefined,
          paginationOpts: { numItems: 50, cursor: null },
        }
      : 'skip'
  );

  // Filter entries by allowed content types if specified
  const filteredEntries = useMemo(() => {
    if (!entriesResult?.page) return [];
    if (allowedContentTypes.length === 0) return entriesResult.page;

    // Get allowed content type IDs
    const allowedIds = filteredContentTypes.map((ct) => ct._id);
    return entriesResult.page.filter((entry) =>
      allowedIds.includes(entry.contentTypeId)
    );
  }, [entriesResult?.page, allowedContentTypes, filteredContentTypes]);

  // Get content type info for an entry
  const getContentTypeName = useCallback(
    (contentTypeId: string) => {
      const ct = contentTypes?.page?.find((c) => c._id === contentTypeId);
      return ct?.displayName || ct?.name || 'Unknown';
    },
    [contentTypes?.page]
  );

  // Handle selecting an entry
  const handleSelect = useCallback(
    (entryId: string) => {
      if (allowMultiple) {
        // Toggle selection
        if (selectedIds.includes(entryId)) {
          const newIds = selectedIds.filter((id) => id !== entryId);
          onChange(newIds.length > 0 ? newIds : null);
        } else {
          onChange([...selectedIds, entryId]);
        }
      } else {
        // Single selection - select and close
        onChange(entryId);
        setShowPicker(false);
      }
    },
    [allowMultiple, selectedIds, onChange]
  );

  // Handle removing a selection
  const handleRemove = useCallback(
    (entryId: string) => {
      if (allowMultiple) {
        const newIds = selectedIds.filter((id) => id !== entryId);
        onChange(newIds.length > 0 ? newIds : null);
      } else {
        onChange(null);
      }
    },
    [allowMultiple, selectedIds, onChange]
  );

  // Handle clearing all selections
  const handleClear = useCallback(() => {
    onChange(null);
  }, [onChange]);

  // Render a selected entry preview
  const renderSelectedEntry = (
    entry: { _id: string; data?: Record<string, unknown>; slug?: string; status: string; contentTypeId: string },
    showRemove = true
  ) => (
    <div key={entry._id} className="field-reference-item">
      <div className="field-reference-item-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </div>
      <div className="field-reference-item-info">
        <span className="field-reference-item-title">
          {getEntryDisplayTitle(entry)}
        </span>
        <div className="field-reference-item-meta">
          <span className="field-reference-item-type">
            {getContentTypeName(entry.contentTypeId)}
          </span>
          <span className={`field-reference-status ${getStatusClass(entry.status)}`}>
            {entry.status}
          </span>
        </div>
      </div>
      {showRemove && !disabled && !readOnly && (
        <button
          type="button"
          className="field-reference-item-remove"
          onClick={(e) => {
            e.stopPropagation();
            handleRemove(entry._id);
          }}
          title="Remove reference"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  );

  return (
    <FieldWrapper field={field} error={error} className={className} id={fieldId}>
      <div className="field-reference">
        {/* Selected References Preview */}
        {selectedIds.length > 0 ? (
          <div className="field-reference-selected">
            {/* Single selection */}
            {selectedIds.length === 1 && selectedEntry && (
              renderSelectedEntry(selectedEntry)
            )}

            {/* Multiple selections */}
            {selectedIds.length > 1 && multipleSelectedEntries.length > 0 && (
              <div className="field-reference-list">
                {multipleSelectedEntries.map((entry) => renderSelectedEntry(entry))}
              </div>
            )}

            {/* Actions */}
            {!disabled && !readOnly && (
              <div className="field-reference-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowPicker(true)}
                >
                  {allowMultiple ? 'Add more' : 'Change'}
                </button>
                {selectedIds.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={handleClear}
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <button
            type="button"
            className="field-reference-empty"
            onClick={() => setShowPicker(true)}
            disabled={disabled || readOnly}
          >
            <div className="field-reference-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <span className="field-reference-empty-text">{placeholder}</span>
            <span className="field-reference-empty-hint">
              Click to select {allowMultiple ? 'content entries' : 'a content entry'}
            </span>
          </button>
        )}
      </div>

      {/* Reference Picker Modal */}
      {showPicker && (
        <div className="modal-overlay" onClick={() => setShowPicker(false)}>
          <div className="modal modal-reference-picker" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select Content</h3>
              <button className="modal-close" onClick={() => setShowPicker(false)}>
                &times;
              </button>
            </div>

            <div className="modal-body">
              {/* Search and Filter */}
              <div className="reference-picker-toolbar">
                <div className="search-input-wrapper">
                  <input
                    type="search"
                    className="search-input"
                    placeholder="Search entries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                    >
                      &times;
                    </button>
                  )}
                </div>
                {filteredContentTypes.length > 1 && (
                  <select
                    className="reference-type-filter"
                    value={contentTypeFilter}
                    onChange={(e) => setContentTypeFilter(e.target.value)}
                  >
                    <option value="">All Types</option>
                    {filteredContentTypes.map((ct) => (
                      <option key={ct._id} value={ct._id}>
                        {ct.displayName || ct.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Entries List */}
              {entriesResult === undefined ? (
                <div className="reference-picker-loading">
                  <div className="loading-spinner" />
                  <p>Loading content...</p>
                </div>
              ) : filteredEntries.length > 0 ? (
                <div className="reference-picker-list">
                  {filteredEntries.map((entry) => {
                    const isSelected = selectedIds.includes(entry._id);
                    return (
                      <button
                        key={entry._id}
                        type="button"
                        className={`reference-picker-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelect(entry._id)}
                      >
                        <div className="reference-picker-item-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                          </svg>
                        </div>
                        <div className="reference-picker-item-info">
                          <span className="reference-picker-item-title">
                            {getEntryDisplayTitle(entry)}
                          </span>
                          <div className="reference-picker-item-meta">
                            <span className="reference-picker-item-type">
                              {getContentTypeName(entry.contentTypeId)}
                            </span>
                            <span className={`field-reference-status ${getStatusClass(entry.status)}`}>
                              {entry.status}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="reference-picker-item-selected">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="reference-picker-empty">
                  <div className="reference-picker-empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                  </div>
                  <p>No content entries found</p>
                  {searchQuery && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSearchQuery('')}
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              {allowMultiple && selectedIds.length > 0 && (
                <span className="reference-picker-count">
                  {selectedIds.length} selected
                </span>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPicker(false)}
              >
                {allowMultiple ? 'Done' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FieldWrapper>
  );
}
