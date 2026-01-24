# Admin API Reference

The Admin API provides backend functions for the CMS Admin UI. Use `defineAdminAPI` to create these functions in your Convex app.

## Overview

```typescript
// convex/admin.ts
import { defineAdminAPI } from "convex-cms";
import { components } from "./_generated/api";

export const {
  listContentTypes,
  getContentType,
  createContentType,
  // ... all other functions
} = defineAdminAPI(components.convexCms, {
  auth: async (ctx, operation) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return identity.subject;
  },
});
```

## How It Works

```
┌─────────────────────────┐      ┌─────────────────────────────┐
│   CLI Mode              │      │   Embed Mode                │
│   npx convex-cms admin  │      │   <CmsAdmin />              │
└────────────┬────────────┘      └──────────────┬──────────────┘
             │                                   │
             │  Calls functions by name:         │
             │  api.admin.listContentTypes       │
             │  api.admin.getEntry               │
             │  api.admin.publishEntry           │
             └───────────────┬───────────────────┘
                             ▼
              ┌──────────────────────────────┐
              │  Your convex/admin.ts        │
              │  defineAdminAPI() exports    │
              │                              │
              │  Must export these exact     │
              │  function names for the      │
              │  Admin UI to work            │
              └──────────────────────────────┘
```

The Admin UI (both CLI and embed modes) calls functions by their exported names. Your `convex/admin.ts` must export the exact function names listed below.

## Authentication

The `auth` callback is called before every operation:

```typescript
interface AdminApiOptions {
  auth?: (
    ctx: { auth: Auth },
    operation: AdminOperation
  ) => Promise<string | null>;
}
```

**Parameters:**
- `ctx.auth` — Convex auth context (use `ctx.auth.getUserIdentity()`)
- `operation` — Describes what operation is being attempted

**Returns:**
- User ID string if authenticated
- `null` for anonymous access
- Throw to deny access

### Operation Types

The `operation` parameter is a discriminated union with the operation type and relevant IDs:

```typescript
type AdminOperation =
  // Content Types
  | { type: "listContentTypes" }
  | { type: "getContentType"; id: string }
  | { type: "createContentType" }
  | { type: "updateContentType"; id: string }
  | { type: "deleteContentType"; id: string }
  // Entries
  | { type: "listEntries"; contentTypeId: string }
  | { type: "getEntry"; id: string }
  | { type: "createEntry"; contentTypeId: string }
  | { type: "updateEntry"; id: string }
  | { type: "publishEntry"; id: string }
  | { type: "unpublishEntry"; id: string }
  | { type: "deleteEntry"; id: string }
  | { type: "duplicateEntry"; id: string }
  | { type: "scheduleEntry"; id: string }
  | { type: "cancelScheduledEntry"; id: string }
  | { type: "getScheduledEntries" }
  // Media Assets
  | { type: "listMediaAssets" }
  | { type: "getMediaAsset"; id: string }
  | { type: "createMediaAsset" }
  | { type: "updateMediaAsset"; id: string }
  | { type: "deleteMediaAsset"; id: string }
  | { type: "restoreMediaAsset"; id: string }
  | { type: "moveMediaAssets" }
  // Media Folders
  | { type: "listMediaFolders" }
  | { type: "getMediaFolder"; id: string }
  | { type: "getMediaFolderTree" }
  | { type: "createMediaFolder" }
  | { type: "updateMediaFolder"; id: string }
  | { type: "moveMediaFolder"; id: string }
  | { type: "deleteMediaFolder"; id: string }
  | { type: "restoreMediaFolder"; id: string }
  // Upload
  | { type: "generateUploadUrl" }
  // Stats
  | { type: "getDashboardStats" };
```

### Fine-Grained Access Control

```typescript
auth: async (ctx, operation) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  // Check operation type for fine-grained control
  if (operation.type === "deleteContentType") {
    const isAdmin = await checkIsAdmin(identity.subject);
    if (!isAdmin) throw new Error("Only admins can delete content types");
  }

  return identity.subject;
}
```

---

## Function Reference

### Content Types

| Function | Type | Description |
|----------|------|-------------|
| `listContentTypes` | Query | List all content types |
| `getContentType` | Query | Get a content type by ID or name |
| `createContentType` | Mutation | Create a new content type |
| `updateContentType` | Mutation | Update a content type |
| `deleteContentType` | Mutation | Delete a content type |

### Content Entries

| Function | Type | Description |
|----------|------|-------------|
| `listEntries` | Query | List entries with filtering and pagination |
| `getEntry` | Query | Get a single entry by ID |
| `getEntryBySlug` | Query | Get an entry by slug |
| `getEntryBySlugAndTypeName` | Query | Get an entry by slug and content type name |
| `createEntry` | Mutation | Create a new entry (draft status) |
| `updateEntry` | Mutation | Update entry data |
| `publishEntry` | Mutation | Publish an entry |
| `unpublishEntry` | Mutation | Unpublish an entry |
| `deleteEntry` | Mutation | Soft delete an entry |
| `restoreEntry` | Mutation | Restore a deleted entry |
| `duplicateEntry` | Mutation | Duplicate an entry |
| `scheduleEntry` | Mutation | Schedule future publication |
| `cancelScheduledEntry` | Mutation | Cancel scheduled publication |
| `getScheduledEntries` | Query | List entries with scheduled publication |

