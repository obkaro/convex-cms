import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Layers, ChevronDown } from "lucide-react";
import { cn } from "~/lib/cn";
import { useAdminConfig } from "~/contexts";
import { Icon } from "~/lib/icons";
import { useApi } from "~/embed/contexts/ApiContext";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "~/components/ui/collapsible";
import { ContentTypeFormModal } from "~/components/ContentTypeFormModal";
import type { NavItem } from "~/lib/admin-config";

export function Sidebar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const config = useAdminConfig();
  const { navItems, branding, layout } = config;
  const api = useApi();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const contentTypesResult = useQuery(api.listContentTypes, {
    isActive: true,
  });
  const contentTypes = contentTypesResult?.page ?? [];

  const isActive = (to: string, exact?: boolean) => {
    if (exact) {
      return currentPath === to;
    }
    return currentPath.startsWith(to);
  };

  const isContentActive =
    currentPath === "/content" ||
    currentPath.startsWith("/entries/type/") ||
    currentPath.startsWith("/entries/new/") ||
    currentPath.startsWith("/entries/");

  const renderNavItem = (item: NavItem) => {
    if (item.id === "content") {
      return renderContentMenu(item);
    }

    return (
      <Link
        key={item.id}
        to={item.path}
        className={cn(
          "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
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
      </Link>
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
          <Link
            to="/content"
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              currentPath === "/content"
                ? "bg-sidebar-accent/60 text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground"
            )}
          >
            All Entries
          </Link>
          {contentTypes.map((type) => (
            <Link
              key={type._id}
              to="/entries/type/$contentTypeId"
              params={{ contentTypeId: type._id }}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                currentPath === `/entries/type/${type._id}`
                  ? "bg-sidebar-accent/60 text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground"
              )}
            >
              {type.displayName}
            </Link>
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

  const sidebarWidth = layout.sidebarWidth;

  return (
    <>
      <aside
        className="fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar"
        style={{ width: sidebarWidth }}
      >
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold text-sidebar-foreground">
            {branding.logo ? (
              <img src={branding.logo} alt={branding.appName} className="size-8" />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Layers className="size-4" />
              </div>
            )}
            <span className="text-base">{branding.appName}</span>
          </Link>
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
