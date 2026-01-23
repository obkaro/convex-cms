import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ContentEntryEditor } from '~/components/ContentEntryEditor';
import type { ContentType, ContentEntry } from '~/components/ContentEntryEditor';
import { usePermissions, useBreadcrumbLabel } from '~/hooks';
import { CmsEmptyState } from '~/components/cmsds/CmsEmptyState';
import { CmsButton } from '~/components/cmsds/CmsButton';
import { FileText } from 'lucide-react';

export const Route = createFileRoute('/entries/$entryId')({
  component: EditEntryPage,
});

function EditEntryPage() {
  const { entryId } = Route.useParams();
  const navigate = useNavigate();
  const { canDelete } = usePermissions();

  const entry = useQuery(api.entries.get, { id: entryId });

  const contentType = useQuery(
    api.contentTypes.get,
    entry ? { id: entry.contentTypeId } : 'skip'
  );

  const getEntryTitle = () => {
    if (!entry || !contentType) return undefined;
    const titleField = contentType.titleField ?? 'title';
    const title = entry.data[titleField];
    return typeof title === 'string' && title ? title : 'Untitled';
  };

  useBreadcrumbLabel(`/entries/${entryId}`, getEntryTitle());

  if (entry === undefined || (entry && contentType === undefined)) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading entry...</p>
        </div>
      </div>
    );
  }

  if (entry === null) {
    return (
      <div className="space-y-6 p-6">
        <CmsEmptyState
          icon={<FileText className="size-6" />}
          title="Entry Not Found"
          description="The content entry you're looking for doesn't exist or has been deleted."
          action={{
            label: 'Back to Content',
            onClick: () => navigate({ to: '/content-types' }),
          }}
        />
      </div>
    );
  }

  if (contentType === null) {
    return (
      <div className="space-y-6 p-6">
        <CmsEmptyState
          icon={<FileText className="size-6" />}
          title="Content Type Not Found"
          description="The content type for this entry doesn't exist or has been deleted."
          action={{
            label: 'Back to Content',
            onClick: () => navigate({ to: '/content-types' }),
          }}
        />
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
    <div className="space-y-6 p-6">
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
