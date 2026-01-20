import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ContentEntryEditor } from '~/components/ContentEntryEditor';
import type { ContentType, ContentEntry } from '~/components/ContentEntryEditor';

export const Route = createFileRoute('/entries/new/$contentTypeId')({
  component: NewEntryPage,
});

function NewEntryPage() {
  const { contentTypeId } = Route.useParams();
  const navigate = useNavigate();

  // Fetch the content type
  const contentType = useQuery(api.contentTypes.get, { id: contentTypeId });

  // Loading state
  if (contentType === undefined) {
    return (
      <div className="page entry-editor-page">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading content type...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (contentType === null) {
    return (
      <div className="page entry-editor-page">
        <div className="error-state">
          <h2>Content Type Not Found</h2>
          <p>The content type you're looking for doesn't exist or has been deleted.</p>
          <button className="btn btn-primary" onClick={() => navigate({ to: '/content' })}>
            Back to Content
          </button>
        </div>
      </div>
    );
  }

  // Handle successful save
  const handleSave = (entry: ContentEntry) => {
    // Navigate to the edit page for the new entry
    navigate({ to: '/entries/$entryId', params: { entryId: entry._id } });
  };

  // Handle cancel
  const handleCancel = () => {
    navigate({ to: '/content' });
  };

  return (
    <div className="page entry-editor-page">
      <ContentEntryEditor
        contentType={contentType as ContentType}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}
