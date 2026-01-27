# Client API Reference

The Convex CMS client provides a typed wrapper around the component's raw functions. This document covers the complete API.

> For Admin UI backend functions, see [Admin API Reference](./admin-api.md). For integration guidance, see [Integration Patterns](../guides/integration-patterns.md).

---

## Creating the Client

```typescript
import { createCmsClient } from "convex-cms";
import { components } from "./_generated/api";

const cms = createCmsClient(components.convexCms, config);
```

See [Configuration Reference](./configuration.md) for all available options.

## API Namespaces

The client organizes methods into namespaces:

- `cms.contentTypes` - Content type operations
- `cms.contentEntries` - Entry operations (includes query builder)
- `cms.versions` - Version history
- `cms.mediaAssets` - Media files
- `cms.mediaFolders` - Folder organization
- `cms.mediaVariants` - Image variants
- `cms.taxonomies` - Taxonomy definitions
- `cms.taxonomyTerms` - Tags and categories
- `cms.contentEntryTags` - Entry-term associations
- `cms.mediaAssetTags` - Media-term associations
- `cms.contentLock` - Content locking for concurrent editing
- `cms.locale` - Locale configuration and resolution

---

## Content Types API

### create

Create a new content type.

```typescript
const type = await cms.contentTypes.create(ctx, {
  name: string;               // Unique identifier
  displayName: string;        // Human-readable name
  description?: string;       // Optional description
  fields: FieldDefinition[];  // Field definitions
  icon?: string;              // Icon name
  singleton?: boolean;        // Single entry only
  slugField?: string;         // Field for URL slugs
  titleField?: string;        // Field for display title
  sortOrder?: number;         // Admin UI ordering
  createdBy?: string;         // Creator user ID
});
```

### update

Update an existing content type.

```typescript
const { contentType, breakingChanges } = await cms.contentTypes.update(ctx, {
  id: Id<"content_types">;
  displayName?: string;
  description?: string;
  fields?: FieldDefinition[];
  icon?: string;
  slugField?: string;
  titleField?: string;
  sortOrder?: number;
  updatedBy?: string;
});
```

Returns `breakingChanges` array if updates would break existing content.

### delete

Delete a content type.

```typescript
await cms.contentTypes.delete(ctx, {
  id: Id<"content_types">;
  cascade?: boolean;      // Delete related entries
  hardDelete?: boolean;   // Permanent deletion
});
```

### get

Get a content type by ID.

```typescript
const type = await cms.contentTypes.get(ctx, id);
// Returns: ContentType | null
```

### list

List all content types.

```typescript
const result = await cms.contentTypes.list(ctx, {
  skip?: number;
  limit?: number;
  orderBy?: "name" | "displayName" | "createdAt" | "updatedAt";
  includeDeleted?: boolean;
});
// Returns: { items: ContentType[], totalCount: number }
```

### getAll

Get all content types (no pagination).

```typescript
const types = await cms.contentTypes.getAll(ctx);
// Returns: ContentType[]
```

---

## Content Entries API

### create

Create a new content entry.

```typescript
const entry = await cms.contentEntries.create(ctx, {
  contentTypeId: Id<"content_types">;
  data: Record<string, any>;       // Field values
  slug?: string;                   // Custom slug (or auto-generated)
  status?: "draft" | "scheduled";  // Default: "draft"
  locale?: string;                 // Locale code
  primaryEntryId?: Id<"content_entries">;  // For locale variants
  scheduledPublishAt?: number;     // Scheduled publish time
  createdBy?: string;
});
```

### update

Update an entry's data.

```typescript
const entry = await cms.contentEntries.update(ctx, {
  id: Id<"content_entries">;
  data: Record<string, any>;
  updatedBy?: string;
  changeDescription?: string;      // For version history
});
```

### get

Get an entry by ID.

```typescript
const entry = await cms.contentEntries.get(ctx, id);
// Returns: ContentEntry | null
```

### getBySlug

Get an entry by slug.

```typescript
const entry = await cms.contentEntries.getBySlug(ctx, {
  contentTypeId?: Id<"content_types">;
  contentTypeName?: string;        // Alternative to ID
  slug: string;
  locale?: string;
});
```

