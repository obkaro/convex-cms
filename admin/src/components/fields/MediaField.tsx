import { useState, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { FieldWrapper } from './FieldWrapper';
import type { BaseFieldProps } from './types';
import { UploadDropzone, type UploadedFile } from '../UploadDropzone';

/**
 * Props for the MediaField component.
 */
export interface MediaFieldProps extends BaseFieldProps<string | null> {
  /** Placeholder text when no media is selected */
  placeholder?: string;
}

// Get media type icon
function getMediaTypeIcon(type: string) {
  switch (type) {
    case 'image':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21,15 16,10 5,21"/>
        </svg>
      );
    case 'video':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="23,7 16,12 23,17 23,7"/>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
      );
    case 'audio':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
      );
    case 'document':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      );
    default:
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
          <polyline points="13 2 13 9 20 9"/>
        </svg>
      );
  }
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * MediaField renders a media picker that allows selecting from the media library
 * or uploading new files.
 *
 * The value stored is the media asset ID (string).
 */
export function MediaField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id,
  placeholder = 'Select media...',
}: MediaFieldProps) {
  const fieldId = id || `field-${field.name}`;
  const [showPicker, setShowPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'browse' | 'upload'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Get allowed MIME types from field options
  const allowedMimeTypes = field.options?.allowedMimeTypes ?? [];

  // Fetch the selected asset details if we have a value
  const selectedAsset = useQuery(
    api.media.getAsset,
    value ? { id: value as Id<'media_assets'> } : 'skip'
  );

  // Fetch available assets for the picker
  const assetsResult = useQuery(
    api.media.listAssets,
    showPicker ? {
      type: typeFilter ? typeFilter as 'image' | 'video' | 'audio' | 'document' | 'other' : undefined,
      search: searchQuery || undefined,
      paginationOpts: { numItems: 50, cursor: null },
    } : 'skip'
  );

  // Mutations for upload
  const generateUploadUrl = useMutation(api.media.generateUploadUrl);
  const createAsset = useMutation(api.media.createAsset);

  // Handle selecting a media asset
  const handleSelect = useCallback((assetId: string) => {
    onChange(assetId);
    setShowPicker(false);
  }, [onChange]);

  // Handle clearing the selection
  const handleClear = useCallback(() => {
    onChange(null);
  }, [onChange]);

  // Handle upload completion
  const handleUploadComplete = useCallback((results: UploadedFile[]) => {
    // Find the first successful upload
    const successfulUpload = results.find(r => r.success);
    if (successfulUpload) {
      // We need to find the asset that was just created
      // Since UploadDropzone creates the asset, we need to query for it
      // For now, close the modal - the asset list will refresh
      setActiveTab('browse');
    }
  }, []);

  // Filter assets by allowed MIME types if specified
  const filteredAssets = assetsResult?.page?.filter(asset => {
    if (allowedMimeTypes.length === 0) return true;
    return allowedMimeTypes.some(pattern => {
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -1);
        return asset.mimeType?.startsWith(prefix);
      }
      return asset.mimeType === pattern;
    });
  });

  return (
    <FieldWrapper field={field} error={error} className={className} id={fieldId}>
      <div className="field-media">
        {/* Selected Media Preview */}
        {value && selectedAsset ? (
          <div className="field-media-preview">
            <div className="field-media-thumbnail">
              {selectedAsset.type === 'image' && selectedAsset.url ? (
                <img src={selectedAsset.url} alt={selectedAsset.title || selectedAsset.filename} />
              ) : (
                <div className="field-media-icon">
                  {getMediaTypeIcon(selectedAsset.type)}
                </div>
              )}
            </div>
            <div className="field-media-info">
              <span className="field-media-filename" title={selectedAsset.filename}>
                {selectedAsset.filename}
              </span>
              <div className="field-media-meta">
                <span className="field-media-type">{selectedAsset.type}</span>
                <span className="field-media-size">{formatFileSize(selectedAsset.size)}</span>
              </div>
            </div>
            {!disabled && !readOnly && (
              <div className="field-media-actions">
                <button
                  type="button"
                  className="field-media-action field-media-action--change"
                  onClick={() => setShowPicker(true)}
                  title="Change media"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  type="button"
                  className="field-media-action field-media-action--remove"
                  onClick={handleClear}
                  title="Remove media"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <button
            type="button"
            className="field-media-empty"
            onClick={() => setShowPicker(true)}
            disabled={disabled || readOnly}
          >
            <div className="field-media-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
            </div>
            <span className="field-media-empty-text">{placeholder}</span>
            <span className="field-media-empty-hint">Click to browse or upload media</span>
          </button>
        )}
      </div>

      {/* Media Picker Modal */}
      {showPicker && (
        <div className="modal-overlay" onClick={() => setShowPicker(false)}>
          <div className="modal modal-media-picker" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select Media</h3>
              <button className="modal-close" onClick={() => setShowPicker(false)}>
                &times;
              </button>
            </div>

            {/* Tabs */}
            <div className="media-picker-tabs">
              <button
                type="button"
                className={`media-picker-tab ${activeTab === 'browse' ? 'active' : ''}`}
                onClick={() => setActiveTab('browse')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                Browse Library
              </button>
              <button
                type="button"
                className={`media-picker-tab ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => setActiveTab('upload')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload New
              </button>
            </div>

            <div className="modal-body">
              {activeTab === 'browse' ? (
                <>
                  {/* Search and Filter */}
                  <div className="media-picker-toolbar">
                    <div className="search-input-wrapper">
                      <input
                        type="search"
                        className="search-input"
                        placeholder="Search files..."
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
                    <select
                      className="media-type-filter"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option value="">All Types</option>
                      <option value="image">Images</option>
                      <option value="video">Videos</option>
                      <option value="audio">Audio</option>
                      <option value="document">Documents</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Assets Grid */}
                  {assetsResult === undefined ? (
                    <div className="media-picker-loading">
                      <div className="loading-spinner" />
                      <p>Loading media...</p>
                    </div>
                  ) : filteredAssets && filteredAssets.length > 0 ? (
                    <div className="media-picker-grid">
                      {filteredAssets.map((asset) => (
                        <button
                          key={asset._id}
                          type="button"
                          className={`media-picker-item ${value === asset._id ? 'selected' : ''}`}
                          onClick={() => handleSelect(asset._id)}
                        >
                          <div className="media-picker-item-thumbnail">
                            {asset.type === 'image' && asset.url ? (
                              <img src={asset.url} alt={asset.title || asset.filename} />
                            ) : (
                              <div className="media-picker-item-icon">
                                {getMediaTypeIcon(asset.type)}
                              </div>
                            )}
                          </div>
                          <div className="media-picker-item-info">
                            <span className="media-picker-item-filename" title={asset.filename}>
                              {asset.filename}
                            </span>
                            <span className="media-picker-item-size">
                              {formatFileSize(asset.size)}
                            </span>
                          </div>
                          {value === asset._id && (
                            <div className="media-picker-item-selected">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="media-picker-empty">
                      <div className="media-picker-empty-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21,15 16,10 5,21"/>
                        </svg>
                      </div>
                      <p>No media found</p>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setActiveTab('upload')}
                      >
                        Upload Media
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Upload Tab */
                <div className="media-picker-upload">
                  <UploadDropzone
                    generateUploadUrl={generateUploadUrl}
                    createAsset={createAsset}
                    onUploadComplete={handleUploadComplete}
                    allowedMimeTypes={allowedMimeTypes}
                    maxFileSize={field.options?.maxFileSize}
                    maxConcurrentUploads={3}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPicker(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </FieldWrapper>
  );
}
