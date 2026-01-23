/**
 * Embed Content Types Page
 *
 * Manage content type definitions.
 */

import { useQuery } from "convex/react";
import { Loader2, Plus, Layers } from "lucide-react";
import { CmsPageHeader } from "~/components/cmsds/CmsPageHeader";
import { CmsEmptyState } from "~/components/cmsds/CmsEmptyState";
import { CmsButton } from "~/components/cmsds/CmsButton";
import { useApi } from "../contexts/ApiContext";
import { useEmbedNavigation } from "../navigation";

type ContentTypeItem = {
  _id: string;
  name: string;
  displayName: string;
  fields?: unknown[];
};

export function EmbedContentTypes() {
  const api = useApi();
  const { navigateToContentType } = useEmbedNavigation();
  const contentTypes = useQuery(api.admin.listContentTypes as any);

  const isLoading = contentTypes === undefined;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Content Types"
        description="Define the structure of your content"
        actions={
          <CmsButton variant="primary" size="sm" disabled>
            <Plus className="mr-2 size-4" />
            New Type
          </CmsButton>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : contentTypes?.page && contentTypes.page.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contentTypes.page.map((type: ContentTypeItem) => (
            <button
              key={type._id}
              type="button"
              onClick={() => navigateToContentType(type._id)}
              className="flex items-start gap-4 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Layers className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground">{type.displayName}</h3>
                <p className="text-sm text-muted-foreground">
                  {type.fields?.length || 0} fields
                </p>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                  {type.name}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <CmsEmptyState
          title="No content types"
          description="Content types define the structure of your content."
          icon="layers"
        />
      )}
    </div>
  );
}
