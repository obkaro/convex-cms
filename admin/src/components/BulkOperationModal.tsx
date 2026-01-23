type BulkAction = 'publish' | 'unpublish' | 'delete' | 'archive';

interface BulkOperationModalProps {
  action: BulkAction;
  count: number;
  isProcessing: boolean;
  result: {
    succeeded: number;
    failed: number;
    errors?: string[];
  } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const ACTION_CONFIG: Record<
  BulkAction,
  {
    title: string;
    description: string;
    warning?: string;
    confirmLabel: string;
    confirmClass: string;
  }
> = {
  publish: {
    title: 'Publish Items',
    description: 'This will publish all selected items, making them publicly visible.',
    confirmLabel: 'Publish All',
    confirmClass: 'btn btn-success',
  },
  unpublish: {
    title: 'Unpublish Items',
    description: 'This will unpublish all selected items, changing them back to draft status.',
    confirmLabel: 'Unpublish All',
    confirmClass: 'btn btn-warning',
  },
  delete: {
    title: 'Delete Items',
    description: 'This will move all selected items to trash.',
    warning: 'Items in trash can be restored within the retention period.',
    confirmLabel: 'Delete All',
    confirmClass: 'btn btn-danger',
  },
  archive: {
    title: 'Archive Items',
    description: 'This will archive all selected items.',
    confirmLabel: 'Archive All',
    confirmClass: 'btn btn-secondary',
  },
};

export function BulkOperationModal({
  action,
  count,
  isProcessing,
  result,
  onConfirm,
  onCancel,
}: BulkOperationModalProps) {
  const config = ACTION_CONFIG[action];

  return (
    <div className="modal-overlay" onClick={isProcessing ? undefined : onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{config.title}</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            disabled={isProcessing}
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          {result ? (
            <div className="bulk-result">
              {result.failed === 0 ? (
                <div className="bulk-result-success">
                  <span className="bulk-result-icon">✓</span>
                  <p>
                    Successfully processed <strong>{result.succeeded}</strong>{' '}
                    {result.succeeded === 1 ? 'item' : 'items'}
                  </p>
                </div>
              ) : (
                <div className="bulk-result-mixed">
                  <div className="bulk-result-summary">
                    <div className="bulk-result-stat bulk-result-stat--success">
                      <span className="bulk-result-stat-value">
                        {result.succeeded}
                      </span>
                      <span className="bulk-result-stat-label">Succeeded</span>
                    </div>
                    <div className="bulk-result-stat bulk-result-stat--failed">
                      <span className="bulk-result-stat-value">
                        {result.failed}
                      </span>
                      <span className="bulk-result-stat-label">Failed</span>
                    </div>
                  </div>
                  {result.errors && result.errors.length > 0 && (
                    <div className="bulk-result-errors">
                      <strong>Errors:</strong>
                      <ul>
                        {result.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {result.errors.length > 5 && (
                          <li className="bulk-result-more">
                            ...and {result.errors.length - 5} more errors
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <p>
                You are about to {action}{' '}
                <strong>
                  {count} {count === 1 ? 'item' : 'items'}
                </strong>
                .
              </p>
              <p>{config.description}</p>
              {config.warning && (
                <div className="bulk-warning">
                  <strong>Note:</strong> {config.warning}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          {result ? (
            <button type="button" className="btn btn-primary" onClick={onCancel}>
              {result.failed === 0 ? 'Done' : 'Close'}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="button"
                className={config.confirmClass}
                onClick={onConfirm}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="btn-spinner" />
                    Processing...
                  </>
                ) : (
                  config.confirmLabel
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
