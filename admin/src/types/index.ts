/**
 * Admin UI Type Definitions
 *
 * Since the admin UI has its own Convex schema (only settings table),
 * we define CMS entity types locally rather than using Doc<> from generated types.
 * These types mirror the CMS component's document structure.
 */

// =============================================================================
// Field Definition Types
// =============================================================================

export type FieldType =
  | "text"
  | "number"
  | "boolean"
  | "richText"
  | "media"
  | "select"
  | "multiSelect"
  | "tags"
  | "category"
  | "json"
  | "date"
  | "datetime"
  | "reference";

export interface FieldDefinition {
  name: string;
  displayName: string;
  type: FieldType;
  required?: boolean;
  description?: string;
  options?: Record<string, unknown>;
}

// =============================================================================
// Content Type
// =============================================================================

export interface ContentType {
  _id: string;
  _creationTime: number;
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  fields: FieldDefinition[];
  singleton: boolean;
  slugField?: string;
  titleField?: string;
  sortOrder: number;
  isActive: boolean;
  createdBy: string;
  updatedBy?: string;
}

export type ContentTypeWithCount = ContentType & {
  entryCount?: number;
};

// =============================================================================
// Content Entry
// =============================================================================

export type ContentStatus = "draft" | "published" | "scheduled" | "archived";

export interface ContentEntry {
  _id: string;
  _creationTime: number;
  contentTypeId: string;
  slug?: string;
  data: Record<string, unknown>;
  status: ContentStatus;
  version: number;
  locale?: string;
  primaryEntryId?: string;
  publishedAt?: number;
  scheduledPublishAt?: number;
  archivedAt?: number;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: number;
  deletedBy?: string;
}

// =============================================================================
// Content Version
// =============================================================================

export interface ContentVersion {
  _id: string;
  _creationTime: number;
  entryId: string;
  version: number;
  data: Record<string, unknown>;
  status: ContentStatus;
  changeDescription?: string;
  createdBy?: string;
}

// =============================================================================
// Media Item
// =============================================================================

export type MediaItemKind = "asset" | "folder";
export type MediaType = "image" | "video" | "audio" | "document" | "other";

export interface MediaItem {
  _id: string;
  _creationTime: number;
  kind: MediaItemKind;
  name: string;
  parentId?: string;
  path?: string;
  sortOrder?: number;
  createdBy?: string;
  deletedAt?: number;
  deletedBy?: string;
  // Asset-specific fields
  storageId?: string;
  mimeType?: string;
  size?: number;
  type?: MediaType;
  width?: number;
  height?: number;
  duration?: number;
  title?: string;
  description?: string;
  altText?: string;
  tags?: string[];
  // Folder-specific fields
  folderDescription?: string;
}

// =============================================================================
// Media Variant
// =============================================================================

export interface MediaVariant {
  _id: string;
  _creationTime: number;
  assetId: string;
  name: string;
  storageId: string;
  width?: number;
  height?: number;
  format?: string;
}

// =============================================================================
// Taxonomy
// =============================================================================

export interface Taxonomy {
  _id: string;
  _creationTime: number;
  name: string;
  displayName: string;
  description?: string;
  isHierarchical: boolean;
  allowInlineCreation: boolean;
  isActive: boolean;
  icon?: string;
  sortOrder?: number;
  createdBy?: string;
  deletedAt?: number;
  deletedBy?: string;
}

// =============================================================================
// Taxonomy Term
// =============================================================================

export interface TaxonomyTerm {
  _id: string;
  _creationTime: number;
  taxonomyId: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
  color?: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  deletedAt?: number;
  deletedBy?: string;
}

export type TaxonomyTermWithChildren = TaxonomyTerm & {
  children?: TaxonomyTermWithChildren[];
};

// =============================================================================
// ID Types (string aliases for documentation)
// =============================================================================

export type ContentTypeId = string;
export type ContentEntryId = string;
export type ContentVersionId = string;
export type MediaItemId = string;
export type MediaVariantId = string;
export type TaxonomyId = string;
export type TaxonomyTermId = string;

// =============================================================================
// Type Assertion Helpers
// =============================================================================

export function asTaxonomyId(id: string): TaxonomyId {
  return id;
}

export function asTaxonomyTermId(id: string): TaxonomyTermId {
  return id;
}

export function asTaxonomyTermIds(ids: string[]): TaxonomyTermId[] {
  return ids;
}
