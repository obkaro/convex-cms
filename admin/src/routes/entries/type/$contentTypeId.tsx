import { useState, useMemo, useEffect, useCallback } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { usePermissions } from '~/hooks';

export const Route = createFileRoute('/entries/type/$contentTypeId')({
  component: ContentTypeEntriesPage,
});

type ContentStatus = 'draft' | 'published' | 'scheduled' | 'archived';
type SortField = 'title' | 'status' | 'updatedAt' | 'createdAt';
type SortDirection = 'asc' | 'desc';

function ContentTypeEntriesPage() {
  const { contentTypeId } = Route.useParams();
  const navigate = useNavigate();

  // Filter and search state
  const [selectedStatus, setSelectedStatus] = useState<ContentStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 25;

  // Permission checks
  const { canCreate, canUpdate, canDelete } = usePermissions();

  // Delete mutation
  const deleteEntry = useMutation(api.entries.remove);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<{ _id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(0); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch content type
  const contentType = useQuery(api.contentTypes.get, { id: contentTypeId });

  // Fetch entries for this content type
  const entriesResult = useQuery(api.entries.list, {
    contentTypeId: contentTypeId,
    status: selectedStatus || undefined,
    search: debouncedSearch || undefined,
    paginationOpts: { numItems: 250, cursor: null },
  });
  const allEntries = entriesResult?.page ?? [];

  // Get title from entry data based on content type's titleField
  const getEntryTitle = (entry: { data: Record<string, unknown> }) => {
    const titleField = contentType?.titleField ?? 'title';
    const title = entry.data[titleField];
    return typeof title === 'string' && title ? title : 'Untitled';
  };

  // Sort entries client-side
  const sortedEntries = useMemo(() => {
    const entries = [...allEntries];

    entries.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'title':
          const titleA = getEntryTitle(a).toLowerCase();
          const titleB = getEntryTitle(b).toLowerCase();
          comparison = titleA.localeCompare(titleB);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'updatedAt':
          // Use lastPublishedAt as proxy for update time when available,
          // otherwise fall back to _creationTime
          const updatedA = a.lastPublishedAt ?? a._creationTime ?? 0;
          const updatedB = b.lastPublishedAt ?? b._creationTime ?? 0;
          comparison = updatedA - updatedB;
          break;
        case 'createdAt':
          comparison = (a._creationTime ?? 0) - (b._creationTime ?? 0);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return entries;
  }, [allEntries, sortField, sortDirection, contentType]);

  // Paginate entries
  const paginatedEntries = useMemo(() => {
    const start = currentPage * pageSize;
    return sortedEntries.slice(start, start + pageSize);
  }, [sortedEntries, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedEntries.length / pageSize);

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get sort indicator
  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Debouncing is handled by the useEffect above
  };

  // Handle status filter change
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(e.target.value as ContentStatus | '');
    setCurrentPage(0);
  };

  // Handle delete click - opens confirmation modal
  const handleDeleteClick = useCallback((entry: { _id: string; data: Record<string, unknown> }) => {
    const title = getEntryTitle(entry);
    setEntryToDelete({ _id: entry._id, title });
    setDeleteError(null);
    setDeleteModalOpen(true);
  }, [contentType]);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!entryToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteEntry({
        id: entryToDelete._id,
        hardDelete: false, // Soft delete - moves to trash
      });
      setDeleteModalOpen(false);
      setEntryToDelete(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete entry';
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  }, [entryToDelete, deleteEntry]);

  // Handle delete modal close
  const handleDeleteModalClose = useCallback(() => {
    if (!isDeleting) {
      setDeleteModalOpen(false);
      setEntryToDelete(null);
      setDeleteError(null);
    }
  }, [isDeleting]);

  // Loading state
  if (contentType === undefined || entriesResult === undefined) {
    return (
      <div className="page content-type-entries-page">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading entries...</p>
        </div>
      </div>
    );
  }

  // Content type not found
  if (contentType === null) {
    return (
      <div className="page content-type-entries-page">
        <div className="error-state">
          <h2>Content Type Not Found</h2>
          <p>The content type you're looking for doesn't exist or has been deleted.</p>
          <button className="btn btn-primary" onClick={() => navigate({ to: '/content-types' })}>
            Back to Content Types
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page content-type-entries-page">
      <header className="page-header">
        <div className="page-header-content">
          <div className="page-breadcrumb">
            <Link to="/content-types" className="breadcrumb-link">Content Types</Link>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{contentType.displayName}</span>
          </div>
          <h1>{contentType.displayName}</h1>
          {contentType.description && (
            <p className="page-description">{contentType.description}</p>
          )}
        </div>
      </header>

      <div className="page-toolbar">
        <div className="toolbar-left">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => {
                  setSearchQuery('');
                  setDebouncedSearch('');
                  setCurrentPage(0);
                }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <select
            className="status-filter"
            value={selectedStatus}
            onChange={handleStatusChange}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="toolbar-right">
          <span className="entries-count">
            {sortedEntries.length} {sortedEntries.length === 1 ? 'entry' : 'entries'}
          </span>
          {canCreate('contentEntries') && (
            <Link
              to="/entries/new/$contentTypeId"
              params={{ contentTypeId }}
              className="btn btn-primary"
            >
              Create {contentType.displayName}
            </Link>
          )}
        </div>
      </div>

      {sortedEntries.length === 0 ? (
        <div className="content-list empty-state">
          <div className="empty-state-icon" />
          <h3>
            {searchQuery || selectedStatus
              ? 'No matching entries'
              : `No ${contentType.displayName} entries yet`}
          </h3>
          <p>
            {searchQuery || selectedStatus
              ? 'Try adjusting your search or filter criteria.'
              : `Click "Create ${contentType.displayName}" to add your first entry.`}
          </p>
          {(searchQuery || selectedStatus) && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSearchQuery('');
                setDebouncedSearch('');
                setSelectedStatus('');
                setCurrentPage(0);
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="content-list">
            <table className="content-table sortable-table">
              <thead>
                <tr>
                  <th
                    className="sortable-header"
                    onClick={() => handleSort('title')}
                  >
                    Title{getSortIndicator('title')}
                  </th>
                  <th
                    className="sortable-header"
                    onClick={() => handleSort('status')}
                  >
                    Status{getSortIndicator('status')}
                  </th>
                  <th
                    className="sortable-header"
                    onClick={() => handleSort('updatedAt')}
                  >
                    Updated{getSortIndicator('updatedAt')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.map((entry) => (
                  <tr key={entry._id}>
                    <td>
                      <Link
                        to="/entries/$entryId"
                        params={{ entryId: entry._id }}
                        className="entry-title-link"
                      >
                        {getEntryTitle(entry)}
                      </Link>
                      <span className="entry-slug">{entry.slug}</span>
                    </td>
                    <td>
                      <span className={`entry-status entry-status--${entry.status}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="date-cell">{formatDate(entry.lastPublishedAt ?? entry._creationTime)}</td>
                    <td className="actions-cell">
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
                      {canDelete('contentEntries') && (
                        <button
                          type="button"
                          className="btn btn-small btn-danger"
                          onClick={() => handleDeleteClick(entry)}
                          data-testid={`delete-entry-${entry._id}`}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-small btn-secondary"
                onClick={() => setCurrentPage(0)}
                disabled={currentPage === 0}
              >
                First
              </button>
              <button
                className="btn btn-small btn-secondary"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                className="btn btn-small btn-secondary"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
              >
                Next
              </button>
              <button
                className="btn btn-small btn-secondary"
                onClick={() => setCurrentPage(totalPages - 1)}
                disabled={currentPage >= totalPages - 1}
              >
                Last
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && entryToDelete && (
        <div
          className="modal-overlay"
          onClick={handleDeleteModalClose}
          data-testid="delete-modal-overlay"
        >
          <div className="modal" onClick={(e) => e.stopPropagation()} data-testid="delete-modal">
            <div className="modal-header">
              <h3>Delete Entry</h3>
              <button
                type="button"
                className="modal-close"
                onClick={handleDeleteModalClose}
                disabled={isDeleting}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete "{entryToDelete.title}"? It will be moved to the trash
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
                onClick={handleDeleteModalClose}
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
    </div>
  );
}
