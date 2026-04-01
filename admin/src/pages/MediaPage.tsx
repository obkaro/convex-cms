/**
 * Shared Media Page Component
 *
 * Manages media assets and folders with upload, organization, and trash functionality.
 * Used by both CLI routes and embed pages.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { UploadDropzone, type UploadedFile } from "../components/UploadDropzone";
import {
  CmsPageHeader,
  CmsEmptyState,
  CmsButton,
  CmsFilterBar,
} from "../components/cmsds";
import { TaxonomyFilter } from "../components/filters/TaxonomyFilter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { cn } from "../lib/cn";
import {
  Image,
  Video,
  Music,
  FileText,
  File,
  Folder,
  Home,
  ChevronLeft,
  FolderPlus,
  Upload,
  Search,
  Trash2,
  RotateCcw,
} from "lucide-react";
import {
  MediaPreviewModal,
  type MediaAsset,
} from "../components/media/MediaPreviewModal";
import {
  MediaAssetEditDialog,
  type MediaAssetForEdit,
} from "../components/media/MediaAssetEditDialog";
import {
  MediaFolderEditDialog,
  type MediaFolderForEdit,
} from "../components/media/MediaFolderEditDialog";
import { MediaAssetActions } from "../components/media/MediaAssetActions";
import { MediaFolderActions } from "../components/media/MediaFolderActions";
import { MediaBulkActionBar } from "../components/media/MediaBulkActionBar";
import { MediaTrashBulkActionBar } from "../components/media/MediaTrashBulkActionBar";
import { MediaMoveModal } from "../components/media/MediaMoveModal";
import { CmsConfirmDialog } from "../components/cmsds/CmsDialog";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import type { AdminNavigation } from "../lib/navigation";
import type { CmsAdminApi } from "../embed/contexts/ApiContext";

type MediaView = "library" | "trash";
type MediaType = "image" | "video" | "audio" | "document" | "other";

export interface MediaPageProps {
  api: CmsAdminApi;
  navigation: AdminNavigation;
  settings?: {
    features: {
      mediaManagement: boolean;
    };
  } | null;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getMediaTypeIcon(type: string, className = "size-6") {
  const iconProps = { className };
  switch (type) {
    case "image":
      return <Image {...iconProps} />;
    case "video":
      return <Video {...iconProps} />;
    case "audio":
      return <Music {...iconProps} />;
    case "document":
      return <FileText {...iconProps} />;
    default:
      return <File {...iconProps} />;
  }
}

function getMediaTypeFromMimeType(mimeType?: string): MediaType {
  if (!mimeType) return "other";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("document") ||
    mimeType.includes("sheet") ||
    mimeType.includes("presentation") ||
    mimeType.startsWith("text/")
  ) {
    return "document";
  }
  return "other";
}

export function MediaPage({ api, navigation, settings }: MediaPageProps) {
  useEffect(() => {
    if (settings && !settings.features.mediaManagement) {
      navigation.navigate("/");
    }
  }, [settings, navigation]);

  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(
    undefined
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MediaType | "">("");
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderError, setFolderError] = useState("");
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [editingAsset, setEditingAsset] = useState<MediaAssetForEdit | null>(
    null
  );
  const [editingFolder, setEditingFolder] = useState<MediaFolderForEdit | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "asset" | "folder";
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [activeView, setActiveView] = useState<MediaView>("library");
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false);
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] =
    useState(false);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<
    string | "bulk" | null
  >(null);

  const isTrashView = activeView === "trash";

  const assetsResult = useQuery(api.listMediaAssets, {
    folderId: isTrashView ? undefined : currentFolderId,
    type: typeFilter || undefined,
    search: searchQuery || undefined,
    deletedOnly: isTrashView ? true : undefined,
    paginationOpts: { numItems: 100, cursor: null },
  });

  const trashCount = useQuery(api.getMediaTrashCount, {});

  const mediaByTermResult0 = useQuery(
    api.getMediaByTerm,
    selectedTermIds[0] ? { termId: selectedTermIds[0] } : "skip"
  );
  const mediaByTermResult1 = useQuery(
    api.getMediaByTerm,
    selectedTermIds[1] ? { termId: selectedTermIds[1] } : "skip"
  );
  const mediaByTermResult2 = useQuery(
    api.getMediaByTerm,
    selectedTermIds[2] ? { termId: selectedTermIds[2] } : "skip"
  );

  const termFilteredMediaIds = useMemo(() => {
    if (selectedTermIds.length === 0) return null;
    const ids = new Set<string>();
    const results = [
      mediaByTermResult0,
      mediaByTermResult1,
      mediaByTermResult2,
    ];
    for (let i = 0; i < selectedTermIds.length && i < 3; i++) {
      const result = results[i];
      if (result?.page) {
        for (const mediaId of result.page) {
          ids.add(mediaId);
        }
      }
    }
    return ids;
  }, [
    selectedTermIds,
    mediaByTermResult0,
    mediaByTermResult1,
    mediaByTermResult2,
  ]);

  const folders = useQuery(api.listMediaFolders, {
    parentId: isTrashView ? undefined : currentFolderId,
    deletedOnly: isTrashView || undefined,
  });

  const currentFolder = useQuery(
    api.getMediaFolder,
    currentFolderId ? { id: currentFolderId } : "skip"
  );

  const folderTree = useQuery(api.getMediaFolderTree, {});

  const createFolder = useMutation(api.createMediaFolder);
  const deleteAsset = useMutation(api.deleteMediaAsset);
  const deleteFolder = useMutation(api.deleteMediaFolder);
  const restoreAsset = useMutation(api.restoreMediaAsset);
  const restoreFolder = useMutation(api.restoreMediaFolder);
  const permanentDeleteAsset = useMutation(api.permanentDeleteMediaAsset);
  const bulkPermanentDeleteAssets = useMutation(
    api.bulkPermanentDeleteMediaAssets
  );

  const breadcrumbPath = useMemo(() => {
    if (!currentFolderId || !folderTree) return [];

    type FolderItem = (typeof folderTree)[number];
    const path: FolderItem[] = [];
    let folder: FolderItem | undefined = folderTree.find(
      (f) => f._id === currentFolderId
    );

    while (folder) {
      path.unshift(folder);
      const parentId = folder.parentId;
      folder = parentId ? folderTree.find((f) => f._id === parentId) : undefined;
    }

    return path;
  }, [currentFolderId, folderTree]);

  const handleFolderClick = useCallback((folderId: string) => {
    setCurrentFolderId(folderId);
    setSearchQuery("");
  }, []);

  const handleNavigateUp = useCallback(() => {
    if (currentFolder?.parentId) {
      setCurrentFolderId(currentFolder.parentId as string);
    } else {
      setCurrentFolderId(undefined);
    }
  }, [currentFolder]);

  const handleNavigateToRoot = useCallback(() => {
    setCurrentFolderId(undefined);
    setSearchQuery("");
  }, []);

  const handleAssetSelect = useCallback((assetId: string) => {
    setSelectedAssets((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!assetsResult?.page) return;
    setSelectedAssets(new Set(assetsResult.page.map((a) => a._id as string)));
  }, [assetsResult?.page]);

  const handleDeselectAll = useCallback(() => {
    setSelectedAssets(new Set());
  }, []);

  const handleViewChange = useCallback((view: MediaView) => {
    setActiveView(view);
    setSelectedAssets(new Set());
    setIsSelectionMode(false);
  }, []);

  const handleAssetClick = useCallback(
    (assetId: string) => {
      if (isSelectionMode) {
        handleAssetSelect(assetId);
      } else {
        const index =
          assetsResult?.page?.findIndex((a) => a._id === assetId) ?? -1;
        if (index !== -1) {
          setPreviewIndex(index);
        }
      }
    },
    [isSelectionMode, handleAssetSelect, assetsResult?.page]
  );

  const handlePreviewNavigate = useCallback((index: number) => {
    setPreviewIndex(index);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      if (deleteTarget.type === "asset") {
        await deleteAsset({ id: deleteTarget.id });
      } else {
        await deleteFolder({ id: deleteTarget.id });
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, deleteAsset, deleteFolder]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedAssets.size === 0) return;

    setIsBulkDeleting(true);
    try {
      const deletePromises = Array.from(selectedAssets).map((id) =>
        deleteAsset({ id })
      );
      await Promise.all(deletePromises);
      setSelectedAssets(new Set());
      setIsSelectionMode(false);
      setShowBulkDeleteConfirm(false);
    } catch (err) {
      console.error("Bulk delete failed:", err);
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedAssets, deleteAsset]);

  const handleBulkMoveComplete = useCallback(() => {
    setSelectedAssets(new Set());
    setIsSelectionMode(false);
  }, []);

  const handleRestore = useCallback(
    async (assetId: string) => {
      setIsRestoring(true);
      try {
        await restoreAsset({ id: assetId });
      } catch (err) {
        console.error("Restore failed:", err);
      } finally {
        setIsRestoring(false);
      }
    },
    [restoreAsset]
  );

  const handleBulkRestore = useCallback(async () => {
    if (selectedAssets.size === 0) return;

    setIsRestoring(true);
    try {
      const restorePromises = Array.from(selectedAssets).map((id) =>
        restoreAsset({ id })
      );
      await Promise.all(restorePromises);
      setSelectedAssets(new Set());
      setIsSelectionMode(false);
    } catch (err) {
      console.error("Bulk restore failed:", err);
    } finally {
      setIsRestoring(false);
    }
  }, [selectedAssets, restoreAsset]);

  const handleRestoreFolder = useCallback(
    async (folderId: string) => {
      setIsRestoring(true);
      try {
        await restoreFolder({ id: folderId });
      } catch (err) {
        console.error("Restore folder failed:", err);
      } finally {
        setIsRestoring(false);
      }
    },
    [restoreFolder]
  );

  const handlePermanentDelete = useCallback(async () => {
    if (!permanentDeleteTarget) return;

    setIsPermanentlyDeleting(true);
    try {
      if (permanentDeleteTarget === "bulk") {
        await bulkPermanentDeleteAssets({ ids: Array.from(selectedAssets) });
        setSelectedAssets(new Set());
        setIsSelectionMode(false);
      } else {
        await permanentDeleteAsset({ id: permanentDeleteTarget });
      }
      setShowPermanentDeleteConfirm(false);
      setPermanentDeleteTarget(null);
    } catch (err) {
      console.error("Permanent delete failed:", err);
    } finally {
      setIsPermanentlyDeleting(false);
    }
  }, [
    permanentDeleteTarget,
    permanentDeleteAsset,
    bulkPermanentDeleteAssets,
    selectedAssets,
  ]);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      setFolderError("Folder name is required");
      return;
    }

    setIsCreatingFolder(true);
    setFolderError("");

    try {
      await createFolder({
        name: newFolderName.trim(),
        parentId: currentFolderId,
      });
      setShowNewFolderModal(false);
      setNewFolderName("");
    } catch (error) {
      setFolderError(
        error instanceof Error ? error.message : "Failed to create folder"
      );
    } finally {
      setIsCreatingFolder(false);
    }
  }, [newFolderName, currentFolderId, createFolder]);

  const handleUploadComplete = useCallback((_results: UploadedFile[]) => {
    setShowUploadModal(false);
  }, []);

  const isLoading = assetsResult === undefined || folders === undefined;

  const displayedAssets = useMemo(() => {
    const assets = assetsResult?.page ?? [];
    if (termFilteredMediaIds === null) {
      return assets;
    }
    return assets.filter((asset) => termFilteredMediaIds.has(asset._id));
  }, [assetsResult?.page, termFilteredMediaIds]);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <CmsPageHeader
        title="Media Library"
        description="Upload, organize, and manage media assets for your content."
      />

      <Tabs
        value={activeView}
        onValueChange={(v) => handleViewChange(v as MediaView)}
      >
        <TabsList>
          <TabsTrigger value="library">
            <Image className="mr-1.5 size-4" />
            Library
          </TabsTrigger>
          <TabsTrigger value="trash">
            <Trash2 className="mr-1.5 size-4" />
            Trash
            {trashCount && trashCount.total > 0 && (
              <Badge variant="secondary" className="ml-1.5">
                {trashCount.total}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {!isTrashView && (
        <nav className="flex items-center gap-1" aria-label="Folder navigation">
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors",
              !currentFolderId
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            onClick={handleNavigateToRoot}
          >
            <Home className="size-4" />
            <span>All Files</span>
          </button>
          {breadcrumbPath.map((folder, index) => (
            <span key={folder._id} className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <button
                className={cn(
                  "rounded-md px-2 py-1 text-sm transition-colors",
                  index === breadcrumbPath.length - 1
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={() => handleFolderClick(folder._id as string)}
              >
                {folder.name}
              </button>
            </span>
          ))}
        </nav>
      )}

      <CmsFilterBar
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: "Search files...",
          className: "w-full md:w-64",
        }}
        filters={[
          {
            key: "type",
            value: typeFilter || "all",
            onChange: (v) => setTypeFilter(v === "all" ? "" : (v as MediaType)),
            options: [
              { value: "all", label: "All Types" },
              { value: "image", label: "Images" },
              { value: "video", label: "Videos" },
              { value: "audio", label: "Audio" },
              { value: "document", label: "Documents" },
              { value: "other", label: "Other" },
            ],
            className: "w-full sm:w-36",
          },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <TaxonomyFilter
              selectedTermIds={selectedTermIds}
              onChange={setSelectedTermIds}
              placeholder="Tags"
            />

            {assetsResult?.page && assetsResult.page.length > 0 && (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={isSelectionMode}
                  onCheckedChange={(checked) => {
                    setIsSelectionMode(checked as boolean);
                    if (!checked) {
                      setSelectedAssets(new Set());
                    }
                  }}
                />
                Selection Mode
              </label>
            )}

            {isSelectionMode && selectedAssets.size > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedAssets.size} selected
              </span>
            )}

            {isSelectionMode && (
              <>
                <CmsButton
                  variant="secondary"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  Select All
                </CmsButton>
                <CmsButton
                  variant="secondary"
                  size="sm"
                  onClick={handleDeselectAll}
                >
                  Clear
                </CmsButton>
              </>
            )}

            {currentFolderId && !isTrashView && (
              <CmsButton variant="secondary" onClick={handleNavigateUp}>
                <ChevronLeft className="size-4" />
                Up
              </CmsButton>
            )}

            {!isTrashView && (
              <>
                <CmsButton
                  variant="secondary"
                  onClick={() => setShowNewFolderModal(true)}
                >
                  <FolderPlus className="size-4" />
                  New Folder
                </CmsButton>

                <CmsButton onClick={() => setShowUploadModal(true)}>
                  <Upload className="size-4" />
                  Upload Files
                </CmsButton>
              </>
            )}
          </div>
        }
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading media library...
          </p>
        </div>
      ) : (
        <>
          {!isTrashView && folders && folders.length > 0 && !searchQuery && (
            <section>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                Folders
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {folders.map((folder) => (
                  <div
                    key={folder._id}
                    className="group relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border bg-card p-4 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
                    onClick={() => handleFolderClick(folder._id as string)}
                  >
                    <div className="absolute right-2 top-2">
                      <MediaFolderActions
                        folder={{ _id: folder._id, name: folder.name }}
                        onEdit={() =>
                          setEditingFolder({
                            _id: folder._id,
                            name: folder.name,
                            description: folder.description,
                          })
                        }
                        onDelete={() =>
                          setDeleteTarget({
                            type: "folder",
                            id: folder._id,
                            name: folder.name,
                          })
                        }
                      />
                    </div>
                    <Folder className="size-10 text-amber-500" />
                    <span className="truncate text-sm font-medium">
                      {folder.name}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {isTrashView && folders && folders.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                Deleted Folders ({folders.length})
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {folders.map((folder) => (
                  <div
                    key={folder._id}
                    className="group relative flex flex-col items-center gap-2 rounded-lg border border-destructive/20 bg-card p-4 text-center opacity-60"
                  >
                    <Folder className="size-10 text-amber-500/50" />
                    <span className="truncate text-sm font-medium">
                      {folder.name}
                    </span>
                    <CmsButton
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRestoreFolder(folder._id)}
                      disabled={isRestoring}
                    >
                      <RotateCcw className="mr-1 size-3" />
                      Restore
                    </CmsButton>
                  </div>
                ))}
              </div>
            </section>
          )}

          {displayedAssets.length > 0 ? (
            <section>
              {!isTrashView && folders && folders.length > 0 && !searchQuery && (
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                  Files
                </h3>
              )}
              {isTrashView && (
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                  Deleted Files ({displayedAssets.length})
                </h3>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {displayedAssets.map((asset) => {
                  const assetId = asset._id as string;
                  const isSelected = selectedAssets.has(assetId);
                  const mediaType = getMediaTypeFromMimeType(asset.mimeType);

                  return (
                    <div
                      key={asset._id}
                      className={cn(
                        "group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-card transition-all hover:border-primary/50",
                        isSelected && "border-primary ring-2 ring-primary/20"
                      )}
                      onClick={() => handleAssetClick(assetId)}
                    >
                      {isSelectionMode && (
                        <div className="absolute left-2 top-2 z-10">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleAssetSelect(assetId)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white/80"
                          />
                        </div>
                      )}

                      {!isSelectionMode && !isTrashView && (
                        <div className="absolute right-2 top-2 z-10">
                          <MediaAssetActions
                            asset={{
                              _id: asset._id,
                              name: asset.name,
                              url: asset.url,
                            }}
                            onView={() => {
                              const index = displayedAssets.findIndex(
                                (a) => a._id === asset._id
                              );
                              if (index !== -1) setPreviewIndex(index);
                            }}
                            onEdit={() =>
                              setEditingAsset({
                                _id: asset._id,
                                name: asset.name,
                                title: asset.title,
                                description: asset.description,
                                altText: asset.altText,
                                tags: asset.tags,
                              })
                            }
                            onDelete={() =>
                              setDeleteTarget({
                                type: "asset",
                                id: asset._id,
                                name: asset.name,
                              })
                            }
                          />
                        </div>
                      )}

                      {!isSelectionMode && isTrashView && (
                        <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100">
                          <CmsButton
                            variant="secondary"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(asset._id);
                            }}
                            title="Restore"
                          >
                            <RotateCcw className="size-4" />
                          </CmsButton>
                          <CmsButton
                            variant="danger"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPermanentDeleteTarget(asset._id);
                              setShowPermanentDeleteConfirm(true);
                            }}
                            title="Delete Forever"
                          >
                            <Trash2 className="size-4" />
                          </CmsButton>
                        </div>
                      )}

                      <div className="aspect-square overflow-hidden bg-muted">
                        {mediaType === "image" && asset.url ? (
                          <img
                            src={asset.url}
                            alt={asset.title || asset.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            {getMediaTypeIcon(mediaType, "size-10")}
                          </div>
                        )}
                      </div>

                      <div className="p-2">
                        <p
                          className="truncate text-sm font-medium"
                          title={asset.name}
                        >
                          {asset.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="capitalize">{mediaType}</span>
                          <span>•</span>
                          <span>{formatFileSize(asset.size ?? 0)}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(asset._creationTime)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!assetsResult.isDone && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Showing {assetsResult.page.length} files. More files available.
                </p>
              )}
            </section>
          ) : isTrashView ? (
            <CmsEmptyState
              icon={<Trash2 className="size-8" />}
              title="Trash is empty"
              description="Deleted files will appear here. You can restore them or permanently delete them."
            />
          ) : (
            !folders?.length && (
              <CmsEmptyState
                icon={<Image className="size-8" />}
                title="No media assets yet"
                description="Upload images, videos, documents, and other files to use in your content."
                action={{
                  label: "Upload Files",
                  onClick: () => setShowUploadModal(true),
                }}
              />
            )
          )}

          {searchQuery && displayedAssets.length === 0 && !isTrashView && (
            <CmsEmptyState
              icon={<Search className="size-8" />}
              title="No results found"
              description={`No files match "${searchQuery}". Try a different search term.`}
              action={{
                label: "Clear Search",
                onClick: () => setSearchQuery(""),
                variant: "secondary",
              }}
            />
          )}
        </>
      )}

      <Dialog open={showNewFolderModal} onOpenChange={setShowNewFolderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => {
                  setNewFolderName(e.target.value);
                  setFolderError("");
                }}
                placeholder="Enter folder name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isCreatingFolder) {
                    handleCreateFolder();
                  }
                }}
              />
              {folderError && (
                <p className="text-sm text-destructive">{folderError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <CmsButton
              variant="secondary"
              onClick={() => setShowNewFolderModal(false)}
              disabled={isCreatingFolder}
            >
              Cancel
            </CmsButton>
            <CmsButton
              onClick={handleCreateFolder}
              disabled={isCreatingFolder || !newFolderName.trim()}
              loading={isCreatingFolder}
            >
              Create Folder
            </CmsButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <UploadDropzone
              currentFolderId={currentFolderId}
              generateUploadUrl={api.generateUploadUrl}
              createAsset={api.createMediaAsset}
              onUploadComplete={handleUploadComplete}
              maxFileSize={50 * 1024 * 1024}
              maxConcurrentUploads={3}
            />
          </div>
          <DialogFooter>
            <CmsButton
              variant="secondary"
              onClick={() => setShowUploadModal(false)}
            >
              Close
            </CmsButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MediaPreviewModal
        asset={
          previewIndex !== null && displayedAssets[previewIndex]
            ? (displayedAssets[previewIndex] as MediaAsset)
            : null
        }
        assets={displayedAssets as MediaAsset[]}
        currentIndex={previewIndex ?? 0}
        open={previewIndex !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewIndex(null);
        }}
        onNavigate={handlePreviewNavigate}
        onEdit={
          isTrashView
            ? undefined
            : (asset) =>
                setEditingAsset({
                  _id: asset._id,
                  name: asset.name,
                  title: asset.title,
                  description: asset.description,
                  altText: asset.altText,
                  tags: asset.tags,
                })
        }
        onDelete={
          isTrashView
            ? undefined
            : (asset) =>
                setDeleteTarget({
                  type: "asset",
                  id: asset._id,
                  name: asset.name,
                })
        }
      />

      <MediaAssetEditDialog
        asset={editingAsset}
        open={editingAsset !== null}
        onOpenChange={(open) => {
          if (!open) setEditingAsset(null);
        }}
      />

      <MediaFolderEditDialog
        folder={editingFolder}
        open={editingFolder !== null}
        onOpenChange={(open) => {
          if (!open) setEditingFolder(null);
        }}
      />

      <CmsConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete ${deleteTarget?.type === "folder" ? "Folder" : "File"}?`}
        description={`Are you sure you want to delete "${deleteTarget?.name}"? ${deleteTarget?.type === "folder" ? "This will also delete all files inside the folder." : "This action can be undone from the trash."}`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="danger"
        loading={isDeleting}
      />

      <CmsConfirmDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
        title="Delete Selected Files?"
        description={`Are you sure you want to delete ${selectedAssets.size} ${selectedAssets.size === 1 ? "file" : "files"}? This action can be undone from the trash.`}
        confirmLabel="Delete All"
        onConfirm={handleBulkDelete}
        variant="danger"
        loading={isBulkDeleting}
      />

      <CmsConfirmDialog
        open={showPermanentDeleteConfirm}
        onOpenChange={(open) => {
          setShowPermanentDeleteConfirm(open);
          if (!open) setPermanentDeleteTarget(null);
        }}
        title={
          permanentDeleteTarget === "bulk"
            ? `Delete ${selectedAssets.size} ${selectedAssets.size === 1 ? "File" : "Files"} Forever?`
            : "Delete Forever?"
        }
        description={
          permanentDeleteTarget === "bulk"
            ? `This will permanently delete ${selectedAssets.size} ${selectedAssets.size === 1 ? "file" : "files"}. This action cannot be undone.`
            : "This will permanently delete this file. This action cannot be undone."
        }
        confirmLabel="Delete Forever"
        onConfirm={handlePermanentDelete}
        variant="danger"
        loading={isPermanentlyDeleting}
      />

      <MediaMoveModal
        open={showMoveModal}
        onOpenChange={setShowMoveModal}
        assetIds={Array.from(selectedAssets)}
        currentFolderId={currentFolderId}
        onMoved={handleBulkMoveComplete}
      />

      {isSelectionMode && !isTrashView && (
        <MediaBulkActionBar
          selectedCount={selectedAssets.size}
          onClear={handleDeselectAll}
          onMove={() => setShowMoveModal(true)}
          onDelete={() => setShowBulkDeleteConfirm(true)}
          isDeleting={isBulkDeleting}
        />
      )}

      {isSelectionMode && isTrashView && (
        <MediaTrashBulkActionBar
          selectedCount={selectedAssets.size}
          onClear={handleDeselectAll}
          onRestore={handleBulkRestore}
          onPermanentDelete={() => {
            setPermanentDeleteTarget("bulk");
            setShowPermanentDeleteConfirm(true);
          }}
          isRestoring={isRestoring}
          isDeleting={isPermanentlyDeleting}
        />
      )}
    </div>
  );
}
