/**
 * Embed API Context
 *
 * Provides the Convex API to embedded CMS admin pages.
 * The API structure matches the CLI's direct import structure,
 * allowing shared page components to work with both.
 */

import { createContext, useContext, type ReactNode } from "react";

export type CmsAdminApi = {
  contentTypes: {
    list: unknown;
    get: unknown;
    create: unknown;
    update: unknown;
    remove: unknown;
    restore: unknown;
  };
  entries: {
    list: unknown;
    get: unknown;
    create: unknown;
    update: unknown;
    publish: unknown;
    unpublish: unknown;
    archive: unknown;
    remove: unknown;
    restore: unknown;
    permanentDelete: unknown;
    bulkPublish: unknown;
    bulkUnpublish: unknown;
    bulkArchive: unknown;
    bulkDelete: unknown;
    listVersions: unknown;
    restoreVersion: unknown;
  };
  media: {
    list: unknown;
    get: unknown;
    upload: unknown;
    remove: unknown;
    restore: unknown;
    permanentDelete: unknown;
    createFolder: unknown;
    listFolders: unknown;
    moveToFolder: unknown;
  };
  taxonomies: {
    list: unknown;
    deleteTaxonomy: unknown;
  };
  trash: {
    list: unknown;
    getConfig: unknown;
    getStats: unknown;
    empty: unknown;
  };
  bulkOperations: {
    bulkRestore: unknown;
  };
  settings: {
    get: unknown;
    update: unknown;
    reset: unknown;
  };
  stats: {
    getDashboardStats: unknown;
  };
  admin: {
    listContentTypes: unknown;
    listEntries: unknown;
    listMediaAssets: unknown;
    getEntry: unknown;
    createEntry: unknown;
    updateEntry: unknown;
    publishEntry: unknown;
    unpublishEntry: unknown;
    archiveEntry: unknown;
    deleteEntry: unknown;
    restoreEntry: unknown;
    createContentType: unknown;
    updateContentType: unknown;
    deleteContentType: unknown;
    getStats: unknown;
    listTaxonomies: unknown;
    listTrash: unknown;
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
