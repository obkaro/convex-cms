interface VersionRollbackModalProps {
  targetVersion: number;
  currentVersion: number;
  isLoading: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function VersionRollbackModal({
  targetVersion,
  currentVersion,
  isLoading,
  error,
  onConfirm,
  onCancel,
}: VersionRollbackModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="rollback-title"
        aria-describedby="rollback-description"
      >
        <div className="modal-header">
          <h3 id="rollback-title">Confirm Rollback</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            disabled={isLoading}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          <p id="rollback-description">
            You are about to rollback from <strong>version {currentVersion}</strong> to{' '}
            <strong>version {targetVersion}</strong>.
          </p>

          <div className="rollback-warning">
            <strong>This action will:</strong>
            <ul>
              <li>Create a new version with the content from version {targetVersion}</li>
              <li>The current version will be preserved in history</li>
              <li>Any unsaved changes will be lost</li>
            </ul>
          </div>

          {error && (
            <div className="rollback-error" role="alert">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-warning"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Rolling back...' : `Rollback to v${targetVersion}`}
          </button>
        </div>
      </div>
    </div>
  );
}
