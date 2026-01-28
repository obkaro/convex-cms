/**
 * Embed API Context
 *
 * Provides the Convex API to embedded CMS admin pages.
 * The API structure matches the namespaced exports from defineAdminAPI,
 * allowing shared page components to work with the generated api object.
 */

import { createContext, useContext, type ReactNode } from "react";
import type { BaseAdminAPI } from "convex-cms";

export type CmsAdminApi = BaseAdminAPI;

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
