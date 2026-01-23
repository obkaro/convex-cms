/**
 * Embed Dashboard Page
 *
 * Overview of CMS content with quick stats and recent activity.
 */

import { useQuery } from "convex/react";
import { Loader2, FileText, Image, Layers, ArrowRight } from "lucide-react";
import { CmsPageHeader } from "~/components/cmsds/CmsPageHeader";
import { CmsEmptyState } from "~/components/cmsds/CmsEmptyState";
import { useEmbedNavigation } from "../navigation";

interface StatCardProps {
  title: string;
  value: number | undefined;
  icon: React.ReactNode;
  onClick?: () => void;
}

function StatCard({ title, value, icon, onClick }: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 rounded-lg border border-border bg-card p-6 text-left transition-colors hover:bg-accent/50"
    >
      <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">
          {value !== undefined ? value : "—"}
        </p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </button>
  );
}

export function EmbedDashboard() {
  const { navigate } = useEmbedNavigation();

  return (
    <div className="space-y-8">
      <CmsPageHeader
        title="Dashboard"
        description="Overview of your content management system"
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Content Entries"
          value={undefined}
          icon={<FileText className="size-6" />}
          onClick={() => navigate("content")}
        />
        <StatCard
          title="Content Types"
          value={undefined}
          icon={<Layers className="size-6" />}
          onClick={() => navigate("content-types")}
        />
        <StatCard
          title="Media Assets"
          value={undefined}
          icon={<Image className="size-6" />}
          onClick={() => navigate("media")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Quick Actions</h3>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => navigate("content")}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
            >
              <span>Browse Content</span>
              <ArrowRight className="size-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => navigate("content-types")}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
            >
              <span>Manage Content Types</span>
              <ArrowRight className="size-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => navigate("media")}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
            >
              <span>Upload Media</span>
              <ArrowRight className="size-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Recent Activity</h3>
          </div>
          <CmsEmptyState
            title="No recent activity"
            description="Activity will appear here as you create and edit content."
            icon="activity"
          />
        </div>
      </div>
    </div>
  );
}
