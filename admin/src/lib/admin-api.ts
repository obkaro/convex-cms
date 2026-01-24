/**
 * Admin API Type Definitions
 *
 * Defines the interface for CMS admin operations that can be satisfied
 * by both direct API import (CLI) and context-provided API (embed).
 */

import type { FunctionReference } from "convex/server";

type QueryFunction = FunctionReference<"query", "public", any, any>;
type MutationFunction = FunctionReference<"mutation", "public", any, any>;
type ActionFunction = FunctionReference<"action", "public", any, any>;

export interface AdminApi {
  contentTypes: {
    list: QueryFunction;
    get: QueryFunction;
    create: MutationFunction;
    update: MutationFunction;
    remove: MutationFunction;
    restore: MutationFunction;
  };
  entries: {
    list: QueryFunction;
    get: QueryFunction;
    create: MutationFunction;
    update: MutationFunction;
    publish: MutationFunction;
    unpublish: MutationFunction;
    archive: MutationFunction;
    remove: MutationFunction;
    restore: MutationFunction;
    permanentDelete: MutationFunction;
    bulkPublish: MutationFunction;
    bulkUnpublish: MutationFunction;
    bulkArchive: MutationFunction;
    bulkDelete: MutationFunction;
    listVersions: QueryFunction;
    restoreVersion: MutationFunction;
  };
  media: {
    list: QueryFunction;
    get: QueryFunction;
    upload: ActionFunction;
    remove: MutationFunction;
    restore: MutationFunction;
    permanentDelete: MutationFunction;
    createFolder: MutationFunction;
    listFolders: QueryFunction;
    moveToFolder: MutationFunction;
  };
  taxonomies: {
    list: QueryFunction;
    get: QueryFunction;
    create: MutationFunction;
    update: MutationFunction;
    remove: MutationFunction;
    listTerms: QueryFunction;
    createTerm: MutationFunction;
    updateTerm: MutationFunction;
    removeTerm: MutationFunction;
  };
  trash: {
    list: QueryFunction;
    restore: MutationFunction;
    permanentDelete: MutationFunction;
    emptyTrash: MutationFunction;
  };
  settings: {
    get: QueryFunction;
    update: MutationFunction;
  };
  dashboard: {
    stats: QueryFunction;
    recentActivity: QueryFunction;
  };
  admin: {
    listContentTypes: QueryFunction;
    listEntries: QueryFunction;
    listMediaAssets: QueryFunction;
    getEntry: QueryFunction;
    createEntry: MutationFunction;
    updateEntry: MutationFunction;
    publishEntry: MutationFunction;
    unpublishEntry: MutationFunction;
    archiveEntry: MutationFunction;
    deleteEntry: MutationFunction;
    restoreEntry: MutationFunction;
    createContentType: MutationFunction;
    updateContentType: MutationFunction;
    deleteContentType: MutationFunction;
    getStats: QueryFunction;
    listTaxonomies: QueryFunction;
    listTrash: QueryFunction;
  };
}

export type AdminApiQuery<K extends keyof AdminApi> = AdminApi[K] extends {
  [key: string]: QueryFunction;
}
  ? keyof AdminApi[K]
  : never;
