import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAdminConfig } from "../contexts";
import { SidebarProvider, SidebarInset } from "./ui/sidebar";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
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
      <Sidebar />
      <SidebarInset>
        <Header />
        <div className="flex-1 overflow-auto p-3 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
