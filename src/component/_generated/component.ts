/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    auditLog: {
      cleanupOldAuditLogs: FunctionReference<
        "mutation",
        "internal",
        { retentionDays?: number },
        { deletedCount: number },
        Name
      >;
      getAuditLog: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
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
            | "scheduled"
            | "locked"
            | "unlocked"
            | "rolledBack"
            | "migrated";
          changeSummary?: string;
          changedFields?: Array<string>;
          contentTypeName?: string;
          entrySlug?: string;
          ipAddress?: string;
          metadata?: any;
          newState?: any;
          previousState?: any;
          requestId?: string;
          resourceId: string;
          resourceType:
            | "contentEntry"
            | "contentType"
            | "mediaAsset"
            | "mediaFolder"
            | "settings";
          sessionId?: string;
          userAgent?: string;
          userDisplayName?: string;
          userId?: string;
        } | null,
        Name
      >;
      getAuditLogDiff: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          changedFields: Array<string>;
          fieldDiffs: Array<{
            field: string;
            newValue?: any;
            previousValue?: any;
          }>;
          hasChanges: boolean;
        },
        Name
      >;
      getAuditLogStats: FunctionReference<
        "query",
        "internal",
        {
          endDate?: number;
          resourceType?:
            | "contentEntry"
            | "contentType"
            | "mediaAsset"
            | "mediaFolder"
            | "settings";
          startDate?: number;
        },
        {
          actionCounts: any;
          topUsers: Array<{ count: number; userId: string }>;
          totalCount: number;
        },
        Name
      >;
      getResourceAuditLogs: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          resourceId: string;
          resourceType:
            | "contentEntry"
            | "contentType"
            | "mediaAsset"
            | "mediaFolder"
            | "settings";
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
            | "scheduled"
            | "locked"
            | "unlocked"
            | "rolledBack"
            | "migrated";
          changeSummary?: string;
          changedFields?: Array<string>;
          contentTypeName?: string;
          entrySlug?: string;
          ipAddress?: string;
          metadata?: any;
          newState?: any;
          previousState?: any;
          requestId?: string;
          resourceId: string;
          resourceType:
            | "contentEntry"
            | "contentType"
            | "mediaAsset"
            | "mediaFolder"
            | "settings";
          sessionId?: string;
          userAgent?: string;
          userDisplayName?: string;
          userId?: string;
        }>,
        Name
      >;
      getUserAuditLogs: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
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
            | "scheduled"
            | "locked"
            | "unlocked"
            | "rolledBack"
            | "migrated";
          changeSummary?: string;
          changedFields?: Array<string>;
          contentTypeName?: string;
          entrySlug?: string;
          ipAddress?: string;
          metadata?: any;
          newState?: any;
          previousState?: any;
          requestId?: string;
          resourceId: string;
          resourceType:
            | "contentEntry"
            | "contentType"
            | "mediaAsset"
            | "mediaFolder"
            | "settings";
          sessionId?: string;
          userAgent?: string;
          userDisplayName?: string;
          userId?: string;
        }>,
        Name
      >;
      listAuditLogs: FunctionReference<
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
            | "scheduled"
            | "locked"
            | "unlocked"
            | "rolledBack"
            | "migrated";
          contentTypeName?: string;
          cursor?: string;
          endDate?: number;
          limit?: number;
          resourceType?:
            | "contentEntry"
            | "contentType"
            | "mediaAsset"
            | "mediaFolder"
            | "settings";
          startDate?: number;
          userId?: string;
        },
        {
          hasMore: boolean;
          logs: Array<{
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
              | "scheduled"
              | "locked"
              | "unlocked"
              | "rolledBack"
              | "migrated";
            changeSummary?: string;
            changedFields?: Array<string>;
            contentTypeName?: string;
            entrySlug?: string;
            ipAddress?: string;
            metadata?: any;
            newState?: any;
            previousState?: any;
            requestId?: string;
            resourceId: string;
            resourceType:
              | "contentEntry"
              | "contentType"
              | "mediaAsset"
              | "mediaFolder"
              | "settings";
            sessionId?: string;
            userAgent?: string;
            userDisplayName?: string;
            userId?: string;
          }>;
          nextCursor?: string;
        },
        Name
      >;
    };
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
        },
        Name
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
        },
        Name
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
        },
        Name
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
        },
        Name
      >;
      bulkUpdate: FunctionReference<
        "mutation",
        "internal",
        {
          data?: any;
          ids: Array<string>;
          status?: "draft" | "published" | "archived" | "scheduled";
          updatedBy?: string;
        },
        {
          failed: number;
          results: Array<{ error?: string; id: string; success: boolean }>;
          succeeded: number;
          total: number;
        },
        Name
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
            status: "draft" | "published" | "archived" | "scheduled";
            versionNumber: number;
            wasPublished: boolean;
          };
          hasChanges: boolean;
          slugChanged: boolean;
          statusChanged: boolean;
          toVersion: {
            createdAt: number;
            slug: string;
            status: "draft" | "published" | "archived" | "scheduled";
            versionNumber: number;
            wasPublished: boolean;
          };
        } | null,
        Name
      >;
      count: FunctionReference<
        "query",
        "internal",
        {
          contentTypeId?: string;
          contentTypeName?: string;
          includeDeleted?: boolean;
          status?: "draft" | "published" | "archived" | "scheduled";
          statusIn?: Array<"draft" | "published" | "archived" | "scheduled">;
        },
        { count: number },
        Name
      >;
      get: FunctionReference<
        "query",
        "internal",
        { id: string; includeVersion?: boolean },
        {
          _creationTime: number;
          _id: string;
          contentTypeId: string;
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
            status: "draft" | "published" | "archived" | "scheduled";
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
          status: "draft" | "published" | "archived" | "scheduled";
          updatedBy?: string;
          version: number;
        } | null,
        Name
      >;
      getBySlug: FunctionReference<
        "query",
        "internal",
        {
          contentTypeId: string;
          includeDeleted?: boolean;
          slug: string;
          status?: "draft" | "published" | "archived" | "scheduled";
        },
        {
          _creationTime: number;
          _id: string;
          contentTypeId: string;
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
          status: "draft" | "published" | "archived" | "scheduled";
          updatedBy?: string;
          version: number;
        } | null,
        Name
      >;
      getBySlugAndTypeName: FunctionReference<
        "query",
        "internal",
        {
          contentTypeName: string;
          includeDeleted?: boolean;
          slug: string;
          status?: "draft" | "published" | "archived" | "scheduled";
        },
        {
          _creationTime: number;
          _id: string;
          contentTypeId: string;
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
          status: "draft" | "published" | "archived" | "scheduled";
          updatedBy?: string;
          version: number;
        } | null,
        Name
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
          status: "draft" | "published" | "archived" | "scheduled";
          versionNumber: number;
          wasPublished: boolean;
        } | null,
        Name
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
            status: "draft" | "published" | "archived" | "scheduled";
            versionNumber: number;
            wasPublished: boolean;
          }>;
        } | null,
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          contentTypeId?: string;
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
          status?: "draft" | "published" | "archived" | "scheduled";
          statusIn?: Array<"draft" | "published" | "archived" | "scheduled">;
        },
        {
          continueCursor: string | null;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            contentTypeId: string;
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
            status: "draft" | "published" | "archived" | "scheduled";
            updatedBy?: string;
            version: number;
          }>;
        },
        Name
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
          contentTypeId: string;
          createdBy?: string;
          data: any;
          locale?: string;
          primaryEntryId?: string;
          slug?: string;
          status?: "draft" | "published" | "archived" | "scheduled";
        },
        {
          _creationTime: number;
          _id: string;
          contentTypeId: string;
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
          status: "draft" | "published" | "archived" | "scheduled";
          updatedBy?: string;
          version: number;
        },
        Name
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
          contentTypeId: string;
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
          status: "draft" | "published" | "archived" | "scheduled";
          updatedBy?: string;
          version: number;
        },
        Name
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
          contentTypeId: string;
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
          status: "draft" | "published" | "archived" | "scheduled";
          updatedBy?: string;
          version: number;
        },
        Name
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
          contentTypeId: string;
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
          status: "draft" | "published" | "archived" | "scheduled";
          updatedBy?: string;
          version: number;
        },
        Name
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
          contentTypeId: string;
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
          status: "draft" | "published" | "archived" | "scheduled";
          updatedBy?: string;
          version: number;
        },
        Name
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
          contentTypeId: string;
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
          status: "draft" | "published" | "archived" | "scheduled";
          updatedBy?: string;
          version: number;
        },
        Name
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
          status?: "draft" | "published" | "archived" | "scheduled";
          updatedBy?: string;
        },
        {
          _creationTime: number;
          _id: string;
          contentTypeId: string;
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
          status: "draft" | "published" | "archived" | "scheduled";
          updatedBy?: string;
          version: number;
        },
        Name
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
        },
        Name
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
            contentTypeId: string;
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
            status: "draft" | "published" | "archived" | "scheduled";
            updatedBy?: string;
            version: number;
          };
          error?: string;
          success: boolean;
        },
        Name
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
        },
        Name
      >;
      forceReleaseLock: FunctionReference<
        "mutation",
        "internal",
        { id: string; releasedBy: string },
        {
          _creationTime: number;
          _id: string;
          contentTypeId: string;
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
          status: "draft" | "published" | "archived" | "scheduled";
          updatedBy?: string;
          version: number;
        },
        Name
      >;
      listLockedEntries: FunctionReference<
        "query",
        "internal",
        {
          contentTypeId?: string;
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
            contentTypeId: string;
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
            status: "draft" | "published" | "archived" | "scheduled";
            timeRemaining?: number;
            updatedBy?: string;
            version: number;
          }>;
        },
        Name
      >;
      releaseLock: FunctionReference<
        "mutation",
        "internal",
        { id: string; userId: string },
        {
          _creationTime: number;
          _id: string;
          contentTypeId: string;
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
          status: "draft" | "published" | "archived" | "scheduled";
          updatedBy?: string;
          version: number;
        },
        Name
      >;
      renewLock: FunctionReference<
        "mutation",
        "internal",
        { id: string; lockDuration?: number; userId: string },
        {
          _creationTime: number;
          _id: string;
          contentTypeId: string;
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
          status: "draft" | "published" | "archived" | "scheduled";
          updatedBy?: string;
          version: number;
        },
        Name
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
        }>,
        Name
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
        },
        Name
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
        },
        Name
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
          createdBy?: string;
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
          sortOrder?: number;
          titleField?: string;
        },
        {
          _creationTime: number;
          _id: string;
          createdBy?: string;
          deletedAt?: number;
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
          isActive: boolean;
          name: string;
          singleton?: boolean;
          slugField?: string;
          sortOrder?: number;
          titleField?: string;
          updatedBy?: string;
        },
        Name
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
        },
        Name
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
          fields?: Array<{
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
          createdBy?: string;
          deletedAt?: number;
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
          isActive: boolean;
          name: string;
          singleton?: boolean;
          slugField?: string;
          sortOrder?: number;
          titleField?: string;
          updatedBy?: string;
        },
        Name
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
          createdBy?: string;
          deletedAt?: number;
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
          isActive: boolean;
          name: string;
          singleton?: boolean;
          slugField?: string;
          sortOrder?: number;
          titleField?: string;
          updatedBy?: string;
        } | null,
        Name
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
            createdBy?: string;
            deletedAt?: number;
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
            isActive: boolean;
            name: string;
            singleton?: boolean;
            slugField?: string;
            sortOrder?: number;
            titleField?: string;
            updatedBy?: string;
          }>;
        },
        Name
      >;
    };
    eventEmitter: {
      cleanupOldEvents: FunctionReference<
        "mutation",
        "internal",
        { retentionDays?: number },
        { deletedCount: number },
        Name
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
        }>,
        Name
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
        }>,
        Name
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
        },
        Name
      >;
      markEventsProcessed: FunctionReference<
        "mutation",
        "internal",
        { eventIds: Array<string> },
        { processedCount: number },
        Name
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
          status?: "draft" | "published" | "archived" | "scheduled";
          statusIn?: Array<"draft" | "published" | "archived" | "scheduled">;
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
            status: "draft" | "published" | "archived" | "scheduled";
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
        },
        Name
      >;
      getExportPreview: FunctionReference<
        "query",
        "internal",
        {
          contentTypeId?: string;
          contentTypeName?: string;
          includeDeleted?: boolean;
          locale?: string;
          status?: "draft" | "published" | "archived" | "scheduled";
          statusIn?: Array<"draft" | "published" | "archived" | "scheduled">;
        },
        {
          contentTypes: Array<string>;
          entriesByStatus: any;
          entriesByType: any;
          totalEntries: number;
        },
        Name
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
              status: "draft" | "published" | "archived" | "scheduled";
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
        },
        Name
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
              status: "draft" | "published" | "archived" | "scheduled";
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
        },
        Name
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
          filename: string;
          folderId?: string;
          height?: number;
          metadata?: any;
          mimeType: string;
          size: number;
          storageId: string;
          tags?: Array<string>;
          title?: string;
          type: "image" | "video" | "audio" | "document" | "other";
          width?: number;
        },
        {
          _creationTime: number;
          _id: string;
          altText?: string;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          duration?: number;
          filename: string;
          folderId?: string;
          height?: number;
          metadata?: any;
          mimeType: string;
          searchText?: string;
          size: number;
          storageId: string;
          tags?: Array<string>;
          title?: string;
          type: "image" | "video" | "audio" | "document" | "other";
          width?: number;
        },
        Name
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
          filename: string;
          folderId?: string;
          height?: number;
          metadata?: any;
          mimeType: string;
          searchText?: string;
          size: number;
          storageFileDeleted?: boolean;
          storageId: string;
          tags?: Array<string>;
          title?: string;
          type: "image" | "video" | "audio" | "document" | "other";
          width?: number;
        },
        Name
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
        }>,
        Name
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
        },
        Name
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
        {
          _creationTime: number;
          _id: string;
          altText?: string;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          duration?: number;
          filename: string;
          folderId?: string;
          height?: number;
          metadata?: any;
          mimeType: string;
          searchText?: string;
          size: number;
          storageId: string;
          tags?: Array<string>;
          title?: string;
          type: "image" | "video" | "audio" | "document" | "other";
          width?: number;
        },
        Name
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
          filename?: string;
          folderId?: string;
          id: string;
          tags?: Array<string>;
          title?: string;
          updatedBy?: string;
        },
        {
          _creationTime: number;
          _id: string;
          altText?: string;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          duration?: number;
          filename: string;
          folderId?: string;
          height?: number;
          metadata?: any;
          mimeType: string;
          searchText?: string;
          size: number;
          storageId: string;
          tags?: Array<string>;
          title?: string;
          type: "image" | "video" | "audio" | "document" | "other";
          width?: number;
        },
        Name
      >;
    };
    mediaAssets: {
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
          filename: string;
          folderId?: string;
          height?: number;
          metadata?: any;
          mimeType: string;
          optimizationHints: {
            aspectRatio?: number;
            durationSeconds?: number;
            hasTransparency?: boolean;
            isResizable: boolean;
            isVector?: boolean;
            suggestedMaxWidth?: number;
          };
          searchText?: string;
          size: number;
          storageId: string;
          tags?: Array<string>;
          title?: string;
          type: "image" | "video" | "audio" | "document" | "other";
          url: string | null;
          width?: number;
        } | null,
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
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
            filename: string;
            folderId?: string;
            height?: number;
            metadata?: any;
            mimeType: string;
            optimizationHints: {
              aspectRatio?: number;
              durationSeconds?: number;
              hasTransparency?: boolean;
              isResizable: boolean;
              isVector?: boolean;
              suggestedMaxWidth?: number;
            };
            searchText?: string;
            size: number;
            storageId: string;
            tags?: Array<string>;
            title?: string;
            type: "image" | "video" | "audio" | "document" | "other";
            url: string | null;
            width?: number;
          }>;
        },
        Name
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
          name: string;
          parentId?: string;
          sortOrder?: number;
        },
        {
          _creationTime: number;
          _id: string;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          name: string;
          parentId?: string;
          path: string;
          sortOrder?: number;
        },
        Name
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
        {
          _creationTime: number;
          _id: string;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          name: string;
          parentId?: string;
          path: string;
          sortOrder?: number;
        },
        Name
      >;
      getFolderTree: FunctionReference<
        "query",
        "internal",
        { includeDeleted?: boolean },
        Array<{
          _creationTime: number;
          _id: string;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          name: string;
          parentId?: string;
          path: string;
          sortOrder?: number;
        }>,
        Name
      >;
      getMediaFolder: FunctionReference<
        "query",
        "internal",
        { id: string; includeDeleted?: boolean },
        {
          _creationTime: number;
          _id: string;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          name: string;
          parentId?: string;
          path: string;
          sortOrder?: number;
        } | null,
        Name
      >;
      getMediaFolderByPath: FunctionReference<
        "query",
        "internal",
        { includeDeleted?: boolean; path: string },
        {
          _creationTime: number;
          _id: string;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          name: string;
          parentId?: string;
          path: string;
          sortOrder?: number;
        } | null,
        Name
      >;
      listMediaFolders: FunctionReference<
        "query",
        "internal",
        { includeDeleted?: boolean; parentId?: string },
        Array<{
          _creationTime: number;
          _id: string;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          name: string;
          parentId?: string;
          path: string;
          sortOrder?: number;
        }>,
        Name
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
        },
        {
          _creationTime: number;
          _id: string;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          name: string;
          parentId?: string;
          path: string;
          sortOrder?: number;
        },
        Name
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
        {
          _creationTime: number;
          _id: string;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          name: string;
          parentId?: string;
          path: string;
          sortOrder?: number;
        },
        Name
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
          name?: string;
          sortOrder?: number;
        },
        {
          _creationTime: number;
          _id: string;
          createdBy?: string;
          deletedAt?: number;
          description?: string;
          name: string;
          parentId?: string;
          path: string;
          sortOrder?: number;
        },
        Name
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
        },
        Name
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
        },
        Name
      >;
      deleteAssetVariants: FunctionReference<
        "mutation",
        "internal",
        { assetId: string; deletedBy?: string; hardDelete?: boolean },
        { assetId: string; deleted: number },
        Name
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
        },
        Name
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
        },
        Name
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
        },
        Name
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
        },
        Name
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
        },
        Name
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
        } | null,
        Name
      >;
      getAssetWithVariants: FunctionReference<
        "query",
        "internal",
        { assetId: string },
        {
          original: {
            _creationTime: number;
            _id: string;
            filename: string;
            height?: number;
            mimeType: string;
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
        } | null,
        Name
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
        } | null,
        Name
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
        }>,
        Name
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
        }>,
        Name
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
        },
        Name
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
        }>,
        Name
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
        },
        Name
      >;
      markIndexingEventsProcessed: FunctionReference<
        "mutation",
        "internal",
        { eventIds: Array<string> },
        { processedCount: number },
        Name
      >;
      needsReindexing: FunctionReference<
        "query",
        "internal",
        { entryId: string },
        boolean,
        Name
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
        } | null>,
        Name
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
        } | null,
        Name
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
        { eventsCreated: number; hasMore: boolean; nextCursor?: string },
        Name
      >;
      requestEntryReindex: FunctionReference<
        "mutation",
        "internal",
        { entryId: string; userId?: string },
        { message: string; success: boolean },
        Name
      >;
      scheduleNextIndexingRun: FunctionReference<
        "mutation",
        "internal",
        { delayMs?: number },
        { scheduledAt: number },
        Name
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
          contentTypeId: string;
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
          status: "draft" | "published" | "archived" | "scheduled";
          updatedBy?: string;
          version: number;
        },
        Name
      >;
      getScheduledEntries: FunctionReference<
        "query",
        "internal",
        { contentTypeId?: string; from?: number; to?: number },
        any,
        Name
      >;
      scheduleEntry: FunctionReference<
        "mutation",
        "internal",
        { id: string; publishAt: number; updatedBy?: string },
        {
          _creationTime: number;
          _id: string;
          contentTypeId: string;
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
          status: "draft" | "published" | "archived" | "scheduled";
          updatedBy?: string;
          version: number;
        },
        Name
      >;
    };
    taxonomies: {
      countTerms: FunctionReference<
        "query",
        "internal",
        { includeDeleted?: boolean; taxonomyId: string },
        { count: number },
        Name
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
        } | null,
        Name
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
        { continueCursor: string | null; isDone: boolean; page: Array<string> },
        Name
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
        } | null,
        Name
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
        }>,
        Name
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
        }>,
        Name
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
        },
        Name
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
        },
        Name
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
        }>,
        Name
      >;
    };
    taxonomyMutations: {
      addTermToEntry: FunctionReference<
        "mutation",
        "internal",
        { entryId: string; fieldName: string; termId: string },
        null,
        Name
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
        string,
        Name
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
        string,
        Name
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
        string,
        Name
      >;
      deleteTaxonomy: FunctionReference<
        "mutation",
        "internal",
        { id: string; userId?: string },
        null,
        Name
      >;
      deleteTerm: FunctionReference<
        "mutation",
        "internal",
        { cascade?: boolean; id: string; userId?: string },
        null,
        Name
      >;
      removeTermFromEntry: FunctionReference<
        "mutation",
        "internal",
        { entryId: string; fieldName: string; termId: string },
        null,
        Name
      >;
      restoreTaxonomy: FunctionReference<
        "mutation",
        "internal",
        { id: string; userId?: string },
        string,
        Name
      >;
      restoreTerm: FunctionReference<
        "mutation",
        "internal",
        { id: string; userId?: string },
        string,
        Name
      >;
      setEntryTerms: FunctionReference<
        "mutation",
        "internal",
        { entryId: string; fieldName: string; termIds: Array<string> },
        null,
        Name
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
        string,
        Name
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
        string,
        Name
      >;
    };
    trash: {
      emptyTrash: FunctionReference<
        "mutation",
        "internal",
        { contentTypeId?: string; deletedBy?: string; olderThanDays?: number },
        {
          deletedCount: number;
          deletedVersionsCount: number;
          errors: Array<{ error: string; id: string }>;
        },
        Name
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
        },
        Name
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
        },
        Name
      >;
      listTrash: FunctionReference<
        "query",
        "internal",
        {
          contentTypeId?: string;
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
            contentTypeId: string;
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
            status: "draft" | "published" | "archived" | "scheduled";
            updatedBy?: string;
            version: number;
          }>;
          totalCount?: number;
        },
        Name
      >;
      runTrashCleanup: FunctionReference<
        "mutation",
        "internal",
        { updatedBy?: string },
        { deletedCount: number; message: string },
        Name
      >;
      scheduleTrashCleanup: FunctionReference<
        "mutation",
        "internal",
        { intervalMs?: number },
        any,
        Name
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
        },
        Name
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
          contentTypeId: string;
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
          status: "draft" | "published" | "archived" | "scheduled";
          updatedBy?: string;
          version: number;
        },
        Name
      >;
    };
    webhookTrigger: {
      cleanupOldDeliveries: FunctionReference<
        "mutation",
        "internal",
        { retentionDays?: number },
        { deletedCount: number },
        Name
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
        string,
        Name
      >;
      deleteWebhook: FunctionReference<
        "mutation",
        "internal",
        { deletedBy?: string; hardDelete?: boolean; id: string },
        { message: string; success: boolean },
        Name
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
        } | null,
        Name
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
        } | null,
        Name
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
        },
        Name
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
        },
        Name
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
        }>,
        Name
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
        }>,
        Name
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
        },
        Name
      >;
      retryDelivery: FunctionReference<
        "mutation",
        "internal",
        { deliveryId: string },
        { message: string; success: boolean },
        Name
      >;
      scheduleNextWebhookRun: FunctionReference<
        "mutation",
        "internal",
        { delayMs?: number },
        { scheduledAt: number },
        Name
      >;
      testWebhook: FunctionReference<
        "mutation",
        "internal",
        { webhookId: string },
        { deliveryId?: string; message: string; success: boolean },
        Name
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
        },
        Name
      >;
    };
  };
