# Convex CMS Component: Comprehensive Validation and Learning Guide

This guide provides a systematic approach to understanding and validating every feature of the `@convex-cms/core` component. Use it to explore the codebase, understand how each feature works, and manually validate that everything functions correctly.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema & Data Models](#2-database-schema--data-models)
3. [Content Types System](#3-content-types-system)
4. [Content Entries](#4-content-entries)
5. [Field Type System](#5-field-type-system)
6. [Publishing Workflow](#6-publishing-workflow)
7. [Versioning System](#7-versioning-system)
8. [Content Locking](#8-content-locking)
9. [Media Management](#9-media-management)
10. [Media Variants](#10-media-variants)
11. [Localization](#11-localization)
12. [Authorization (RBAC)](#12-authorization-rbac)
13. [Taxonomies & Tagging](#13-taxonomies--tagging)
14. [Bulk Operations](#14-bulk-operations)
15. [Event System](#15-event-system)
16. [Audit Logging](#16-audit-logging)
17. [Webhooks](#17-webhooks)
18. [Trash & Soft Delete](#18-trash--soft-delete)
19. [Content Migration](#19-content-migration)
20. [Export/Import](#20-exportimport)
21. [Query Builder](#21-query-builder)
22. [Client Wrapper](#22-client-wrapper)
23. [Admin UI](#23-admin-ui)
24. [Edge Cases & Limitations](#24-edge-cases--limitations)
25. [Potential Improvements](#25-potential-improvements)

---

## 1. Architecture Overview

### How It Works

The CMS is built as a **Convex Component** - a sandboxed module with its own isolated database tables. This means:

- **Isolation**: The component cannot access the parent app's database or auth
- **Integration**: Parent apps "install" the component via `convex.config.ts`
- **Communication**: All interaction happens through the typed client wrapper

### Key Files to Read

| File | Purpose |
|------|---------|
| `src/component/convex.config.ts` | Component definition |
| `src/component/schema.ts` | All database tables and indexes |
| `src/client/wrapper.ts` | Client API implementation |
| `example/convex/convex.config.ts` | How to install the component |
| `example/convex/cms.ts` | How to configure the client |

### What to Check

1. **Component Registration**
   - Open `example/convex/convex.config.ts`
   - Verify the component is registered with `app.use(convexCms)`
   - Note: No configuration options in the component definition itself

2. **Client Configuration**
   - Open `example/convex/cms.ts`
   - Look for `createCmsClient()` call
   - Check the configuration options: `defaultLocale`, `features`, `getUserRole`, `authorizationHooks`

3. **API Access**
   - Functions are exposed via the generated API object
   - Parent app calls component functions through the client wrapper

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       Parent Application                         │
│  ┌──────────────┐  ┌──────────────────────┐  ┌───────────────┐ │
│  │ convex.config│→ │ CMS Client (wrapper) │→ │ Your Queries  │ │
│  └──────────────┘  └──────────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Convex CMS Component                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │ Mutations  │  │  Queries   │  │  Actions   │  │  Schema   │ │
│  │ (CRUD ops) │  │ (read ops) │  │(webhooks,  │  │ (9 tables)│ │
│  │            │  │            │  │ variants)  │  │           │ │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
│                         │                                        │
│                    Isolated Database                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema & Data Models

### Tables Overview

The component defines **9 tables** in `src/component/schema.ts`:

| Table | Purpose | Lines |
|-------|---------|-------|
| `contentTypes` | Schema definitions | 21-37 |
| `contentEntries` | Content instances | 39-73 |
| `contentVersions` | Version history | 75-95 |
| `mediaItems` | Files and folders | 97-138 |
| `mediaVariants` | Optimized media | 140-165 |
| `taxonomies` | Classification systems | 167-180 |
| `taxonomyTerms` | Terms within taxonomies | 182-200 |
| `contentEntryTags` | Entry-term relationships | 202-212 |
| `cmsEvents` | Event stream | 214-232 |
| `auditLogs` | Audit trail | 234-260 |
| `webhookConfigs` | Webhook settings | 262-280 |
| `webhookDeliveries` | Webhook delivery log | 282-305 |
| `trashConfig` | Soft delete settings | 307-315 |

### What to Check

1. **Index Design**
   - Every query field should have an index
   - Look for `index()` definitions in schema
   - Verify queries use indexes (see `contentEntries.ts` query functions)

2. **Search Index**
   - `contentEntries` has a search index for full-text search
   - Fields: `title`, `slug`, `searchableContent`
   - Check `contentEntriesQueries.ts:list()` for search implementation

3. **Relationships**
   - No foreign key constraints (Convex doesn't support them)
   - Relationships maintained by storing IDs
   - Reference integrity is application-level

### Code to Read

```typescript
// src/component/schema.ts - Key excerpts

// Content entry table with all indexes
contentEntries: defineTable({
  contentTypeId: v.id("contentTypes"),
  title: v.string(),
  slug: v.string(),
  status: v.union(
    v.literal("draft"),
    v.literal("published"),
    v.literal("archived"),
    v.literal("scheduled")
  ),
  // ... more fields
})
  .index("by_content_type", ["contentTypeId"])
  .index("by_status", ["status"])
  .index("by_locale", ["locale"])
  .index("by_scheduled_publish", ["scheduledPublishAt"])
  .searchIndex("search", {
    searchField: "searchableContent",
    filterFields: ["contentTypeId", "status", "locale"],
  }),
```

---

## 3. Content Types System

### How It Works

Content types define the schema for content entries. Each content type:
- Has a unique `name` (slug-style, e.g., `blog_post`)
- Contains a list of `fields` with their definitions
- Can be active or inactive

### Key Files

| File | Purpose |
|------|---------|
| `src/component/contentTypesMutations.ts` | CRUD operations |
| `src/component/contentTypesQueries.ts` | Read operations |
| `src/component/lib/fieldDefinitions.ts` | Field type definitions |

### What to Check

1. **Create Content Type**
   ```typescript
   // Example from tests
   await cms.contentTypes.create(ctx, {
     name: "blog_post",
     displayName: "Blog Post",
     description: "Blog articles",
     fields: [
       { name: "title", type: "text", required: true },
       { name: "body", type: "richText" },
       { name: "publishDate", type: "date" }
     ]
   });
   ```

2. **Validation Points**
   - Name must be unique (check `contentTypesMutations.ts:25-35`)
   - Name format validated (slug-style)
   - Field names must be unique within a content type
   - Cannot delete content type with existing entries (without `force`)

3. **Field Definition Structure**
   ```typescript
   // src/component/lib/fieldDefinitions.ts
   {
     name: string;      // Field identifier
     type: FieldType;   // One of 13 types
     label?: string;    // Display label
     required?: boolean;
     searchable?: boolean;
     localized?: boolean;
     options?: object;  // Type-specific options
   }
   ```

### Tests to Review

- `src/component/contentTypes.test.ts` - Full CRUD testing
- Look for edge cases: duplicate names, special characters, empty fields array

---

## 4. Content Entries

### How It Works

Content entries are instances of content types. Each entry:
- Belongs to exactly one content type
- Has a unique slug within that content type
- Has a status (draft, published, archived, scheduled)
- Contains field data matching the content type's schema

### Key Files

| File | Purpose |
|------|---------|
| `src/component/contentEntriesMutations.ts` | Create, update, delete |
| `src/component/contentEntriesQueries.ts` | Get, list, search |
| `src/component/contentEntryValidation.ts` | Field validation |

### What to Check

1. **Create Entry Flow**
   - Open `contentEntriesMutations.ts:createEntry`
   - Follow the flow: validate content type → generate slug → validate data → create

2. **Slug Generation**
   - Automatic slug generation from title
   - Auto-increment on collision (`my-post` → `my-post-1`)
   - Check `src/component/lib/slugUtils.ts`

3. **Field Data Validation**
   - Required fields must be present
   - Field types must match definition
   - Reference fields must point to valid entries
   - Check `contentEntryValidation.ts:validateEntry`

4. **Status Transitions**
   ```
   draft ──────→ published ──────→ archived
     │              │                  │
     │              ▼                  │
     └────────→ scheduled ←───────────┘
   ```

### Validation Checklist

- [ ] Create entry with all field types
- [ ] Create entry with required field missing (should fail)
- [ ] Create entry with invalid field type (should fail)
- [ ] Create duplicate slug (should auto-increment)
- [ ] Update entry and verify version increments
- [ ] Delete entry and verify it moves to trash

---

## 5. Field Type System

### Supported Types (13)

| Type | Validator | Purpose |
|------|-----------|---------|
| `text` | `v.string()` | Single-line text |
| `richText` | `v.string()` | Markdown/HTML |
| `number` | `v.number()` | Numeric values |
| `boolean` | `v.boolean()` | True/false |
| `date` | `v.string()` | Date only |
| `datetime` | `v.string()` | Date + time |
| `select` | `v.string()` | Single choice |
| `multiSelect` | `v.array(v.string())` | Multiple choices |
| `reference` | `v.id("contentEntries")` | Entry reference |
| `media` | `v.id("mediaItems")` | Media reference |
| `tags` | `v.array(v.string())` | Tag array |
| `category` | `v.string()` | Single category |
| `json` | `v.any()` | Custom JSON |

### Key Files

| File | Purpose |
|------|---------|
| `src/component/validators.ts` | Field type validators (L100-300) |
| `src/component/lib/fieldDefinitions.ts` | Field definition types |
| `admin/src/components/FieldRenderer.tsx` | UI rendering |

### What to Check

1. **Text Field Options**
   ```typescript
   {
     name: "title",
     type: "text",
     options: {
       placeholder: "Enter title...",
       maxLength: 200
     }
   }
   ```

2. **Select/MultiSelect Options**
   ```typescript
   {
     name: "status",
     type: "select",
     options: {
       choices: ["draft", "review", "published"]
     }
   }
   ```

3. **Reference Field Options**
   ```typescript
   {
     name: "author",
     type: "reference",
     options: {
       allowedContentTypes: ["author", "contributor"]
     }
   }
   ```

### Validation Checklist

For each field type, verify:
- [ ] Can create entry with valid value
- [ ] Rejects invalid value types
- [ ] Respects `required` flag
- [ ] Works with `localized: true`
- [ ] Search works when `searchable: true`

---

## 6. Publishing Workflow

### How It Works

Entries follow a publishing workflow:
1. Created as `draft`
2. Can be `published` (immediate) or `scheduled` (future)
3. Published entries can be `archived`
4. Any state can return to `draft`

### Key Files

| File | Purpose |
|------|---------|
| `src/component/contentEntriesMutations.ts` | `publishEntry`, `unpublishEntry` |
| `src/component/scheduledPublish.ts` | Scheduled publishing |

### What to Check

1. **Immediate Publishing**
   - Open `contentEntriesMutations.ts:publishEntry`
   - Creates version snapshot before publishing
   - Updates status to "published"
   - Sets `publishedAt` timestamp

2. **Scheduled Publishing**
   - Open `scheduledPublish.ts`
   - Uses Convex `scheduler.runAt()`
   - Minimum 60 seconds in future (L91)
   - Race condition handling via `expectedPublishAt` check (L105-110)

3. **Unpublishing**
   - Resets status to "draft"
   - Clears `publishedAt`
   - Creates version snapshot

### Validation Checklist

- [ ] Publish draft entry → status becomes "published"
- [ ] Schedule entry for future → status becomes "scheduled"
- [ ] Scheduled entry publishes at correct time
- [ ] Reschedule entry → old schedule cancelled
- [ ] Unpublish → status becomes "draft"
- [ ] Archive published entry → status becomes "archived"

### Edge Cases to Test

- Schedule for exactly 60 seconds in future (minimum)
- Schedule for 1 second in future (should fail)
- Delete scheduled entry (scheduled job should be orphaned but skip)
- Reschedule while scheduled job is executing

---

## 7. Versioning System

### How It Works

Every content change creates a version snapshot:
- Stores complete field data before change
- Tracks version number (auto-incrementing)
- Records who made the change and why
- Supports rollback to any previous version

### Key Files

| File | Purpose |
|------|---------|
| `src/component/versionMutations.ts` | `createVersionSnapshot`, `rollback` |
| `src/component/versionQueries.ts` | `getVersionHistory`, `compareVersions` |

### What to Check

1. **Version Creation**
   - Open `versionMutations.ts:createVersionSnapshot`
   - Stores `previousData` and `newData`
   - Increments version number
   - Records `changedBy` user

2. **Version Structure**
   ```typescript
   {
     entryId: Id<"contentEntries">,
     versionNumber: number,
     previousData: object,  // Fields before change
     newData: object,       // Fields after change
     changedBy: string,
     changeDescription?: string,
     publishedVersion: boolean,
     _creationTime: number
   }
   ```

3. **Rollback Mechanism**
   - Restores `previousData` from selected version
   - Creates new version snapshot (for audit trail)
   - Does NOT delete versions

4. **Version Comparison**
   - `compareVersions(v1, v2)` shows field-level diffs
   - Identifies added, removed, changed fields

### Validation Checklist

- [ ] Update entry → new version created
- [ ] Version number increments correctly
- [ ] Rollback restores previous data
- [ ] Rollback creates new version (audit trail)
- [ ] Version history shows all changes
- [ ] Compare versions shows correct diffs

---

## 8. Content Locking

### How It Works

Optimistic locking prevents concurrent edit conflicts:
- User acquires lock before editing
- Lock has expiration time (default 30 minutes, max 4 hours)
- Other users see "locked by [user]" warning
- Lock auto-expires or can be manually released

### Key Files

| File | Purpose |
|------|---------|
| `src/component/contentLock.ts` | All lock operations |

### What to Check

1. **Lock Acquisition**
   - Open `contentLock.ts:acquireLock`
   - Checks for existing active lock
   - Creates lock with expiration
   - Returns lock token

2. **Lock Constraints**
   ```typescript
   DEFAULT_LOCK_DURATION_MS = 30 * 60 * 1000  // 30 minutes
   MAX_LOCK_DURATION_MS = 4 * 60 * 60 * 1000  // 4 hours
   ```

3. **Lock Release**
   - Manual release via `releaseLock`
   - Force release via `forceReleaseLock` (admin only)
   - Auto-expire after duration

4. **Lock Renewal**
   - `renewLock` extends expiration
   - Requires valid lock token

### Validation Checklist

- [ ] Acquire lock → lock active for entry
- [ ] Second user cannot acquire lock
- [ ] Release lock → entry unlocked
- [ ] Lock expires after duration
- [ ] Renew lock extends expiration
- [ ] Force release works for admins

### Edge Cases

- User loses connection (lock persists until expiry)
- Lock renewal while lock is expiring
- Multiple force-release attempts

---

## 9. Media Management

### How It Works

Media management uses a unified model for files and folders:
- `mediaItems` table stores both with `kind` discriminator
- Files (`kind: "asset"`) have storage ID, MIME type, size
- Folders (`kind: "folder"`) have parent reference for nesting
- Path-based organization with breadcrumb support

### Key Files

| File | Purpose |
|------|---------|
| `src/component/schema.ts` | `mediaItems` table (L97-138) |
| `src/component/mediaAssetMutations.ts` | File operations |
| `src/component/mediaFolderMutations.ts` | Folder operations |
| `src/component/mediaAssetQueries.ts` | File queries |
| `src/component/mediaFolderQueries.ts` | Folder queries |

### What to Check

1. **File Upload Flow**
   - `generateUploadUrl()` → get presigned URL
   - Upload file to URL
   - `createMediaAsset()` with storage ID

2. **Folder Structure**
   ```
   /                       (root)
   ├── images/
   │   ├── blog/
   │   └── products/
   └── documents/
   ```

3. **Folder Constraints**
   ```typescript
   MAX_FOLDER_DEPTH = 10
   MAX_PATH_LENGTH = 500
   MAX_FOLDER_NAME_LENGTH = 255
   ```

4. **Asset Metadata**
   ```typescript
   {
     kind: "asset",
     name: "photo.jpg",
     storageId: Id<"_storage">,
     mimeType: "image/jpeg",
     size: 1024000,
     metadata: {
       width: 1920,
       height: 1080,
       altText: "Description"
     }
   }
   ```

### Validation Checklist

- [ ] Generate upload URL
- [ ] Create asset after upload
- [ ] Create folder
- [ ] Nest folders (up to 10 levels)
- [ ] Move asset to folder
- [ ] Move folder (cascades to children)
- [ ] Delete folder (requires empty or force)
- [ ] Get folder tree (breadcrumbs)

---

## 10. Media Variants

### How It Works

Media variants are optimized versions of assets:
- Thumbnails, responsive sizes, format conversions
- Generated on-demand or via presets
- Status tracking: pending → processing → completed/failed

### Key Files

| File | Purpose |
|------|---------|
| `src/component/mediaVariants.ts` | Variant operations |
| `src/component/schema.ts` | `mediaVariants` table (L140-165) |

### What to Check

1. **Variant Structure**
   ```typescript
   {
     assetId: Id<"mediaItems">,
     preset: string,           // e.g., "thumbnail", "responsive-800"
     width: number,
     height: number,
     format: "webp" | "avif" | "jpeg" | "png",
     storageId?: Id<"_storage">,
     status: "pending" | "processing" | "completed" | "failed",
     size?: number
   }
   ```

2. **Preset System**
   ```typescript
   // Built-in presets
   thumbnail: { width: 200, height: 200 }
   responsive-400: { width: 400 }
   responsive-800: { width: 800 }
   responsive-1200: { width: 1200 }
   format-webp: { format: "webp" }
   format-avif: { format: "avif" }
   ```

3. **Best Variant Selection**
   - `getBestVariant(assetId, { width, format })`
   - Scoring algorithm favors smaller sizes that meet requirements
   - No upscaling preference (picks closest larger variant)

4. **Responsive Srcset**
   - `getResponsiveSrcset(assetId)` returns srcset string
   - For `<img srcset="...">` attribute

### Validation Checklist

- [ ] Request variant generation
- [ ] Variant status transitions correctly
- [ ] getBestVariant returns appropriate variant
- [ ] getResponsiveSrcset generates valid srcset
- [ ] Failed variants can be retried (by recreating)

### Edge Cases

- Variant for non-image asset
- Multiple variants requested simultaneously
- Asset deleted while variant processing

---

## 11. Localization

### How It Works

The localization system supports:
- Per-field localization (not all fields need to be localized)
- Fallback chains (e.g., es-MX → es-ES → en-US)
- BCP 47 compliance (automatic hierarchy inference)
- Primary entry + locale variants pattern

### Key Files

| File | Purpose |
|------|---------|
| `src/component/lib/localeFallbackChain.ts` | Fallback resolution |
| `src/component/localeQueries.ts` | Locale-aware queries |
| `src/client/wrapper.ts` | Client-side locale handling |

### What to Check

1. **Client Configuration**
   ```typescript
   createCmsClient(component, {
     defaultLocale: "en-US",
     features: { localization: true },
     // Custom fallback chains
     localeFallbacks: {
       "es-MX": ["es-ES", "en-US"],
       "fr-CA": ["fr-FR", "en-US"]
     }
   });
   ```

2. **Auto-Generated Fallbacks**
   - `es-MX` → `es` → default
   - Based on BCP 47 hierarchy

3. **Entry Variants**
   ```typescript
   // Primary entry (en-US)
   { id: "entry1", locale: "en-US", primaryEntryId: null }

   // Spanish variant
   { id: "entry2", locale: "es-MX", primaryEntryId: "entry1" }
   ```

4. **Field-Level Fallback**
   - Only fields marked `localized: true` fall back
   - Non-localized fields are shared

### Validation Checklist

- [ ] Create entry in default locale
- [ ] Create locale variant
- [ ] Query with locale → returns localized content
- [ ] Query with missing locale → falls back correctly
- [ ] Verify fallback chain order
- [ ] Non-localized fields don't fall back

### Edge Cases

- Circular fallback chains (should be prevented)
- Missing default locale content
- Deeply nested fallback chains

---

## 12. Authorization (RBAC)

### How It Works

Role-Based Access Control with:
- Built-in roles: `admin`, `editor`, `author`, `viewer`
- Custom role extension support
- Resource + action permissions
- Ownership scopes: "all" vs "own"

### Key Files

| File | Purpose |
|------|---------|
| `src/component/authorization.ts` | Permission checking |
| `src/component/roles.ts` | Role definitions |
| `src/client/wrapper.ts` | Auth hook integration |

### What to Check

1. **Built-in Roles**
   ```typescript
   admin:  { all resources: all actions }
   editor: { contentEntries: all, mediaItems: all }
   author: { contentEntries: create/read/update (own), mediaItems: create/read }
   viewer: { contentEntries: read, mediaItems: read }
   ```

2. **Permission Matrix**
   ```
   Resource        Actions
   ─────────────────────────────────────
   contentTypes    create, read, update, delete, manage
   contentEntries  create, read, update, delete, publish, unpublish, restore
   mediaItems      create, read, update, delete, move, restore
   settings        read, manage
   ```

3. **Authorization Context**
   ```typescript
   {
     userId: string,
     role: string,
     resource: ResourceType,
     action: ActionType,
     resourceId?: Id,
     resourceOwnerId?: string
   }
   ```

4. **Authorization Hooks**
   ```typescript
   authorizationHooks: {
     beforeRbac: async (context) => {
       // Custom logic before RBAC check
       // Return { allowed: true } to bypass RBAC
     },
     afterRbac: async (context) => {
       // Additional checks after RBAC passes
       // Return { allowed: false } to deny
     },
     onDeny: async (context) => {
       // Log denied access attempts
     }
   }
   ```

### Validation Checklist

- [ ] Admin can do everything
- [ ] Editor can manage content but not content types
- [ ] Author can only manage own content
- [ ] Viewer can only read
- [ ] Custom role works correctly
- [ ] beforeRbac hook can override
- [ ] afterRbac hook can add restrictions
- [ ] onDeny hook is called on denial

### Critical Note

> **Current Limitation**: Authorization checks may not be fully integrated into all mutations. Check each mutation for `checkPermission` calls.

---

## 13. Taxonomies & Tagging

### How It Works

Flexible classification system:
- `taxonomies`: Define classification types (tags, categories, topics)
- `taxonomyTerms`: Terms within each taxonomy (with optional hierarchy)
- `contentEntryTags`: Junction table for many-to-many relationships

### Key Files

| File | Purpose |
|------|---------|
| `src/component/taxonomyQueries.ts` | All taxonomy operations |
| `src/component/schema.ts` | Tables (L167-212) |

### What to Check

1. **Taxonomy Structure**
   ```typescript
   {
     name: "categories",
     displayName: "Categories",
     description: "Content categories",
     hierarchical: true,  // Allow nested terms
     multiSelect: true    // Allow multiple terms per entry
   }
   ```

2. **Term Hierarchy**
   ```
   Technology
   ├── Software
   │   ├── Web Development
   │   └── Mobile Apps
   └── Hardware
   ```

3. **Tag Assignment**
   ```typescript
   // Create tag relationship
   { entryId: "entry1", termId: "term1" }
   ```

4. **Query Operations**
   - `getTermsByEntry`: Get all tags for an entry
   - `getEntriesByTerm`: Get all entries with a tag
   - `suggestTerms`: Autocomplete for tag input

### Validation Checklist

- [ ] Create taxonomy
- [ ] Create terms (flat)
- [ ] Create nested terms (hierarchical)
- [ ] Assign tags to entry
- [ ] Query entries by tag
- [ ] Get tags for entry
- [ ] Suggest terms (autocomplete)

---

## 14. Bulk Operations

### How It Works

Batch operations for multiple entries:
- Maximum 100 items per operation
- Partial failure handling (returns success + failures)
- Supports: publish, unpublish, delete, update, restore

### Key Files

| File | Purpose |
|------|---------|
| `src/component/bulkOperations.ts` | All bulk operations |
| `src/component/validators.ts` | `BULK_OPERATION_BATCH_SIZE` (L589) |

### What to Check

1. **Bulk Publish**
   ```typescript
   await cms.contentEntries.bulkPublish(ctx, {
     entryIds: ["entry1", "entry2", "entry3"],
     publishedBy: "user123"
   });
   ```

2. **Response Structure**
   ```typescript
   {
     succeeded: ["entry1", "entry2"],
     failed: [
       { id: "entry3", error: "Already published" }
     ]
   }
   ```

3. **Batch Size Limit**
   ```typescript
   BULK_OPERATION_BATCH_SIZE = 100
   ```

### Validation Checklist

- [ ] Bulk publish multiple entries
- [ ] Bulk unpublish multiple entries
- [ ] Bulk delete multiple entries
- [ ] Bulk update (field changes)
- [ ] Bulk restore from trash
- [ ] Partial failure returns correct response
- [ ] Exceeding 100 items fails validation

### Edge Cases

- Mixed statuses in bulk publish
- Some entries locked during bulk operation
- Concurrent bulk operations on same entries

---

## 15. Event System

### How It Works

Content changes emit events for integration:
- Event types: `{resource}.{action}` (e.g., "contentEntry.published")
- Stored in `cmsEvents` table
- Polled by webhooks or external systems
- Correlation IDs link related events

### Key Files

| File | Purpose |
|------|---------|
| `src/component/events.ts` | Event emission |
| `src/component/eventQueries.ts` | Event retrieval |

### What to Check

1. **Event Structure**
   ```typescript
   {
     eventType: "contentEntry.published",
     resourceType: "contentEntry",
     resourceId: Id<"contentEntries">,
     payload: {
       title: "My Post",
       slug: "my-post",
       status: "published"
     },
     correlationId: "uuid",
     processed: false,
     _creationTime: timestamp
   }
   ```

2. **Event Types**
   ```
   contentEntry.created
   contentEntry.updated
   contentEntry.published
   contentEntry.unpublished
   contentEntry.archived
   contentEntry.deleted
   contentEntry.restored

   mediaItem.created
   mediaItem.updated
   mediaItem.deleted

   contentType.created
   contentType.updated
   contentType.deleted
   ```

3. **Event Queries**
   - `listEvents`: Paginated event list
   - `getResourceEvents`: Events for specific resource
   - `getUnprocessedEvents`: For webhook processing
   - `markEventsProcessed`: After successful delivery

### Validation Checklist

- [ ] Create entry → event emitted
- [ ] Publish entry → event emitted
- [ ] Events have correct payload
- [ ] Events can be filtered by type
- [ ] Events can be marked processed
- [ ] Correlation ID links related events

---

## 16. Audit Logging

### How It Works

Comprehensive change tracking:
- Records before/after state
- Tracks who made changes and when
- Includes IP address (if provided)
- Supports compliance requirements

### Key Files

| File | Purpose |
|------|---------|
| `src/component/auditLog.ts` | Log creation |
| `src/component/auditLogQueries.ts` | Log retrieval |

### What to Check

1. **Audit Log Structure**
   ```typescript
   {
     resourceType: "contentEntry",
     resourceId: Id<"contentEntries">,
     action: "update",
     userId: "user123",
     previousState: { title: "Old Title", ... },
     newState: { title: "New Title", ... },
     changedFields: ["title"],
     ipAddress?: "192.168.1.1",
     _creationTime: timestamp
   }
   ```

2. **Audit Queries**
   - `getResourceAuditLogs`: History for one resource
   - `getUserAuditLogs`: All changes by one user
   - `listAuditLogs`: Paginated list with filters
   - `getAuditLogDiff`: Visual diff between states

3. **Cleanup**
   - `cleanupOldAuditLogs`: Remove logs older than retention period

### Validation Checklist

- [ ] Create entry → audit log created
- [ ] Update entry → audit log with before/after
- [ ] Delete entry → audit log created
- [ ] Changed fields correctly identified
- [ ] User ID recorded
- [ ] Query by resource works
- [ ] Query by user works

---

## 17. Webhooks

### How It Works

HTTP callbacks for external integration:
- Configure webhook URLs per event type
- Automatic retry on failure (up to 5 times)
- Delivery tracking and debugging
- Secret-based payload signing

### Key Files

| File | Purpose |
|------|---------|
| `src/component/webhookTrigger.ts` | Webhook sending |
| `src/component/webhookConfigMutations.ts` | Config CRUD |
| `src/component/schema.ts` | Tables (L262-305) |

### What to Check

1. **Webhook Config**
   ```typescript
   {
     url: "https://example.com/webhook",
     events: ["contentEntry.published", "contentEntry.deleted"],
     secret: "webhook_secret_key",
     active: true,
     retryConfig: {
       maxRetries: 5,
       initialDelay: 1000,
       maxDelay: 60000
     }
   }
   ```

2. **Webhook Payload**
   ```typescript
   {
     event: "contentEntry.published",
     timestamp: "2024-01-15T10:30:00Z",
     data: {
       id: "entry_id",
       title: "My Post",
       // ... event-specific data
     },
     signature: "hmac_sha256_signature"
   }
   ```

3. **Delivery Tracking**
   ```typescript
   {
     webhookId: Id<"webhookConfigs">,
     eventId: Id<"cmsEvents">,
     status: "success" | "failed" | "pending",
     responseCode?: number,
     responseBody?: string,
     attempts: number,
     lastAttempt: timestamp
   }
   ```

### Validation Checklist

- [ ] Create webhook config
- [ ] Webhook fires on matching event
- [ ] Payload includes signature
- [ ] Failed delivery triggers retry
- [ ] Max retries respected
- [ ] Delivery log created
- [ ] Can disable webhook

---

## 18. Trash & Soft Delete

### How It Works

Content is soft-deleted first:
- Deleted items move to "trash" (deletedAt timestamp set)
- Can be restored within retention period
- Configurable auto-cleanup (not implemented yet)
- Hard delete available with `force` flag

### Key Files

| File | Purpose |
|------|---------|
| `src/component/contentEntriesMutations.ts` | `deleteEntry`, `restoreEntry` |
| `src/component/trashQueries.ts` | Trash listing |
| `src/component/validators.ts` | `DEFAULT_TRASH_RETENTION_DAYS` (L633) |

### What to Check

1. **Soft Delete**
   - Sets `deletedAt` timestamp
   - Entry excluded from normal queries
   - Can be restored

2. **Restore**
   - Clears `deletedAt`
   - Entry visible in normal queries again

3. **Hard Delete**
   - With `force: true`
   - Permanently removes from database
   - Cannot be restored

4. **Retention**
   ```typescript
   DEFAULT_TRASH_RETENTION_DAYS = 30
   ```
   > Note: Auto-cleanup not implemented yet

### Validation Checklist

- [ ] Delete entry → moves to trash
- [ ] Deleted entry hidden from normal queries
- [ ] Trash query shows deleted entries
- [ ] Restore entry → visible again
- [ ] Hard delete → permanently removed
- [ ] Cannot restore hard-deleted entry

---

## 19. Content Migration

### How It Works

Migrate content type schemas:
- Add new fields (with defaults)
- Remove fields (preserve data by default)
- Rename fields (move data)
- Change field types (with transformation)

### Key Files

| File | Purpose |
|------|---------|
| `src/component/contentMigration.ts` | Migration operations |

### What to Check

1. **Migration Preview**
   ```typescript
   await cms.migration.preview(ctx, {
     contentTypeId: "ct_id",
     changes: [
       { type: "add", field: { name: "newField", type: "text" } },
       { type: "remove", field: "oldField" },
       { type: "rename", from: "oldName", to: "newName" }
     ]
   });
   // Returns: { affectedEntries: 100, warnings: [...] }
   ```

2. **Transformation Types**
   - `text` → `number`: Attempts parse
   - `number` → `text`: String conversion
   - `select` → `multiSelect`: Wraps in array
   - Others may require custom transformer

### Validation Checklist

- [ ] Add field → new field added with default
- [ ] Remove field → field removed (data preserved)
- [ ] Rename field → data moved to new name
- [ ] Preview shows accurate count
- [ ] Type transformation works

---

## 20. Export/Import

### How It Works

Export and import content:
- Export to JSON format
- Import from JSON with validation
- Supports content type + entries

### Key Files

| File | Purpose |
|------|---------|
| `src/component/exportImport.ts` | Export/import operations |

### What to Check

1. **Export Format**
   ```typescript
   {
     version: "1.0",
     exportedAt: "2024-01-15T10:30:00Z",
     contentTypes: [...],
     entries: [...]
   }
   ```

2. **Import Validation**
   - Content type compatibility
   - Field type matching
   - Reference resolution

### Validation Checklist

- [ ] Export entries to JSON
- [ ] Export includes content type
- [ ] Import creates entries
- [ ] Invalid import rejected
- [ ] References resolved during import

---

## 21. Query Builder

### How It Works

Fluent API for building content queries:
- Chain filters, sorting, pagination
- Type-safe with generics
- Executes against Convex queries

### Key Files

| File | Purpose |
|------|---------|
| `src/client/queryBuilder.ts` | Query builder implementation |

### What to Check

1. **Builder Chain**
   ```typescript
   cms.contentEntries
     .query()
     .contentType("blog_post")
     .status("published")
     .where("category", "eq", "tech")
     .search("javascript")
     .orderBy("_creationTime", "desc")
     .limit(10)
     .execute(ctx);
   ```

2. **Filter Operations**
   - `eq`: Equals
   - `neq`: Not equals
   - `gt`, `gte`: Greater than
   - `lt`, `lte`: Less than
   - `contains`: Array contains
   - `in`: Value in array

3. **Pagination**
   ```typescript
   const page1 = await query.limit(10).execute(ctx);
   const page2 = await query.limit(10).cursor(page1.cursor).execute(ctx);
   ```

### Validation Checklist

- [ ] Filter by content type
- [ ] Filter by status
- [ ] Filter by custom field
- [ ] Full-text search
- [ ] Sort ascending/descending
- [ ] Pagination with cursor
- [ ] Combine multiple filters

---

## 22. Client Wrapper

### How It Works

Type-safe client that wraps component API:
- Organized by resource: `contentTypes`, `contentEntries`, `mediaAssets`, etc.
- All operations return typed results
- Handles configuration (locale, auth)

### Key Files

| File | Purpose |
|------|---------|
| `src/client/wrapper.ts` | Main client implementation |
| `src/client/types.ts` | TypeScript types |
| `src/client/adminApi.ts` | Admin UI API helper |

### What to Check

1. **Client Creation**
   ```typescript
   const cms = createCmsClient(components.convexCms, {
     defaultLocale: "en-US",
     features: {
       versioning: true,
       localization: true
     },
     getUserRole: async (ctx, { userId }) => {
       const user = await ctx.db.get(userId);
       return user?.cmsRole ?? null;
     }
   });
   ```

2. **API Structure**
   ```typescript
   cms.contentTypes.create(...)
   cms.contentTypes.get(...)
   cms.contentTypes.list(...)

   cms.contentEntries.create(...)
   cms.contentEntries.publish(...)
   cms.contentEntries.query()...

   cms.mediaAssets.upload(...)
   cms.mediaFolders.create(...)

   cms.versions.history(...)
   cms.versions.rollback(...)
   ```

### Validation Checklist

- [ ] Create client with configuration
- [ ] Access all API namespaces
- [ ] Operations return typed results
- [ ] Error handling works correctly
- [ ] Hooks are called at correct times

---

## 23. Admin UI

### How It Works

TanStack Start application for content management:
- React components for all features
- Field renderers for each type
- Permission-based UI

### Key Files

| File | Purpose |
|------|---------|
| `admin/src/routes/__root.tsx` | Root layout |
| `admin/src/routes/index.tsx` | Dashboard |
| `admin/src/routes/content-types.tsx` | Content type management |
| `admin/src/routes/entries/` | Entry editor |
| `admin/src/routes/media.tsx` | Media library |
| `admin/src/components/FieldRenderer.tsx` | Dynamic field rendering |

### What to Check

1. **Navigation**
   - Dashboard → Content Types → Entries → Media → Settings

2. **Content Type List**
   - Lists all content types
   - Shows entry count per type
   - Create button (currently disabled)

3. **Entry Editor**
   - Dynamic form based on content type fields
   - Save, publish, unpublish actions
   - Version history sidebar

4. **Media Library**
   - Folder tree navigation
   - Upload dropzone
   - File preview

### Validation Checklist

- [ ] Dashboard loads with stats
- [ ] Content type list displays
- [ ] Can navigate to entries
- [ ] Entry editor renders all field types
- [ ] Can save draft entry
- [ ] Can publish entry
- [ ] Media library displays
- [ ] Can upload media
- [ ] Can create folders

### Known Issues

- Content type create button disabled
- Some field renderers incomplete (media, reference)
- Settings form non-functional
- No delete button in entry editor

---

## 24. Edge Cases & Limitations

### Critical Limitations

1. **Authorization Not Fully Integrated**
   - Some mutations may bypass RBAC checks
   - Verify each mutation for `checkPermission` calls

2. **No Automatic Trash Cleanup**
   - `DEFAULT_TRASH_RETENTION_DAYS` is advisory only
   - No scheduled job to purge old deleted items

3. **Circular Reference Detection Missing**
   - Entry A → Entry B → Entry A possible
   - Could cause infinite loops in reference resolution

4. **Rate Limiting Not Integrated**
   - Infrastructure exists but not called in mutations

### Constraints & Limits

| Constraint | Value | Location |
|------------|-------|----------|
| Bulk operation batch | 100 items | `validators.ts:589` |
| Lock duration (default) | 30 minutes | `validators.ts:679` |
| Lock duration (max) | 4 hours | `validators.ts:682` |
| Folder nesting depth | 10 levels | `mediaFolderMutations.ts:48` |
| Folder path length | 500 chars | `mediaFolderMutations.ts:54` |
| Folder name length | 255 chars | `mediaFolderMutations.ts:88` |
| Schedule advance time | 1 minute minimum | `scheduledPublish.ts:91` |

### Known Edge Cases

1. **Scheduled Publishing**
   - Race condition when rescheduling
   - Orphaned scheduled jobs when entry deleted

2. **Content Locking**
   - Lock persists if user disconnects
   - No automatic cleanup

3. **Media Variants**
   - Cannot cancel variant generation
   - Cannot retry failed variants (must recreate)

4. **Localization**
   - Circular fallback chains possible
   - Auto-generated fallbacks may conflict with explicit

5. **Bulk Operations**
   - Partial failures may leave inconsistent state
   - Version numbers may gap on retry

---

## 25. Potential Improvements

### High Priority

1. **Complete Authorization Integration**
   - Add `checkPermission` to all mutations
   - Add authorization tests

2. **Implement Automatic Trash Cleanup**
   - Scheduled job to purge old deleted items
   - Configurable retention period

3. **Add Circular Reference Detection**
   - Track visited IDs during resolution
   - Fail with clear error

4. **Rate Limiting Integration**
   - Connect existing infrastructure to mutations
   - Add configuration options

### Medium Priority

1. **Lock Recovery**
   - Automatic unlock after client disconnect
   - Grace period before auto-unlock

2. **Variant Generation Improvements**
   - Cancel pending variants
   - Automatic retry on failure
   - Progress tracking

3. **Bulk Operation Pagination**
   - Support >100 items via pagination
   - Transaction guarantees

4. **Better Error Messages**
   - Include context in all errors
   - Actionable suggestions

### Low Priority

1. **Version Conflict Resolution**
   - UI for merging concurrent edits
   - Three-way diff support

2. **Media Deduplication**
   - Hash-based duplicate detection
   - Storage savings

3. **Field-Level Permissions**
   - Per-field read/write permissions
   - Sensitive field masking

4. **Workflow Extensions**
   - Custom workflow states
   - Approval chains

---

## Appendix A: Test Files Reference

| Test File | Coverage |
|-----------|----------|
| `contentTypes.test.ts` | Content type CRUD |
| `contentEntries.test.ts` | Entry CRUD |
| `contentEntryValidation.test.ts` | Field validation |
| `scheduledPublish.test.ts` | Scheduled publishing |
| `contentVersions.test.ts` | Versioning |
| `contentLock.test.ts` | Locking |
| `mediaAssets.test.ts` | Media files |
| `mediaFolders.test.ts` | Media folders |
| `mediaVariants.test.ts` | Variants |
| `bulkOperations.test.ts` | Bulk operations |
| `authorization.test.ts` | RBAC |
| `auditLog.test.ts` | Audit logging |
| `localeFallbackChain.test.ts` | Localization |
| `queryBuilder.test.ts` | Query builder |

---

## Appendix B: Quick Reference Card

### Create Content Type
```typescript
await cms.contentTypes.create(ctx, {
  name: "blog_post",
  displayName: "Blog Post",
  fields: [
    { name: "title", type: "text", required: true },
    { name: "body", type: "richText" }
  ]
});
```

### Create Entry
```typescript
await cms.contentEntries.create(ctx, {
  contentTypeId: "content_type_id",
  data: { title: "Hello", body: "World" },
  createdBy: "user_id"
});
```

### Publish Entry
```typescript
await cms.contentEntries.publish(ctx, {
  entryId: "entry_id",
  publishedBy: "user_id"
});
```

### Query Entries
```typescript
const entries = await cms.contentEntries
  .query()
  .contentType("blog_post")
  .status("published")
  .limit(10)
  .execute(ctx);
```

### Upload Media
```typescript
const uploadUrl = await cms.mediaAssets.generateUploadUrl(ctx);
// Upload file to URL
await cms.mediaAssets.create(ctx, {
  name: "photo.jpg",
  storageId: "storage_id",
  mimeType: "image/jpeg"
});
```

---

*Document generated for comprehensive validation and learning. Last updated: January 2025.*
