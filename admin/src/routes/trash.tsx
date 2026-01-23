import { useState, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

export const Route = createFileRoute('/trash')({
  component: TrashPage,
});

interface TrashItem {
  _id: string;
  contentTypeId?: string;
  contentTypeName?: string;
  slug?: string;
  name?: string;
  title?: string;
  status?: string;
  deletedAt: number;
  deletedBy?: string;
  data?: Record<string, unknown>;
}

function TrashPage() {
  const [selectedContentType, setSelectedContentType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [isEmptying, setIsEmptying] = useState(false);
  const [emptyError, setEmptyError] = useState<string | null>(null);

  const trashQuery = useQuery(api.trash.list, {
    contentTypeId: selectedContentType || undefined,
    search: searchQuery || undefined,
    paginationOpts: { numItems: 50, cursor: null },
  });

  const configQuery = useQuery(api.trash.getConfig, {});
  const statsQuery = useQuery(api.trash.getStats, {});
  const contentTypesQuery = useQuery(api.contentTypes.list, {});

  const contentTypes = contentTypesQuery?.page ?? [];

  const restoreMutation = useMutation(api.bulkOperations.bulkRestore);
  const emptyMutation = useMutation(api.trash.empty);

  const trashItems = (trashQuery?.page ?? []) as TrashItem[];
  const isLoading = trashQuery === undefined;
  const config = configQuery;
  const stats = statsQuery;

  const handleSelectItem = useCallback((itemId: string, selected: boolean) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedItems.size === trashItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(trashItems.map((item) => item._id)));
    }
  }, [selectedItems.size, trashItems]);

  const handleRestore = useCallback(async (ids: string[]) => {
    setIsRestoring(true);
    setRestoreError(null);

    try {
      await restoreMutation({ ids });
      setSelectedItems((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to restore';
      setRestoreError(message);
    } finally {
      setIsRestoring(false);
    }
  }, [restoreMutation]);

  const handleEmptyTrash = useCallback(async () => {
    setIsEmptying(true);
    setEmptyError(null);

    try {
      await emptyMutation({});
      setShowEmptyConfirm(false);
      setSelectedItems(new Set());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to empty trash';
      setEmptyError(message);
    } finally {
      setIsEmptying(false);
    }
  }, [emptyMutation]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysUntilDeletion = (deletedAt: number) => {
    if (!config?.retentionDays) return null;
    const expiresAt = deletedAt + config.retentionDays * 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
    return Math.max(0, daysLeft);
  };

  const getItemTitle = (item: TrashItem) => {
    if (item.title) return item.title;
    if (item.name) return item.name;
    if (item.data) {
      const titleField = item.data.title || item.data.name;
      if (titleField && typeof titleField === 'string') return titleField;
    }
    return item.slug || item._id;
  };

  return (
    <div className="trash-page">
      <div className="trash-header">
        <div className="trash-title">
          <h1>Trash</h1>
          <p className="trash-subtitle">
            Deleted items are kept for{' '}
            {config?.retentionDays ?? 30} days before permanent deletion
          </p>
        </div>
        {trashItems.length > 0 && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setShowEmptyConfirm(true)}
          >
            Empty Trash
          </button>
        )}
      </div>

      {stats && (
        <div className="trash-stats">
          <div className="trash-stat">
            <span className="trash-stat-value">{stats.totalCount ?? 0}</span>
            <span className="trash-stat-label">Items in Trash</span>
          </div>
          <div className="trash-stat">
            <span className="trash-stat-value">{stats.expiredCount ?? 0}</span>
            <span className="trash-stat-label">Expired</span>
          </div>
        </div>
      )}

      <div className="trash-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search deleted items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="trash-search"
          />
          <select
            value={selectedContentType}
            onChange={(e) => setSelectedContentType(e.target.value)}
            className="trash-content-type-filter"
          >
            <option value="">All Content Types</option>
            {contentTypes.map((type) => (
              <option key={type._id} value={type._id}>
                {type.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {restoreError && (
        <div className="trash-error" role="alert">
          {restoreError}
          <button type="button" onClick={() => setRestoreError(null)}>
            &times;
          </button>
        </div>
      )}

      {emptyError && (
        <div className="trash-error" role="alert">
          {emptyError}
          <button type="button" onClick={() => setEmptyError(null)}>
            &times;
          </button>
        </div>
      )}

      {selectedItems.size > 0 && (
        <div className="trash-bulk-bar">
          <span>
            {selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'}{' '}
            selected
          </span>
          <button
            type="button"
            className="btn btn-sm btn-success"
            onClick={() => handleRestore(Array.from(selectedItems))}
            disabled={isRestoring}
          >
            {isRestoring ? 'Restoring...' : 'Restore Selected'}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => setSelectedItems(new Set())}
          >
            Clear Selection
          </button>
        </div>
      )}

      <div className="trash-content">
        {isLoading ? (
          <div className="trash-loading">Loading trash...</div>
        ) : trashItems.length === 0 ? (
          <div className="trash-empty">
            <span className="trash-empty-icon">🗑️</span>
            <p>Trash is empty</p>
          </div>
        ) : (
          <table className="trash-table">
            <thead>
              <tr>
                <th className="trash-col-checkbox">
                  <input
                    type="checkbox"
                    checked={
                      selectedItems.size === trashItems.length &&
                      trashItems.length > 0
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Name</th>
                <th>Type</th>
                <th>Deleted</th>
                <th>Expires In</th>
                <th className="trash-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trashItems.map((item) => {
                const daysLeft = getDaysUntilDeletion(item.deletedAt);

                return (
                  <tr key={item._id}>
                    <td className="trash-col-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item._id)}
                        onChange={(e) =>
                          handleSelectItem(item._id, e.target.checked)
                        }
                      />
                    </td>
                    <td>
                      <div className="trash-item-name">
                        <span className="trash-item-title">
                          {getItemTitle(item)}
                        </span>
                        {item.slug && (
                          <span className="trash-item-slug">{item.slug}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="trash-item-type">
                        {item.contentTypeName || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <span className="trash-item-date">
                        {formatDate(item.deletedAt)}
                      </span>
                      {item.deletedBy && (
                        <span className="trash-item-by">
                          by {item.deletedBy}
                        </span>
                      )}
                    </td>
                    <td>
                      {daysLeft !== null && (
                        <span
                          className={`trash-item-expires ${daysLeft <= 3 ? 'trash-item-expires--soon' : ''}`}
                        >
                          {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                        </span>
                      )}
                    </td>
                    <td className="trash-col-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        onClick={() => handleRestore([item._id])}
                        disabled={isRestoring}
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showEmptyConfirm && (
        <div className="modal-overlay" onClick={() => setShowEmptyConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Empty Trash</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowEmptyConfirm(false)}
                disabled={isEmptying}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                <strong>Warning:</strong> This will permanently delete all items
                in the trash. This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowEmptyConfirm(false)}
                disabled={isEmptying}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleEmptyTrash}
                disabled={isEmptying}
              >
                {isEmptying ? 'Deleting...' : 'Empty Trash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
