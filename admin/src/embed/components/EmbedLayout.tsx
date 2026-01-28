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

interface EmbedLayoutProps {
  children: ReactNode;
}

export function EmbedLayout({ children }: EmbedLayoutProps) {
  const { layout } = useAdminConfig();

  return (
    <div className="flex min-h-screen bg-background">
      <EmbedSidebar />
      <div className="flex flex-1 flex-col" style={{ marginLeft: layout.sidebarWidth }}>
        <EmbedHeader />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
