import type { AdminConfig } from "../lib/admin-config";
import type { CmsAdminApi } from "./contexts/ApiContext";

export interface CmsAdminUser {
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

export interface CmsAdminAuthConfig {
  getUser: () => CmsAdminUser | null | Promise<CmsAdminUser | null>;
  getUserRole: (userId: string) => string | null | Promise<string | null>;
  onLogout?: () => void | Promise<void>;
}

export interface CmsAdminProps {
  api: CmsAdminApi;
  config?: Partial<AdminConfig>;
  auth: CmsAdminAuthConfig;
  basePath?: string;
  className?: string;
}
