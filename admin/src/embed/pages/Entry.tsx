/**
 * Embed Entry Page
 *
 * Renders the entry editor for editing an existing content entry.
 */

import { useMemo } from "react";
import { useApi } from "../contexts/ApiContext";
import { useEmbedNavigation, useEmbedParams } from "../navigation";
import { useQuery } from "convex/react";
import { ContentEntryEditor } from "../../components/ContentEntryEditor";
import type { ContentType, ContentEntry } from "../../components/ContentEntryEditor";
import { CmsEmptyState } from "../../components/cmsds/CmsEmptyState";
import { FileText } from "lucide-react";
import { usePermissions } from "../../hooks";

function extractEntryTitle(
  entry: Record<string, unknown>,
  titleField?: string
): string {
  if (titleField && typeof entry[titleField] === "string") {
    return entry[titleField] as string;
  }
  // Fall back to common title fields
  for (const key of ["title", "name", "heading", "label", "displayName"]) {
    if (typeof entry[key] === "string" && (entry[key] as string).trim()) {
      return entry[key] as string;
    }
  }
  return "Untitled";
}

export function EmbedEntry() {
  const api = useApi();
  const params = useEmbedParams();
  const { navigate, navigateToEntry, navigateToNewEntry } = useEmbedNavigation();
  const { canDelete } = usePermissions();

  const entryId = params.entryId;

  const entryArgs = entryId ? { id: entryId } : ("skip" as const);
  const entry = useQuery(api.getEntry, entryArgs);

  const contentTypeArgs = entry ? { name: entry.contentTypeName } : ("skip" as const);
  const contentType = useQuery(api.getContentType, contentTypeArgs);

  // Fetch sibling entries for the entry switcher
  const siblingsArgs = entry
    ? {
        contentTypeName: entry.contentTypeName,
        paginationOpts: { numItems: 100, cursor: null },
      }
    : ("skip" as const);
  const siblingsResult = useQuery(api.listEntries, siblingsArgs);

  const siblingEntries = useMemo(() => {
    if (!siblingsResult?.page || !contentType) return undefined;
    return siblingsResult.page.map((e: any) => ({
      _id: e._id as string,
      title: extractEntryTitle(e.data ?? {}, contentType.titleField),
    }));
  }, [siblingsResult?.page, contentType]);

  if (!entryId) {
    return (
      <div className="flex flex-col gap-6 p-6">
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
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading entry...</p>
        </div>
      </div>
    );
  }

  if (entry === null) {
    return (
      <div className="flex flex-col gap-6 p-6">
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
      <div className="flex flex-col gap-6 p-6">
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
    <ContentEntryEditor
      contentType={contentType as ContentType}
      entry={entry as ContentEntry}
      onSave={handleSave}
      onCancel={handleCancel}
      onDelete={handleDelete}
      canDelete={canDelete("contentEntries")}
      siblingEntries={siblingEntries}
      onNavigateToEntry={(id) => navigateToEntry(id)}
      onNavigateToNewEntry={() => navigateToNewEntry((contentType as ContentType)._id)}
    />
  );
}
