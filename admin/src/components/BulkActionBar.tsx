import { useState, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { BulkOperationModal } from './BulkOperationModal';

type BulkAction = 'publish' | 'unpublish' | 'delete' | 'archive';

interface BulkActionBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onOperationComplete?: () => void;
}

export function BulkActionBar({
  selectedIds,
  onClearSelection,
  onOperationComplete,
}: BulkActionBarProps) {
  const [activeAction, setActiveAction] = useState<BulkAction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    succeeded: number;
    failed: number;
    errors?: string[];
  } | null>(null);

  const bulkPublish = useMutation(api.bulkOperations.bulkPublish);
  const bulkUnpublish = useMutation(api.bulkOperations.bulkUnpublish);
  const bulkDelete = useMutation(api.bulkOperations.bulkDelete);
  const bulkUpdate = useMutation(api.bulkOperations.bulkUpdate);

  const handleAction = useCallback((action: BulkAction) => {
    setActiveAction(action);
    setResult(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!activeAction || selectedIds.length === 0) return;

    setIsProcessing(true);
    setResult(null);

    try {
      let response: { succeeded: number; failed: number; errors?: { id: string; error: string }[] };

      switch (activeAction) {
        case 'publish':
          response = await bulkPublish({
            ids: selectedIds,
            changeDescription: 'Bulk published from admin',
          });
          break;
        case 'unpublish':
          response = await bulkUnpublish({
            ids: selectedIds,
          });
          break;
        case 'delete':
          response = await bulkDelete({
            ids: selectedIds,
            hardDelete: false,
          });
          break;
        case 'archive':
          response = await bulkUpdate({
            ids: selectedIds,
            status: 'archived',
          });
          break;
        default:
          throw new Error(`Unknown action: ${activeAction}`);
      }

      setResult({
        succeeded: response.succeeded,
        failed: response.failed,
        errors: response.errors?.map((e) => `${e.id}: ${e.error}`),
      });

      if (response.failed === 0) {
        setTimeout(() => {
          setActiveAction(null);
          onClearSelection();
          onOperationComplete?.();
        }, 1500);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Operation failed';
      setResult({
        succeeded: 0,
        failed: selectedIds.length,
        errors: [message],
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    activeAction,
    selectedIds,
    bulkPublish,
    bulkUnpublish,
    bulkDelete,
    bulkUpdate,
    onClearSelection,
    onOperationComplete,
  ]);

  const handleCancel = useCallback(() => {
    setActiveAction(null);
    setResult(null);
  }, []);

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bulk-action-bar">
        <div className="bulk-action-info">
          <span className="bulk-action-count">{selectedIds.length}</span>
          <span className="bulk-action-label">
            {selectedIds.length === 1 ? 'item' : 'items'} selected
          </span>
          <button
            type="button"
            className="bulk-action-clear"
            onClick={onClearSelection}
          >
            Clear
          </button>
        </div>

        <div className="bulk-action-buttons">
          <button
            type="button"
            className="btn btn-sm btn-success"
            onClick={() => handleAction('publish')}
          >
            Publish
          </button>
          <button
            type="button"
            className="btn btn-sm btn-warning"
            onClick={() => handleAction('unpublish')}
          >
            Unpublish
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => handleAction('archive')}
          >
            Archive
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => handleAction('delete')}
          >
            Delete
          </button>
        </div>
      </div>

      {activeAction && (
        <BulkOperationModal
          action={activeAction}
          count={selectedIds.length}
          isProcessing={isProcessing}
          result={result}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
