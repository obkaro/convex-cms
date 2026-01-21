import { useState, useMemo, useCallback } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ContentTypeFormModal } from '../components/ContentTypeFormModal';
import { ErrorState, ErrorAlert } from '~/components';

export const Route = createFileRoute('/content-types')({
  component: ContentTypesPage,
});

type ViewMode = 'grid' | 'list';

function ContentTypesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Handle content type created
  const handleContentTypeCreated = useCallback(() => {
    // The query will automatically refetch due to Convex reactivity
    setShowCreateModal(false);
  }, []);

  // Fetch content types with entry counts
  const contentTypesResult = useQuery(api.contentTypes.list, {
    isActive: showActiveOnly ? true : undefined,
    includeEntryCounts: true,
  });

  const contentTypes = contentTypesResult?.page ?? [];
  const isLoading = contentTypesResult === undefined;
  const error = contentTypesResult?.error;
  const [dismissedError, setDismissedError] = useState(false);

  // Retry handler
  const handleRetry = useCallback(() => {
    setDismissedError(false);
    window.location.reload();
  }, []);

  // Filter content types by search query
  const filteredContentTypes = useMemo(() => {
    if (!searchQuery.trim()) {
      return contentTypes;
    }

    const query = searchQuery.toLowerCase();
    return contentTypes.filter(
      (type) =>
        type.name.toLowerCase().includes(query) ||
        type.displayName.toLowerCase().includes(query)
    );
  }, [contentTypes, searchQuery]);

  // Format date helper
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get relative time helper
  const getRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 30) {
      return formatDate(timestamp);
    } else if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  // Get field type icon
  const getFieldTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      text: 'Aa',
      richText: '¶',
      number: '#',
      boolean: '☑',
      date: '📅',
      datetime: '📆',
      reference: '🔗',
      media: '🖼',
      json: '{}',
      select: '▼',
      multiSelect: '☰',
      tags: '🏷',
      category: '📁',
    };
    return icons[type] || '?';
  };

  // Show full-page error state if query failed
  if (error && !isLoading) {
    return (
      <div className="page content-types-page">
        <header className="page-header">
          <h1>Content Types</h1>
          <p className="page-description">
            Define the structure of your content with custom fields and validation rules.
          </p>
        </header>
        <ErrorState
          error={error}
          title="Failed to load content types"
          onRetry={handleRetry}
        />
      </div>
    );
  }

  return (
    <div className="page content-types-page">
      <header className="page-header">
        <h1>Content Types</h1>
        <p className="page-description">
          Define the structure of your content with custom fields and validation rules.
        </p>
      </header>

      {/* Error alert for partial failures */}
      {error && !dismissedError && (
        <ErrorAlert
          error={error}
          onDismiss={() => setDismissedError(true)}
          onRetry={handleRetry}
        />
      )}

      <div className="page-toolbar">
        <div className="toolbar-left">
          <input
            type="search"
            placeholder="Search content types..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <label className="toolbar-checkbox">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
            />
            <span>Active only</span>
          </label>
        </div>
        <div className="toolbar-right">
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
              aria-label="Grid view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="6" height="6" rx="1" />
                <rect x="9" y="1" width="6" height="6" rx="1" />
                <rect x="1" y="9" width="6" height="6" rx="1" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
              </svg>
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
              aria-label="List view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="2" width="14" height="2" rx="0.5" />
                <rect x="1" y="7" width="14" height="2" rx="0.5" />
                <rect x="1" y="12" width="14" height="2" rx="0.5" />
              </svg>
            </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            data-testid="create-content-type-button"
          >
            Create Content Type
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading content types...</p>
        </div>
      ) : filteredContentTypes.length === 0 ? (
        <div className="content-types-list empty-state">
          <div className="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="8" y="8" width="32" height="32" rx="4" />
              <line x1="16" y1="16" x2="32" y2="16" />
              <line x1="16" y1="24" x2="28" y2="24" />
              <line x1="16" y1="32" x2="24" y2="32" />
            </svg>
          </div>
          <h3>
            {searchQuery
              ? 'No content types match your search'
              : 'No content types defined'}
          </h3>
          <p>
            {searchQuery
              ? 'Try adjusting your search query or filters.'
              : 'Content types define the schema for your content. Create one to get started.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="content-types-grid">
          {filteredContentTypes.map((contentType) => (
            <Link
              key={contentType._id}
              to="/entries/type/$contentTypeId"
              params={{ contentTypeId: contentType._id }}
              className="content-type-card"
            >
              <div className="content-type-card-header">
                <div className="content-type-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="7" y1="8" x2="17" y2="8" />
                    <line x1="7" y1="12" x2="14" y2="12" />
                    <line x1="7" y1="16" x2="11" y2="16" />
                  </svg>
                </div>
                {!contentType.isActive && (
                  <span className="content-type-badge content-type-badge--inactive">
                    Inactive
                  </span>
                )}
                {contentType.singleton && (
                  <span className="content-type-badge content-type-badge--singleton">
                    Singleton
                  </span>
                )}
              </div>

              <h3 className="content-type-name">{contentType.displayName}</h3>
              <p className="content-type-machine-name">{contentType.name}</p>

              <div className="content-type-stats">
                <div className="content-type-stat">
                  <span className="stat-value">{contentType.fields.length}</span>
                  <span className="stat-label">
                    {contentType.fields.length === 1 ? 'Field' : 'Fields'}
                  </span>
                </div>
                <div className="content-type-stat">
                  <span className="stat-value">
                    {(contentType as any).entryCount ?? 0}
                  </span>
                  <span className="stat-label">
                    {(contentType as any).entryCount === 1 ? 'Entry' : 'Entries'}
                  </span>
                </div>
              </div>

              <div className="content-type-fields-preview">
                {contentType.fields.slice(0, 4).map((field) => (
                  <span key={field.name} className="field-preview-chip" title={field.label}>
                    <span className="field-type-icon">{getFieldTypeIcon(field.type)}</span>
                    {field.label}
                  </span>
                ))}
                {contentType.fields.length > 4 && (
                  <span className="field-preview-more">
                    +{contentType.fields.length - 4} more
                  </span>
                )}
              </div>

              <div className="content-type-footer">
                <span className="content-type-updated">
                  Updated {getRelativeTime(contentType._creationTime)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="content-types-list-view">
          <table className="content-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Fields</th>
                <th>Entries</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContentTypes.map((contentType) => (
                <tr key={contentType._id}>
                  <td>
                    <div className="content-type-name-cell">
                      <span className="content-type-display-name">
                        {contentType.displayName}
                      </span>
                      <span className="content-type-slug">{contentType.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="field-count">{contentType.fields.length}</span>
                  </td>
                  <td>
                    <span className="entry-count">
                      {(contentType as any).entryCount ?? 0}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`content-type-status ${
                        contentType.isActive
                          ? 'content-type-status--active'
                          : 'content-type-status--inactive'
                      }`}
                    >
                      {contentType.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {contentType.singleton && (
                      <span className="content-type-status content-type-status--singleton">
                        Singleton
                      </span>
                    )}
                  </td>
                  <td>{formatDate(contentType._creationTime)}</td>
                  <td>
                    <Link
                      to="/entries/type/$contentTypeId"
                      params={{ contentTypeId: contentType._id }}
                      className="btn btn-small btn-secondary"
                    >
                      View Entries
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filteredContentTypes.length > 0 && (
        <div className="content-types-summary">
          Showing {filteredContentTypes.length} of {contentTypes.length} content type
          {contentTypes.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Create Content Type Modal */}
      <ContentTypeFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleContentTypeCreated}
      />
    </div>
  );
}
