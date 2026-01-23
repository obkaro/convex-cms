# Convex CMS Feature Review Checklist

This document provides a comprehensive checklist for manually validating all features of the Convex CMS component, understanding its implementation, and identifying areas for improvement.

---

## Quick Summary

| Category | Status | Details |
|----------|--------|---------|
| **Tests** | 2518/2619 passing | 101 failing tests |
| **Tables** | 13 tables | All defined in schema.ts |
| **Field Types** | 13 types | text, richText, number, boolean, date, datetime, reference, media, json, select, multiSelect, tags, category |
| **Roles** | 4 built-in | admin, editor, author, viewer |

---

## ⚠️ CRITICAL ISSUES TO INVESTIGATE FIRST

These are documented critical issues that should be your first priority:

### 1. Authorization Bypass (CRITICAL)
**Location**: All mutation files
**Issue**: The RBAC system is fully implemented (`authorization.ts`, `authorizationHooks.ts`) but **never called** from mutations.
**Impact**: Any user can perform any operation regardless of role.
**Test**: Create an entry as a "viewer" role - it should fail but currently succeeds.

### 2. Rate Limiting Never Applied
**Location**: `rateLimitHooks.ts`
**Issue**: Rate limiting infrastructure exists but `executeRateLimitHooks()` is never called.
**Impact**: No protection against abuse or DoS.

### 3. Admin UI Silent Failures
**Locations**: Multiple admin routes
**Issue**: API errors show empty lists instead of error states.
**Test**: Disconnect Convex and observe behavior.

---

## 1. CONTENT TYPE SYSTEM

### 1.1 Content Type Definition
**Files**: `src/component/contentTypes.ts`, `src/component/contentTypeMutations.ts`

| Test Case | Expected Behavior | Status |
|-----------|-------------------|--------|
| Create content type with all 13 field types | Successfully creates with validation | ☐ |
| Create content type with duplicate name | Should reject with error | ☐ |
| Create content type with invalid field type | Should reject with validation error | ☐ |
| Create content type with duplicate field names | Should reject | ☐ |
| Create singleton content type | Only allows one entry | ☐ |
| Create content type with titleField/slugField set | Uses correct fields for display/slug | ☐ |

**Field Type Specific Tests:**

| Field Type | Options to Test | Validation |
|------------|-----------------|------------|
| `text` | minLength, maxLength, pattern (regex) | ☐ |
| `richText` | allowedBlocks, allowedMarks | ☐ |
| `number` | min, max, step, precision | ☐ |
| `boolean` | trueLabel, falseLabel | ☐ |
| `date` | min, max dates | ☐ |
| `datetime` | min, max, timezone handling | ☐ |
| `select` | options array, required validation | ☐ |
| `multiSelect` | options array, multi-value storage | ☐ |
| `reference` | allowedContentTypes, multiple, minItems | ☐ |
| `media` | mediaType filter, allowedMimeTypes, maxFileSize | ☐ |
| `json` | schema validation (if implemented) | ☐ |
| `tags` | taxonomyId, allowCreate, maxTags, minTags | ☐ |
| `category` | allowMultiple, hierarchical | ☐ |

### 1.2 Content Type CRUD

| Test Case | Expected | Status |
|-----------|----------|--------|
| Update content type display name | Updates successfully | ☐ |
| Update content type - add new field | Adds without data loss | ☐ |
| Update content type - remove field | Handles existing data | ☐ |
| Update content type - rename field | Data migration? | ☐ |
| Delete content type (soft) | Sets deletedAt | ☐ |
| Delete content type (hard) | Removes completely | ☐ |
| Delete content type with entries | Cascade or prevent? | ☐ |
| Deactivate content type | Sets isActive = false | ☐ |

**Edge Cases:**
- [ ] What happens when updating a field type (e.g., text → number)?
- [ ] Can you restore a soft-deleted content type?
- [ ] What about entries when content type is deactivated?

---

## 2. CONTENT ENTRIES

### 2.1 Entry CRUD Operations
**Files**: `src/component/contentEntries.ts`, `src/component/contentEntryMutations.ts`

