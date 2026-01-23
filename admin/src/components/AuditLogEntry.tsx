import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface AuditLogEntryProps {
  logId: string;
  onClose: () => void;
}

interface FieldDiff {
  field: string;
  previousValue?: unknown;
  newValue?: unknown;
}

interface DiffResponse {
  changedFields: string[];
  fieldDiffs: FieldDiff[];
  hasChanges: boolean;
}

export function AuditLogEntry({ logId, onClose }: AuditLogEntryProps) {
  const logQuery = useQuery(api.auditLogs.get, { id: logId });
  const diffQuery = useQuery(api.auditLogs.getDiff, { id: logId });

  const log = logQuery;
  const diff = diffQuery as DiffResponse | undefined;
  const isLoading = log === undefined;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '(empty)';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getChangeType = (fieldDiff: FieldDiff): 'added' | 'removed' | 'modified' => {
    if (fieldDiff.previousValue === undefined) return 'added';
    if (fieldDiff.newValue === undefined) return 'removed';
    return 'modified';
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'added':
        return '+';
      case 'removed':
        return '-';
      case 'modified':
        return '~';
      default:
        return '';
    }
  };

  const getChangeClass = (changeType: string) => {
    switch (changeType) {
      case 'added':
        return 'diff-change diff-change--added';
      case 'removed':
        return 'diff-change diff-change--removed';
      case 'modified':
        return 'diff-change diff-change--modified';
      default:
        return 'diff-change';
    }
  };

  const getActionBadgeClass = (action: string) => {
    const classes: Record<string, string> = {
      created: 'action-badge action-badge--success',
      updated: 'action-badge action-badge--info',
      published: 'action-badge action-badge--success',
      unpublished: 'action-badge action-badge--warning',
      deleted: 'action-badge action-badge--danger',
      restored: 'action-badge action-badge--success',
      duplicated: 'action-badge action-badge--info',
      scheduled: 'action-badge action-badge--info',
      locked: 'action-badge action-badge--warning',
      unlocked: 'action-badge action-badge--success',
      rolledBack: 'action-badge action-badge--warning',
      migrated: 'action-badge action-badge--info',
    };
    return classes[action] || 'action-badge';
  };

  return (
    <div className="audit-log-detail-overlay" onClick={onClose}>
      <div className="audit-log-detail" onClick={(e) => e.stopPropagation()}>
        <div className="audit-log-detail-header">
          <h3>Audit Log Details</h3>
          <button
            type="button"
            className="audit-log-detail-close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {isLoading ? (
          <div className="audit-log-detail-loading">Loading details...</div>
        ) : !log ? (
          <div className="audit-log-detail-error">Could not load audit log</div>
        ) : (
          <div className="audit-log-detail-content">
            <div className="audit-log-detail-section">
              <div className="audit-log-detail-row">
                <span className="audit-log-detail-label">Action</span>
                <span className={getActionBadgeClass(log.action)}>
                  {log.action}
                </span>
              </div>

              <div className="audit-log-detail-row">
                <span className="audit-log-detail-label">Resource Type</span>
                <span className="audit-log-detail-value">{log.resourceType}</span>
              </div>

              <div className="audit-log-detail-row">
                <span className="audit-log-detail-label">Resource ID</span>
                <code className="audit-log-detail-code">{log.resourceId}</code>
              </div>

              {log.contentTypeName && (
                <div className="audit-log-detail-row">
                  <span className="audit-log-detail-label">Content Type</span>
                  <span className="audit-log-detail-value">
                    {log.contentTypeName}
                  </span>
                </div>
              )}

              <div className="audit-log-detail-row">
                <span className="audit-log-detail-label">Timestamp</span>
                <span className="audit-log-detail-value">
                  {formatDate(log._creationTime)}
                </span>
              </div>

              {log.userId && (
                <div className="audit-log-detail-row">
                  <span className="audit-log-detail-label">User</span>
                  <span className="audit-log-detail-value">{log.userId}</span>
                </div>
              )}
            </div>

            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="audit-log-detail-section">
                <h4>Metadata</h4>
                <pre className="audit-log-metadata">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}

            {diff && diff.fieldDiffs && diff.fieldDiffs.length > 0 && (
              <div className="audit-log-detail-section">
                <h4>Changes</h4>
                <div className="diff-list">
                  {diff.fieldDiffs.map((fieldDiff, index) => {
                    const changeType = getChangeType(fieldDiff);
                    return (
                      <div key={index} className={getChangeClass(changeType)}>
                        <div className="diff-field-header">
                          <span className="diff-icon">
                            {getChangeIcon(changeType)}
                          </span>
                          <span className="diff-field-name">{fieldDiff.field}</span>
                          <span className="diff-change-type">{changeType}</span>
                        </div>

                        <div className="diff-values">
                          {changeType !== 'added' && (
                            <div className="diff-value diff-value--old">
                              <span className="diff-value-label">Before:</span>
                              <pre className="diff-value-content">
                                {formatValue(fieldDiff.previousValue)}
                              </pre>
                            </div>
                          )}
                          {changeType !== 'removed' && (
                            <div className="diff-value diff-value--new">
                              <span className="diff-value-label">After:</span>
                              <pre className="diff-value-content">
                                {formatValue(fieldDiff.newValue)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(!diff || !diff.fieldDiffs || diff.fieldDiffs.length === 0) &&
              log.action !== 'created' &&
              log.action !== 'deleted' && (
                <div className="audit-log-detail-section">
                  <h4>Changes</h4>
                  <p className="audit-log-no-diff">
                    No detailed changes recorded for this event.
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
