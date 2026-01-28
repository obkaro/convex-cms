/**
 * Shared Content Type Entries Page Component
 *
 * Lists entries for a specific content type with search, filtering, and actions.
 * Used by both CLI routes and embed pages.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { usePermissions } from "~/hooks";
import {
  CmsPageHeader,
  CmsButton,
  CmsStatusBadge,
  type ContentStatus,
  CmsEmptyState,
  CmsConfirmDialog,
  CmsFilterBar,
  CmsTable,
  type CmsTableColumn,
  CmsPagination,
} from "~/components/cmsds";
import { Plus, FileText } from "lucide-react";
import type { AdminNavigation } from "~/lib/navigation";
import type { CmsAdminApi } from "~/embed/contexts/ApiContext";

type SortField = "title" | "status" | "updatedAt" | "createdAt";
type SortDirection = "asc" | "desc";

export interface ContentTypeEntriesPageProps {
  api: CmsAdminApi;
  navigation: AdminNavigation;
  contentTypeId: string;
}

export function ContentTypeEntriesPage({
  api,
  navigation,
  contentTypeId,
}: ContentTypeEntriesPageProps) {
  const [selectedStatus, setSelectedStatus] = useState<ContentStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 25;

  const { canCreate, canUpdate, canDelete } = usePermissions();

  const deleteEntry = useMutation(api.deleteEntry);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<{ _id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const contentType = useQuery(api.getContentType, { id: contentTypeId });

  const entriesResult = useQuery(api.listEntries, {
    contentTypeName: contentType?.name,
    status: selectedStatus === "all" ? undefined : selectedStatus,
    search: debouncedSearch || undefined,
    paginationOpts: { numItems: 250, cursor: null },
  });
  const allEntries = entriesResult?.page ?? [];

  const getEntryTitle = useCallback(
    (entry: { data: Record<string, unknown> }) => {
      const titleField = contentType?.titleField ?? "title";
      const title = entry.data[titleField];
      return typeof title === "string" && title ? title : "Untitled";
    },
    [contentType?.titleField]
  );

  const sortedEntries = useMemo(() => {
    const entries = [...allEntries];

    entries.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "title": {
          const titleA = getEntryTitle(a).toLowerCase();
          const titleB = getEntryTitle(b).toLowerCase();
          comparison = titleA.localeCompare(titleB);
          break;
        }
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "updatedAt": {
          const updatedA = a.lastPublishedAt ?? a._creationTime ?? 0;
          const updatedB = b.lastPublishedAt ?? b._creationTime ?? 0;
          comparison = updatedA - updatedB;
          break;
        }
        case "createdAt":
          comparison = (a._creationTime ?? 0) - (b._creationTime ?? 0);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === "desc" ? -comparison : comparison;
    });

    return entries;
  }, [allEntries, sortField, sortDirection, getEntryTitle]);

  const paginatedEntries = useMemo(() => {
    const start = currentPage * pageSize;
    return sortedEntries.slice(start, start + pageSize);
  }, [sortedEntries, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedEntries.length / pageSize);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSort = (columnKey: string) => {
    const field = columnKey as SortField;
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleDeleteClick = useCallback(
    (entry: { _id: string; data: Record<string, unknown> }) => {
      const title = getEntryTitle(entry);
      setEntryToDelete({ _id: entry._id, title });
      setDeleteError(null);
      setDeleteModalOpen(true);
    },
    [getEntryTitle]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!entryToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteEntry({
        id: entryToDelete._id,
        hardDelete: false,
      });
      setDeleteModalOpen(false);
      setEntryToDelete(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete entry";
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  }, [entryToDelete, deleteEntry]);

  const handleDeleteModalClose = useCallback(
    (open: boolean) => {
      if (!open && !isDeleting) {
        setDeleteModalOpen(false);
        setEntryToDelete(null);
        setDeleteError(null);
      }
    },
    [isDeleting]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSelectedStatus("all");
    setCurrentPage(0);
  }, []);

  type Entry = (typeof paginatedEntries)[number];

  const entryColumns: CmsTableColumn<Entry>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Title",
        sortable: true,
        cell: (entry) => (
          <button
            type="button"
            onClick={() => navigation.navigateToEntry(entry._id)}
            className="block text-left"
          >
            <span className="font-medium text-foreground hover:text-primary hover:underline">
              {getEntryTitle(entry)}
            </span>
            <span className="block text-xs text-muted-foreground">{entry.slug}</span>
          </button>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        cell: (entry) => <CmsStatusBadge status={entry.status as ContentStatus} />,
      },
      {
        key: "updatedAt",
        header: "Updated",
        sortable: true,
        cell: (entry) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(entry.lastPublishedAt ?? entry._creationTime)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        cell: (entry) => (
          <div className="flex items-center gap-2">
            <CmsButton
              variant="outline"
              size="sm"
              onClick={() => navigation.navigateToEntry(entry._id)}
            >
              {canUpdate("contentEntries") ? "Edit" : "View"}
            </CmsButton>
            {canDelete("contentEntries") && (
              <CmsButton
                variant="danger"
                size="sm"
                onClick={() => handleDeleteClick(entry)}
              >
                Delete
              </CmsButton>
            )}
          </div>
        ),
      },
    ],
    [navigation, getEntryTitle, formatDate, canUpdate, canDelete, handleDeleteClick]
  );

  if (contentType === undefined || entriesResult === undefined) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading entries...</p>
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
            onClick: () => navigation.navigate("/content-types"),
          }}
        />
      </div>
    );
  }

  const hasFilters = searchQuery || selectedStatus !== "all";

  return (
    <div className="space-y-6 p-6">
      <CmsPageHeader
        title={contentType.displayName}
        description={contentType.description}
        actions={
          canCreate("contentEntries") && (
            <CmsButton onClick={() => navigation.navigateToNewEntry(contentTypeId)}>
              <Plus className="size-4" />
              Create {contentType.displayName}
            </CmsButton>
          )
        }
      />

      <CmsFilterBar
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: "Search entries...",
          className: "w-64",
        }}
        filters={[
          {
            key: "status",
            value: selectedStatus,
            onChange: (v) => {
              setSelectedStatus(v as ContentStatus | "all");
              setCurrentPage(0);
            },
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
        onClear={hasFilters ? clearFilters : undefined}
      />

      {sortedEntries.length === 0 ? (
        <CmsEmptyState
          icon={<FileText className="size-6" />}
          title={hasFilters ? "No matching entries" : `No ${contentType.displayName} entries yet`}
          description={
            hasFilters
              ? "Try adjusting your search or filter criteria."
              : `Click "Create ${contentType.displayName}" to add your first entry.`
          }
          action={
            hasFilters
              ? { label: "Clear Filters", onClick: clearFilters, variant: "secondary" }
              : undefined
          }
        />
      ) : (
        <>
          <CmsTable
            columns={entryColumns}
            data={paginatedEntries}
            getRowId={(e) => e._id}
            sortColumn={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            emptyMessage="No entries found"
          />

          <CmsPagination
            currentPage={currentPage + 1}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page - 1)}
          />
        </>
      )}

      {sortedEntries.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {paginatedEntries.length} of {sortedEntries.length}{" "}
          {sortedEntries.length === 1 ? "entry" : "entries"}
        </p>
      )}

      <CmsConfirmDialog
        open={deleteModalOpen}
        onOpenChange={handleDeleteModalClose}
        title="Delete Entry"
        description={
          entryToDelete
            ? `Are you sure you want to delete "${entryToDelete.title}"? It will be moved to the trash and can be restored within the retention period.`
            : "Are you sure you want to delete this entry?"
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        error={deleteError}
      />
    </div>
  );
}
