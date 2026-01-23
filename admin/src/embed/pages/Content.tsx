/**
 * Embed Content Page
 *
 * Lists all content entries across content types with search and filtering.
 */

import { useQuery } from "convex/react";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";
import { CmsPageHeader } from "~/components/cmsds/CmsPageHeader";
import { CmsToolbar } from "~/components/cmsds/CmsToolbar";
import { CmsEmptyState } from "~/components/cmsds/CmsEmptyState";
import { CmsStatusBadge } from "~/components/cmsds/CmsStatusBadge";
import { useApi } from "../contexts/ApiContext";
import { useEmbedNavigation } from "../navigation";

type Entry = {
  _id: string;
  contentTypeId: string;
  slug?: string;
  status: string;
  updatedAt: number;
  data: Record<string, unknown>;
};

type ContentType = {
  _id: string;
  displayName: string;
};

export function EmbedContent() {
  const api = useApi();
  const { navigateToEntry, navigateToContentType } = useEmbedNavigation();
  const [search, setSearch] = useState("");

  const contentTypes = useQuery(api.admin.listContentTypes as any);
  const entries = useQuery(api.admin.listEntries as any, {
    paginationOpts: { numItems: 50, cursor: null },
  });

  const isLoading = contentTypes === undefined || entries === undefined;

  const filteredEntries = entries?.page.filter((entry: Entry) => {
    if (!search) return true;
    const title = (entry.data.title as string) || entry.slug || "";
    return title.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Content"
        description="Browse and manage all content entries"
      />

      <CmsToolbar
        left={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search entries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEntries && filteredEntries.length > 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry: Entry) => {
                const title = (entry.data.title as string) || entry.slug || "Untitled";
                const contentType = contentTypes?.page?.find(
                  (ct: ContentType) => ct._id === entry.contentTypeId
                );

                return (
                  <tr
                    key={entry._id}
                    className="border-b border-border last:border-0 hover:bg-accent/50 cursor-pointer"
                    onClick={() => navigateToEntry(entry._id)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToContentType(entry.contentTypeId);
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        {contentType?.displayName || "Unknown"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <CmsStatusBadge status={entry.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(entry.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <CmsEmptyState
          title="No content yet"
          description="Create your first content entry to get started."
          icon="file-text"
        />
      )}
    </div>
  );
}
