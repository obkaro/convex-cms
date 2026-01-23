import { useState, useCallback } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { usePermissions } from '~/hooks';
import { ErrorState, ErrorAlert } from '~/components';
import { BulkActionBar } from '~/components/BulkActionBar';

export const Route = createFileRoute('/content')({
  component: ContentPage,
});

type ContentStatus = 'draft' | 'published' | 'scheduled' | 'archived';

function ContentPage() {
  const navigate = useNavigate();
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<ContentStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [dismissedError, setDismissedError] = useState<'contentTypes' | 'entries' | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Permission checks
  const { canCreate, canUpdate, canDelete, canPublish } = usePermissions();

  // Fetch content types for the filter dropdown and create menu
  const contentTypesResult = useQuery(api.contentTypes.list, { isActive: true });
  const contentTypes = contentTypesResult?.page ?? [];
  const contentTypesError = contentTypesResult?.error;
  const isLoadingContentTypes = contentTypesResult === undefined;

  // Fetch content entries with filters (including search)
  const entriesResult = useQuery(api.entries.list, {
    contentTypeId: selectedTypeId || undefined,
    status: selectedStatus || undefined,
    search: searchQuery.trim() || undefined,
    paginationOpts: { numItems: 50, cursor: null },
  });
  const entries = entriesResult?.page ?? [];
  const entriesError = entriesResult?.error;
  const isLoadingEntries = entriesResult === undefined;

  // Combined loading state
  const isLoading = isLoadingContentTypes || isLoadingEntries;

  // Retry handler - reloads the page to retry queries
  const handleRetry = useCallback(() => {
    setDismissedError(null);
    window.location.reload();
  }, []);

  // Create entry handler
  const handleCreateEntry = (contentTypeId: string) => {
    setShowCreateMenu(false);
    navigate({ to: '/entries/new/$contentTypeId', params: { contentTypeId } });
  };

  // Get content type display name by ID
  const getContentTypeName = (contentTypeId: string) => {
    const type = contentTypes.find((t) => t._id === contentTypeId);
    return type?.displayName ?? 'Unknown';
  };

  // Get title from entry data
  const getEntryTitle = (entry: { data: Record<string, unknown> }, contentTypeId: string) => {
    const type = contentTypes.find((t) => t._id === contentTypeId);
    const titleField = type?.titleField ?? 'title';
    const title = entry.data[titleField];
    return typeof title === 'string' && title ? title : 'Untitled';
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Selection handlers
  const handleSelectItem = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === entries.length && entries.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map((e) => e._id)));
    }
  }, [selectedIds.size, entries]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Show full-page error state if both queries failed
  if (contentTypesError && entriesError) {
    return (
      <div className="page content-page">
        <header className="page-header">
          <h1>Content</h1>
          <p className="page-description">
            Browse and manage content entries across all content types.
          </p>
        </header>
        <ErrorState
          error={contentTypesError}
          title="Failed to load content"
          onRetry={handleRetry}
        />
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="page content-page">
        <header className="page-header">
          <h1>Content</h1>
          <p className="page-description">
            Browse and manage content entries across all content types.
          </p>
        </header>
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page content-page">
      <header className="page-header">
        <h1>Content</h1>
        <p className="page-description">
          Browse and manage content entries across all content types.
        </p>
      </header>

      {/* Error alerts for partial failures */}
      {contentTypesError && dismissedError !== 'contentTypes' && (
        <ErrorAlert
          error={contentTypesError}
          onDismiss={() => setDismissedError('contentTypes')}
          onRetry={handleRetry}
        />
      )}
      {entriesError && dismissedError !== 'entries' && (
        <ErrorAlert
          error={entriesError}
          onDismiss={() => setDismissedError('entries')}
          onRetry={handleRetry}
        />
      )}

      <div className="page-toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            className="search-input"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="content-search-input"
          />
          <select
            className="content-type-filter"
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
          >
            <option value="">All Content Types</option>
            {contentTypes.map((type) => (
              <option key={type._id} value={type._id}>
                {type.displayName}
              </option>
            ))}
          </select>
          <select
            className="status-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ContentStatus | '')}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="toolbar-right">
          <div className="create-menu-container">
            {canCreate('contentEntries') && (
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateMenu(!showCreateMenu)}
                disabled={contentTypes.length === 0}
              >
                Create Entry
              </button>
            )}
            {showCreateMenu && contentTypes.length > 0 && (
              <div className="create-menu">
                {contentTypes.map((type) => (
                  <button
                    key={type._id}
                    className="create-menu-item"
                    onClick={() => handleCreateEntry(type._id)}
                  >
                    {type.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedIds={Array.from(selectedIds)}
        onClearSelection={handleClearSelection}
        onOperationComplete={handleClearSelection}
      />

      {entries.length === 0 ? (
        <div className="content-list empty-state">
          <div className="empty-state-icon" />
          <h3>No content entries yet</h3>
          <p>
            {contentTypes.length === 0
              ? 'Create a content type first, then start adding content entries.'
              : 'Click "Create Entry" to add your first content entry.'}
          </p>
        </div>
      ) : (
        <div className="content-list">
          <table className="content-table">
            <thead>
              <tr>
                <th className="content-col-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === entries.length && entries.length > 0}
                    onChange={handleSelectAll}
                    aria-label="Select all entries"
                  />
                </th>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry._id} className={selectedIds.has(entry._id) ? 'selected' : ''}>
                  <td className="content-col-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(entry._id)}
                      onChange={(e) => handleSelectItem(entry._id, e.target.checked)}
                      aria-label={`Select ${getEntryTitle(entry, entry.contentTypeId)}`}
                    />
                  </td>
                  <td>
                    <Link
                      to="/entries/$entryId"
                      params={{ entryId: entry._id }}
                      className="entry-title-link"
                    >
                      {getEntryTitle(entry, entry.contentTypeId)}
                    </Link>
                    <span className="entry-slug">{entry.slug}</span>
                  </td>
                  <td>{getContentTypeName(entry.contentTypeId)}</td>
                  <td>
                    <span className={`entry-status entry-status--${entry.status}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td>{formatDate(entry._creationTime)}</td>
                  <td>
                    {canUpdate('contentEntries') ? (
                      <Link
                        to="/entries/$entryId"
                        params={{ entryId: entry._id }}
                        className="btn btn-small btn-secondary"
                      >
                        Edit
                      </Link>
                    ) : (
                      <Link
                        to="/entries/$entryId"
                        params={{ entryId: entry._id }}
                        className="btn btn-small btn-secondary"
                      >
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