| Test Case | Expected | Status |
|-----------|----------|--------|
| Create entry with valid data | Returns entry with ID | ☐ |
| Create entry with missing required field | Validation error | ☐ |
| Create entry with invalid field type | Validation error | ☐ |
| Update entry data | Updates and increments version | ☐ |
| Update entry slug | Validates uniqueness | ☐ |
| Get entry by ID | Returns full entry | ☐ |
| Get entry by slug | Returns entry for content type | ☐ |
| Delete entry (soft) | Moves to trash | ☐ |
| Delete entry (hard) | Permanent removal | ☐ |
| Restore entry from trash | Restores successfully | ☐ |
| Duplicate entry | Creates copy with new slug | ☐ |

### 2.2 Slug Generation
**File**: `src/component/lib/slugGenerator.ts`, `src/component/lib/slugUniqueness.ts`

| Test Case | Expected | Status |
|-----------|----------|--------|
| Generate slug from title | "My Blog Post" → "my-blog-post" | ☐ |
| Handle special characters | "Café & Restaurant" → "cafe-restaurant" | ☐ |
| Handle unicode | "日本語" → appropriate handling | ☐ |
| Duplicate slug | Generates "slug-1", "slug-2" | ☐ |
| Custom slug provided | Uses custom, validates uniqueness | ☐ |
| Empty title | Generates something reasonable | ☐ |

### 2.3 Content Validation
**File**: `src/component/contentEntryValidation.ts`, `src/component/validation.ts`

| Test Case | Expected | Status |
|-----------|----------|--------|
| Text field - minLength violation | Error with field name | ☐ |
| Text field - maxLength violation | Error | ☐ |
| Text field - pattern mismatch | Error | ☐ |
| Number field - below min | Error | ☐ |
| Number field - above max | Error | ☐ |
| Number field - wrong precision | Error or truncate? | ☐ |
| Select field - invalid option | Error | ☐ |
| Reference field - invalid ID | Error | ☐ |
| Reference field - wrong content type | Error | ☐ |
| Media field - wrong MIME type | Error | ☐ |
| Required field missing | Error | ☐ |

---

## 3. PUBLISHING WORKFLOW

### 3.1 Status Management
**Files**: `src/component/contentEntryMutations.ts`

| Test Case | Expected | Status |
|-----------|----------|--------|
| Create entry → status = "draft" | Correct | ☐ |
| Publish draft → status = "published" | Sets publishedAt | ☐ |
| Publish sets firstPublishedAt once | Only on first publish | ☐ |
| Publish updates lastPublishedAt | Every publish | ☐ |
| Unpublish → status = "draft" | Reverts status | ☐ |
| Archive entry | status = "archived" | ☐ |
| Query by status filter | Returns correct entries | ☐ |

### 3.2 Scheduled Publishing
**Files**: `src/component/contentEntryMutations.ts`, scheduler integration

| Test Case | Expected | Status |
|-----------|----------|--------|
| Schedule for future date | status = "scheduled", scheduledPublishAt set | ☐ |
| Scheduled time passes | Convex scheduler triggers publish | ☐ |
| Cancel scheduled publish | Reverts to draft | ☐ |
| Schedule in the past | Immediate publish or error? | ☐ |
| Re-schedule | Updates scheduledPublishAt | ☐ |

**Note**: 15 scheduled publish tests are failing - investigate!

---

## 4. VERSIONING

### 4.1 Version Creation
**File**: `src/component/versionMutations.ts`

| Test Case | Expected | Status |
|-----------|----------|--------|
| Create entry → version 1 | Initial version snapshot | ☐ |
| Update entry → version increments | New snapshot created | ☐ |
| Version stores complete state | data, slug, status captured | ☐ |
| Publish creates version | wasPublished = true | ☐ |
| Max versions limit | Oldest pruned when exceeded? | ☐ |

### 4.2 Version History
| Test Case | Expected | Status |
|-----------|----------|--------|
| Get version history | Paginated list, newest first | ☐ |
| Get specific version by number | Returns that version | ☐ |
| Version metadata | createdBy, timestamp, wasPublished | ☐ |

