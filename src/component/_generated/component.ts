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
    contentEntries: {
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
      list: FunctionReference<
        "query",
        "internal",
        {
          contentTypeId?: string;
          contentTypeName?: string;
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
        { deletedBy?: string; hardDelete?: boolean; id: string },
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
      publishEntry: FunctionReference<
        "mutation",
        "internal",
        { changeDescription?: string; id: string; updatedBy?: string },
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
        { id: string; restoredBy?: string },
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
      updateEntry: FunctionReference<
        "mutation",
        "internal",
        {
          data?: any;
          id: string;
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
    contentTypeMutations: {
      createContentType: FunctionReference<
        "mutation",
        "internal",
        {
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
              allowedBlocks?: Array<string>;
              allowedContentTypes?: Array<string>;
              allowedMarks?: Array<string>;
              allowedMimeTypes?: Array<string>;
              max?: number;
              maxFileSize?: number;
              maxLength?: number;
              min?: number;
              minItems?: number;
              minLength?: number;
              multiple?: boolean;
              options?: Array<{ label: string; value: string }>;
              pattern?: string;
              precision?: number;
              step?: number;
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
              | "multiSelect";
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
              allowedBlocks?: Array<string>;
              allowedContentTypes?: Array<string>;
              allowedMarks?: Array<string>;
              allowedMimeTypes?: Array<string>;
              max?: number;
              maxFileSize?: number;
              maxLength?: number;
              min?: number;
              minItems?: number;
              minLength?: number;
              multiple?: boolean;
              options?: Array<{ label: string; value: string }>;
              pattern?: string;
              precision?: number;
              step?: number;
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
              | "multiSelect";
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
  };