### list

List entries with filtering.

```typescript
const result = await cms.contentEntries.list(ctx, {
  contentTypeId?: Id<"content_types">;
  status?: "draft" | "published" | "scheduled" | "archived";
  locale?: string;
  search?: string;                 // Full-text search
  filter?: FilterCondition[];      // Field filters
  sort?: SortCondition[];          // Sorting
  skip?: number;
  limit?: number;
  includeDeleted?: boolean;
});
// Returns: { items: ContentEntry[], totalCount: number }
```

### publish

Publish an entry.

```typescript
const entry = await cms.contentEntries.publish(ctx, {
  id: Id<"content_entries">;
  publishedBy?: string;
});
```

### unpublish

Unpublish an entry (back to draft).

```typescript
const entry = await cms.contentEntries.unpublish(ctx, {
  id: Id<"content_entries">;
});
```

### schedule

Schedule an entry for future publishing.

```typescript
const entry = await cms.contentEntries.schedule(ctx, {
  id: Id<"content_entries">;
  scheduledPublishAt: number;      // Timestamp
});
```

### delete

Delete an entry.

```typescript
const entry = await cms.contentEntries.delete(ctx, {
  id: Id<"content_entries">;
  hardDelete?: boolean;
  reason?: string;                 // For audit log
});
```

### restore

Restore a soft-deleted entry.

```typescript
const entry = await cms.contentEntries.restore(ctx, {
  id: Id<"content_entries">;
});
```

### duplicate

Create a copy of an entry.

```typescript
const copy = await cms.contentEntries.duplicate(ctx, {
  id: Id<"content_entries">;
  slug?: string;                   // Custom slug for copy
});
```

### Query Builder

For complex queries, use the fluent query builder. See [Query Builder Guide](../guides/query-builder.md) for the complete API.

```typescript
const posts = await cms.contentEntries
  .query()
  .contentType("blog_post")
  .published()
  .where("featured", "eq", true)
  .orderBy("_creationTime", "desc")
  .limit(10)
  .execute(ctx);
```

### Bulk Operations

```typescript
// Publish multiple
const result = await cms.contentEntries.bulkPublish(ctx, {
  entryIds: Id<"content_entries">[];
});

// Unpublish multiple
const result = await cms.contentEntries.bulkUnpublish(ctx, {
  entryIds: Id<"content_entries">[];
});

// Delete multiple
const result = await cms.contentEntries.bulkDelete(ctx, {
  entryIds: Id<"content_entries">[];
  hardDelete?: boolean;
});

// Update multiple
const result = await cms.contentEntries.bulkUpdate(ctx, {
  entryIds: Id<"content_entries">[];
  data: Record<string, any>;       // Partial data to merge
});

// Restore multiple
const result = await cms.contentEntries.bulkRestore(ctx, {
  entryIds: Id<"content_entries">[];
});

// Result format:
// { succeeded: string[], failed: Array<{ id: string, error: string }> }
```

---

## Versions API

### list

List version history for an entry.

```typescript
const result = await cms.versions.list(ctx, {
  entryId: Id<"content_entries">;
  skip?: number;
  limit?: number;
});
```

### get

Get a specific version.

```typescript
const version = await cms.versions.get(ctx, {
  entryId: Id<"content_entries">;
  versionNumber: number;
});
```

### compare

Compare two versions.

```typescript
const diff = await cms.versions.compare(ctx, {
  entryId: Id<"content_entries">;
  v1: number;
  v2: number;
});
// Returns: { changes: FieldChange[] }
```

### rollback

Restore content from a previous version.

```typescript
const entry = await cms.versions.rollback(ctx, {
  entryId: Id<"content_entries">;
  versionNumber: number;
  reason?: string;
});
```

---

## Media Assets API

### create

Create a media asset record.

```typescript
const asset = await cms.mediaAssets.create(ctx, {
  storageId: Id<"_storage">;
  filename: string;
  mimeType: string;
  size: number;
  type: "image" | "video" | "audio" | "document" | "other";
  title?: string;
  description?: string;
  altText?: string;
  folderId?: Id<"media_folders">;
  tags?: string[];
  createdBy?: string;
});
```

