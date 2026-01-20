import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ContentEntryEditor } from '~/components/ContentEntryEditor';
import type { ContentType, ContentEntry } from '~/components/ContentEntryEditor';
import { usePermissions } from '~/hooks';

export const Route = createFileRoute('/entries/$entryId')({
  component: EditEntryPage,
});

function EditEntryPage() {
  const { entryId } = Route.useParams();
  const navigate = useNavigate();
  const { canDelete } = usePermissions();

  // Fetch the entry
  const entry = useQuery(api.entries.get, { id: entryId });

  // Fetch the content type (only if we have the entry)
  const contentType = useQuery(
    api.contentTypes.get,
    entry ? { id: entry.contentTypeId } : 'skip'
  );

  // Loading state
  if (entry === undefined || (entry && contentType === undefined)) {
    return (
      <div className="page entry-editor-page">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading entry...</p>
        </div>
      </div>
    );
  }

  // Entry not found state
  if (entry === null) {
    return (
      <div className="page entry-editor-page">
        <div className="error-state">
          <h2>Entry Not Found</h2>
          <p>The content entry you're looking for doesn't exist or has been deleted.</p>
          <button className="btn btn-primary" onClick={() => navigate({ to: '/content' })}>
            Back to Content
          </button>
        </div>
      </div>
    );
  }

  // Content type not found state
  if (contentType === null) {
    return (
      <div className="page entry-editor-page">
        <div className="error-state">
          <h2>Content Type Not Found</h2>
          <p>The content type for this entry doesn't exist or has been deleted.</p>
          <button className="btn btn-primary" onClick={() => navigate({ to: '/content' })}>
            Back to Content
          </button>
        </div>
      </div>
    );
  }

  // Handle successful save
  const handleSave = (savedEntry: ContentEntry) => {
    // Stay on the page but show a success state
    // The component will handle the success feedback
  };

  // Handle cancel
  const handleCancel = () => {
    navigate({ to: '/content' });
  };

  // Handle delete - navigate back to content list
  const handleDelete = () => {
    navigate({ to: '/content' });
  };

  return (
    <div className="page entry-editor-page">
      <ContentEntryEditor
        contentType={contentType as ContentType}
        entry={entry as ContentEntry}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={handleDelete}
        canDelete={canDelete('contentEntries')}
      />
    </div>
  );
}
