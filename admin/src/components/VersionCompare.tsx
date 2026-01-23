import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface VersionCompareProps {
  entryId: string;
  fromVersion: number;
  toVersion: number;
  onClose: () => void;
  onRollback: (version: number) => void;
}

interface DiffChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: 'added' | 'removed' | 'modified';
}

export function VersionCompare({
  entryId,
  fromVersion,
  toVersion,
  onClose,
  onRollback,
}: VersionCompareProps) {
  const comparisonQuery = useQuery(api.versions.compare, {
    entryId,
    fromVersionNumber: fromVersion,
    toVersionNumber: toVersion,
  });

  const isLoading = comparisonQuery === undefined;
  const comparison = comparisonQuery as {
    from: { versionNumber: number; data: Record<string, unknown>; _creationTime: number };
    to: { versionNumber: number; data: Record<string, unknown>; _creationTime: number };
    diff: DiffChange[];
  } | null;

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '(empty)';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="version-compare-panel">
      <div className="version-compare-header">
        <h3>
          Comparing v{fromVersion} → v{toVersion}
        </h3>
        <button
          type="button"
          className="version-compare-close"
          onClick={onClose}
          aria-label="Close comparison"
        >
          &times;
        </button>
      </div>

      <div className="version-compare-content">
        {isLoading ? (
          <div className="version-compare-loading">Loading comparison...</div>
        ) : !comparison ? (
          <div className="version-compare-error">Could not load version comparison</div>
        ) : comparison.diff.length === 0 ? (
          <div className="version-compare-empty">
            <p>No differences found between these versions</p>
          </div>
        ) : (
          <>
            <div className="version-compare-summary">
              <div className="version-compare-version">
                <span className="version-badge">v{comparison.from.versionNumber}</span>
                <span className="version-date">
                  {formatDate(comparison.from._creationTime)}
                </span>
              </div>
              <span className="version-compare-arrow">→</span>
              <div className="version-compare-version">
                <span className="version-badge">v{comparison.to.versionNumber}</span>
                <span className="version-date">
                  {formatDate(comparison.to._creationTime)}
                </span>
              </div>
            </div>

            <div className="diff-list">
              {comparison.diff.map((change, index) => (
                <div key={index} className={getChangeClass(change.changeType)}>
                  <div className="diff-field-header">
                    <span className="diff-icon">{getChangeIcon(change.changeType)}</span>
                    <span className="diff-field-name">{change.field}</span>
                    <span className="diff-change-type">{change.changeType}</span>
                  </div>

                  <div className="diff-values">
                    {change.changeType !== 'added' && (
                      <div className="diff-value diff-value--old">
                        <span className="diff-value-label">Before:</span>
                        <pre className="diff-value-content">
                          {formatValue(change.oldValue)}
                        </pre>
                      </div>
                    )}
                    {change.changeType !== 'removed' && (
                      <div className="diff-value diff-value--new">
                        <span className="diff-value-label">After:</span>
                        <pre className="diff-value-content">
                          {formatValue(change.newValue)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="version-compare-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Back to History
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => onRollback(fromVersion)}
        >
          Rollback to v{fromVersion}
        </button>
      </div>
    </div>
  );
}
