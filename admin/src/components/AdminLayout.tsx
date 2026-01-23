import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAdminConfig } from "~/contexts";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { layout } = useAdminConfig();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col" style={{ marginLeft: layout.sidebarWidth }}>
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
