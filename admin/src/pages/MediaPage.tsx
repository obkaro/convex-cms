/**
 * Shared Media Page Component
 *
 * Manages media assets and folders.
 * Used by both CLI routes and embed pages.
 */

import { CmsPageHeader } from "~/components/cmsds/CmsPageHeader";
import { CmsEmptyState } from "~/components/cmsds/CmsEmptyState";
import { Image } from "lucide-react";
import type { AdminNavigation } from "~/lib/navigation";
import type { CmsAdminApi } from "~/embed/contexts/ApiContext";

export interface MediaPageProps {
  api: CmsAdminApi;
  navigation: AdminNavigation;
}

export function MediaPage({ api: _api, navigation: _navigation }: MediaPageProps) {
  return (
    <div className="space-y-6 p-6">
      <CmsPageHeader
        title="Media Library"
        description="Upload and manage media assets like images, videos, and documents."
      />

      <CmsEmptyState
        icon={<Image className="size-6" />}
        title="Media library coming soon"
        description="The media management interface is under development."
      />
    </div>
  );
}