### 4.3 Version Comparison & Rollback
| Test Case | Expected | Status |
|-----------|----------|--------|
| Compare two versions | Field-level diff | ☐ |
| Rollback to previous version | Creates new version with old data | ☐ |
| Rollback preserves history | Old versions still accessible | ☐ |
| Rollback to published version | What status does it get? | ☐ |

---

## 5. MEDIA MANAGEMENT

### 5.1 Media Upload
**Files**: `src/component/mediaAssetMutations.ts`

| Test Case | Expected | Status |
|-----------|----------|--------|
| Generate upload URL | Returns temporary signed URL | ☐ |
| Upload file via URL | File stored in Convex storage | ☐ |
| Create asset record | Stores metadata (name, size, type) | ☐ |
| Extract image dimensions | width/height populated | ☐ |
| Extract video/audio duration | duration populated | ☐ |
| MIME type detection | Correct type stored | ☐ |

### 5.2 Media Organization
**Files**: `src/component/mediaFolderMutations.ts`

| Test Case | Expected | Status |
|-----------|----------|--------|
| Create folder at root | path = "/folder-name" | ☐ |
| Create nested folder | path = "/parent/child" | ☐ |
| Move asset to folder | Updates parentId | ☐ |
| Move folder (with children) | Updates all paths | ☐ |
| Delete empty folder | Removes folder | ☐ |
| Delete folder with contents | Cascade or prevent? | ☐ |
| Folder tree query | Returns hierarchical structure | ☐ |

### 5.3 Media Variants
**File**: `src/component/mediaVariants*.ts`

| Test Case | Expected | Status |
|-----------|----------|--------|
| Request thumbnail generation | Creates pending variant | ☐ |
| Variant processing completes | Status → completed | ☐ |
| Get best variant for dimensions | Returns closest match | ☐ |
| Generate responsive srcset | Valid srcset string | ☐ |
| Format conversion (WebP, AVIF) | Creates format variants | ☐ |

**Known Issue**: Admin UI lacks media field renderer (placeholder only)

---

## 6. LOCALIZATION

### 6.1 Multi-Locale Content
**File**: `src/component/localeFields.ts`

| Test Case | Expected | Status |
|-----------|----------|--------|
| Create entry with locale | Stores locale-specific data | ☐ |
| Set localized field value | Updates specific locale | ☐ |
| Get localized value | Returns for requested locale | ☐ |
| Field marked as localized: true | Stores per-locale values | ☐ |
| Field not localized | Single value for all locales | ☐ |

### 6.2 Locale Fallback
| Test Case | Expected | Status |
|-----------|----------|--------|
| Request locale with content | Returns that locale | ☐ |
| Request locale without content | Falls back via chain | ☐ |
| Fallback chain: es-MX → es-ES → en-US | Correct resolution | ☐ |
| No content in any fallback | Returns null/undefined? | ☐ |
| Get translation status | Shows which locales have content | ☐ |

---

## 7. ROLE-BASED ACCESS CONTROL (RBAC)

### 7.1 Built-in Roles
**Files**: `src/component/roles.ts`, `src/component/authorization.ts`

| Role | Permissions | Test Status |
|------|-------------|-------------|
| **admin** | Full access to everything | ☐ |
| **editor** | Manage all content/media, no settings | ☐ |
| **author** | Create content, manage own only | ☐ |
| **viewer** | Read-only published content | ☐ |

### 7.2 Permission Checks
**⚠️ CRITICAL: Authorization is implemented but not enforced!**

| Test Case | Expected | Status |
|-----------|----------|--------|
| Viewer creates entry | Should DENY | ☐ BROKEN |
| Author edits other's entry | Should DENY | ☐ BROKEN |
| Author edits own entry | Should ALLOW | ☐ |
| Editor deletes any entry | Should ALLOW | ☐ |
| Admin manages settings | Should ALLOW | ☐ |

### 7.3 Authorization Hooks
**File**: `src/component/authorizationHooks.ts`

