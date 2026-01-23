import { useState, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { VersionCompare } from './VersionCompare';
import { VersionRollbackModal } from './VersionRollbackModal';

interface VersionHistoryProps {
  entryId: string;
  currentVersion: number;
  onRollbackComplete?: () => void;
  onClose: () => void;
}

interface VersionItem {
  _id: string;
  versionNumber: number;
  changeDescription?: string;
  createdBy?: string;
  _creationTime: number;
  status: string;
  data: Record<string, unknown>;
}

export function VersionHistory({
  entryId,
  currentVersion,
  onRollbackComplete,
  onClose,
}: VersionHistoryProps) {
  const [selectedVersions, setSelectedVersions] = useState<[number, number] | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<number | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackError, setRollbackError] = useState<string | null>(null);
  const [rollbackSuccess, setRollbackSuccess] = useState(false);

  const versionsQuery = useQuery(api.versions.getHistory, {
    entryId,
    paginationOpts: { numItems: 50, cursor: null },
  });

  const rollbackMutation = useMutation(api.versions.rollback);

  const versions = (versionsQuery?.page ?? []) as VersionItem[];
  const isLoading = versionsQuery === undefined;

  const handleCompare = useCallback((fromVersion: number, toVersion: number) => {
    setSelectedVersions([fromVersion, toVersion]);
  }, []);

  const handleRollback = useCallback((versionNumber: number) => {
    setRollbackTarget(versionNumber);
    setRollbackError(null);
  }, []);

  const handleConfirmRollback = useCallback(async () => {
    if (rollbackTarget === null) return;

    setIsRollingBack(true);
    setRollbackError(null);

    try {
      await rollbackMutation({
        entryId,
        versionNumber: rollbackTarget,
      });
      setRollbackTarget(null);
      setRollbackSuccess(true);
      setTimeout(() => {
        setRollbackSuccess(false);
        onRollbackComplete?.();
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to rollback';
      setRollbackError(message);
    } finally {
      setIsRollingBack(false);
    }
  }, [entryId, rollbackTarget, rollbackMutation, onRollbackComplete]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'published':
        return 'version-status version-status--published';
      case 'draft':
        return 'version-status version-status--draft';
      case 'scheduled':
        return 'version-status version-status--scheduled';
      default:
        return 'version-status';
    }
  };

  if (selectedVersions) {
    return (
      <VersionCompare
        entryId={entryId}
        fromVersion={selectedVersions[0]}
        toVersion={selectedVersions[1]}
        onClose={() => setSelectedVersions(null)}
        onRollback={(version) => {
          setSelectedVersions(null);
          handleRollback(version);
        }}
      />
    );
  }

  return (
    <div className="version-history-panel">
      <div className="version-history-header">
        <h3>Version History</h3>
        <button
          type="button"
          className="version-history-close"
          onClick={onClose}
          aria-label="Close version history"
        >
          &times;
        </button>
      </div>

      {rollbackSuccess && (
        <div className="version-history-success">
          Successfully rolled back to previous version
        </div>
      )}

      <div className="version-history-content">
        {isLoading ? (
          <div className="version-history-loading">Loading versions...</div>
        ) : versions.length === 0 ? (
          <div className="version-history-empty">No version history available</div>
        ) : (
          <ul className="version-list">
            {versions.map((version, index) => {
              const isCurrent = version.versionNumber === currentVersion;
              const prevVersion = versions[index + 1];

              return (
                <li
                  key={version._id}
                  className={`version-item ${isCurrent ? 'version-item--current' : ''}`}
                >
                  <div className="version-item-header">
                    <div className="version-item-number">
                      <span className="version-badge">v{version.versionNumber}</span>
                      {isCurrent && <span className="version-current-tag">Current</span>}
                    </div>
                    <span className={getStatusBadgeClass(version.status)}>
                      {version.status}
                    </span>
                  </div>

                  <div className="version-item-meta">
                    <span className="version-date">{formatDate(version._creationTime)}</span>
                    {version.createdBy && (
                      <span className="version-author">by {version.createdBy}</span>
                    )}
                  </div>

                  {version.changeDescription && (
                    <p className="version-description">{version.changeDescription}</p>
                  )}

                  <div className="version-item-actions">
                    {prevVersion && (
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() =>
                          handleCompare(prevVersion.versionNumber, version.versionNumber)
                        }
                      >
                        Compare with v{prevVersion.versionNumber}
                      </button>
                    )}
                    {!isCurrent && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => handleRollback(version.versionNumber)}
                      >
                        Rollback to this version
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {rollbackTarget !== null && (
        <VersionRollbackModal
          targetVersion={rollbackTarget}
          currentVersion={currentVersion}
          isLoading={isRollingBack}
          error={rollbackError}
          onConfirm={handleConfirmRollback}
          onCancel={() => {
            setRollbackTarget(null);
            setRollbackError(null);
          }}
        />
      )}
    </div>
  );
}
