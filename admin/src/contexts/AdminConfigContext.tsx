import { createContext, useContext, type ReactNode } from "react";
import type { AdminConfig, NavItem } from "../lib/admin-config";
import { getVisibleNavItems } from "../lib/admin-config";

interface AdminConfigContextValue extends AdminConfig {
  navItems: { main: NavItem[]; config: NavItem[] };
}

const AdminConfigContext = createContext<AdminConfigContextValue | null>(null);

export function AdminConfigProvider({
  config,
  children,
}: {
  config: AdminConfig;
  children: ReactNode;
}) {
  const navItems = getVisibleNavItems(config);
  const value: AdminConfigContextValue = { ...config, navItems };

  return <AdminConfigContext.Provider value={value}>{children}</AdminConfigContext.Provider>;
}

export function useAdminConfig(): AdminConfigContextValue {
  const config = useContext(AdminConfigContext);
  if (!config) {
    throw new Error("useAdminConfig must be used within AdminConfigProvider");
  }
  return config;
}
