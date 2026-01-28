/**
 * Embed API Context
 *
 * Provides the Convex API to embedded CMS admin pages.
 * The API structure matches the namespaced exports from defineAdminAPI,
 * allowing shared page components to work with the generated api object.
 */

import { createContext, useContext, type ReactNode } from "react";
import type { BaseAdminAPI } from "convex-cms";

// CmsAdminApi accepts BaseAdminAPI with optional namespaced exports.
// This allows the API to work with Convex's FilterApi which removes
// non-FunctionReference types (the namespaced objects get filtered out).
type NamespacedKeys = "stats" | "settings" | "contentTypes" | "entries" | "bulk" | "trash" | "contentLock" | "versions" | "media" | "taxonomies";
export type CmsAdminApi = Omit<BaseAdminAPI, NamespacedKeys> & Partial<Pick<BaseAdminAPI, NamespacedKeys>>;

const ApiContext = createContext<CmsAdminApi | null>(null);

export function ApiProvider({
  api,
  children,
}: {
  api: CmsAdminApi;
  children: ReactNode;
}) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): CmsAdminApi {
  const api = useContext(ApiContext);
  if (!api) {
    throw new Error("useApi must be used within ApiProvider");
  }
  return api;
}