### update

Update asset metadata.

```typescript
const asset = await cms.mediaAssets.update(ctx, {
  id: Id<"media_assets">;
  title?: string;
  description?: string;
  altText?: string;
  folderId?: Id<"media_folders">;
  tags?: string[];
});
```

### get

Get an asset with resolved URL.

```typescript
const asset = await cms.mediaAssets.get(ctx, id);
// Returns asset with `url` property
```

### list

List media assets.

```typescript
const result = await cms.mediaAssets.list(ctx, {
  folderId?: Id<"media_folders"> | null;  // null = root
  type?: "image" | "video" | "audio" | "document" | "other";
  search?: string;
  skip?: number;
  limit?: number;
});
```

### delete

Delete an asset.

```typescript
await cms.mediaAssets.delete(ctx, {
  id: Id<"media_assets">;
  hardDelete?: boolean;
});
```

### restore

Restore a soft-deleted asset.

```typescript
await cms.mediaAssets.restore(ctx, {
  id: Id<"media_assets">;
});
```

### generateUploadUrl

Generate URL for direct upload.

```typescript
const { uploadUrl, storageId } = await cms.mediaAssets.generateUploadUrl(ctx);
```

### findReferences

Find where an asset is used.

```typescript
const refs = await cms.mediaAssets.findReferences(ctx, {
  assetId: Id<"media_assets">;
});
// Returns: Array<{ entryId, entryTitle, fieldName }>
```

---

## Media Folders API

### create

```typescript
const folder = await cms.mediaFolders.create(ctx, {
  name: string;
  parentId?: Id<"media_folders">;
  description?: string;
});
```

### update

```typescript
const folder = await cms.mediaFolders.update(ctx, {
  id: Id<"media_folders">;
  name?: string;
  description?: string;
});
```

### get

```typescript
const folder = await cms.mediaFolders.get(ctx, id);
```

### list

```typescript
const folders = await cms.mediaFolders.list(ctx, {
  parentId?: Id<"media_folders"> | null;
});
```

### getByPath

```typescript
const folder = await cms.mediaFolders.getByPath(ctx, {
  path: string;  // e.g., "/Blog/2026"
});
```

### getFolderTree

Get flat list for building tree UI.

```typescript
const tree = await cms.mediaFolders.getFolderTree(ctx);
```

### move

Move folder to new parent.

```typescript
const folder = await cms.mediaFolders.move(ctx, {
  id: Id<"media_folders">;
  parentId?: Id<"media_folders"> | null;
});
```

### delete

```typescript
await cms.mediaFolders.delete(ctx, {
  id: Id<"media_folders">;
  recursive?: boolean;   // Delete contents
  hardDelete?: boolean;
});
```

---

## Media Variants API

### requestGeneration

Request a variant to be generated.

```typescript
await cms.mediaVariants.requestGeneration(ctx, {
  assetId: Id<"media_assets">;
  variantType: "thumbnail" | "responsive" | "format";
  width?: number;
  height?: number;
  format?: "webp" | "avif" | "jpeg" | "png";
  quality?: number;        // 1-100
  preset?: string;         // Named preset
});
```

### generateFromPresets

Generate multiple variants from presets.

```typescript
await cms.mediaVariants.generateFromPresets(ctx, {
  assetId: Id<"media_assets">;
  presets: string[];       // ["thumbnail", "medium", "large"]
});
```

### get

Get a variant with URL.

```typescript
const variant = await cms.mediaVariants.get(ctx, id);
```

### list

List variants for an asset.

```typescript
const variants = await cms.mediaVariants.list(ctx, {
  assetId: Id<"media_assets">;
  format?: "webp" | "avif" | "jpeg" | "png";
  type?: "thumbnail" | "responsive" | "format";
});
```

### getBestVariant

Get optimal variant for target size.

```typescript
const variant = await cms.mediaVariants.getBestVariant(ctx, {
  assetId: Id<"media_assets">;
  targetWidth?: number;
  targetHeight?: number;
});
```

### getResponsiveSrcset

