import * as React from "react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/cn";

export type ContentStatus = "draft" | "published" | "scheduled" | "archived";

export type WorkflowStateColor =
  | "gray"
  | "yellow"
  | "blue"
  | "green"
  | "red"
  | "purple"
  | "orange";

export interface CustomStatusConfig {
  name: string;
  displayName: string;
  color: WorkflowStateColor;
}

export interface CmsStatusBadgeProps
  extends Omit<React.ComponentProps<typeof Badge>, "variant"> {
  status: ContentStatus | string;
  customConfig?: CustomStatusConfig;
}

const statusConfig: Record<
  ContentStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  draft: {
    label: "Draft",
    className: "status-draft",
    icon: (
      <svg className="size-3" fill="currentColor" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="3" />
      </svg>
    ),
  },
  published: {
    label: "Published",
    className: "status-published",
    icon: (
      <svg
        className="size-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  scheduled: {
    label: "Scheduled",
    className: "status-scheduled",
    icon: (
      <svg
        className="size-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" d="M12 6v6l4 2" />
      </svg>
    ),
  },
  archived: {
    label: "Archived",
    className: "status-archived",
    icon: (
      <svg
        className="size-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
        />
      </svg>
    ),
  },
};

const colorToClassName: Record<WorkflowStateColor, string> = {
  gray: "bg-muted text-muted-foreground",
  yellow: "bg-diff-modified-bg text-diff-modified-foreground",
  blue: "bg-info-bg text-info-foreground",
  green: "bg-diff-added-bg text-diff-added-foreground",
  red: "bg-diff-removed-bg text-diff-removed-foreground",
  purple: "bg-purple-bg text-purple-foreground",
  orange: "bg-diff-modified-bg text-diff-modified-foreground",
};

function getDefaultIcon() {
  return (
    <svg className="size-3" fill="currentColor" viewBox="0 0 8 8">
      <circle cx="4" cy="4" r="3" />
    </svg>
  );
}

export function CmsStatusBadge({ status, customConfig, className, ...props }: CmsStatusBadgeProps) {
  if (customConfig) {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "gap-1.5 px-2 py-0.5 text-xs font-medium",
          colorToClassName[customConfig.color],
          className
        )}
        {...props}
      >
        {getDefaultIcon()}
        {customConfig.displayName}
      </Badge>
    );
  }

  const config = statusConfig[status as ContentStatus];
  if (!config) {
    return (
      <Badge
        variant="secondary"
        className={cn("gap-1.5 px-2 py-0.5 text-xs font-medium", colorToClassName.gray, className)}
        {...props}
      >
        {getDefaultIcon()}
        {status}
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={cn("gap-1.5 px-2 py-0.5 text-xs font-medium", config.className, className)}
      {...props}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}
