/**
 * Embed Media Page
 *
 * Media library for managing images, documents, and other files.
 */

import { useQuery } from "convex/react";
import { Loader2, Upload, Image, File, Film, Music } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { CmsPageHeader } from "~/components/cmsds/CmsPageHeader";
import { CmsEmptyState } from "~/components/cmsds/CmsEmptyState";
import { CmsButton } from "~/components/cmsds/CmsButton";

function getMediaIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return Film;
  if (mimeType.startsWith("audio/")) return Music;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmbedMedia() {
  const assets = useQuery(api.media.listAssets, {
    paginationOpts: { numItems: 50, cursor: null },
  });

  const isLoading = assets === undefined;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Media Library"
        description="Manage your images, documents, and other files"
        actions={
          <CmsButton variant="primary" size="sm" disabled>
            <Upload className="mr-2 size-4" />
            Upload
          </CmsButton>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : assets && assets.page.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {assets.page.map((asset) => {
            const IconComponent = getMediaIcon(asset.mimeType);
            const isImage = asset.mimeType.startsWith("image/");

            return (
              <div
                key={asset._id}
                className="group relative overflow-hidden rounded-lg border border-border bg-card"
              >
                <div className="aspect-square bg-muted">
                  {isImage && asset.url ? (
                    <img
                      src={asset.url}
                      alt={asset.filename}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <IconComponent className="size-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-foreground">
                    {asset.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(asset.size)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <CmsEmptyState
          title="No media yet"
          description="Upload images, documents, and other files to use in your content."
          icon="image"
        />
      )}
    </div>
  );
}