| Hook | Purpose | Test Status |
|------|---------|-------------|
| `beforeRbac` | Run before role check | ☐ |
| `authorize` | Custom logic after role check | ☐ |
| `afterRbac` | Post-authorization actions | ☐ |
| `onDeny` | Handle authorization failures | ☐ |

### 7.4 Ownership Rules
| Test Case | Expected | Status |
|-----------|----------|--------|
| Author creates entry | They become owner | ☐ |
| Author queries "own" entries | Only theirs returned | ☐ |
| Editor queries "all" entries | All returned | ☐ |

---

## 8. CONTENT LOCKING

### 8.1 Lock Management
**File**: `src/component/contentLock.ts`

| Test Case | Expected | Status |
|-----------|----------|--------|
| Acquire lock on entry | Lock acquired, user recorded | ☐ |
| Another user tries to acquire | Denied with lock info | ☐ |
| Release lock | Lock removed | ☐ |
| Lock expires after duration | Auto-released | ☐ |
| Renew lock before expiry | Extends duration | ☐ |
| Admin force releases lock | Lock removed | ☐ |
| List all locked entries | Returns locked entries | ☐ |

### 8.2 Lock Edge Cases
| Test Case | Expected | Status |
|-----------|----------|--------|
| Edit while locked by another | Should fail | ☐ |
| Edit while you hold lock | Should succeed | ☐ |
| Lock expired mid-edit | What happens? | ☐ |
| Publish while locked | Should succeed (if lock holder) | ☐ |

---

## 9. BULK OPERATIONS

### 9.1 Batch Mutations
**File**: `src/component/bulkOperations.ts`

| Test Case | Expected | Status |
|-----------|----------|--------|
| Bulk publish 10 entries | All published, version snapshots | ☐ |
| Bulk unpublish | All reverted to draft | ☐ |
| Bulk delete | All soft-deleted | ☐ |
| Bulk update same field | All updated | ☐ |
| Bulk restore from trash | All restored | ☐ |
| Partial failure handling | Reports which failed | ☐ |
| Batch size > limit | Processes in batches | ☐ |

---

## 10. EVENTS & WEBHOOKS

### 10.1 Event Emission
**File**: `src/component/eventEmitter.ts`

| Event Type | When Emitted | Status |
|------------|--------------|--------|
| `contentEntry.created` | Entry created | ☐ |
| `contentEntry.updated` | Entry updated | ☐ |
| `contentEntry.published` | Entry published | ☐ |
| `contentEntry.unpublished` | Entry unpublished | ☐ |
| `contentEntry.deleted` | Entry deleted | ☐ |
| `contentEntry.restored` | Entry restored | ☐ |
| `contentEntry.duplicated` | Entry duplicated | ☐ |
| `contentEntry.scheduled` | Entry scheduled | ☐ |

### 10.2 Webhook Delivery
**File**: `src/component/webhookTrigger.ts`

| Test Case | Expected | Status |
|-----------|----------|--------|
| Create webhook config | Stored with secret | ☐ |
| Event triggers webhook | HTTP POST to URL | ☐ |
| Signature verification | HMAC-SHA256 header | ☐ |
| Retry on failure | Exponential backoff | ☐ |
| Delivery tracking | Status and attempts logged | ☐ |
| Event type filtering | Only subscribed events | ☐ |

---

## 11. AUDIT LOGGING

### 11.1 Audit Trail
**File**: `src/component/auditLog.ts`

| Test Case | Expected | Status |
|-----------|----------|--------|
| Create entry logs action | "created" with new state | ☐ |
| Update entry logs diff | "updated" with changed fields | ☐ |
| Delete logs previous state | "deleted" with before state | ☐ |
| Logs include user ID | Attribution correct | ☐ |
| Logs include timestamp | Correct time | ☐ |
| Query by resource | Returns that resource's logs | ☐ |
| Query by user | Returns user's actions | ☐ |
| Query by action type | Filters correctly | ☐ |

**Note**: 24 audit log tests are skipped - need implementation!

---

## 12. TRASH & SOFT DELETE

