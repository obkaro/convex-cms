/**
 * Content Types Operations
 *
 * CRUD operations for content type management with optional entry counts.
 * Supports merging code-defined types with database-defined types.
 */

import { queryGeneric, mutationGeneric } from "convex/server";
import { v } from "convex/values";
import type { ComponentApi } from "../../component/_generated/component.js";
import type { AuthContext, AdminOperation } from "./types.js";
import type { ContentTypeDefinition } from "../schema/types.js";
import { toFieldDefinitions } from "../schema/defineContentType.js";
import {
  getAllCodeDefinedTypes,
  getCodeDefinedType,
  isCodeDefinedType as isCodeDefinedTypeFromRegistry,
} from "../registry.js";
import {
  adminContentTypeDoc,
  adminContentTypeWithSourceDoc,
  adminContentTypeWithSourceAndCountDoc,
  adminDeleteContentTypeResult,
  adminFieldDefinitionValidator,
  adminPaginationResult,
  type AdminContentTypeWithSource,
  type AdminContentTypeWithSourceAndCount,
} from "./validators.js";

/**
 * Content type source indicator.
 * - "code": Defined in code via defineContentType or cms.defineContent
 * - "database": Defined in the database via admin UI
 */
export type ContentTypeSource = "code" | "database";

/**
 * Helper to convert a code-defined type to the admin API format.
 */
function toAdminFormat(t: ContentTypeDefinition, id: string): AdminContentTypeWithSource {
  return {
    _id: id,
    _creationTime: 0,
    name: t.slug,
    displayName: t.meta.displayName || t.name,
    description: t.meta.description,
    icon: t.meta.icon,
    singleton: t.meta.singleton ?? false,
    titleField: t.meta.titleField,
    slugField: t.meta.slugField,
    sortOrder: t.meta.sortOrder ?? 0,
    isActive: true,
    fields: toFieldDefinitions(t),
    createdBy: "code",
    source: "code",
  } as AdminContentTypeWithSource;
}

