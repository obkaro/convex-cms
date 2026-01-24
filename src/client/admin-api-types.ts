/**
 * Admin API Type Definitions
 *
 * Provides typed exports for the Admin API contract and related types.
 * These types are derived from validators and can be imported by consumer apps.
 *
 * Note: The Admin API uses string-based IDs rather than branded Id<> types
 * for cross-boundary compatibility between the parent app and component.
 */

import type { defineAdminAPI } from "./adminApi.js";

/**
 * The contract type for the Admin API.
 * This is the return type of defineAdminAPI().
 */
export type AdminApiContract = ReturnType<typeof defineAdminAPI>;

/**
 * Content type document as returned by the Admin API.
 */
export type AdminContentType = {
  _id: string;
  _creationTime: number;
  name: string;
  displayName: string;
  description?: string;
  fields: unknown[];
  icon?: string;
  singleton?: boolean;
  slugField?: string;
  titleField?: string;
  sortOrder?: number;
  isActive: boolean;
  deletedAt?: number;
  createdBy: string;
  updatedBy?: string;
  breakingChanges?: unknown[];
};

/**
 * Content entry document as returned by the Admin API.
 */
export type AdminContentEntry = {
  _id: string;
  _creationTime: number;
  contentTypeId: string;
  slug: string;
  data: Record<string, unknown>;
  status: "draft" | "published" | "scheduled" | "archived";
  version: number;
  locale?: string;
  primaryEntryId?: string;
  scheduledPublishAt?: number;
  publishedAt?: number;
  lockedBy?: string;
  lockExpiresAt?: number;
  deletedAt?: number;
  searchText?: string;
  createdBy?: string;
  updatedBy?: string;
  deletedVersionsCount?: number;
  firstPublishedAt?: number;
};

/**
 * Media item document as returned by the Admin API.
 * Can represent either an asset or a folder.
 */
export type AdminMediaItem = {
  _id: string;
  _creationTime: number;
  kind: "asset" | "folder";
  name: string;
  parentId?: string;
  path?: string;
  storageId?: string;
  mimeType?: string;
  type?: "image" | "video" | "audio" | "document" | "other";
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  title?: string;
  description?: string;
  altText?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  sortOrder?: number;
  deletedAt?: number;
  createdBy?: string;
  updatedBy?: string;
};

/**
 * Result type for move media assets operation.
 */
export type AdminMoveMediaAssetsResult = {
  total: number;
  succeeded: number;
  failed: number;
  targetFolderId?: string;
  targetFolderPath?: string;
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
    previousFolderId?: string;
  }>;
};

/**
 * Result type for delete content type operation.
 */
export type AdminDeleteContentTypeResult = {
  success: boolean;
  deletedId: string;
  deletedEntriesCount: number;
  deletedVersionsCount: number;
  wasHardDelete: boolean;
};

/**
 * Paginated result type.
 */
export type AdminPaginatedResult<T> = {
  page: T[];
  continueCursor: string | null;
  isDone: boolean;
};

/**
 * Paginated result type for content types.
 */
export type PaginatedContentTypes = AdminPaginatedResult<AdminContentType>;

/**
 * Paginated result type for content entries.
 */
export type PaginatedContentEntries = AdminPaginatedResult<AdminContentEntry>;

/**
 * Paginated result type for media items.
 */
export type PaginatedMediaItems = AdminPaginatedResult<AdminMediaItem>;

// Re-export for backwards compatibility with original plan naming
export type ContentTypeDoc = AdminContentType;
export type ContentEntryDoc = AdminContentEntry;
export type MediaItemDoc = AdminMediaItem;
export type MediaFolderDoc = AdminMediaItem;
export type MoveMediaAssetsResult = AdminMoveMediaAssetsResult;
