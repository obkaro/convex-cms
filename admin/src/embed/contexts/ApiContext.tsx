/**
 * Embed API Context
 *
 * Provides the Convex API to embedded CMS admin pages.
 * The API structure matches the namespaced exports from defineAdminAPI,
 * allowing shared page components to work with the generated api object.
 */

import { createContext, useContext, type ReactNode } from "react";
import type { FunctionReference } from "convex/server";

// Generic type for the CMS Admin API - matches the shape from defineAdminAPI
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CmsAdminApi = Record<string, FunctionReference<any, any, any, any>>;

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
