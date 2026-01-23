import { useState, useCallback, useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { AuditLogEntry } from '../components/AuditLogEntry';

export const Route = createFileRoute('/audit-logs')({
  component: AuditLogsPage,
});

type ResourceType = 'contentEntry' | 'contentType' | 'mediaAsset' | 'mediaFolder' | 'settings';
type ActionType = 'created' | 'updated' | 'published' | 'unpublished' | 'deleted' | 'restored' | 'duplicated' | 'scheduled' | 'locked' | 'unlocked' | 'rolledBack' | 'migrated';

interface AuditLog {
  _id: string;
  resourceType: ResourceType;
  resourceId: string;
  action: ActionType;
  userId?: string;
  contentTypeName?: string;
  changes?: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  _creationTime: number;
}

const RESOURCE_TYPES: { value: ResourceType | ''; label: string }[] = [
  { value: '', label: 'All Resources' },
  { value: 'contentEntry', label: 'Content Entries' },
  { value: 'contentType', label: 'Content Types' },
  { value: 'mediaAsset', label: 'Media Assets' },
  { value: 'mediaFolder', label: 'Media Folders' },
  { value: 'settings', label: 'Settings' },
];

const ACTION_TYPES: { value: ActionType | ''; label: string }[] = [
  { value: '', label: 'All Actions' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished', label: 'Unpublished' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'restored', label: 'Restored' },
  { value: 'duplicated', label: 'Duplicated' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'locked', label: 'Locked' },
  { value: 'unlocked', label: 'Unlocked' },
  { value: 'rolledBack', label: 'Rolled Back' },
  { value: 'migrated', label: 'Migrated' },
];

function AuditLogsPage() {
  const [filters, setFilters] = useState({
    resourceType: '' as ResourceType | '',
    action: '' as ActionType | '',
    userId: '',
    contentTypeName: '',
    dateRange: 'all' as 'all' | 'today' | 'week' | 'month',
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [cursor, setCursor] = useState<string | undefined>();

  const getDateRange = useCallback(() => {
    const now = Date.now();
    switch (filters.dateRange) {
      case 'today': {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        return { startDate: startOfDay.getTime(), endDate: now };
      }
      case 'week': {
        return { startDate: now - 7 * 24 * 60 * 60 * 1000, endDate: now };
      }
      case 'month': {
        return { startDate: now - 30 * 24 * 60 * 60 * 1000, endDate: now };
      }
      default:
        return {};
    }
  }, [filters.dateRange]);

  const dateRange = getDateRange();

  const logsQuery = useQuery(api.auditLogs.list, {
    resourceType: filters.resourceType || undefined,
    action: filters.action || undefined,
    userId: filters.userId || undefined,
    contentTypeName: filters.contentTypeName || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    limit: 50,
    cursor,
  });

  const statsQuery = useQuery(api.auditLogs.getStats, {
    resourceType: filters.resourceType || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const logs = (logsQuery?.logs ?? []) as AuditLog[];
  const nextCursor = logsQuery?.nextCursor;
  const isLoading = logsQuery === undefined;
  const stats = statsQuery;

  const handleFilterChange = useCallback(
    (field: keyof typeof filters, value: string) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
      setCursor(undefined);
    },
    []
  );

  const handleLoadMore = useCallback(() => {
    if (nextCursor) {
      setCursor(nextCursor);
    }
  }, [nextCursor]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionColor = (action: ActionType) => {
    const colors: Record<ActionType, string> = {
      created: '#16a34a',
      updated: '#2563eb',
      published: '#16a34a',
      unpublished: '#ca8a04',
      deleted: '#dc2626',
      restored: '#16a34a',
      duplicated: '#6366f1',
      scheduled: '#8b5cf6',
      locked: '#f59e0b',
      unlocked: '#22c55e',
      rolledBack: '#f97316',
      migrated: '#06b6d4',
    };
    return colors[action] || '#6b7280';
  };

  const getResourceIcon = (resourceType: ResourceType) => {
    const icons: Record<ResourceType, string> = {
      contentEntry: '📄',
      contentType: '📁',
      mediaAsset: '🖼️',
      mediaFolder: '📂',
      settings: '⚙️',
    };
    return icons[resourceType] || '📌';
  };

  return (
    <div className="audit-logs-page">
      <div className="audit-logs-header">
        <div className="audit-logs-title">
          <h1>Audit Logs</h1>
          <p className="audit-logs-subtitle">
            Track all changes across your content management system
          </p>
        </div>
      </div>

      {stats && (
        <div className="audit-logs-stats">
          <div className="audit-stat">
            <span className="audit-stat-value">{stats.totalCount ?? 0}</span>
            <span className="audit-stat-label">Total Events</span>
          </div>
          <div className="audit-stat">
            <span className="audit-stat-value">{stats.actionCounts?.created ?? 0}</span>
            <span className="audit-stat-label">Created</span>
          </div>
          <div className="audit-stat">
            <span className="audit-stat-value">{stats.actionCounts?.updated ?? 0}</span>
            <span className="audit-stat-label">Updated</span>
          </div>
          <div className="audit-stat">
            <span className="audit-stat-value">{stats.actionCounts?.published ?? 0}</span>
            <span className="audit-stat-label">Published</span>
          </div>
          <div className="audit-stat">
            <span className="audit-stat-value">{stats.actionCounts?.deleted ?? 0}</span>
            <span className="audit-stat-label">Deleted</span>
          </div>
        </div>
      )}

      <div className="audit-logs-filters">
        <div className="filter-group">
          <label htmlFor="resourceType">Resource Type</label>
          <select
            id="resourceType"
            value={filters.resourceType}
            onChange={(e) => handleFilterChange('resourceType', e.target.value)}
          >
            {RESOURCE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="action">Action</label>
          <select
            id="action"
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
          >
            {ACTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="dateRange">Date Range</label>
          <select
            id="dateRange"
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="contentTypeName">Content Type</label>
          <input
            type="text"
            id="contentTypeName"
            placeholder="Filter by content type"
            value={filters.contentTypeName}
            onChange={(e) => handleFilterChange('contentTypeName', e.target.value)}
          />
        </div>
      </div>

      <div className="audit-logs-content">
        {isLoading ? (
          <div className="audit-logs-loading">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="audit-logs-empty">
            <p>No audit logs found matching your filters.</p>
          </div>
        ) : (
          <>
            <ul className="audit-logs-list">
              {logs.map((log) => (
                <li
                  key={log._id}
                  className={`audit-log-item ${selectedLog?._id === log._id ? 'audit-log-item--selected' : ''}`}
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="audit-log-icon">
                    {getResourceIcon(log.resourceType)}
                  </div>
                  <div className="audit-log-info">
                    <div className="audit-log-header">
                      <span
                        className="audit-log-action"
                        style={{ color: getActionColor(log.action) }}
                      >
                        {log.action}
                      </span>
                      <span className="audit-log-resource-type">
                        {log.resourceType}
                      </span>
                      {log.contentTypeName && (
                        <span className="audit-log-content-type">
                          {log.contentTypeName}
                        </span>
                      )}
                    </div>
                    <div className="audit-log-meta">
                      <span className="audit-log-date">
                        {formatDate(log._creationTime)}
                      </span>
                      {log.userId && (
                        <span className="audit-log-user">by {log.userId}</span>
                      )}
                    </div>
                  </div>
                  <div className="audit-log-chevron">›</div>
                </li>
              ))}
            </ul>

            {nextCursor && (
              <div className="audit-logs-load-more">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleLoadMore}
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedLog && (
        <AuditLogEntry
          logId={selectedLog._id}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
