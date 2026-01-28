/**
 * Embed Sidebar
 *
 * A router-agnostic version of the Sidebar component that uses
 * the EmbedNavigation context for navigation instead of TanStack Router.
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { Layers, ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { useAdminConfig } from "../../contexts";
import { Icon } from "../../lib/icons";
import { useEmbedNavigation, type EmbedRoute } from "../navigation";
import { useApi } from "../contexts/ApiContext";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../../components/ui/collapsible";
import { ContentTypeFormModal } from "../../components/ContentTypeFormModal";
import type { NavItem } from "../../lib/admin-config";

function pathToRoute(path: string): EmbedRoute {
  if (path === "/" || path === "") return "dashboard";
  if (path.startsWith("/content-types")) return "content-types";
  if (path.startsWith("/entries")) return "entries";
  if (path.startsWith("/content")) return "content";
  if (path.startsWith("/media")) return "media";
  if (path.startsWith("/taxonomies")) return "taxonomies";
  if (path.startsWith("/settings")) return "settings";
  if (path.startsWith("/trash")) return "trash";
  return "dashboard";
}

export function EmbedSidebar() {
  const { currentPath, navigate, navigateToContentType } = useEmbedNavigation();
  const config = useAdminConfig();
  const { navItems, branding,
    // layout
  } = config;
  const api = useApi();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const contentTypesResult = useQuery(api.listContentTypes, {
    isActive: true,
  });
  const contentTypes = contentTypesResult?.page ?? [];

  const normalizedPath = currentPath.replace(/^\/admin/, "");

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return normalizedPath === path;
    }
    return normalizedPath.startsWith(path);
  };

  const isContentActive =
    normalizedPath === "/content" ||
    normalizedPath.startsWith("/entries/type/") ||
    normalizedPath.startsWith("/entries/new/") ||
    normalizedPath.startsWith("/entries/");

  const handleNavClick = (item: NavItem) => {
    const route = pathToRoute(item.path);
    navigate(route);
  };

  const renderNavItem = (item: NavItem) => {
    if (item.id === "content") {
      return renderContentMenu(item);
    }

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleNavClick(item)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm font-medium transition-colors",
          isActive(item.path, item.exact)
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon name={item.icon} className="size-5" />
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className="rounded-full bg-sidebar-primary px-2 py-0.5 text-xs text-sidebar-primary-foreground">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const renderContentMenu = (item: NavItem) => (
    <Collapsible key={item.id} defaultOpen={isContentActive}>
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
          isContentActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
          "group"
        )}
      >
        <Icon name={item.icon} className="size-5" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-5 mt-1 space-y-1 border-l border-sidebar-border pl-3">
          <button
            type="button"
            onClick={() => navigate("content")}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
              normalizedPath === "/content"
                ? "bg-sidebar-accent/60 text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground"
            )}
          >
            All Entries
          </button>
          {contentTypes.map((type) => (
            <button
              key={type._id}
              type="button"
              onClick={() => navigateToContentType(type._id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                normalizedPath === `/entries/type/${type._id}`
                  ? "bg-sidebar-accent/60 text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground"
              )}
            >
              {type.displayName}
            </button>
          ))}
          {contentTypes.length === 0 && contentTypesResult !== undefined && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground"
            >
              + Create content type
            </button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <>
      <aside className="sticky top-0 z-40 flex h-full flex-col overflow-hidden border-r border-sidebar-border bg-sidebar">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <button
            type="button"
            onClick={() => navigate("dashboard")}
            className="flex items-center gap-2 font-semibold text-sidebar-foreground"
          >
            {branding.logo ? (
              <img src={branding.logo} alt={branding.appName} className="size-8" />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Layers className="size-4" />
              </div>
            )}
            <span className="text-base">{branding.appName}</span>
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto p-4">
          {navItems.main.length > 0 && (
            <div className="space-y-1">
              <span className="px-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/60">
                Main
              </span>
              <div className="space-y-1 pt-2">{navItems.main.map(renderNavItem)}</div>
            </div>
          )}

          {navItems.config.length > 0 && (
            <div className="space-y-1">
              <span className="px-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/60">
                Configuration
              </span>
              <div className="space-y-1 pt-2">{navItems.config.map(renderNavItem)}</div>
            </div>
          )}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center justify-between text-xs text-sidebar-foreground/60">
            <span>Version</span>
            <span className="font-mono">0.1.0</span>
          </div>
        </div>
      </aside>

      <ContentTypeFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
}
