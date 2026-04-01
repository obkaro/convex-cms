/**
 * Embed Layout
 *
 * A router-agnostic layout for the embedded admin that uses
 * EmbedSidebar instead of the router-dependent Sidebar.
 */

import type { ReactNode } from "react";
import { EmbedSidebar } from "./EmbedSidebar";
import { EmbedHeader } from "./EmbedHeader";
import { useAdminConfig } from "../../contexts";
import { SidebarProvider, SidebarInset } from "../../components/ui/sidebar";

interface EmbedLayoutProps {
  children: ReactNode;
}

export function EmbedLayout({ children }: EmbedLayoutProps) {
  const { layout } = useAdminConfig();

  return (
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": `${layout.sidebarWidth}px`,
        } as React.CSSProperties
      }
    >
      <EmbedSidebar />
      <SidebarInset>
        <EmbedHeader />
        <div className="flex-1 overflow-auto p-3 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
