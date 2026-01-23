import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ContentEntryEditor } from '~/components/ContentEntryEditor';
import type { ContentType, ContentEntry } from '~/components/ContentEntryEditor';
import { useBreadcrumbLabel } from '~/hooks';
import { CmsEmptyState } from '~/components/cmsds/CmsEmptyState';
import { FileText } from 'lucide-react';

export const Route = createFileRoute('/entries/new/$contentTypeId')({
  component: NewEntryPage,
});

function NewEntryPage() {
  const { contentTypeId } = Route.useParams();
  const navigate = useNavigate();

  const contentType = useQuery(api.contentTypes.get, { id: contentTypeId });

  useBreadcrumbLabel(
    `/entries/new/${contentTypeId}`,
    contentType ? `New ${contentType.displayName}` : undefined
  );

  if (contentType === undefined) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading content type...</p>
        </div>
      </div>
    );
  }

  if (contentType === null) {
    return (
      <div className="space-y-6 p-6">
        <CmsEmptyState
          icon={<FileText className="size-6" />}
          title="Content Type Not Found"
          description="The content type you're looking for doesn't exist or has been deleted."
          action={{
            label: 'Back to Content Types',
            onClick: () => navigate({ to: '/content-types' }),
          }}
        />
      </div>
    );
  }

  const handleSave = (entry: ContentEntry) => {
    navigate({ to: '/entries/$entryId', params: { entryId: entry._id } });
  };

  const handleCancel = () => {
    navigate({ to: '/entries/type/$contentTypeId', params: { contentTypeId } });
  };

  return (
    <div className="space-y-6 p-6">
      <ContentEntryEditor
        contentType={contentType as ContentType}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}
