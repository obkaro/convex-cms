/**
 * Shared Content Page Component
 *
 * Lists all content entries with search, filtering, and bulk actions.
 * Used by both CLI routes and embed pages.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { usePermissions } from "~/hooks";
import { BulkActionBar } from "~/components/BulkActionBar";
import {
  CmsPageHeader,
  CmsEmptyState,
  CmsStatusBadge,
  type ContentStatus,
  CmsButton,
  CmsFilterBar,
  CmsTable,
  type CmsTableColumn,
} from "~/components/cmsds";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Plus, FileText, ChevronDown } from "lucide-react";
import type { AdminNavigation } from "~/lib/navigation";
import { CmsAdminApi } from "~/embed/contexts/ApiContext";

type ContentType = {
  _id: string;
  name: string;
  displayName: string;
  titleField?: string;
};

export interface ContentPageProps {
  api: CmsAdminApi
  navigation: AdminNavigation;
}

export function ContentPage({ api, navigation }: ContentPageProps) {
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<ContentStatus | "">("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { canCreate, canUpdate } = usePermissions();

  // Sync with navigation params when contentTypeId changes
  useEffect(() => {
    const contentTypeId = navigation.params?.contentTypeId;
    if (contentTypeId) {
      // Extract slug from contentTypeId (handles "code:slug" format)
      const slug = contentTypeId.startsWith("code:")
        ? contentTypeId.slice(5)
        : contentTypeId;
      setSelectedTypeId(slug);
    } else {
      // Clear selection when navigating to "All Entries"
      setSelectedTypeId("");
    }
  }, [navigation.params?.contentTypeId]);

  const contentTypesResult = useQuery(api.listContentTypes, { isActive: true });
  const contentTypes: ContentType[] = contentTypesResult?.page ?? [];
  const isLoadingContentTypes = contentTypesResult === undefined;

  const entriesResult = useQuery(api.listEntries, {
    contentTypeName: selectedTypeId || undefined,
    status: selectedStatus || undefined,
    search: searchQuery.trim() || undefined,
    paginationOpts: { numItems: 50, cursor: null },
  });
  const entries = entriesResult?.page ?? [];
  const isLoadingEntries = entriesResult === undefined;

  const isLoading = isLoadingContentTypes || isLoadingEntries;

  const handleCreateEntry = (contentTypeId: string) => {
    navigation.navigateToNewEntry(contentTypeId);
  };

  const getContentTypeDisplayName = (contentTypeName: string) => {
    const type = contentTypes.find((t) => t.name === contentTypeName);
    return type?.displayName ?? contentTypeName;
  };

  const getEntryTitle = (
    entry: { data: Record<string, unknown> },
    contentTypeName: string
  ) => {
    const type = contentTypes.find((t) => t.name === contentTypeName);
    const titleField = type?.titleField ?? "title";
    const title = entry.data[titleField];
    return typeof title === "string" && title ? title : "Untitled";
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  type Entry = (typeof entries)[number];

  const entryColumns: CmsTableColumn<Entry>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Title",
        cell: (entry) => (
          <button
            type="button"
            onClick={() => navigation.navigateToEntry(entry._id)}
            className="block text-left"
          >
            <span className="font-medium text-foreground hover:text-primary">
              {getEntryTitle(entry, entry.contentTypeName)}
            </span>
            <span className="block text-xs text-muted-foreground">
              {entry.slug}
            </span>
          </button>
        ),
      },
      {
        key: "type",
        header: "Type",
        cell: (entry) => (
          <span className="text-sm text-muted-foreground">
            {getContentTypeDisplayName(entry.contentTypeName)}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (entry) => <CmsStatusBadge status={entry.status as ContentStatus} />,
      },
      {
        key: "updated",
        header: "Updated",
        cell: (entry) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(entry._creationTime)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        cell: (entry) => (
          <CmsButton
            variant="outline"
            size="sm"
            onClick={() => navigation.navigateToEntry(entry._id)}
          >
            {canUpdate("contentEntries") ? "Edit" : "View"}
          </CmsButton>
        ),
      },
    ],
    [navigation, contentTypes, canUpdate]
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <CmsPageHeader
          title="Content"
          description="Browse and manage content entries across all content types."
        />
        <div className="flex flex-col items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading content...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <CmsPageHeader
        title="Content"
        description="Browse and manage content entries across all content types."
      />

      <CmsFilterBar
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: "Search content...",
          className: "w-64",
        }}
        filters={[
          {
            key: "contentType",
            value: selectedTypeId || "all",
            onChange: (v) => setSelectedTypeId(v === "all" ? "" : v),
            options: [
              { value: "all", label: "All Content Types" },
              ...contentTypes.map((type) => ({
                value: type._id,
                label: type.displayName,
              })),
            ],
            className: "w-48",
          },
          {
            key: "status",
            value: selectedStatus || "all",
            onChange: (v) => setSelectedStatus(v === "all" ? "" : (v as ContentStatus)),
            options: [
              { value: "all", label: "All Statuses" },
              { value: "draft", label: "Draft" },
              { value: "published", label: "Published" },
              { value: "scheduled", label: "Scheduled" },
              { value: "archived", label: "Archived" },
            ],
            className: "w-36",
          },
        ]}
        actions={
          canCreate("contentEntries") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <CmsButton disabled={contentTypes.length === 0}>
                  <Plus className="size-4" />
                  Create Entry
                  <ChevronDown className="size-4" />
                </CmsButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {contentTypes.map((type) => (
                  <DropdownMenuItem
                    key={type._id}
                    onClick={() => handleCreateEntry(type._id)}
                  >
                    {type.displayName}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      />

      <BulkActionBar
        selectedIds={Array.from(selectedIds)}
        onClearSelection={handleClearSelection}
        onOperationComplete={handleClearSelection}
      />

      {entries.length === 0 ? (
        <CmsEmptyState
          icon={<FileText className="size-6" />}
          title="No content entries yet"
          description={
            contentTypes.length === 0
              ? "Create a content type first, then start adding content entries."
              : 'Click "Create Entry" to add your first content entry.'
          }
        />
      ) : (
        <CmsTable
          columns={entryColumns}
          data={entries}
          getRowId={(e) => e._id}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          emptyMessage="No content entries found"
        />
      )}
    </div>
  );
}
