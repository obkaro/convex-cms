import { createContext, useContext, type ReactNode } from "react";

export type CmsAdminApi = {
  admin: {
    listContentTypes: unknown;
    listEntries: unknown;
    listMediaAssets: unknown;
  };
};

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
