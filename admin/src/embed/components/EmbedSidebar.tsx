/**
 * Embed Sidebar
 *
 * A router-agnostic version of the Sidebar component that uses
 * the EmbedNavigation context for navigation instead of TanStack Router.
 */

import { useState } from "react";
import { version } from "../../../../package.json";
import { useQuery } from "convex/react";
import { Layers, ChevronDown } from "lucide-react";
import { useAdminConfig } from "../../contexts";
import { Icon } from "../../lib/icons";
import { useEmbedNavigation, type EmbedRoute } from "../navigation";
import { useApi } from "../contexts/ApiContext";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../../components/ui/collapsible";
import {
  Sidebar as ShadcnSidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "../../components/ui/sidebar";
import { ContentTypeFormModal } from "../../components/ContentTypeFormModal";
import type { NavItem } from "../../lib/admin-config";

function pathToRoute(path: string): EmbedRoute {
  if (path === "/" || path === "") return "dashboard";
  if (path.startsWith("/content-types")) return "content-types";
  if (path.startsWith("/entries")) return "entries";
  if (path.startsWith("/content")) return "content";
  if (path.startsWith("/media")) return "media";
  if (path.startsWith("/taxonomies")) return "taxonomies";
  if (path.startsWith("/users")) return "users";
  if (path.startsWith("/settings")) return "settings";
  if (path.startsWith("/trash")) return "trash";
  return "dashboard";
}

export function EmbedSidebar() {
  const { currentPath, navigate, navigateToContentType } = useEmbedNavigation();
  const config = useAdminConfig();
  const { navItems, branding } = config;
  const api = useApi();
  const { setOpenMobile, isMobile } = useSidebar();

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

  const closeMobileSheet = () => {
    if (isMobile) setOpenMobile(false);
  };

  const handleNavClick = (item: NavItem) => {
    const route = pathToRoute(item.path);
    navigate(route);
    closeMobileSheet();
  };

  const renderNavItem = (item: NavItem) => {
    if (item.id === "content") {
      return renderContentMenu(item);
    }

    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton
          isActive={isActive(item.path, item.exact)}
          onClick={() => handleNavClick(item)}
        >
          <Icon name={item.icon} className="size-5" />
          <span>{item.label}</span>
          {item.badge && (
            <span className="ml-auto rounded-full bg-sidebar-primary px-2 py-0.5 text-xs text-sidebar-primary-foreground">
              {item.badge}
            </span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderContentMenu = (item: NavItem) => (
    <Collapsible key={item.id} defaultOpen={isContentActive} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={isContentActive}>
            <Icon name={item.icon} className="size-5" />
            <span>{item.label}</span>
            <ChevronDown className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <SidebarMenuSubButton
                isActive={normalizedPath === "/content"}
                onClick={() => {
                  navigate("content");
                  closeMobileSheet();
                }}
              >
                All Entries
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
            {contentTypes.map((type) => (
              <SidebarMenuSubItem key={type._id}>
                <SidebarMenuSubButton
                  isActive={normalizedPath === `/entries/type/${type._id}`}
                  onClick={() => {
                    navigateToContentType(type._id);
                    closeMobileSheet();
                  }}
                >
                  {type.displayName}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
            {contentTypes.length === 0 && contentTypesResult !== undefined && (
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  onClick={() => setIsCreateModalOpen(true)}
                  className="text-sidebar-foreground/60"
                >
                  + Create content type
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );

  return (
    <>
      <ShadcnSidebar collapsible="offcanvas" className="bg-sidebar">
        <SidebarHeader className="border-none">
          <button
            type="button"
            onClick={() => {
              navigate("dashboard");
              closeMobileSheet();
            }}
            className="flex h-14 items-center gap-2 px-2 font-semibold text-sidebar-foreground"
          >
            {branding.logo ? (
              <img src={branding.logo} alt={branding.appName} className="size-8 bg-primary" />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sidebar-primary-foreground">
                <Layers className="size-4" />
              </div>
            )}
            <span className="text-base">{branding.appName}</span>
          </button>
        </SidebarHeader>

        <SidebarContent>
          {navItems.main.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Main</SidebarGroupLabel>
              <SidebarMenu>{navItems.main.map(renderNavItem)}</SidebarMenu>
            </SidebarGroup>
          )}

          {navItems.config.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Configuration</SidebarGroupLabel>
              <SidebarMenu>{navItems.config.map(renderNavItem)}</SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <div className="flex items-center justify-between text-xs text-sidebar-foreground/60">
            <span>Version</span>
            <span className="font-mono">{version}</span>
          </div>
        </SidebarFooter>
      </ShadcnSidebar>

      <ContentTypeFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
}
