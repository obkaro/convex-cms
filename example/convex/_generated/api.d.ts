/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as cms from "../cms.js";
import type * as content from "../content.js";
import type * as http from "../http.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  cms: typeof cms;
  content: typeof content;
  http: typeof http;
  seed: typeof seed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  cms: {
    bulkOperations: {
      bulkDelete: FunctionReference<
        "mutation",
        "internal",
        { deletedBy?: string; hardDelete?: boolean; ids: Array<string> },
        {
          failed: number;
          results: Array<{ error?: string; id: string; success: boolean }>;
          succeeded: number;
          total: number;
        }
      >;
      bulkPublish: FunctionReference<
        "mutation",
        "internal",
        { changeDescription?: string; ids: Array<string>; updatedBy?: string },
        {
          failed: number;
          results: Array<{ error?: string; id: string; success: boolean }>;
          succeeded: number;
          total: number;
        }
      >;
      bulkRestore: FunctionReference<
        "mutation",
        "internal",
        { ids: Array<string>; restoredBy?: string },
        {
          failed: number;
          results: Array<{ error?: string; id: string; success: boolean }>;
          succeeded: number;
          total: number;
        }
      >;
      bulkUnpublish: FunctionReference<
        "mutation",
        "internal",
        { ids: Array<string>; updatedBy?: string },
        {
          failed: number;
          results: Array<{ error?: string; id: string; success: boolean }>;
          succeeded: number;
          total: number;
        }
      >;
      bulkUpdate: FunctionReference<
        "mutation",
        "internal",
        { data?: any; ids: Array<string>; status?: string; updatedBy?: string },
        {
          failed: number;
          results: Array<{ error?: string; id: string; success: boolean }>;
          succeeded: number;
          total: number;
        }
      >;
    };
    contentEntries: {
      compareVersions: FunctionReference<
        "query",
        "internal",
        { entryId: string; fromVersionNumber: number; toVersionNumber: number },
        {
          changeSummary: string;
          changedFields: Array<string>;
          fieldDiffs: Array<{
            changeType: "added" | "removed" | "modified";
            field: string;
            fromValue?: any;
            toValue?: any;
          }>;
          fromVersion: {
            createdAt: number;
            slug: string;
            status: string;
            versionNumber: number;
            wasPublished: boolean;
          };
          hasChanges: boolean;
          slugChanged: boolean;
          statusChanged: boolean;
          toVersion: {
            createdAt: number;
            slug: string;
            status: string;
            versionNumber: number;
            wasPublished: boolean;
          };
        } | null
      >;
      count: FunctionReference<
        "query",
        "internal",
        {
          contentTypeName?: string;
          includeDeleted?: boolean;
          status?: string;
          statusIn?: Array<string>;
        },
        { count: number }
      >;
      get: FunctionReference<
        "query",
        "internal",
        { id: string; includeVersion?: boolean },
        {
          _creationTime: number;
          _id: string;
          contentTypeName: string;
          createdBy?: string;
          data: any;
          deletedAt?: number;
          firstPublishedAt?: number;
          lastPublishedAt?: number;
          latestVersion?: {
            _creationTime: number;
            _id: string;
            changeDescription?: string;
            createdBy?: string;
            data: any;
            entryId: string;
            publishedAt?: number;
            slug: string;
            status: string;
            versionNumber: number;
            wasPublished: boolean;
          };
          locale?: string;
          lockExpiresAt?: number;
          lockedBy?: string;
          primaryEntryId?: string;
          scheduledPublishAt?: number;
          searchText?: string;
          slug: string;
          status: string;
          updatedBy?: string;
          version: number;
        } | null
      >;
      getBySlug: FunctionReference<
        "query",
        "internal",
        {
          contentTypeName: string;
          includeDeleted?: boolean;
          slug: string;
          status?: string;
        },
        {
          _creationTime: number;
          _id: string;
          contentTypeName: string;
          createdBy?: string;
          data: any;
          deletedAt?: number;
          firstPublishedAt?: number;
          lastPublishedAt?: number;
          locale?: string;
          lockExpiresAt?: number;
          lockedBy?: string;
          primaryEntryId?: string;
          scheduledPublishAt?: number;
          searchText?: string;
          slug: string;
          status: string;
          updatedBy?: string;
          version: number;
        } | null
      >;
      getBySlugAndTypeName: FunctionReference<
        "query",
        "internal",
        {
          contentTypeName: string;
          includeDeleted?: boolean;
          slug: string;
          status?: string;
        },
        {
          _creationTime: number;
          _id: string;
          contentTypeName: string;
          createdBy?: string;
          data: any;
          deletedAt?: number;
          firstPublishedAt?: number;
          lastPublishedAt?: number;
          locale?: string;
          lockExpiresAt?: number;
          lockedBy?: string;
          primaryEntryId?: string;
          scheduledPublishAt?: number;
          searchText?: string;
          slug: string;
          status: string;
          updatedBy?: string;
          version: number;
        } | null
      >;
      getVersion: FunctionReference<
        "query",
        "internal",
        { entryId: string; versionId?: string; versionNumber?: number },
        {
          _creationTime: number;
          _id: string;
          changeDescription?: string;
          createdBy?: string;
          data: any;
          entryId: string;
          publishedAt?: number;
          slug: string;
          status: string;
          versionNumber: number;
          wasPublished: boolean;
        } | null
      >;
      getVersionHistory: FunctionReference<
        "query",
        "internal",
        {
          entryId: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string | null;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            changeDescription?: string;
            createdBy?: string;
            data: any;
            entryId: string;
            publishedAt?: number;
            slug: string;
            status: string;
            versionNumber: number;
            wasPublished: boolean;
          }>;
        } | null
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          contentTypeName?: string;
          fieldFilters?: Array<{
            field: string;
            operator:
              | "eq"
              | "ne"
              | "gt"
              | "gte"
              | "lt"
              | "lte"
              | "contains"
              | "startsWith"
              | "endsWith"
              | "in"
              | "notIn";
            value: any;
          }>;
          includeDeleted?: boolean;
          locale?: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          search?: string;
          sortDirection?: "asc" | "desc";
          sortField?: string;
          status?: string;
          statusIn?: Array<string>;
        },
        {
          continueCursor: string | null;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            contentTypeName: string;
            createdBy?: string;
            data: any;
            deletedAt?: number;
            firstPublishedAt?: number;
            lastPublishedAt?: number;
            locale?: string;
            lockExpiresAt?: number;
            lockedBy?: string;
            primaryEntryId?: string;
            scheduledPublishAt?: number;
            searchText?: string;
            slug: string;
            status: string;
            updatedBy?: string;
            version: number;
          }>;
        }
      >;
    };
    contentEntryMutations: {
      createEntry: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          contentTypeName: string;
          createdBy?: string;
          data: any;
          locale?: string;
          primaryEntryId?: string;
          scheduledPublishAt?: number;
          slug?: string;
          status?: string;
        },
        {
          _creationTime: number;
          _id: string;
          contentTypeName: string;
          createdBy?: string;
          data: any;
          deletedAt?: number;
          firstPublishedAt?: number;
          lastPublishedAt?: number;
          locale?: string;
          lockExpiresAt?: number;
          lockedBy?: string;
          primaryEntryId?: string;
          scheduledPublishAt?: number;
          searchText?: string;
          slug: string;
          status: string;
          updatedBy?: string;
          version: number;
        }
      >;
      deleteEntry: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          deletedBy?: string;
          hardDelete?: boolean;
          id: string;
        },
        {
          _creationTime: number;
          _id: string;
          contentTypeName: string;
          createdBy?: string;
          data: any;
          deletedAt?: number;
          deletedVersionsCount?: number;
          firstPublishedAt?: number;
          lastPublishedAt?: number;
          locale?: string;
          lockExpiresAt?: number;
          lockedBy?: string;
          primaryEntryId?: string;
          scheduledPublishAt?: number;
          searchText?: string;
          slug: string;
          status: string;
          updatedBy?: string;
          version: number;
        }
      >;
      duplicateEntry: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          copyMediaReferences?: boolean;
          createdBy?: string;
          locale?: string;
          slug?: string;
          sourceEntryId: string;
        },
        {
          _creationTime: number;
          _id: string;
          contentTypeName: string;
          createdBy?: string;
          data: any;
          deletedAt?: number;
          firstPublishedAt?: number;
          lastPublishedAt?: number;
          locale?: string;
          lockExpiresAt?: number;
          lockedBy?: string;
          primaryEntryId?: string;
          scheduledPublishAt?: number;
          searchText?: string;
          slug: string;
          status: string;
          updatedBy?: string;
          version: number;
        }
      >;
      publishEntry: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          changeDescription?: string;
          id: string;
          updatedBy?: string;
        },
        {
          _creationTime: number;
          _id: string;
          contentTypeName: string;
          createdBy?: string;
          data: any;
          deletedAt?: number;
          firstPublishedAt?: number;
          lastPublishedAt?: number;
          locale?: string;
          lockExpiresAt?: number;
          lockedBy?: string;
          primaryEntryId?: string;
          scheduledPublishAt?: number;
          searchText?: string;
          slug: string;
          status: string;
          updatedBy?: string;
          version: number;
        }
      >;
      restoreEntry: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          id: string;
          restoredBy?: string;
        },
        {
          _creationTime: number;
          _id: string;
          contentTypeName: string;
          createdBy?: string;
          data: any;
          deletedAt?: number;
          firstPublishedAt?: number;
          lastPublishedAt?: number;
          locale?: string;
          lockExpiresAt?: number;
          lockedBy?: string;
          primaryEntryId?: string;
          scheduledPublishAt?: number;
          searchText?: string;
          slug: string;
          status: string;
          updatedBy?: string;
          version: number;
        }
      >;
      unpublishEntry: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          id: string;
          updatedBy?: string;
        },
        {
          _creationTime: number;
          _id: string;
          contentTypeName: string;
          createdBy?: string;
          data: any;
          deletedAt?: number;
          firstPublishedAt?: number;
          lastPublishedAt?: number;
          locale?: string;
          lockExpiresAt?: number;
          lockedBy?: string;
          primaryEntryId?: string;
          scheduledPublishAt?: number;
          searchText?: string;
          slug: string;
          status: string;
          updatedBy?: string;
          version: number;
        }
      >;
      updateEntry: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          data?: any;
          id: string;
          regenerateSlug?: boolean;
          scheduledPublishAt?: number;
          slug?: string;
          status?: string;
          updatedBy?: string;
        },
        {
          _creationTime: number;
          _id: string;
          contentTypeName: string;
          createdBy?: string;
          data: any;
          deletedAt?: number;
          firstPublishedAt?: number;
          lastPublishedAt?: number;
          locale?: string;
          lockExpiresAt?: number;
          lockedBy?: string;
          primaryEntryId?: string;
          scheduledPublishAt?: number;
          searchText?: string;
          slug: string;
          status: string;
          updatedBy?: string;
          version: number;
        }
      >;
    };
    contentEntryValidation: {
      validateEntry: FunctionReference<
        "query",
        "internal",
        {
          contentTypeId: string;
          data: any;
          options?: { strictFields?: boolean; validateReferences?: boolean };
        },
        {
          contentTypeDisplayName?: string;
          contentTypeName?: string;
          errors: Array<{ code: string; field: string; message: string }>;
          referencesValidated: boolean;
          valid: boolean;
        }
      >;
    };
    contentLock: {
      acquireLock: FunctionReference<
        "mutation",
        "internal",
        { id: string; lockDuration?: number; userId: string },
        {
          currentLockExpiresAt?: number;
          currentLockHolder?: string;
          entry?: {
            _creationTime: number;
            _id: string;
            contentTypeName: string;
            createdBy?: string;
            data: any;
            deletedAt?: number;
            firstPublishedAt?: number;
            lastPublishedAt?: number;
            locale?: string;
            lockExpiresAt?: number;
            lockedBy?: string;
            primaryEntryId?: string;
            scheduledPublishAt?: number;
            searchText?: string;
            slug: string;
            status: string;
            updatedBy?: string;
            version: number;
          };
          error?: string;
          success: boolean;
        }
      >;
      checkLock: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          isExpired?: boolean;
          isLocked: boolean;
          lockExpiresAt?: number;
          lockedBy?: string;
          timeRemaining?: number;
        }
      >;
      forceReleaseLock: FunctionReference<
        "mutation",
        "internal",
        { id: string; releasedBy: string },
        {
          _creationTime: number;
          _id: string;
          contentTypeName: string;
          createdBy?: string;
          data: any;
          deletedAt?: number;
          firstPublishedAt?: number;
          lastPublishedAt?: number;
          locale?: string;
          lockExpiresAt?: number;
          lockedBy?: string;
          primaryEntryId?: string;
          scheduledPublishAt?: number;
          searchText?: string;
          slug: string;
          status: string;
          updatedBy?: string;
          version: number;
        }
      >;
      listLockedEntries: FunctionReference<
        "query",
        "internal",
        {
          contentTypeName?: string;
          lockedBy?: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string | null;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            contentTypeName: string;
            createdBy?: string;
            data: any;
            deletedAt?: number;
            firstPublishedAt?: number;
            lastPublishedAt?: number;
            locale?: string;
            lockExpiresAt?: number;
            lockedBy?: string;
            primaryEntryId?: string;
            scheduledPublishAt?: number;
            searchText?: string;
            slug: string;
            status: string;
            timeRemaining?: number;
            updatedBy?: string;
            version: number;
          }>;
        }
      >;
      releaseLock: FunctionReference<
        "mutation",
        "internal",
        { id: string; userId: string },
        {
          _creationTime: number;
          _id: string;
          contentTypeName: string;
          createdBy?: string;
          data: any;
          deletedAt?: number;
          firstPublishedAt?: number;
          lastPublishedAt?: number;
          locale?: string;
          lockExpiresAt?: number;
          lockedBy?: string;
          primaryEntryId?: string;
          scheduledPublishAt?: number;
          searchText?: string;
          slug: string;
          status: string;
          updatedBy?: string;
          version: number;
        }
      >;
      renewLock: FunctionReference<
        "mutation",
        "internal",
        { id: string; lockDuration?: number; userId: string },
        {
          _creationTime: number;
          _id: string;
          contentTypeName: string;
          createdBy?: string;
          data: any;
          deletedAt?: number;
          firstPublishedAt?: number;
          lastPublishedAt?: number;
          locale?: string;
          lockExpiresAt?: number;
          lockedBy?: string;
          primaryEntryId?: string;
          scheduledPublishAt?: number;
          searchText?: string;
          slug: string;
          status: string;
          updatedBy?: string;
          version: number;
        }
      >;
    };
    contentTypeMigration: {
      getTransformationTypes: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          description: string;
          fromType: string;
          toType: string;
          type: string;
        }>
      >;
      migrateContentType: FunctionReference<
        "mutation",
        "internal",
        {
          changeDescription?: string;
          contentTypeId: string;
          createVersionSnapshots?: boolean;
          dryRun?: boolean;
          entryIds?: Array<string>;
          migratedBy?: string;
          migrations: Array<{
            customTransformation?: string;
            defaultValue?: any;
            fieldName?: string;
            newFieldName?: string;
            oldFieldName?: string;
            preserveEmpty?: boolean;
            transformation?:
              | "TEXT_TO_NUMBER"
              | "NUMBER_TO_TEXT"
              | "TEXT_TO_BOOLEAN"
              | "BOOLEAN_TO_TEXT"
              | "TEXT_TO_DATE"
              | "DATE_TO_TEXT"
              | "TEXT_TO_JSON"
              | "JSON_TO_TEXT"
              | "SINGLE_TO_ARRAY"
              | "ARRAY_TO_SINGLE"
              | "SELECT_VALUE_REMAP";
            type:
              | "ADD_FIELD"
              | "REMOVE_FIELD"
              | "RENAME_FIELD"
              | "TRANSFORM_FIELD"
              | "SET_DEFAULT";
            valueMap?: any;
          }>;
          statusFilter?: Array<
            "draft" | "published" | "archived" | "scheduled"
          >;
        },
        {
          dryRun: boolean;
          failureCount: number;
          results: Array<{
            changes?: Array<{
              fieldName: string;
              newValue?: any;
              oldValue?: any;
              operation:
                | "ADD_FIELD"
                | "REMOVE_FIELD"
                | "RENAME_FIELD"
                | "TRANSFORM_FIELD"
                | "SET_DEFAULT";
            }>;
            entryId: string;
            error?: string;
            slug: string;
            success: boolean;
          }>;
          skippedCount: number;
          successCount: number;
          totalEntries: number;
          versionSnapshotsCreated: number;
        }
      >;
      previewMigration: FunctionReference<
        "query",
        "internal",
        {
          contentTypeId: string;
          entryIds?: Array<string>;
          limit?: number;
          migrations: Array<{
            customTransformation?: string;
            defaultValue?: any;
            fieldName?: string;
            newFieldName?: string;
            oldFieldName?: string;
            preserveEmpty?: boolean;
            transformation?:
              | "TEXT_TO_NUMBER"
              | "NUMBER_TO_TEXT"
              | "TEXT_TO_BOOLEAN"
              | "BOOLEAN_TO_TEXT"
              | "TEXT_TO_DATE"
              | "DATE_TO_TEXT"
              | "TEXT_TO_JSON"
              | "JSON_TO_TEXT"
              | "SINGLE_TO_ARRAY"
              | "ARRAY_TO_SINGLE"
              | "SELECT_VALUE_REMAP";
            type:
              | "ADD_FIELD"
              | "REMOVE_FIELD"
              | "RENAME_FIELD"
              | "TRANSFORM_FIELD"
              | "SET_DEFAULT";
            valueMap?: any;
          }>;
          statusFilter?: Array<
            "draft" | "published" | "archived" | "scheduled"
          >;
        },
        {
          previewedEntries: number;
          results: Array<{
            changes?: Array<{
              fieldName: string;
              newValue?: any;
              oldValue?: any;
              operation:
                | "ADD_FIELD"
                | "REMOVE_FIELD"
                | "RENAME_FIELD"
                | "TRANSFORM_FIELD"
                | "SET_DEFAULT";
            }>;
            entryId: string;
            error?: string;
            slug: string;
            success: boolean;
          }>;
          summary: {
            entriesWithChanges: number;
            entriesWithoutChanges: number;
            operationCounts: any;
          };
          totalEntries: number;
        }
      >;
    };
    contentTypeMutations: {
      createContentType: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          createdBy: string;
          description?: string;
          displayName: string;
          fields: Array<
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  maxLength?: number;
                  minLength?: number;
                  multiline?: boolean;
                  pattern?: string;
                  patternMessage?: string;
                  placeholder?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "text";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  max?: number;
                  min?: number;
                  precision?: number;
                  prefix?: string;
                  step?: number;
                  suffix?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "number";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { falseLabel?: string; trueLabel?: string };
                required: boolean;
                searchable?: boolean;
                type: "boolean";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowedBlocks?: Array<string>;
                  allowedMarks?: Array<string>;
                  maxLength?: number;
                  placeholder?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "richText";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowedMimeTypes?: Array<string>;
                  maxFileSize?: number;
                  maxItems?: number;
                  mediaType?:
                    | "image"
                    | "video"
                    | "audio"
                    | "document"
                    | "other";
                  multiple?: boolean;
                };
                required: boolean;
                searchable?: boolean;
                type: "media";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { options?: Array<{ label: string; value: string }> };
                required: boolean;
                searchable?: boolean;
                type: "select";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  maxSelections?: number;
                  minSelections?: number;
                  options?: Array<{ label: string; value: string }>;
                };
                required: boolean;
                searchable?: boolean;
                type: "multiSelect";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowCreate?: boolean;
                  maxTags?: number;
                  minTags?: number;
                  taxonomyId?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "tags";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowMultiple?: boolean;
                  depth?: number;
                  maxSelections?: number;
                  taxonomyName?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "category";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { schema?: any };
                required: boolean;
                searchable?: boolean;
                type: "json";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { format?: string; max?: number; min?: number };
                required: boolean;
                searchable?: boolean;
                type: "date";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  format?: string;
                  max?: number;
                  min?: number;
                  timezone?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "datetime";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowedContentTypes?: Array<string>;
                  maxItems?: number;
                  minItems?: number;
                  multiple?: boolean;
                };
                required: boolean;
                searchable?: boolean;
                type: "reference";
              }
          >;
          icon?: string;
          name: string;
          singleton?: boolean;
          slugField?: string;
          sortOrder?: number;
          titleField?: string;
        },
        {
          _creationTime: number;
          _id: string;
          createdBy: string;
          deletedAt?: number;
          description?: string;
          displayName: string;
          fields: Array<
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  maxLength?: number;
                  minLength?: number;
                  multiline?: boolean;
                  pattern?: string;
                  patternMessage?: string;
                  placeholder?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "text";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  max?: number;
                  min?: number;
                  precision?: number;
                  prefix?: string;
                  step?: number;
                  suffix?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "number";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { falseLabel?: string; trueLabel?: string };
                required: boolean;
                searchable?: boolean;
                type: "boolean";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowedBlocks?: Array<string>;
                  allowedMarks?: Array<string>;
                  maxLength?: number;
                  placeholder?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "richText";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowedMimeTypes?: Array<string>;
                  maxFileSize?: number;
                  maxItems?: number;
                  mediaType?:
                    | "image"
                    | "video"
                    | "audio"
                    | "document"
                    | "other";
                  multiple?: boolean;
                };
                required: boolean;
                searchable?: boolean;
                type: "media";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { options?: Array<{ label: string; value: string }> };
                required: boolean;
                searchable?: boolean;
                type: "select";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  maxSelections?: number;
                  minSelections?: number;
                  options?: Array<{ label: string; value: string }>;
                };
                required: boolean;
                searchable?: boolean;
                type: "multiSelect";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowCreate?: boolean;
                  maxTags?: number;
                  minTags?: number;
                  taxonomyId?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "tags";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowMultiple?: boolean;
                  depth?: number;
                  maxSelections?: number;
                  taxonomyName?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "category";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { schema?: any };
                required: boolean;
                searchable?: boolean;
                type: "json";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { format?: string; max?: number; min?: number };
                required: boolean;
                searchable?: boolean;
                type: "date";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  format?: string;
                  max?: number;
                  min?: number;
                  timezone?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "datetime";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowedContentTypes?: Array<string>;
                  maxItems?: number;
                  minItems?: number;
                  multiple?: boolean;
                };
                required: boolean;
                searchable?: boolean;
                type: "reference";
              }
          >;
          icon?: string;
          isActive: boolean;
          name: string;
          singleton?: boolean;
          slugField?: string;
          sortOrder?: number;
          titleField?: string;
          updatedBy?: string;
        }
      >;
      deleteContentType: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          cascade?: boolean;
          deletedBy?: string;
          hardDelete?: boolean;
          id: string;
        },
        {
          deletedEntriesCount: number;
          deletedId: string;
          deletedVersionsCount: number;
          success: boolean;
          wasHardDelete: boolean;
        }
      >;
      updateContentType: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          description?: string;
          displayName?: string;
          fields?: Array<
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  maxLength?: number;
                  minLength?: number;
                  multiline?: boolean;
                  pattern?: string;
                  patternMessage?: string;
                  placeholder?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "text";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  max?: number;
                  min?: number;
                  precision?: number;
                  prefix?: string;
                  step?: number;
                  suffix?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "number";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { falseLabel?: string; trueLabel?: string };
                required: boolean;
                searchable?: boolean;
                type: "boolean";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowedBlocks?: Array<string>;
                  allowedMarks?: Array<string>;
                  maxLength?: number;
                  placeholder?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "richText";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowedMimeTypes?: Array<string>;
                  maxFileSize?: number;
                  maxItems?: number;
                  mediaType?:
                    | "image"
                    | "video"
                    | "audio"
                    | "document"
                    | "other";
                  multiple?: boolean;
                };
                required: boolean;
                searchable?: boolean;
                type: "media";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { options?: Array<{ label: string; value: string }> };
                required: boolean;
                searchable?: boolean;
                type: "select";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  maxSelections?: number;
                  minSelections?: number;
                  options?: Array<{ label: string; value: string }>;
                };
                required: boolean;
                searchable?: boolean;
                type: "multiSelect";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowCreate?: boolean;
                  maxTags?: number;
                  minTags?: number;
                  taxonomyId?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "tags";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowMultiple?: boolean;
                  depth?: number;
                  maxSelections?: number;
                  taxonomyName?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "category";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { schema?: any };
                required: boolean;
                searchable?: boolean;
                type: "json";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { format?: string; max?: number; min?: number };
                required: boolean;
                searchable?: boolean;
                type: "date";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  format?: string;
                  max?: number;
                  min?: number;
                  timezone?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "datetime";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowedContentTypes?: Array<string>;
                  maxItems?: number;
                  minItems?: number;
                  multiple?: boolean;
                };
                required: boolean;
                searchable?: boolean;
                type: "reference";
              }
          >;
          force?: boolean;
          icon?: string;
          id: string;
          isActive?: boolean;
          singleton?: boolean;
          slugField?: string;
          sortOrder?: number;
          titleField?: string;
          updatedBy?: string;
        },
        {
          _creationTime: number;
          _id: string;
          breakingChanges?: Array<{
            affectedEntriesCount: number;
            fieldName: string;
            message: string;
            type:
              | "FIELD_REMOVED"
              | "FIELD_TYPE_CHANGED"
              | "FIELD_MADE_REQUIRED"
              | "SELECT_OPTIONS_REMOVED"
              | "REFERENCE_TYPES_RESTRICTED"
              | "VALIDATION_TIGHTENED";
          }>;
          createdBy: string;
          deletedAt?: number;
          description?: string;
          displayName: string;
          fields: Array<
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  maxLength?: number;
                  minLength?: number;
                  multiline?: boolean;
                  pattern?: string;
                  patternMessage?: string;
                  placeholder?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "text";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  max?: number;
                  min?: number;
                  precision?: number;
                  prefix?: string;
                  step?: number;
                  suffix?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "number";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { falseLabel?: string; trueLabel?: string };
                required: boolean;
                searchable?: boolean;
                type: "boolean";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowedBlocks?: Array<string>;
                  allowedMarks?: Array<string>;
                  maxLength?: number;
                  placeholder?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "richText";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowedMimeTypes?: Array<string>;
                  maxFileSize?: number;
                  maxItems?: number;
                  mediaType?:
                    | "image"
                    | "video"
                    | "audio"
                    | "document"
                    | "other";
                  multiple?: boolean;
                };
                required: boolean;
                searchable?: boolean;
                type: "media";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { options?: Array<{ label: string; value: string }> };
                required: boolean;
                searchable?: boolean;
                type: "select";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  maxSelections?: number;
                  minSelections?: number;
                  options?: Array<{ label: string; value: string }>;
                };
                required: boolean;
                searchable?: boolean;
                type: "multiSelect";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowCreate?: boolean;
                  maxTags?: number;
                  minTags?: number;
                  taxonomyId?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "tags";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowMultiple?: boolean;
                  depth?: number;
                  maxSelections?: number;
                  taxonomyName?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "category";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { schema?: any };
                required: boolean;
                searchable?: boolean;
                type: "json";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { format?: string; max?: number; min?: number };
                required: boolean;
                searchable?: boolean;
                type: "date";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  format?: string;
                  max?: number;
                  min?: number;
                  timezone?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "datetime";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowedContentTypes?: Array<string>;
                  maxItems?: number;
                  minItems?: number;
                  multiple?: boolean;
                };
                required: boolean;
                searchable?: boolean;
                type: "reference";
              }
          >;
          icon?: string;
          isActive: boolean;
          name: string;
          singleton?: boolean;
          slugField?: string;
          sortOrder?: number;
          titleField?: string;
          updatedBy?: string;
        }
      >;
    };
    contentTypes: {
      get: FunctionReference<
        "query",
        "internal",
        { id?: string; includeDeleted?: boolean; name?: string },
        {
          _creationTime: number;
          _id: string;
          createdBy: string;
          deletedAt?: number;
          description?: string;
          displayName: string;
          fields: Array<
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  maxLength?: number;
                  minLength?: number;
                  multiline?: boolean;
                  pattern?: string;
                  patternMessage?: string;
                  placeholder?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "text";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  max?: number;
                  min?: number;
                  precision?: number;
                  prefix?: string;
                  step?: number;
                  suffix?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "number";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { falseLabel?: string; trueLabel?: string };
                required: boolean;
                searchable?: boolean;
                type: "boolean";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowedBlocks?: Array<string>;
                  allowedMarks?: Array<string>;
                  maxLength?: number;
                  placeholder?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "richText";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowedMimeTypes?: Array<string>;
                  maxFileSize?: number;
                  maxItems?: number;
                  mediaType?:
                    | "image"
                    | "video"
                    | "audio"
                    | "document"
                    | "other";
                  multiple?: boolean;
                };
                required: boolean;
                searchable?: boolean;
                type: "media";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { options?: Array<{ label: string; value: string }> };
                required: boolean;
                searchable?: boolean;
                type: "select";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  maxSelections?: number;
                  minSelections?: number;
                  options?: Array<{ label: string; value: string }>;
                };
                required: boolean;
                searchable?: boolean;
                type: "multiSelect";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowCreate?: boolean;
                  maxTags?: number;
                  minTags?: number;
                  taxonomyId?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "tags";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowMultiple?: boolean;
                  depth?: number;
                  maxSelections?: number;
                  taxonomyName?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "category";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { schema?: any };
                required: boolean;
                searchable?: boolean;
                type: "json";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: { format?: string; max?: number; min?: number };
                required: boolean;
                searchable?: boolean;
                type: "date";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  format?: string;
                  max?: number;
                  min?: number;
                  timezone?: string;
                };
                required: boolean;
                searchable?: boolean;
                type: "datetime";
              }
            | {
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowedContentTypes?: Array<string>;
                  maxItems?: number;
                  minItems?: number;
                  multiple?: boolean;
                };
                required: boolean;
                searchable?: boolean;
                type: "reference";
              }
          >;
          icon?: string;
          isActive: boolean;
          name: string;
          singleton?: boolean;
          slugField?: string;
          sortOrder?: number;
          titleField?: string;
          updatedBy?: string;
        } | null
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          includeDeleted?: boolean;
          isActive?: boolean;
          paginationOpts?: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          sortBy?: "name" | "createdAt";
          sortDirection?: "asc" | "desc";
        },
        {
          continueCursor: string | null;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            createdBy: string;
            deletedAt?: number;
            description?: string;
            displayName: string;
            fields: Array<
              | {
                  defaultValue?: any;
                  description?: string;
                  label: string;
                  localized?: boolean;
                  name: string;
                  options?: {
                    maxLength?: number;
                    minLength?: number;
                    multiline?: boolean;
                    pattern?: string;
                    patternMessage?: string;
                    placeholder?: string;
                  };
                  required: boolean;
                  searchable?: boolean;
                  type: "text";
                }
              | {
                  defaultValue?: any;
                  description?: string;
                  label: string;
                  localized?: boolean;
                  name: string;
                  options?: {
                    max?: number;
                    min?: number;
                    precision?: number;
                    prefix?: string;
                    step?: number;
                    suffix?: string;
                  };
                  required: boolean;
                  searchable?: boolean;
                  type: "number";
                }
              | {
                  defaultValue?: any;
                  description?: string;
                  label: string;
                  localized?: boolean;
                  name: string;
                  options?: { falseLabel?: string; trueLabel?: string };
                  required: boolean;
                  searchable?: boolean;
                  type: "boolean";
                }
              | {
                  defaultValue?: any;
                  description?: string;
                  label: string;
                  localized?: boolean;
                  name: string;
                  options?: {
                    allowedBlocks?: Array<string>;
                    allowedMarks?: Array<string>;
                    maxLength?: number;
                    placeholder?: string;
                  };
                  required: boolean;
                  searchable?: boolean;
                  type: "richText";
                }
              | {
                  defaultValue?: any;
                  description?: string;
                  label: string;
                  localized?: boolean;
                  name: string;
                  options?: {
                    allowedMimeTypes?: Array<string>;
                    maxFileSize?: number;
                    maxItems?: number;
                    mediaType?:
                      | "image"
                      | "video"
                      | "audio"
                      | "document"
                      | "other";
                    multiple?: boolean;
                  };
                  required: boolean;
                  searchable?: boolean;
                  type: "media";
                }
              | {
                  defaultValue?: any;
                  description?: string;
                  label: string;
                  localized?: boolean;
                  name: string;
                  options?: {
                    options?: Array<{ label: string; value: string }>;
                  };
                  required: boolean;
                  searchable?: boolean;
                  type: "select";
                }
              | {
                  defaultValue?: any;
                  description?: string;
                  label: string;
                  localized?: boolean;
                  name: string;
                  options?: {
                    maxSelections?: number;
                    minSelections?: number;
                    options?: Array<{ label: string; value: string }>;
                  };
                  required: boolean;
                  searchable?: boolean;
                  type: "multiSelect";
                }
              | {
                  defaultValue?: any;
                  description?: string;
                  label: string;
                  localized?: boolean;
                  name: string;
                  options?: {
                    allowCreate?: boolean;
                    maxTags?: number;
                    minTags?: number;
                    taxonomyId?: string;
                  };
                  required: boolean;
                  searchable?: boolean;
                  type: "tags";
                }
              | {
                  defaultValue?: any;
                  description?: string;
                  label: string;
                  localized?: boolean;
                  name: string;
                  options?: {
                    allowMultiple?: boolean;
                    depth?: number;
                    maxSelections?: number;
                    taxonomyName?: string;
                  };
                  required: boolean;
                  searchable?: boolean;
                  type: "category";
                }
              | {
                  defaultValue?: any;
                  description?: string;
                  label: string;
                  localized?: boolean;
                  name: string;
                  options?: { schema?: any };
                  required: boolean;
                  searchable?: boolean;
                  type: "json";
                }
              | {
                  defaultValue?: any;
                  description?: string;
                  label: string;
                  localized?: boolean;
                  name: string;
                  options?: { format?: string; max?: number; min?: number };
                  required: boolean;
                  searchable?: boolean;
                  type: "date";
                }
              | {
                  defaultValue?: any;
                  description?: string;
                  label: string;
                  localized?: boolean;
                  name: string;
                  options?: {
                    format?: string;
                    max?: number;
                    min?: number;
                    timezone?: string;
                  };
                  required: boolean;
                  searchable?: boolean;
                  type: "datetime";
                }
              | {
                  defaultValue?: any;
                  description?: string;
                  label: string;
                  localized?: boolean;
                  name: string;
                  options?: {
                    allowedContentTypes?: Array<string>;
                    maxItems?: number;
                    minItems?: number;
                    multiple?: boolean;
                  };
                  required: boolean;
                  searchable?: boolean;
                  type: "reference";
                }
            >;
            icon?: string;
            isActive: boolean;
            name: string;
            singleton?: boolean;
            slugField?: string;
            sortOrder?: number;
            titleField?: string;
            updatedBy?: string;
          }>;
        }
      >;
    };
    eventEmitter: {
      cleanupOldEvents: FunctionReference<
        "mutation",
        "internal",
        { retentionDays?: number },
        { deletedCount: number }
      >;
      getResourceEvents: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          resourceId: string;
          resourceType:
            | "contentEntry"
            | "contentType"
            | "mediaAsset"
            | "mediaFolder";
        },
        Array<{
          _creationTime: number;
          _id: string;
          action:
            | "created"
            | "updated"
            | "published"
            | "unpublished"
            | "deleted"
            | "restored"
            | "duplicated"
            | "scheduled";
          correlationId?: string;
          eventType: string;
          metadata?: any;
          payload: any;
          processed: boolean;
          processedAt?: number;
          resourceId: string;
          resourceType:
            | "contentEntry"
            | "contentType"
            | "mediaAsset"
            | "mediaFolder";
          userId?: string;
        }>
      >;
      getUnprocessedEvents: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        Array<{
          _creationTime: number;
          _id: string;
          action:
            | "created"
            | "updated"
            | "published"
            | "unpublished"
            | "deleted"
            | "restored"
            | "duplicated"
            | "scheduled";
          correlationId?: string;
          eventType: string;
          metadata?: any;
          payload: any;
          processed: boolean;
          processedAt?: number;
          resourceId: string;
          resourceType:
            | "contentEntry"
            | "contentType"
            | "mediaAsset"
            | "mediaFolder";
          userId?: string;
        }>
      >;
      listEvents: FunctionReference<
        "query",
        "internal",
        {
          action?:
            | "created"
            | "updated"
            | "published"
            | "unpublished"
            | "deleted"
            | "restored"
            | "duplicated"
            | "scheduled";
          cursor?: string;
          limit?: number;
          processed?: boolean;
          resourceType?:
            | "contentEntry"
            | "contentType"
            | "mediaAsset"
            | "mediaFolder";
        },
        {
          events: Array<{
            _creationTime: number;
            _id: string;
            action:
              | "created"
              | "updated"
              | "published"
              | "unpublished"
              | "deleted"
              | "restored"
              | "duplicated"
              | "scheduled";
            correlationId?: string;
            eventType: string;
            metadata?: any;
            payload: any;
            processed: boolean;
            processedAt?: number;
            resourceId: string;
            resourceType:
              | "contentEntry"
              | "contentType"
              | "mediaAsset"
              | "mediaFolder";
            userId?: string;
          }>;
          hasMore: boolean;
        }
      >;
      markEventsProcessed: FunctionReference<
        "mutation",
        "internal",
        { eventIds: Array<string> },
        { processedCount: number }
      >;
    };
    exportImport: {
      exportEntries: FunctionReference<
        "query",
        "internal",
        {
          contentTypeId?: string;
          contentTypeName?: string;
          description?: string;
          includeContentTypes?: boolean;
          includeDeleted?: boolean;
          limit?: number;
          locale?: string;
          source?: string;
          status?: string;
          statusIn?: Array<string>;
        },
        {
          contentTypes?: Array<{
            description?: string;
            displayName: string;
            fields: Array<{
              defaultValue?: any;
              description?: string;
              label: string;
              localized?: boolean;
              name: string;
              options?: {
                allowCreate?: boolean;
                allowMultiple?: boolean;
                allowedBlocks?: Array<string>;
                allowedContentTypes?: Array<string>;
                allowedMarks?: Array<string>;
                allowedMimeTypes?: Array<string>;
                max?: number;
                maxFileSize?: number;
                maxLength?: number;
                maxTags?: number;
                min?: number;
                minItems?: number;
                minLength?: number;
                minTags?: number;
                multiple?: boolean;
                options?: Array<{ label: string; value: string }>;
                pattern?: string;
                precision?: number;
                step?: number;
                taxonomyId?: string;
              };
              required: boolean;
              searchable?: boolean;
              type:
                | "text"
                | "richText"
                | "number"
                | "boolean"
                | "date"
                | "datetime"
                | "reference"
                | "media"
                | "json"
                | "select"
                | "multiSelect"
                | "tags"
                | "category";
            }>;
            icon?: string;
            name: string;
            singleton?: boolean;
            slugField?: string;
            titleField?: string;
          }>;
          entries: Array<{
            _originalId: string;
            contentTypeName: string;
            createdAt: number;
            createdBy?: string;
            data: any;
            firstPublishedAt?: number;
            lastPublishedAt?: number;
            locale?: string;
            scheduledPublishAt?: number;
            slug: string;
            status: string;
            version: number;
          }>;
          exportedAt: number;
          metadata?: {
            description?: string;
            entriesByType?: any;
            source?: string;
            totalEntries: number;
          };
          version: "1.0";
        }
      >;
      getExportPreview: FunctionReference<
        "query",
        "internal",
        {
          contentTypeId?: string;
          contentTypeName?: string;
          includeDeleted?: boolean;
          locale?: string;
          status?: string;
          statusIn?: Array<string>;
        },
        {
          contentTypes: Array<string>;
          entriesByStatus: any;
          entriesByType: any;
          totalEntries: number;
        }
      >;
      importEntries: FunctionReference<
        "mutation",
        "internal",
        {
          contentTypeFilter?: Array<string>;
          data: {
            contentTypes?: Array<{
              description?: string;
              displayName: string;
              fields: Array<{
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowCreate?: boolean;
                  allowMultiple?: boolean;
                  allowedBlocks?: Array<string>;
                  allowedContentTypes?: Array<string>;
                  allowedMarks?: Array<string>;
                  allowedMimeTypes?: Array<string>;
                  max?: number;
                  maxFileSize?: number;
                  maxLength?: number;
                  maxTags?: number;
                  min?: number;
                  minItems?: number;
                  minLength?: number;
                  minTags?: number;
                  multiple?: boolean;
                  options?: Array<{ label: string; value: string }>;
                  pattern?: string;
                  precision?: number;
                  step?: number;
                  taxonomyId?: string;
                };
                required: boolean;
                searchable?: boolean;
                type:
                  | "text"
                  | "richText"
                  | "number"
                  | "boolean"
                  | "date"
                  | "datetime"
                  | "reference"
                  | "media"
                  | "json"
                  | "select"
                  | "multiSelect"
                  | "tags"
                  | "category";
              }>;
              icon?: string;
              name: string;
              singleton?: boolean;
              slugField?: string;
              titleField?: string;
            }>;
            entries: Array<{
              _originalId: string;
              contentTypeName: string;
              createdAt: number;
              createdBy?: string;
              data: any;
              firstPublishedAt?: number;
              lastPublishedAt?: number;
              locale?: string;
              scheduledPublishAt?: number;
              slug: string;
              status: string;
              version: number;
            }>;
            exportedAt: number;
            metadata?: {
              description?: string;
              entriesByType?: any;
              source?: string;
              totalEntries: number;
            };
            version: "1.0";
          };
          dryRun?: boolean;
          importedBy?: string;
          onConflict?: "skip" | "update" | "error";
          preserveStatus?: boolean;
        },
        {
          created: number;
          failed: number;
          idMapping: any;
          results: Array<{
            action: "created" | "updated" | "skipped" | "failed";
            contentTypeName: string;
            error?: string;
            newId?: string;
            originalId: string;
            slug: string;
          }>;
          skipped: number;
          success: boolean;
          totalProcessed: number;
          updated: number;
          validationErrors?: Array<string>;
        }
      >;
      validateImportPackage: FunctionReference<
        "query",
        "internal",
        {
          contentTypeFilter?: Array<string>;
          data: {
            contentTypes?: Array<{
              description?: string;
              displayName: string;
              fields: Array<{
                defaultValue?: any;
                description?: string;
                label: string;
                localized?: boolean;
                name: string;
                options?: {
                  allowCreate?: boolean;
                  allowMultiple?: boolean;
                  allowedBlocks?: Array<string>;
                  allowedContentTypes?: Array<string>;
                  allowedMarks?: Array<string>;
                  allowedMimeTypes?: Array<string>;
                  max?: number;
                  maxFileSize?: number;
                  maxLength?: number;
                  maxTags?: number;
                  min?: number;
                  minItems?: number;
                  minLength?: number;
                  minTags?: number;
                  multiple?: boolean;
                  options?: Array<{ label: string; value: string }>;
                  pattern?: string;
                  precision?: number;
                  step?: number;
                  taxonomyId?: string;
                };
                required: boolean;
                searchable?: boolean;
                type:
                  | "text"
                  | "richText"
                  | "number"
                  | "boolean"
                  | "date"
                  | "datetime"
                  | "reference"
                  | "media"
                  | "json"
                  | "select"
                  | "multiSelect"
                  | "tags"
                  | "category";
              }>;
              icon?: string;
              name: string;
              singleton?: boolean;
              slugField?: string;
              titleField?: string;
            }>;
            entries: Array<{
              _originalId: string;
              contentTypeName: string;
              createdAt: number;
              createdBy?: string;
              data: any;
              firstPublishedAt?: number;
              lastPublishedAt?: number;
              locale?: string;
              scheduledPublishAt?: number;
              slug: string;
              status: string;
              version: number;
            }>;
            exportedAt: number;
            metadata?: {
              description?: string;
              entriesByType?: any;
              source?: string;
              totalEntries: number;
            };
            version: "1.0";
          };
        },
        {
          invalidEntries: number;
          missingContentTypes: Array<string>;
          totalEntries: number;
          valid: boolean;
          validEntries: number;
          validationErrors: Array<{
            contentTypeName: string;
            errors: Array<string>;
            slug: string;
          }>;
        }
      >;
    };
    mediaAssetMutations: {
      createMediaAsset: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          altText?: string;
          createdBy?: string;
          description?: string;
          duration?: number;
          height?: number;
          metadata?: Record<string, any>;
          mimeType: string;
          name: string;
          parentId?: string;
          size?: number;
          storageId: string;
          tags?: Array<string>;
          title?: string;
          width?: number;
        },
        | {
            _creationTime: number;
            _id: string;
            altText?: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            duration?: number;
            height?: number;
            kind: "asset";
            metadata?: Record<string, any>;
            mimeType: string;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            storageId: string;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
            width?: number;
          }
        | {
            _creationTime: number;
            _id: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            kind: "folder";
            metadata?: Record<string, any>;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            sortOrder?: number;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
          }
      >;
      deleteMediaAsset: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          deletedBy?: string;
          forceDelete?: boolean;
          hardDelete?: boolean;
          id: string;
        },
        {
          _creationTime: number;
          _id: string;
          altText?: string;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          duration?: number;
          height?: number;
          kind: "asset";
          metadata?: Record<string, any>;
          mimeType: string;
          name: string;
          parentId?: string;
          path: string;
          searchText?: string;
          size?: number;
          storageFileDeleted?: boolean;
          storageId: string;
          tags?: Array<string>;
          title?: string;
          updatedBy?: string;
          width?: number;
        }
      >;
      findMediaAssetReferences: FunctionReference<
        "query",
        "internal",
        { limit?: number; mediaAssetId: string },
        Array<{
          contentTypeName: string;
          entryId: string;
          fields: Array<string>;
          slug: string;
        }>
      >;
      moveMediaAssets: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          assetIds: Array<string>;
          movedBy?: string;
          targetFolderId?: string;
        },
        {
          failed: number;
          results: Array<{
            error?: string;
            id: string;
            previousFolderId?: string;
            success: boolean;
          }>;
          succeeded: number;
          targetFolderId?: string;
          targetFolderPath?: string;
          total: number;
        }
      >;
      restoreMediaAsset: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          id: string;
          restoredBy?: string;
        },
        | {
            _creationTime: number;
            _id: string;
            altText?: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            duration?: number;
            height?: number;
            kind: "asset";
            metadata?: Record<string, any>;
            mimeType: string;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            storageId: string;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
            width?: number;
          }
        | {
            _creationTime: number;
            _id: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            kind: "folder";
            metadata?: Record<string, any>;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            sortOrder?: number;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
          }
      >;
      updateMediaAsset: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          altText?: string;
          description?: string;
          duration?: number;
          height?: number;
          id: string;
          metadata?: Record<string, any>;
          name?: string;
          parentId?: string;
          tags?: Array<string>;
          title?: string;
          updatedBy?: string;
          width?: number;
        },
        | {
            _creationTime: number;
            _id: string;
            altText?: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            duration?: number;
            height?: number;
            kind: "asset";
            metadata?: Record<string, any>;
            mimeType: string;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            storageId: string;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
            width?: number;
          }
        | {
            _creationTime: number;
            _id: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            kind: "folder";
            metadata?: Record<string, any>;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            sortOrder?: number;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
          }
      >;
    };
    mediaAssets: {
      count: FunctionReference<
        "query",
        "internal",
        {
          deletedOnly?: boolean;
          folderId?: string;
          includeDeleted?: boolean;
          mimeType?: string;
          mimeTypePrefix?: string;
        },
        { count: number }
      >;
      get: FunctionReference<
        "query",
        "internal",
        { id: string; includeDeleted?: boolean },
        {
          _creationTime: number;
          _id: string;
          altText?: string;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          duration?: number;
          height?: number;
          kind: "asset";
          metadata?: Record<string, any>;
          mimeType: string;
          name: string;
          optimizationHints: {
            aspectRatio?: number;
            durationSeconds?: number;
            hasTransparency?: boolean;
            isResizable: boolean;
            isVector?: boolean;
            suggestedMaxWidth?: number;
          };
          parentId?: string;
          path: string;
          searchText?: string;
          size?: number;
          storageId: string;
          tags?: Array<string>;
          title?: string;
          updatedBy?: string;
          url: string | null;
          width?: number;
        } | null
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          deletedOnly?: boolean;
          folderId?: string;
          includeDeleted?: boolean;
          includeRootLevel?: boolean;
          mimeType?: string;
          mimeTypePrefix?: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          search?: string;
          sortDirection?: "asc" | "desc";
          sortField?:
            | "_creationTime"
            | "filename"
            | "size"
            | "type"
            | "mimeType";
          tags?: Array<string>;
          type?: "image" | "video" | "audio" | "document" | "other";
        },
        {
          continueCursor: string | null;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            altText?: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            duration?: number;
            height?: number;
            kind: "asset";
            metadata?: Record<string, any>;
            mimeType: string;
            name: string;
            optimizationHints: {
              aspectRatio?: number;
              durationSeconds?: number;
              hasTransparency?: boolean;
              isResizable: boolean;
              isVector?: boolean;
              suggestedMaxWidth?: number;
            };
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            storageId: string;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
            url: string | null;
            width?: number;
          }>;
        }
      >;
    };
    mediaFolderMutations: {
      createMediaFolder: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          createdBy?: string;
          description?: string;
          metadata?: Record<string, any>;
          name: string;
          parentId?: string;
          sortOrder?: number;
          tags?: Array<string>;
          title?: string;
        },
        | {
            _creationTime: number;
            _id: string;
            altText?: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            duration?: number;
            height?: number;
            kind: "asset";
            metadata?: Record<string, any>;
            mimeType: string;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            storageId: string;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
            width?: number;
          }
        | {
            _creationTime: number;
            _id: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            kind: "folder";
            metadata?: Record<string, any>;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            sortOrder?: number;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
          }
      >;
      deleteMediaFolder: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          deletedBy?: string;
          hardDelete?: boolean;
          id: string;
          recursive?: boolean;
        },
        | {
            _creationTime: number;
            _id: string;
            altText?: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            duration?: number;
            height?: number;
            kind: "asset";
            metadata?: Record<string, any>;
            mimeType: string;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            storageId: string;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
            width?: number;
          }
        | {
            _creationTime: number;
            _id: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            kind: "folder";
            metadata?: Record<string, any>;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            sortOrder?: number;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
          }
      >;
      getFolderTree: FunctionReference<
        "query",
        "internal",
        { includeDeleted?: boolean },
        Array<
          | {
              _creationTime: number;
              _id: string;
              altText?: string;
              createdBy?: string;
              deletedAt?: number;
              description?: string;
              duration?: number;
              height?: number;
              kind: "asset";
              metadata?: Record<string, any>;
              mimeType: string;
              name: string;
              parentId?: string;
              path: string;
              searchText?: string;
              size?: number;
              storageId: string;
              tags?: Array<string>;
              title?: string;
              updatedBy?: string;
              width?: number;
            }
          | {
              _creationTime: number;
              _id: string;
              createdBy?: string;
              deletedAt?: number;
              description?: string;
              kind: "folder";
              metadata?: Record<string, any>;
              name: string;
              parentId?: string;
              path: string;
              searchText?: string;
              size?: number;
              sortOrder?: number;
              tags?: Array<string>;
              title?: string;
              updatedBy?: string;
            }
        >
      >;
      getMediaFolder: FunctionReference<
        "query",
        "internal",
        { id: string; includeDeleted?: boolean },
        | {
            _creationTime: number;
            _id: string;
            altText?: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            duration?: number;
            height?: number;
            kind: "asset";
            metadata?: Record<string, any>;
            mimeType: string;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            storageId: string;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
            width?: number;
          }
        | {
            _creationTime: number;
            _id: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            kind: "folder";
            metadata?: Record<string, any>;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            sortOrder?: number;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
          }
        | null
      >;
      getMediaFolderByPath: FunctionReference<
        "query",
        "internal",
        { includeDeleted?: boolean; path: string },
        | {
            _creationTime: number;
            _id: string;
            altText?: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            duration?: number;
            height?: number;
            kind: "asset";
            metadata?: Record<string, any>;
            mimeType: string;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            storageId: string;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
            width?: number;
          }
        | {
            _creationTime: number;
            _id: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            kind: "folder";
            metadata?: Record<string, any>;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            sortOrder?: number;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
          }
        | null
      >;
      listMediaFolders: FunctionReference<
        "query",
        "internal",
        { deletedOnly?: boolean; includeDeleted?: boolean; parentId?: string },
        Array<
          | {
              _creationTime: number;
              _id: string;
              altText?: string;
              createdBy?: string;
              deletedAt?: number;
              description?: string;
              duration?: number;
              height?: number;
              kind: "asset";
              metadata?: Record<string, any>;
              mimeType: string;
              name: string;
              parentId?: string;
              path: string;
              searchText?: string;
              size?: number;
              storageId: string;
              tags?: Array<string>;
              title?: string;
              updatedBy?: string;
              width?: number;
            }
          | {
              _creationTime: number;
              _id: string;
              createdBy?: string;
              deletedAt?: number;
              description?: string;
              kind: "folder";
              metadata?: Record<string, any>;
              name: string;
              parentId?: string;
              path: string;
              searchText?: string;
              size?: number;
              sortOrder?: number;
              tags?: Array<string>;
              title?: string;
              updatedBy?: string;
            }
        >
      >;
      moveMediaFolder: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          id: string;
          newParentId?: string;
          updatedBy?: string;
        },
        | {
            _creationTime: number;
            _id: string;
            altText?: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            duration?: number;
            height?: number;
            kind: "asset";
            metadata?: Record<string, any>;
            mimeType: string;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            storageId: string;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
            width?: number;
          }
        | {
            _creationTime: number;
            _id: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            kind: "folder";
            metadata?: Record<string, any>;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            sortOrder?: number;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
          }
      >;
      restoreMediaFolder: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          id: string;
          recursive?: boolean;
          restoredBy?: string;
        },
        | {
            _creationTime: number;
            _id: string;
            altText?: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            duration?: number;
            height?: number;
            kind: "asset";
            metadata?: Record<string, any>;
            mimeType: string;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            storageId: string;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
            width?: number;
          }
        | {
            _creationTime: number;
            _id: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            kind: "folder";
            metadata?: Record<string, any>;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            sortOrder?: number;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
          }
      >;
      updateMediaFolder: FunctionReference<
        "mutation",
        "internal",
        {
          _auth?: {
            resourceOwnerId?: string;
            role: string | null;
            userId: string;
          };
          description?: string;
          id: string;
          metadata?: Record<string, any>;
          name?: string;
          parentId?: string;
          sortOrder?: number;
          tags?: Array<string>;
          title?: string;
          updatedBy?: string;
        },
        | {
            _creationTime: number;
            _id: string;
            altText?: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            duration?: number;
            height?: number;
            kind: "asset";
            metadata?: Record<string, any>;
            mimeType: string;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            storageId: string;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
            width?: number;
          }
        | {
            _creationTime: number;
            _id: string;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            kind: "folder";
            metadata?: Record<string, any>;
            name: string;
            parentId?: string;
            path: string;
            searchText?: string;
            size?: number;
            sortOrder?: number;
            tags?: Array<string>;
            title?: string;
            updatedBy?: string;
          }
      >;
    };
    mediaUploadMutations: {
      generateUploadUrl: FunctionReference<
        "mutation",
        "internal",
        {
          allowedMimeTypes?: Array<string>;
          maxFileSize?: number;
          requestedBy?: string;
        },
        {
          allowedMimeTypes?: Array<string>;
          expiresAt: number;
          maxFileSize: number;
          uploadUrl: string;
        }
      >;
    };
    mediaVariantMutations: {
      createMediaVariant: FunctionReference<
        "mutation",
        "internal",
        {
          assetId: string;
          autoGenerated?: boolean;
          createdBy?: string;
          format: string;
          height?: number;
          mimeType: string;
          preset?: string;
          quality?: number;
          size: number;
          storageId: string;
          variantType: "thumbnail" | "responsive" | "format";
          width?: number;
        },
        {
          _creationTime: number;
          _id: string;
          assetId: string;
          autoGenerated: boolean;
          createdBy?: string;
          deletedAt?: number;
          errorMessage?: string;
          format: string;
          height?: number;
          mimeType: string;
          preset?: string;
          processingCompletedAt?: number;
          processingStartedAt?: number;
          quality?: number;
          size: number;
          status: "pending" | "processing" | "completed" | "failed";
          storageId: string;
          url: string | null;
          variantType: "thumbnail" | "responsive" | "format";
          width?: number;
        }
      >;
      deleteAssetVariants: FunctionReference<
        "mutation",
        "internal",
        { assetId: string; deletedBy?: string; hardDelete?: boolean },
        { assetId: string; deleted: number }
      >;
      deleteMediaVariant: FunctionReference<
        "mutation",
        "internal",
        { deletedBy?: string; hardDelete?: boolean; id: string },
        {
          _creationTime: number;
          _id: string;
          assetId: string;
          autoGenerated: boolean;
          createdBy?: string;
          deletedAt?: number;
          errorMessage?: string;
          format: string;
          height?: number;
          mimeType: string;
          preset?: string;
          processingCompletedAt?: number;
          processingStartedAt?: number;
          quality?: number;
          size: number;
          status: "pending" | "processing" | "completed" | "failed";
          storageId: string;
          variantType: "thumbnail" | "responsive" | "format";
          width?: number;
        }
      >;
      generateFromPresets: FunctionReference<
        "mutation",
        "internal",
        { assetId: string; presets: Array<string>; requestedBy?: string },
        {
          failed: number;
          results: Array<{
            error?: string;
            preset: string;
            success: boolean;
            variantId?: string;
          }>;
          succeeded: number;
          total: number;
        }
      >;
      requestVariantGeneration: FunctionReference<
        "mutation",
        "internal",
        {
          assetId: string;
          format: string;
          height?: number;
          preset?: string;
          quality?: number;
          requestedBy?: string;
          variantType: "thumbnail" | "responsive" | "format";
          width?: number;
        },
        {
          _creationTime: number;
          _id: string;
          assetId: string;
          autoGenerated: boolean;
          createdBy?: string;
          deletedAt?: number;
          errorMessage?: string;
          format: string;
          height?: number;
          mimeType: string;
          preset?: string;
          processingCompletedAt?: number;
          processingStartedAt?: number;
          quality?: number;
          size: number;
          status: "pending" | "processing" | "completed" | "failed";
          storageId: string;
          variantType: "thumbnail" | "responsive" | "format";
          width?: number;
        }
      >;
      restoreMediaVariant: FunctionReference<
        "mutation",
        "internal",
        { id: string; restoredBy?: string },
        {
          _creationTime: number;
          _id: string;
          assetId: string;
          autoGenerated: boolean;
          createdBy?: string;
          deletedAt?: number;
          errorMessage?: string;
          format: string;
          height?: number;
          mimeType: string;
          preset?: string;
          processingCompletedAt?: number;
          processingStartedAt?: number;
          quality?: number;
          size: number;
          status: "pending" | "processing" | "completed" | "failed";
          storageId: string;
          variantType: "thumbnail" | "responsive" | "format";
          width?: number;
        }
      >;
      updateVariantStatus: FunctionReference<
        "mutation",
        "internal",
        {
          errorMessage?: string;
          height?: number;
          id: string;
          mimeType?: string;
          size?: number;
          status: "pending" | "processing" | "completed" | "failed";
          storageId?: string;
          width?: number;
        },
        {
          _creationTime: number;
          _id: string;
          assetId: string;
          autoGenerated: boolean;
          createdBy?: string;
          deletedAt?: number;
          errorMessage?: string;
          format: string;
          height?: number;
          mimeType: string;
          preset?: string;
          processingCompletedAt?: number;
          processingStartedAt?: number;
          quality?: number;
          size: number;
          status: "pending" | "processing" | "completed" | "failed";
          storageId: string;
          variantType: "thumbnail" | "responsive" | "format";
          width?: number;
        }
      >;
    };
    mediaVariants: {
      get: FunctionReference<
        "query",
        "internal",
        { id: string; includeDeleted?: boolean },
        {
          _creationTime: number;
          _id: string;
          assetId: string;
          autoGenerated: boolean;
          createdBy?: string;
          deletedAt?: number;
          errorMessage?: string;
          format: string;
          height?: number;
          mimeType: string;
          preset?: string;
          processingCompletedAt?: number;
          processingStartedAt?: number;
          quality?: number;
          size: number;
          status: "pending" | "processing" | "completed" | "failed";
          storageId: string;
          url: string | null;
          variantType: "thumbnail" | "responsive" | "format";
          width?: number;
        } | null
      >;
      getAssetWithVariants: FunctionReference<
        "query",
        "internal",
        { assetId: string },
        {
          original: {
            _creationTime: number;
            _id: string;
            height?: number;
            mimeType: string;
            name: string;
            size: number;
            url: string | null;
            width?: number;
          };
          variants: Array<{
            _creationTime: number;
            _id: string;
            assetId: string;
            autoGenerated: boolean;
            createdBy?: string;
            deletedAt?: number;
            errorMessage?: string;
            format: string;
            height?: number;
            mimeType: string;
            preset?: string;
            processingCompletedAt?: number;
            processingStartedAt?: number;
            quality?: number;
            size: number;
            status: "pending" | "processing" | "completed" | "failed";
            storageId: string;
            url: string | null;
            variantType: "thumbnail" | "responsive" | "format";
            width?: number;
          }>;
          variantsByType: {
            format: Array<{
              _creationTime: number;
              _id: string;
              assetId: string;
              autoGenerated: boolean;
              createdBy?: string;
              deletedAt?: number;
              errorMessage?: string;
              format: string;
              height?: number;
              mimeType: string;
              preset?: string;
              processingCompletedAt?: number;
              processingStartedAt?: number;
              quality?: number;
              size: number;
              status: "pending" | "processing" | "completed" | "failed";
              storageId: string;
              url: string | null;
              variantType: "thumbnail" | "responsive" | "format";
              width?: number;
            }>;
            responsive: Array<{
              _creationTime: number;
              _id: string;
              assetId: string;
              autoGenerated: boolean;
              createdBy?: string;
              deletedAt?: number;
              errorMessage?: string;
              format: string;
              height?: number;
              mimeType: string;
              preset?: string;
              processingCompletedAt?: number;
              processingStartedAt?: number;
              quality?: number;
              size: number;
              status: "pending" | "processing" | "completed" | "failed";
              storageId: string;
              url: string | null;
              variantType: "thumbnail" | "responsive" | "format";
              width?: number;
            }>;
            thumbnail?: {
              _creationTime: number;
              _id: string;
              assetId: string;
              autoGenerated: boolean;
              createdBy?: string;
              deletedAt?: number;
              errorMessage?: string;
              format: string;
              height?: number;
              mimeType: string;
              preset?: string;
              processingCompletedAt?: number;
              processingStartedAt?: number;
              quality?: number;
              size: number;
              status: "pending" | "processing" | "completed" | "failed";
              storageId: string;
              url: string | null;
              variantType: "thumbnail" | "responsive" | "format";
              width?: number;
            };
          };
        } | null
      >;
      getBestVariant: FunctionReference<
        "query",
        "internal",
        {
          assetId: string;
          fallbackToOriginal?: boolean;
          preferredFormat?: string;
          targetHeight?: number;
          targetWidth?: number;
        },
        {
          _creationTime: number;
          _id: string;
          assetId: string;
          autoGenerated: boolean;
          createdBy?: string;
          deletedAt?: number;
          errorMessage?: string;
          format: string;
          height?: number;
          isOriginal: boolean;
          mimeType: string;
          preset?: string;
          processingCompletedAt?: number;
          processingStartedAt?: number;
          quality?: number;
          size: number;
          status: "pending" | "processing" | "completed" | "failed";
          storageId: string;
          url: string | null;
          variantType: "thumbnail" | "responsive" | "format";
          width?: number;
        } | null
      >;
      getPendingVariants: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: "pending" | "processing" },
        Array<{
          _creationTime: number;
          _id: string;
          assetId: string;
          autoGenerated: boolean;
          createdBy?: string;
          deletedAt?: number;
          errorMessage?: string;
          format: string;
          height?: number;
          mimeType: string;
          preset?: string;
          processingCompletedAt?: number;
          processingStartedAt?: number;
          quality?: number;
          size: number;
          status: "pending" | "processing" | "completed" | "failed";
          storageId: string;
          variantType: "thumbnail" | "responsive" | "format";
          width?: number;
        }>
      >;
      getPresets: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          description?: string;
          format: string;
          height?: number;
          name: string;
          quality?: number;
          variantType: "thumbnail" | "responsive" | "format";
          width?: number;
        }>
      >;
      getResponsiveSrcset: FunctionReference<
        "query",
        "internal",
        { assetId: string; format?: string },
        {
          entries: Array<{
            descriptor: string;
            format: string;
            url: string;
            width: number;
          }>;
          sizes?: string;
          src: string | null;
          srcset: string;
        }
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          assetId: string;
          format?: string;
          includeDeleted?: boolean;
          preset?: string;
          status?: "pending" | "processing" | "completed" | "failed";
          variantType?: "thumbnail" | "responsive" | "format";
        },
        Array<{
          _creationTime: number;
          _id: string;
          assetId: string;
          autoGenerated: boolean;
          createdBy?: string;
          deletedAt?: number;
          errorMessage?: string;
          format: string;
          height?: number;
          mimeType: string;
          preset?: string;
          processingCompletedAt?: number;
          processingStartedAt?: number;
          quality?: number;
          size: number;
          status: "pending" | "processing" | "completed" | "failed";
          storageId: string;
          url: string | null;
          variantType: "thumbnail" | "responsive" | "format";
          width?: number;
        }>
      >;
    };
    ragContentIndexer: {
      getIndexingStats: FunctionReference<
        "query",
        "internal",
        {},
        {
          byContentType: any;
          pendingIndexing: number;
          pendingRemoval: number;
          totalPublished: number;
        }
      >;
      markIndexingEventsProcessed: FunctionReference<
        "mutation",
        "internal",
        { eventIds: Array<string> },
        { processedCount: number }
      >;
      needsReindexing: FunctionReference<
        "query",
        "internal",
        { entryId: string },
        boolean
      >;
      prepareEntriesForIndexing: FunctionReference<
        "query",
        "internal",
        {
          entryIds: Array<string>;
          options?: {
            excludeFields?: Array<string>;
            includeFields?: Array<string>;
            maxCharsSoftLimit?: number;
            namespacePrefix?: string;
          };
        },
        Array<{
          chunks: Array<{ metadata: any; text: string }>;
          entryId: string;
          metadata: {
            contentType: string;
            contentTypeDisplayName: string;
            entryId: string;
            locale?: string;
            namespace: string;
            publishedAt?: number;
            slug: string;
            title?: string;
            version: number;
          };
        } | null>
      >;
      prepareEntryForIndexing: FunctionReference<
        "query",
        "internal",
        {
          entryId: string;
          options?: {
            excludeFields?: Array<string>;
            includeFields?: Array<string>;
            maxCharsSoftLimit?: number;
            namespacePrefix?: string;
          };
        },
        {
          chunks: Array<{ metadata: any; text: string }>;
          entryId: string;
          metadata: {
            contentType: string;
            contentTypeDisplayName: string;
            entryId: string;
            locale?: string;
            namespace: string;
            publishedAt?: number;
            slug: string;
            title?: string;
            version: number;
          };
        } | null
      >;
      requestBulkReindex: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          contentTypeId?: string;
          cursor?: string;
          userId?: string;
        },
        { eventsCreated: number; hasMore: boolean; nextCursor?: string }
      >;
      requestEntryReindex: FunctionReference<
        "mutation",
        "internal",
        { entryId: string; userId?: string },
        { message: string; success: boolean }
      >;
      scheduleNextIndexingRun: FunctionReference<
        "mutation",
        "internal",
        { delayMs?: number },
        { scheduledAt: number }
      >;
    };
    scheduledPublish: {
      cancelScheduledPublish: FunctionReference<
        "mutation",
        "internal",
        { id: string; updatedBy?: string },
        {
          _creationTime: number;
          _id: string;
          contentTypeName: string;
          createdBy?: string;
          data: any;
          deletedAt?: number;
          firstPublishedAt?: number;
          lastPublishedAt?: number;
          locale?: string;
          lockExpiresAt?: number;
          lockedBy?: string;
          primaryEntryId?: string;
          scheduledPublishAt?: number;
          searchText?: string;
          slug: string;
          status: string;
          updatedBy?: string;
          version: number;
        }
      >;
      getScheduledEntries: FunctionReference<
        "query",
        "internal",
        { contentTypeName?: string; from?: number; to?: number },
        any
      >;
      scheduleEntry: FunctionReference<
        "mutation",
        "internal",
        { id: string; publishAt: number; updatedBy?: string },
        {
          _creationTime: number;
          _id: string;
          contentTypeName: string;
          createdBy?: string;
          data: any;
          deletedAt?: number;
          firstPublishedAt?: number;
          lastPublishedAt?: number;
          locale?: string;
          lockExpiresAt?: number;
          lockedBy?: string;
          primaryEntryId?: string;
          scheduledPublishAt?: number;
          searchText?: string;
          slug: string;
          status: string;
          updatedBy?: string;
          version: number;
        }
      >;
    };
    settings: {
      getSettings: FunctionReference<
        "query",
        "internal",
        {
          features?: {
            localization: boolean;
            mediaManagement: boolean;
            scheduling: boolean;
            versioning: boolean;
          };
        },
        {
          _creationTime?: number;
          _id: string | null;
          availableLocales: Array<string>;
          defaultLocale: string;
          features: {
            localization: boolean;
            mediaManagement: boolean;
            scheduling: boolean;
            versioning: boolean;
          };
          updatedBy?: string;
        }
      >;
      resetSettings: FunctionReference<
        "mutation",
        "internal",
        { updatedBy?: string },
        {
          _creationTime: number;
          _id: string;
          availableLocales: Array<string>;
          defaultLocale: string;
          updatedBy?: string;
        }
      >;
      updateSettings: FunctionReference<
        "mutation",
        "internal",
        {
          availableLocales?: Array<string>;
          defaultLocale?: string;
          updatedBy?: string;
        },
        {
          _creationTime: number;
          _id: string;
          availableLocales: Array<string>;
          defaultLocale: string;
          updatedBy?: string;
        }
      >;
    };
    taxonomies: {
      countTerms: FunctionReference<
        "query",
        "internal",
        { includeDeleted?: boolean; taxonomyId: string },
        { count: number }
      >;
      get: FunctionReference<
        "query",
        "internal",
        { id?: string; includeDeleted?: boolean; name?: string },
        {
          _creationTime: number;
          _id: string;
          allowInlineCreation: boolean;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          displayName: string;
          icon?: string;
          isActive: boolean;
          isHierarchical: boolean;
          name: string;
          sortOrder?: number;
          updatedBy?: string;
        } | null
      >;
      getEntriesByTerm: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts?: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          status?: "draft" | "published" | "archived" | "scheduled";
          termId: string;
        },
        { continueCursor: string | null; isDone: boolean; page: Array<string> }
      >;
      getMediaByTerm: FunctionReference<
        "query",
        "internal",
        {
          includeDeleted?: boolean;
          paginationOpts?: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          termId: string;
        },
        { continueCursor: string | null; isDone: boolean; page: Array<string> }
      >;
      getTerm: FunctionReference<
        "query",
        "internal",
        {
          id?: string;
          includeDeleted?: boolean;
          slug?: string;
          taxonomyId?: string;
        },
        {
          _creationTime: number;
          _id: string;
          color?: string;
          createdBy?: string;
          deletedAt?: number;
          depth: number;
          description?: string;
          icon?: string;
          name: string;
          parentId?: string;
          path?: string;
          searchText?: string;
          slug: string;
          sortOrder?: number;
          taxonomyId: string;
          updatedBy?: string;
          usageCount: number;
        } | null
      >;
      getTermsByEntry: FunctionReference<
        "query",
        "internal",
        { entryId: string; fieldName?: string; taxonomyId?: string },
        Array<{
          _creationTime: number;
          _id: string;
          color?: string;
          createdBy?: string;
          deletedAt?: number;
          depth: number;
          description?: string;
          fieldName: string;
          icon?: string;
          name: string;
          parentId?: string;
          path?: string;
          searchText?: string;
          slug: string;
          sortOrder?: number;
          taxonomyId: string;
          updatedBy?: string;
          usageCount: number;
        }>
      >;
      getTermsByMedia: FunctionReference<
        "query",
        "internal",
        { mediaId: string; taxonomyId?: string },
        Array<{
          _creationTime: number;
          _id: string;
          color?: string;
          createdBy?: string;
          deletedAt?: number;
          depth: number;
          description?: string;
          icon?: string;
          name: string;
          parentId?: string;
          path?: string;
          searchText?: string;
          slug: string;
          sortOrder?: number;
          taxonomyId: string;
          updatedBy?: string;
          usageCount: number;
        }>
      >;
      getTermsHierarchy: FunctionReference<
        "query",
        "internal",
        { includeDeleted?: boolean; taxonomyId: string },
        Array<{
          _creationTime: number;
          _id: string;
          children: Array<any>;
          color?: string;
          createdBy?: string;
          deletedAt?: number;
          depth: number;
          description?: string;
          icon?: string;
          name: string;
          parentId?: string;
          path?: string;
          searchText?: string;
          slug: string;
          sortOrder?: number;
          taxonomyId: string;
          updatedBy?: string;
          usageCount: number;
        }>
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          includeDeleted?: boolean;
          isActive?: boolean;
          isHierarchical?: boolean;
          paginationOpts?: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string | null;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            allowInlineCreation: boolean;
            createdBy?: string;
            deletedAt?: number;
            description?: string;
            displayName: string;
            icon?: string;
            isActive: boolean;
            isHierarchical: boolean;
            name: string;
            sortOrder?: number;
            updatedBy?: string;
          }>;
        }
      >;
      listTerms: FunctionReference<
        "query",
        "internal",
        {
          includeDeleted?: boolean;
          paginationOpts?: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          parentId?: string;
          rootOnly?: boolean;
          search?: string;
          sortBy?: "name" | "usageCount" | "sortOrder";
          sortDirection?: "asc" | "desc";
          taxonomyId: string;
        },
        {
          continueCursor: string | null;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            color?: string;
            createdBy?: string;
            deletedAt?: number;
            depth: number;
            description?: string;
            icon?: string;
            name: string;
            parentId?: string;
            path?: string;
            searchText?: string;
            slug: string;
            sortOrder?: number;
            taxonomyId: string;
            updatedBy?: string;
            usageCount: number;
          }>;
        }
      >;
      suggestTerms: FunctionReference<
        "query",
        "internal",
        {
          excludeIds?: Array<string>;
          limit?: number;
          query: string;
          taxonomyId: string;
        },
        Array<{
          _creationTime: number;
          _id: string;
          color?: string;
          createdBy?: string;
          deletedAt?: number;
          depth: number;
          description?: string;
          icon?: string;
          name: string;
          parentId?: string;
          path?: string;
          searchText?: string;
          slug: string;
          sortOrder?: number;
          taxonomyId: string;
          updatedBy?: string;
          usageCount: number;
        }>
      >;
    };
    taxonomyMutations: {
      addTermToEntry: FunctionReference<
        "mutation",
        "internal",
        { entryId: string; fieldName: string; termId: string },
        null
      >;
      addTermToMedia: FunctionReference<
        "mutation",
        "internal",
        { mediaId: string; termId: string },
        null
      >;
      createTaxonomy: FunctionReference<
        "mutation",
        "internal",
        {
          allowInlineCreation: boolean;
          description?: string;
          displayName: string;
          icon?: string;
          isHierarchical: boolean;
          name: string;
          sortOrder?: number;
          userId?: string;
        },
        string
      >;
      createTerm: FunctionReference<
        "mutation",
        "internal",
        {
          color?: string;
          description?: string;
          icon?: string;
          name: string;
          parentId?: string;
          slug?: string;
          sortOrder?: number;
          taxonomyId: string;
          userId?: string;
        },
        string
      >;
      createTermAndAddToEntry: FunctionReference<
        "mutation",
        "internal",
        {
          entryId: string;
          fieldName: string;
          name: string;
          taxonomyId: string;
          userId?: string;
        },
        string
      >;
      createTermAndAddToMedia: FunctionReference<
        "mutation",
        "internal",
        { mediaId: string; name: string; taxonomyId: string; userId?: string },
        string
      >;
      deleteTaxonomy: FunctionReference<
        "mutation",
        "internal",
        { id: string; userId?: string },
        null
      >;
      deleteTerm: FunctionReference<
        "mutation",
        "internal",
        { cascade?: boolean; id: string; userId?: string },
        null
      >;
      removeTermFromEntry: FunctionReference<
        "mutation",
        "internal",
        { entryId: string; fieldName: string; termId: string },
        null
      >;
      removeTermFromMedia: FunctionReference<
        "mutation",
        "internal",
        { mediaId: string; termId: string },
        null
      >;
      restoreTaxonomy: FunctionReference<
        "mutation",
        "internal",
        { id: string; userId?: string },
        string
      >;
      restoreTerm: FunctionReference<
        "mutation",
        "internal",
        { id: string; userId?: string },
        string
      >;
      setEntryTerms: FunctionReference<
        "mutation",
        "internal",
        { entryId: string; fieldName: string; termIds: Array<string> },
        null
      >;
      setMediaTerms: FunctionReference<
        "mutation",
        "internal",
        { mediaId: string; taxonomyId: string; termIds: Array<string> },
        null
      >;
      updateTaxonomy: FunctionReference<
        "mutation",
        "internal",
        {
          allowInlineCreation?: boolean;
          description?: string;
          displayName?: string;
          icon?: string;
          id: string;
          isActive?: boolean;
          sortOrder?: number;
          userId?: string;
        },
        string
      >;
      updateTerm: FunctionReference<
        "mutation",
        "internal",
        {
          color?: string;
          description?: string;
          icon?: string;
          id: string;
          name?: string;
          parentId?: string | null;
          slug?: string;
          sortOrder?: number;
          userId?: string;
        },
        string
      >;
    };
    trash: {
      emptyTrash: FunctionReference<
        "mutation",
        "internal",
        {
          contentTypeName?: string;
          deletedBy?: string;
          olderThanDays?: number;
        },
        {
          deletedCount: number;
          deletedVersionsCount: number;
          errors: Array<{ error: string; id: string }>;
        }
      >;
      getTrashConfig: FunctionReference<
        "query",
        "internal",
        {},
        {
          autoCleanupEnabled: boolean;
          lastCleanupAt?: number;
          lastCleanupCount?: number;
          retentionDays: number;
        }
      >;
      getTrashStats: FunctionReference<
        "query",
        "internal",
        {},
        {
          expiredCount: number;
          newestDeletedAt?: number;
          oldestDeletedAt?: number;
          retentionDays: number;
          totalCount: number;
        }
      >;
      listTrash: FunctionReference<
        "query",
        "internal",
        {
          contentTypeName?: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          search?: string;
        },
        {
          continueCursor: string | null;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            contentTypeName?: string;
            createdBy?: string;
            data: any;
            deletedAt?: number;
            deletedDaysAgo: number;
            expiresAt?: number;
            firstPublishedAt?: number;
            lastPublishedAt?: number;
            locale?: string;
            lockExpiresAt?: number;
            lockedBy?: string;
            primaryEntryId?: string;
            scheduledPublishAt?: number;
            searchText?: string;
            slug: string;
            status: string;
            updatedBy?: string;
            version: number;
          }>;
          totalCount?: number;
        }
      >;
      runTrashCleanup: FunctionReference<
        "mutation",
        "internal",
        { updatedBy?: string },
        { deletedCount: number; message: string }
      >;
      scheduleTrashCleanup: FunctionReference<
        "mutation",
        "internal",
        { intervalMs?: number },
        any
      >;
      updateTrashConfig: FunctionReference<
        "mutation",
        "internal",
        {
          autoCleanupEnabled?: boolean;
          retentionDays?: number;
          updatedBy?: string;
        },
        {
          _creationTime: number;
          _id: string;
          autoCleanupEnabled: boolean;
          lastCleanupAt?: number;
          lastCleanupCount?: number;
          retentionDays: number;
          updatedBy?: string;
        }
      >;
    };
    versionMutations: {
      rollbackVersion: FunctionReference<
        "mutation",
        "internal",
        { entryId: string; updatedBy?: string; versionNumber: number },
        {
          _creationTime: number;
          _id: string;
          contentTypeName: string;
          createdBy?: string;
          data: any;
          deletedAt?: number;
          firstPublishedAt?: number;
          lastPublishedAt?: number;
          locale?: string;
          lockExpiresAt?: number;
          lockedBy?: string;
          primaryEntryId?: string;
          scheduledPublishAt?: number;
          searchText?: string;
          slug: string;
          status: string;
          updatedBy?: string;
          version: number;
        }
      >;
    };
    webhookTrigger: {
      cleanupOldDeliveries: FunctionReference<
        "mutation",
        "internal",
        { retentionDays?: number },
        { deletedCount: number }
      >;
      createWebhook: FunctionReference<
        "mutation",
        "internal",
        {
          contentTypes?: Array<string>;
          createdBy?: string;
          description?: string;
          enabled?: boolean;
          eventTypes: Array<string>;
          headers?: any;
          maxRetries?: number;
          name: string;
          resourceTypes?: Array<
            "contentEntry" | "contentType" | "mediaAsset" | "mediaFolder"
          >;
          secret?: string;
          timeoutMs?: number;
          url: string;
        },
        string
      >;
      deleteWebhook: FunctionReference<
        "mutation",
        "internal",
        { deletedBy?: string; hardDelete?: boolean; id: string },
        { message: string; success: boolean }
      >;
      getDelivery: FunctionReference<
        "query",
        "internal",
        { deliveryId: string },
        {
          _creationTime: number;
          _id: string;
          attemptCount: number;
          deliveredAt?: number;
          eventId: string;
          eventType: string;
          lastAttemptAt?: number;
          lastDurationMs?: number;
          lastError?: string;
          lastResponseBody?: string;
          lastStatusCode?: number;
          maxAttempts: number;
          nextRetryAt?: number;
          payload: any;
          status:
            | "pending"
            | "processing"
            | "delivered"
            | "failed"
            | "retrying";
          webhookId: string;
        } | null
      >;
      getWebhook: FunctionReference<
        "query",
        "internal",
        { id: string; includeDeleted?: boolean },
        {
          _creationTime: number;
          _id: string;
          contentTypes?: Array<string>;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          enabled: boolean;
          eventTypes: Array<string>;
          headers?: any;
          maxRetries?: number;
          name: string;
          resourceTypes?: Array<
            "contentEntry" | "contentType" | "mediaAsset" | "mediaFolder"
          >;
          timeoutMs?: number;
          updatedBy?: string;
          url: string;
        } | null
      >;
      getWebhookDeliveryStats: FunctionReference<
        "query",
        "internal",
        { since?: number; webhookId: string },
        {
          delivered: number;
          failed: number;
          pending: number;
          processing: number;
          retrying: number;
          total: number;
        }
      >;
      getWebhookStats: FunctionReference<
        "query",
        "internal",
        {},
        {
          activeWebhooks: number;
          deliveriesLast24h: number;
          pendingDeliveries: number;
          retryingDeliveries: number;
          successRateLast24h: number;
          totalWebhooks: number;
        }
      >;
      listWebhookDeliveries: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          status?:
            | "pending"
            | "processing"
            | "delivered"
            | "failed"
            | "retrying";
          webhookId: string;
        },
        Array<{
          _creationTime: number;
          _id: string;
          attemptCount: number;
          deliveredAt?: number;
          eventId: string;
          eventType: string;
          lastAttemptAt?: number;
          lastDurationMs?: number;
          lastError?: string;
          lastResponseBody?: string;
          lastStatusCode?: number;
          maxAttempts: number;
          nextRetryAt?: number;
          payload: any;
          status:
            | "pending"
            | "processing"
            | "delivered"
            | "failed"
            | "retrying";
          webhookId: string;
        }>
      >;
      listWebhooks: FunctionReference<
        "query",
        "internal",
        { enabled?: boolean; includeDeleted?: boolean; limit?: number },
        Array<{
          _creationTime: number;
          _id: string;
          contentTypes?: Array<string>;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          enabled: boolean;
          eventTypes: Array<string>;
          headers?: any;
          maxRetries?: number;
          name: string;
          resourceTypes?: Array<
            "contentEntry" | "contentType" | "mediaAsset" | "mediaFolder"
          >;
          timeoutMs?: number;
          updatedBy?: string;
          url: string;
        }>
      >;
      restoreWebhook: FunctionReference<
        "mutation",
        "internal",
        { id: string; restoredBy?: string },
        {
          _creationTime: number;
          _id: string;
          contentTypes?: Array<string>;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          enabled: boolean;
          eventTypes: Array<string>;
          headers?: any;
          maxRetries?: number;
          name: string;
          resourceTypes?: Array<
            "contentEntry" | "contentType" | "mediaAsset" | "mediaFolder"
          >;
          timeoutMs?: number;
          updatedBy?: string;
          url: string;
        }
      >;
      retryDelivery: FunctionReference<
        "mutation",
        "internal",
        { deliveryId: string },
        { message: string; success: boolean }
      >;
      scheduleNextWebhookRun: FunctionReference<
        "mutation",
        "internal",
        { delayMs?: number },
        { scheduledAt: number }
      >;
      testWebhook: FunctionReference<
        "mutation",
        "internal",
        { webhookId: string },
        { deliveryId?: string; message: string; success: boolean }
      >;
      updateWebhook: FunctionReference<
        "mutation",
        "internal",
        {
          contentTypes?: Array<string>;
          description?: string;
          enabled?: boolean;
          eventTypes?: Array<string>;
          headers?: any;
          id: string;
          maxRetries?: number;
          name?: string;
          resourceTypes?: Array<
            "contentEntry" | "contentType" | "mediaAsset" | "mediaFolder"
          >;
          secret?: string;
          timeoutMs?: number;
          updatedBy?: string;
          url?: string;
        },
        {
          _creationTime: number;
          _id: string;
          contentTypes?: Array<string>;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          enabled: boolean;
          eventTypes: Array<string>;
          headers?: any;
          maxRetries?: number;
          name: string;
          resourceTypes?: Array<
            "contentEntry" | "contentType" | "mediaAsset" | "mediaFolder"
          >;
          timeoutMs?: number;
          updatedBy?: string;
          url: string;
        }
      >;
    };
  };
};