### Media Assets

| Function | Type | Description |
|----------|------|-------------|
| `listMediaAssets` | Query | List media assets |
| `getMediaAsset` | Query | Get a media asset by ID |
| `createMediaAsset` | Mutation | Create a media asset record |
| `updateMediaAsset` | Mutation | Update media metadata |
| `deleteMediaAsset` | Mutation | Soft delete a media asset |
| `restoreMediaAsset` | Mutation | Restore a deleted asset |
| `permanentDeleteMediaAsset` | Mutation | Permanently delete an asset |
| `bulkPermanentDeleteMediaAssets` | Mutation | Permanently delete multiple assets |
| `moveMediaAssets` | Mutation | Move assets to a folder |
| `getMediaTrashCount` | Query | Count of deleted media assets |
| `generateUploadUrl` | Mutation | Get a URL for uploading files |

### Media Folders

| Function | Type | Description |
|----------|------|-------------|
| `listMediaFolders` | Query | List folders |
| `getMediaFolder` | Query | Get a folder by ID |
| `getMediaFolderTree` | Query | Get nested folder tree |
| `createMediaFolder` | Mutation | Create a folder |
| `updateMediaFolder` | Mutation | Update folder name/metadata |
| `moveMediaFolder` | Mutation | Move folder to new parent |
| `deleteMediaFolder` | Mutation | Soft delete a folder |
| `restoreMediaFolder` | Mutation | Restore a deleted folder |

### Media Variants

| Function | Type | Description |
|----------|------|-------------|
| `listMediaVariants` | Query | List variants for an asset |
| `getMediaVariant` | Query | Get a specific variant |
| `getBestMediaVariant` | Query | Get best variant for given dimensions |
| `getMediaResponsiveSrcset` | Query | Get srcset for responsive images |
| `getMediaVariantPresets` | Query | List available variant presets |
| `getMediaAssetWithVariants` | Query | Get asset with all variants |
| `createMediaVariant` | Mutation | Create a variant manually |
| `requestMediaVariantGeneration` | Mutation | Request variant generation |
| `deleteMediaVariant` | Mutation | Delete a variant |
| `deleteMediaAssetVariants` | Mutation | Delete all variants for an asset |
| `generateMediaVariantsFromPresets` | Mutation | Generate variants from presets |
| `restoreMediaVariant` | Mutation | Restore a deleted variant |

### Taxonomies

| Function | Type | Description |
|----------|------|-------------|
| `listTaxonomies` | Query | List all taxonomies |
| `getTaxonomy` | Query | Get a taxonomy by ID |
| `createTaxonomy` | Mutation | Create a taxonomy |
| `updateTaxonomy` | Mutation | Update a taxonomy |
| `deleteTaxonomy` | Mutation | Delete a taxonomy |
| `restoreTaxonomy` | Mutation | Restore a deleted taxonomy |

### Taxonomy Terms

| Function | Type | Description |
|----------|------|-------------|
| `listTerms` | Query | List terms in a taxonomy |
| `getTerm` | Query | Get a term by ID |
| `getTermsHierarchy` | Query | Get hierarchical term tree |
| `suggestTerms` | Query | Autocomplete term suggestions |
| `countTerms` | Query | Count terms in a taxonomy |
| `createTerm` | Mutation | Create a term |
| `updateTerm` | Mutation | Update a term |
| `deleteTerm` | Mutation | Delete a term |
| `restoreTerm` | Mutation | Restore a deleted term |

### Term Associations (Entries)

| Function | Type | Description |
|----------|------|-------------|
| `getTermsByEntry` | Query | Get terms for an entry |
| `getEntriesByTerm` | Query | Get entries with a term |
| `setEntryTerms` | Mutation | Set all terms for an entry |
| `addTermToEntry` | Mutation | Add a term to an entry |
| `removeTermFromEntry` | Mutation | Remove a term from an entry |
| `createTermAndAddToEntry` | Mutation | Create term and associate |

### Term Associations (Media)

| Function | Type | Description |
|----------|------|-------------|
| `getTermsByMedia` | Query | Get terms for a media asset |
| `getMediaByTerm` | Query | Get media assets with a term |
| `setMediaTerms` | Mutation | Set all terms for a media asset |
| `addTermToMedia` | Mutation | Add a term to a media asset |
| `removeTermFromMedia` | Mutation | Remove a term from a media asset |
| `createTermAndAddToMedia` | Mutation | Create term and associate |

### Trash

| Function | Type | Description |
|----------|------|-------------|
| `listTrash` | Query | List deleted items |
| `getTrashConfig` | Query | Get trash retention config |
| `getTrashStats` | Query | Get trash statistics |
| `updateTrashConfig` | Mutation | Update retention settings |
| `emptyTrash` | Mutation | Permanently delete all trash |
| `runTrashCleanup` | Mutation | Run cleanup for expired items |

