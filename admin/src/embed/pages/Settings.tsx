/**
 * Embed Settings Page
 *
 * CMS configuration and settings.
 */

import { CmsPageHeader } from "~/components/cmsds/CmsPageHeader";

export function EmbedSettings() {
  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Settings"
        description="Configure your content management system"
      />

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 font-semibold text-foreground">General Settings</h3>
        <p className="text-sm text-muted-foreground">
          Settings configuration is available in the standalone admin application.
        </p>
      </div>
    </div>
  );
}
