/**
 * Embed Layout
 *
 * A router-agnostic layout for the embedded admin that uses
 * EmbedSidebar instead of the router-dependent Sidebar.
 * Uses CSS Grid for proper container-relative positioning.
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
    <div
      className="grid h-full bg-background"
      style={{ gridTemplateColumns: `${layout.sidebarWidth}px 1fr` }}
    >
      <EmbedSidebar />
      <div className="flex flex-col overflow-hidden">
        <EmbedHeader />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