### Versions

| Function | Type | Description |
|----------|------|-------------|
| `getVersionHistory` | Query | Get version history for an entry |
| `getVersion` | Query | Get a specific version |
| `compareVersions` | Query | Compare two versions |
| `rollbackVersion` | Mutation | Restore from a version |

### Bulk Operations

| Function | Type | Description |
|----------|------|-------------|
| `bulkPublish` | Mutation | Publish multiple entries |
| `bulkUnpublish` | Mutation | Unpublish multiple entries |
| `bulkDelete` | Mutation | Delete multiple entries |
| `bulkUpdate` | Mutation | Update multiple entries |
| `bulkRestore` | Mutation | Restore multiple entries |

### Content Locking

| Function | Type | Description |
|----------|------|-------------|
| `checkContentLock` | Query | Check if content is locked |
| `listLockedContent` | Query | List all locked content |
| `acquireContentLock` | Mutation | Lock content for editing |
| `releaseContentLock` | Mutation | Release a lock |
| `renewContentLock` | Mutation | Extend lock duration |
| `forceReleaseContentLock` | Mutation | Force-release another user's lock |

### Settings

| Function | Type | Description |
|----------|------|-------------|
| `getSettings` | Query | Get CMS settings |
| `updateSettings` | Mutation | Update settings |
| `resetSettings` | Mutation | Reset to defaults |

### Dashboard

| Function | Type | Description |
|----------|------|-------------|
| `getDashboardStats` | Query | Get dashboard statistics |

---

## Complete Export Example

For reference, here's the complete list of exports your `convex/admin.ts` should have:

```typescript
import { defineAdminAPI } from "convex-cms";
import { components } from "./_generated/api";

export const {
  // Content Types
  listContentTypes,
  getContentType,
  createContentType,
  updateContentType,
  deleteContentType,

  // Entries
  listEntries,
  getEntry,
  getEntryBySlug,
  getEntryBySlugAndTypeName,
  createEntry,
  updateEntry,
  publishEntry,
  unpublishEntry,
  deleteEntry,
  restoreEntry,
  duplicateEntry,
  scheduleEntry,
  cancelScheduledEntry,
  getScheduledEntries,

  // Media Assets
  listMediaAssets,
  getMediaAsset,
  createMediaAsset,
  updateMediaAsset,
  deleteMediaAsset,
  restoreMediaAsset,
  permanentDeleteMediaAsset,
  bulkPermanentDeleteMediaAssets,
  moveMediaAssets,
  getMediaTrashCount,
  generateUploadUrl,

  // Media Folders
  listMediaFolders,
  getMediaFolder,
  getMediaFolderTree,
  createMediaFolder,
  updateMediaFolder,
  moveMediaFolder,
  deleteMediaFolder,
  restoreMediaFolder,

  // Media Variants
  listMediaVariants,
  getMediaVariant,
  getBestMediaVariant,
  getMediaResponsiveSrcset,
  getMediaVariantPresets,
  getMediaAssetWithVariants,
  createMediaVariant,
  requestMediaVariantGeneration,
  deleteMediaVariant,
  deleteMediaAssetVariants,
  generateMediaVariantsFromPresets,
  restoreMediaVariant,

  // Taxonomies
  listTaxonomies,
  getTaxonomy,
  createTaxonomy,
  updateTaxonomy,
  deleteTaxonomy,
  restoreTaxonomy,

  // Terms
  listTerms,
  getTerm,
  getTermsHierarchy,
  suggestTerms,
  countTerms,
  createTerm,
  updateTerm,
  deleteTerm,
  restoreTerm,

  // Term-Entry Associations
  getTermsByEntry,
  getEntriesByTerm,
  setEntryTerms,
  addTermToEntry,
  removeTermFromEntry,
  createTermAndAddToEntry,

  // Term-Media Associations
  getTermsByMedia,
  getMediaByTerm,
  setMediaTerms,
  addTermToMedia,
  removeTermFromMedia,
  createTermAndAddToMedia,

  // Trash
  listTrash,
  getTrashConfig,
  getTrashStats,
  updateTrashConfig,
  emptyTrash,
  runTrashCleanup,

  // Versions
  getVersionHistory,
  getVersion,
  compareVersions,
  rollbackVersion,

  // Bulk Operations
  bulkPublish,
  bulkUnpublish,
  bulkDelete,
  bulkUpdate,
  bulkRestore,

  // Content Locking
  checkContentLock,
  listLockedContent,
  acquireContentLock,
  releaseContentLock,
  renewContentLock,
  forceReleaseContentLock,

  // Settings
  getSettings,
  updateSettings,
  resetSettings,

  // Dashboard
  getDashboardStats,
} = defineAdminAPI(components.convexCms);
```

---

## See Also

- [Admin UI Setup](../guides/admin-ui-setup.md) — CLI and embed modes
- [Authorization](../guides/authorization.md) — RBAC and custom roles
- [Client API](./client-api.md) — `createCmsClient` for custom functions