### 12.1 Trash Management
**File**: `src/component/trash.ts`

| Test Case | Expected | Status |
|-----------|----------|--------|
| Delete entry → trash | deletedAt set, hidden from queries | ☐ |
| List trash | Shows deleted entries | ☐ |
| Restore from trash | deletedAt cleared | ☐ |
| Retention period passes | Entry eligible for cleanup | ☐ |
| Run cleanup | Old entries permanently deleted | ☐ |
| Configure retention days | Settings respected | ☐ |
| Empty trash | Permanently deletes all | ☐ |

---

## 13. CONTENT MIGRATION

### 13.1 Schema Evolution
**File**: `src/component/contentTypeMigration.ts`

| Operation | Test Case | Status |
|-----------|-----------|--------|
| Add field | New field with default value | ☐ |
| Remove field | Field data removed | ☐ |
| Rename field | Value preserved under new name | ☐ |
| Transform text→number | Conversion applied | ☐ |
| Transform number→text | Conversion applied | ☐ |
| Remap select values | Values updated | ☐ |
| Preview migration | Shows changes without applying | ☐ |
| Dry run | Validates without persisting | ☐ |

---

## 14. RAG INTEGRATION

### 14.1 Content Indexing
**File**: `src/component/ragContentIndexer.ts`

| Test Case | Expected | Status |
|-----------|----------|--------|
| Publish triggers indexing event | Event created | ☐ |
| Prepare entry for indexing | Chunks extracted | ☐ |
| Unpublish triggers removal | Event created | ☐ |
| Check indexing status | Stats returned | ☐ |
| Request reindex | Entry queued | ☐ |

### 14.2 Content Chunking
**File**: `src/component/lib/ragContentChunker.ts`

| Test Case | Expected | Status |
|-----------|----------|--------|
| Rich text chunked | Semantic chunks | ☐ |
| Metadata preserved | Type, locale, etc. | ☐ |
| Chunk size limits | Respects config | ☐ |

---

## 15. ADMIN UI

### 15.1 Routes & Pages

| Route | Purpose | Status |
|-------|---------|--------|
| `/` | Dashboard with stats | ☐ BROKEN (hardcoded values) |
| `/content-types` | List content types | ☐ |
| `/content` | Browse all entries | ☐ |
| `/entries/:id` | Edit entry | ☐ |
| `/entries/new/:typeId` | Create entry | ☐ |
| `/entries/type/:typeId` | Filter by type | ☐ |
| `/media` | Media library | ☐ |
| `/settings` | Configuration | ☐ BROKEN (non-functional) |

### 15.2 Components

| Component | Status | Known Issues |
|-----------|--------|--------------|
| ContentEntryEditor | ☐ | No delete button |
| FieldRenderer | ☐ | Media/Reference fields placeholder |
| UploadDropzone | ☐ | Silent failures, cancellation issues |
| Header | ☐ | Non-functional buttons |
| Entry List | ☐ | Wrong sort timestamp |

### 15.3 Admin UI Known Bugs

- [ ] Dashboard stats hardcoded
- [ ] Settings form non-functional
- [ ] Entry count limited to 1000
- [ ] Search debounce uses useState incorrectly
- [ ] Sorting by "updated" uses creation time
- [ ] No error states on API failures
- [ ] No delete entry button
- [ ] Media field shows placeholder
- [ ] Reference field shows placeholder
- [ ] Create Content Type disabled

---

## 16. CLIENT API

### 16.1 CMS Client Wrapper
**File**: `src/client/wrapper.ts`

| API | Methods | Status |
|-----|---------|--------|
| `cms.contentTypes` | create, get, list, update, delete, deactivate, reactivate | ☐ |
| `cms.contentEntries` | create, get, getBySlug, list, update, delete, publish, unpublish, schedule, restore, duplicate | ☐ |
| `cms.versions` | getHistory, getVersion, compare, rollback | ☐ |
| `cms.mediaAssets` | upload, create, get, list, update, delete | ☐ |
| `cms.trash` | list, restore, empty, getStats | ☐ |

