/**
 * Content Types Operations
 *
 * CRUD operations for content type management with optional entry counts.
 */

import { queryGeneric, mutationGeneric } from "convex/server";
import { v } from "convex/values";
import type { ComponentApi } from "../../component/_generated/component.js";
import type { AuthContext, AdminOperation } from "./types.js";
import {
  adminContentTypeDoc,
  adminContentTypeWithCountDoc,
  adminDeleteContentTypeResult,
  adminFieldDefinitionValidator,
  adminPaginationResult,
} from "./validators.js";

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
        adminPaginationResult(adminContentTypeDoc),
        adminPaginationResult(adminContentTypeWithCountDoc)
      ),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "listContentTypes" });

        const result = await ctx.runQuery(component.contentTypes.list, {
          isActive: args.isActive,
        });

        if (!args.includeEntryCounts) {
          return result;
        }

        const contentTypesWithCounts = await Promise.all(
          result.page.map(async (contentType) => {
            const countResult = await ctx.runQuery(
              component.contentEntries.count,
              { contentTypeId: contentType._id }
            );
            return {
              ...contentType,
              entryCount: countResult.count,
            };
          })
        );

        return {
          ...result,
          page: contentTypesWithCounts,
        };
      },
    }),

    getContentType: queryGeneric({
      args: {
        id: v.optional(v.string()),
        name: v.optional(v.string()),
      },
      returns: v.union(adminContentTypeDoc, v.null()),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getContentType", id: args.id, name: args.name });

        if (args.id && (!/^[a-z0-9]+$/i.test(args.id) || args.id.length < 10)) {
          return null;
        }

        try {
          return await ctx.runQuery(component.contentTypes.get, {
            id: args.id,
            name: args.name,
          });
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
        return await ctx.runMutation(
          component.contentTypeMutations.deleteContentType,
          args
        );
      },
    }),
  };
}
