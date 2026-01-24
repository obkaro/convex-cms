/**
 * Shared Content Page Component
 *
 * Lists all content entries with search, filtering, and bulk actions.
 * Used by both CLI routes and embed pages.
 */

import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { usePermissions } from "~/hooks";
import { BulkActionBar } from "~/components/BulkActionBar";
import { CmsPageHeader } from "~/components/cmsds/CmsPageHeader";
import { CmsToolbar } from "~/components/cmsds/CmsToolbar";
import { CmsEmptyState } from "~/components/cmsds/CmsEmptyState";
import {
  CmsStatusBadge,
  type ContentStatus,
} from "~/components/cmsds/CmsStatusBadge";
import { CmsButton } from "~/components/cmsds/CmsButton";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/cn";
import { Plus, Search, FileText, ChevronDown } from "lucide-react";
import type { AdminNavigation } from "~/lib/navigation";
import { CmsAdminApi } from "~/embed/contexts/ApiContext";

type ContentType = {
  _id: string;
  displayName: string;
  titleField?: string;
};

type Entry = {
  _id: string;
  contentTypeId: string;
  slug?: string;
  status: string;
  data: Record<string, unknown>;
  _creationTime: number;
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

  const contentTypesResult = useQuery(api.listContentTypes, { isActive: true });
  const contentTypes: ContentType[] = contentTypesResult?.page ?? [];
  const isLoadingContentTypes = contentTypesResult === undefined;

  const entriesResult = useQuery(api.listEntries, {
    contentTypeId: selectedTypeId || undefined,
    status: selectedStatus || undefined,
    search: searchQuery.trim() || undefined,
    paginationOpts: { numItems: 50, cursor: null },
  });
  const entries: Entry[] = entriesResult?.page ?? [];
  const isLoadingEntries = entriesResult === undefined;

  const isLoading = isLoadingContentTypes || isLoadingEntries;

  const handleCreateEntry = (contentTypeId: string) => {
    navigation.navigateToNewEntry(contentTypeId);
  };

  const getContentTypeName = (contentTypeId: string) => {
    const type = contentTypes.find((t) => t._id === contentTypeId);
    return type?.displayName ?? "Unknown";
  };

  const getEntryTitle = (
    entry: { data: Record<string, unknown> },
    contentTypeId: string
  ) => {
    const type = contentTypes.find((t) => t._id === contentTypeId);
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

  const handleSelectItem = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === entries.length && entries.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map((e) => e._id)));
    }
  }, [selectedIds.size, entries]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

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

      <CmsToolbar
        left={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9"
                data-testid="content-search-input"
              />
            </div>
            <Select
              value={selectedTypeId || "all"}
              onValueChange={(v) => setSelectedTypeId(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Content Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Content Types</SelectItem>
                {contentTypes.map((type) => (
                  <SelectItem key={type._id} value={type._id}>
                    {type.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedStatus || "all"}
              onValueChange={(v) =>
                setSelectedStatus(v === "all" ? "" : (v as ContentStatus))
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        right={
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
        <div className="rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="w-10 p-3 text-left">
                  <Checkbox
                    checked={
                      selectedIds.size === entries.length && entries.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all entries"
                  />
                </th>
                <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                  Title
                </th>
                <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                  Type
                </th>
                <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                  Updated
                </th>
                <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry._id}
                  className={cn(
                    "border-b last:border-0 transition-colors hover:bg-muted/50",
                    selectedIds.has(entry._id) && "bg-primary/5"
                  )}
                >
                  <td className="p-3">
                    <Checkbox
                      checked={selectedIds.has(entry._id)}
                      onCheckedChange={(checked) =>
                        handleSelectItem(entry._id, checked as boolean)
                      }
                      aria-label={`Select ${getEntryTitle(entry, entry.contentTypeId)}`}
                    />
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => navigation.navigateToEntry(entry._id)}
                      className="block text-left"
                    >
                      <span className="font-medium text-foreground hover:text-primary">
                        {getEntryTitle(entry, entry.contentTypeId)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {entry.slug}
                      </span>
                    </button>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {getContentTypeName(entry.contentTypeId)}
                  </td>
                  <td className="p-3">
                    <CmsStatusBadge status={entry.status as ContentStatus} />
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {formatDate(entry._creationTime)}
                  </td>
                  <td className="p-3">
                    <CmsButton
                      variant="outline"
                      size="sm"
                      onClick={() => navigation.navigateToEntry(entry._id)}
                    >
                      {canUpdate("contentEntries") ? "Edit" : "View"}
                    </CmsButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