export function createContentTypesOperations(
  component: ComponentApi,
  checkAuth: (ctx: AuthContext, operation: AdminOperation) => Promise<string | null>
) {
  return {
    listContentTypes: queryGeneric({
      args: {
        isActive: v.optional(v.boolean()),
        includeEntryCounts: v.optional(v.boolean()),
      },
      returns: v.union(
        adminPaginationResult(adminContentTypeWithSourceDoc),
        adminPaginationResult(adminContentTypeWithSourceAndCountDoc)
      ),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "listContentTypes" });

        // Query registry at runtime for code-defined types
        const codeDefinedTypes = getAllCodeDefinedTypes();
        const codeTypeNames = new Set(codeDefinedTypes.map((t) => t.name));

        // Get database-defined types
        const dbResult = await ctx.runQuery(component.contentTypes.list, {
          isActive: args.isActive,
        });

        // Filter out DB types that are also code-defined (code takes precedence)
        const dbTypesFiltered = dbResult.page
          .filter((t) => !codeTypeNames.has(t.name))
          .map((t) => ({
            ...t,
            source: "database" as const,
          })) as AdminContentTypeWithSource[];

        // Convert code-defined types to the expected format
        const codeTypes = codeDefinedTypes
          .filter(() => args.isActive === undefined || args.isActive === true)
          .map((t) => toAdminFormat(t, `code:${t.slug}`));

        // Merge and sort by sortOrder, then name
        const allTypes = [...codeTypes, ...dbTypesFiltered].sort((a, b) => {
          const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
          if (orderDiff !== 0) return orderDiff;
          return a.name.localeCompare(b.name);
        });

        // Add entry counts if requested
        if (!args.includeEntryCounts) {
          return {
            page: allTypes,
            continueCursor: null as string | null,
            isDone: true,
          };
        }

        const contentTypesWithCounts: AdminContentTypeWithSourceAndCount[] = await Promise.all(
          allTypes.map(async (contentType) => {
            const countResult = await ctx.runQuery(
              component.contentEntries.count,
              { contentTypeName: contentType.name }
            );
            return {
              ...contentType,
              entryCount: countResult.count,
            };
          })
        );

        return {
          page: contentTypesWithCounts,
          continueCursor: null as string | null,
          isDone: true,
        };
      },
    }),

    getContentType: queryGeneric({
      args: {
        id: v.optional(v.string()),
        name: v.optional(v.string()),
      },
      returns: v.union(adminContentTypeWithSourceDoc, v.null()),
      handler: async (ctx, args): Promise<AdminContentTypeWithSource | null> => {
        await checkAuth(ctx, { type: "getContentType", id: args.id, name: args.name });

        // Check code-defined types first (by name)
        if (args.name) {
          const codeType = getCodeDefinedType(args.name);
          if (codeType) {
            return toAdminFormat(codeType, `code:${codeType.slug}`);
          }
        }

        // Check if ID is a code-defined type ID (code:name format)
        if (args.id?.startsWith("code:")) {
          const name = args.id.slice(5);
          const codeType = getCodeDefinedType(name);
          if (codeType) {
            return toAdminFormat(codeType, args.id);
          }
          return null;
        }

        // Validate DB ID format
        if (args.id && (!/^[a-z0-9]+$/i.test(args.id) || args.id.length < 10)) {
          return null;
        }

        try {
          const dbResult = await ctx.runQuery(component.contentTypes.get, {
            id: args.id,
            name: args.name,
          });
          if (!dbResult) return null;
          return { ...dbResult, source: "database" } as AdminContentTypeWithSource;
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("ArgumentValidationError")
          ) {
            return null;
          }
          throw error;
        }
      },
    }),

    createContentType: mutationGeneric({
      args: {
        name: v.string(),
        displayName: v.string(),
        fields: v.array(adminFieldDefinitionValidator),
        description: v.optional(v.string()),
        icon: v.optional(v.string()),
        singleton: v.optional(v.boolean()),
        slugField: v.optional(v.string()),
        titleField: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
        createdBy: v.optional(v.string()),
      },
      returns: adminContentTypeDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "createContentType" });

        // Prevent creating a type with the same name as a code-defined type
        if (isCodeDefinedTypeFromRegistry(args.name)) {
          throw new Error(
            `Cannot create content type "${args.name}": a code-defined type with this name already exists.`
          );
        }

        return await ctx.runMutation(
          component.contentTypeMutations.createContentType,
          {
            ...args,
            createdBy: args.createdBy ?? "system",
          }
        );
      },
    }),

    updateContentType: mutationGeneric({
      args: {
        id: v.string(),
        displayName: v.optional(v.string()),
        fields: v.optional(v.array(adminFieldDefinitionValidator)),
        description: v.optional(v.string()),
        icon: v.optional(v.string()),
        singleton: v.optional(v.boolean()),
        slugField: v.optional(v.string()),
        titleField: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
        updatedBy: v.optional(v.string()),
        force: v.optional(v.boolean()),
      },
      returns: adminContentTypeDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "updateContentType", id: args.id });

        // Prevent updating code-defined types
        if (args.id.startsWith("code:")) {
          throw new Error(
            `Cannot update content type "${args.id}": code-defined types are read-only. ` +
              `Modify the type definition in your code instead.`
          );
        }

        return await ctx.runMutation(
          component.contentTypeMutations.updateContentType,
          args
        );
      },
    }),

    deleteContentType: mutationGeneric({
      args: {
        id: v.string(),
        cascade: v.optional(v.boolean()),
        hardDelete: v.optional(v.boolean()),
        deletedBy: v.optional(v.string()),
      },
      returns: adminDeleteContentTypeResult,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "deleteContentType", id: args.id });

        // Prevent deleting code-defined types
        if (args.id.startsWith("code:")) {
          throw new Error(
            `Cannot delete content type "${args.id}": code-defined types are managed by code. ` +
              `Remove the type definition from your code instead.`
          );
        }

        return await ctx.runMutation(
          component.contentTypeMutations.deleteContentType,
          args
        );
      },
    }),

    /**
     * Check if a content type is code-defined (read-only).
     */
    isCodeDefined: (name: string): boolean => {
      return isCodeDefinedTypeFromRegistry(name);
    },
  };
}
