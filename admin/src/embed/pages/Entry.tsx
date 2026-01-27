/**
 * Embed Entry Page
 *
 * Renders the entry editor for editing an existing content entry.
 */

import { useApi } from "../contexts/ApiContext";
import { useEmbedNavigation, useEmbedParams } from "../navigation";
import { useQuery } from "convex/react";
import { ContentEntryEditor } from "../../components/ContentEntryEditor";
import type { ContentType, ContentEntry } from "../../components/ContentEntryEditor";
import { CmsEmptyState } from "../../components/cmsds/CmsEmptyState";
import { FileText } from "lucide-react";
import { usePermissions } from "../../hooks";

export function EmbedEntry() {
  const api = useApi();
  const params = useEmbedParams();
  const { navigate } = useEmbedNavigation();
  const { canDelete } = usePermissions();

  const entryId = params.entryId;

  const entry = useQuery(api.getEntry, entryId ? { id: entryId } : "skip");

  const contentType = useQuery(
    api.getContentType,
    entry ? { name: entry.contentTypeName } : "skip"
  );

  if (!entryId) {
    return (
      <div className="space-y-6 p-6">
        <CmsEmptyState
          icon={<FileText className="size-6" />}
          title="No Entry Selected"
          description="Please select an entry to edit."
          action={{
            label: "Go to Content",
            onClick: () => navigate("content"),
          }}
        />
      </div>
    );
  }

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
            label: "Back to Content",
            onClick: () => navigate("content"),
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
            label: "Back to Content",
            onClick: () => navigate("content"),
          }}
        />
      </div>
    );
  }

  const handleSave = (_savedEntry: ContentEntry) => {
    // Stay on page - ContentEntryEditor handles success feedback
  };

  const handleCancel = () => {
    navigate("content");
  };

  const handleDelete = () => {
    navigate("content");
  };

  return (
    <div className="space-y-6 p-6">
      <ContentEntryEditor
        contentType={contentType as ContentType}
        entry={entry as ContentEntry}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={handleDelete}
        canDelete={canDelete("contentEntries")}
      />
    </div>
  );
}
