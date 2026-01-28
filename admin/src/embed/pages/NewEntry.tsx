/**
 * Embed New Entry Page
 *
 * Renders the entry editor for creating a new content entry.
 */

import { useApi } from "../contexts/ApiContext";
import { useEmbedNavigation, useEmbedParams } from "../navigation";
import { useQuery } from "convex/react";
import { ContentEntryEditor } from "../../components/ContentEntryEditor";
import type { ContentType, ContentEntry } from "../../components/ContentEntryEditor";
import { CmsEmptyState } from "../../components/cmsds/CmsEmptyState";
import { FileText } from "lucide-react";

export function EmbedNewEntry() {
  const api = useApi();
  const params = useEmbedParams();
  const { navigate, navigateToEntry, navigateToContentType } = useEmbedNavigation();

  const contentTypeId = params.contentTypeId;
  const contentTypeArgs = contentTypeId ? { id: contentTypeId } : ("skip" as const);
  const contentType = useQuery(api.getContentType, contentTypeArgs);

  if (!contentTypeId) {
    return (
      <div className="space-y-6 p-6">
        <CmsEmptyState
          icon={<FileText className="size-6" />}
          title="No Content Type Selected"
          description="Please select a content type to create an entry."
          action={{
            label: "Go to Content",
            onClick: () => navigate("content"),
          }}
        />
      </div>
    );
  }

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
            label: "Back to Content Types",
            onClick: () => navigate("content-types"),
          }}
        />
      </div>
    );
  }

  const handleSave = (entry: ContentEntry) => {
    navigateToEntry(entry._id);
  };

  const handleCancel = () => {
    navigateToContentType(contentTypeId);
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