Get srcset string for responsive images.

```typescript
const { src, srcset } = await cms.mediaVariants.getResponsiveSrcset(ctx, {
  assetId: Id<"media_assets">;
  format: "webp" | "avif" | "jpeg" | "png";
  sizes?: number[];        // [400, 800, 1200, 1600]
});
```

### updateStatus

Update variant processing status.

```typescript
await cms.mediaVariants.updateStatus(ctx, {
  id: Id<"media_variants">;
  status: "pending" | "processing" | "completed" | "failed";
  errorMessage?: string;
});
```

---

## Locale API

The locale API provides configuration and resolution utilities for multi-locale content.

### getConfig

Get the full locale configuration.

```typescript
const config = cms.locale.getConfig();
// Returns: {
//   defaultLocale: string;
//   supportedLocales: string[];
//   fallbackChains: Record<string, string[]>;
//   autoGenerateFallbacks: boolean;
// }
```

### getFallbackChain

Get the fallback chain for a specific locale.

```typescript
const chain = cms.locale.getFallbackChain("es-MX");
// Returns: ["es-ES", "es", "en"]
```

### resolve

Resolve a locale with full metadata.

```typescript
const resolved = cms.locale.resolve("es-MX");
// Returns: {
//   requestedLocale: "es-MX",
//   fallbackChain: ["es-MX", "es-ES", "es", "en"],
//   isSupported: true,
//   ...
// }
```

---

## Permission Checking

### hasPermissionForUser

Check if user has a permission.

```typescript
const allowed = await cms.hasPermissionForUser(userId, {
  resource: "contentEntries";
  action: "publish";
  scope?: "all" | "own";
});
```

### hasContentTypePermissionForUser

Check permission for specific content type.

```typescript
const allowed = await cms.hasContentTypePermissionForUser(
  userId,
  { resource: "contentEntries", action: "update" },
  "blog_post"  // Content type name
);
```

---

## Types

### ContentType

```typescript
interface ContentType {
  _id: Id<"content_types">;
  name: string;
  displayName: string;
  description?: string;
  fields: FieldDefinition[];
  icon?: string;
  singleton: boolean;
  slugField?: string;
  titleField?: string;
  sortOrder: number;
  isActive: boolean;
  deletedAt?: number;
  createdBy?: string;
  updatedBy?: string;
  _creationTime: number;
}
```

### ContentEntry

```typescript
interface ContentEntry {
  _id: Id<"content_entries">;
  contentTypeId: Id<"content_types">;
  slug: string;
  status: "draft" | "published" | "scheduled" | "archived";
  data: Record<string, any>;
  locale: string;
  primaryEntryId?: Id<"content_entries">;
  version: number;
  scheduledPublishAt?: number;
  firstPublishedAt?: number;
  lastPublishedAt?: number;
  lockedBy?: string;
  lockExpiresAt?: number;
  deletedAt?: number;
  createdBy?: string;
  updatedBy?: string;
  _creationTime: number;
}
```

### MediaAsset

```typescript
interface MediaAsset {
  _id: Id<"media_assets">;
  storageId: Id<"_storage">;
  filename: string;
  mimeType: string;
  size: number;
  type: "image" | "video" | "audio" | "document" | "other";
  title?: string;
  description?: string;
  altText?: string;
  folderId?: Id<"media_folders">;
  width?: number;
  height?: number;
  duration?: number;
  metadata?: Record<string, any>;
  tags?: string[];
  url?: string;            // Resolved URL (in query results)
  deletedAt?: number;
  createdBy?: string;
  _creationTime: number;
}
```

---

See also:
- [Query Builder Guide](../guides/query-builder.md) for fluent API queries
- [Code-First Schema](./code-first-schema.md) for TypeScript-first content types
- [Taxonomies Guide](../guides/taxonomies.md) for categories, tags, and organization
- [Agent Tools Guide](../guides/agent-tools.md) for AI agent integration
- [Content Locking Guide](../guides/content-locking.md) for concurrent edit prevention
- [Field Types Reference](./field-types.md) for all 13 field types
- [Configuration Reference](./configuration.md) for all config options