**Missing from wrapper (documented bug):**
- [ ] bulkPublish, bulkUnpublish, bulkDelete, bulkUpdate, bulkRestore
- [ ] duplicateEntry (may be missing)

### 16.2 React Hooks
**File**: `src/react/hooks.ts`

| Hook | Purpose | Status |
|------|---------|--------|
| `useContentEntries` | Paginated entries query | ☐ |
| `useContentEntry` | Single entry query | ☐ |
| `useMediaAssets` | Paginated media query | ☐ |
| `useCmsMutation` | Mutation wrapper | ☐ |
| `useMediaUpload` | Upload helper | ☐ |

---

## 17. TEST SUITE STATUS

### Current Test Results
- **Passing**: 2518
- **Failing**: 101
- **Files**: 11 failing, 44 passing

### Key Failing Test Files

| File | Failures | Issue |
|------|----------|-------|
| `contentTypeMutations.test.ts` | 11 | Field validation, update validators |
| `mediaFolderMutations.test.ts` | 9 | Schema structure tests |
| `schema.test.ts` | 8 | mediaAssets/mediaFolders tables undefined |
| `scheduledPublish.test.ts` | 15 | convex-test setup issue |
| `auditLog.test.ts` | 24 | All skipped |

---

## 18. EDGE CASES & LIMITATIONS

### Documented Constraints

| Constraint | Description |
|------------|-------------|
| No `ctx.auth` | Components can't access authentication directly |
| No `.filter()` | Must use `.withIndex()` for queries |
| Pagination | Uses convex-helpers, not built-in |
| Max versions | Configurable limit per entry |
| Upload URLs | Temporary signed URLs |
| Lock duration | Configurable, default 30 min |

### Edge Cases to Test

| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| Create entry with 100+ fields | Performance? | ☐ |
| Upload 50MB file | Respects limits? | ☐ |
| 1000+ entries in one content type | Pagination works? | ☐ |
| Deeply nested folders (10 levels) | Path handling? | ☐ |
| Circular references in content | Detection/prevention? | ☐ |
| Very long slug (500 chars) | Truncation? | ☐ |
| Concurrent edits (no lock) | Data consistency? | ☐ |
| Webhook timeout | Retry behavior? | ☐ |
| Large bulk operation (10,000 entries) | Batching works? | ☐ |

---

## 19. POTENTIAL IMPROVEMENTS

### High Priority
1. **Fix authorization enforcement** - RBAC must be called from mutations
2. **Fix Admin UI error handling** - Show errors, not empty states
3. **Implement Media/Reference field renderers** - Currently placeholder
4. **Fix failing tests** - 101 tests failing

### Medium Priority
5. **Add rate limiting to mutations** - Infrastructure exists
6. **Live dashboard stats** - Currently hardcoded
7. **Settings form functionality** - Non-functional
8. **Entry delete button in admin** - Missing
9. **Fix search debounce** - useState → useEffect

### Lower Priority
10. **Content Type creation in Admin UI** - Disabled
11. **Improve upload dropzone reliability** - Silent failures
12. **Header button functionality** - Non-functional
13. **Agent tools API alignment** - Namespace mismatch

---

## 20. TESTING APPROACH

### Manual Testing Sequence

1. **Start Example App**
   ```bash
   cd example
   npm run dev
   ```

2. **Create Test Content Type**
   - Use all 13 field types
   - Test validation options

3. **CRUD Operations**
   - Create, read, update, delete entries
   - Test all field types

4. **Publishing Workflow**
   - Draft → Published → Scheduled
   - Version creation

5. **Media Management**
   - Upload files
   - Create folders
   - Test variants

6. **RBAC Testing**
   - Configure getUserRole hook
   - Test each role's permissions
   - **Verify authorization is enforced!**

7. **Admin UI**
   - Navigate all routes
   - Test forms
   - Check error handling

---

## Checklist Usage

- **☐** = Not tested
- **☑** = Tested and passing
- **☒** = Tested and failing
- **⚠️** = Known issue

Mark items as you test them to track progress.
