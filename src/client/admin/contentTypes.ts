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
import type { DatabaseFieldDefinition } from "../schema/defineContentType.js";

/**
 * Content type source indicator.
 * - "code": Defined in code via defineContentType or cms.defineContent
 * - "database": Defined in the database via admin UI
 */
export type ContentTypeSource = "code" | "database";

/**
 * Drift severity levels.
 */
export type DriftSeverity = "error" | "warning" | "info";

/**
 * Types of schema drift that can be detected.
 */
export type DriftType =
  | "CONTENT_TYPE_MISSING_IN_DB"
  | "CONTENT_TYPE_MISSING_IN_CODE"
  | "FIELD_MISSING_IN_DB"
  | "FIELD_MISSING_IN_CODE"
  | "FIELD_TYPE_MISMATCH"
  | "FIELD_REQUIRED_MISMATCH";

/**
 * A single schema drift issue.
 */
export interface DriftIssue {
  type: DriftType;
  severity: DriftSeverity;
  contentTypeName: string;
  fieldName?: string;
  message: string;
}

/**
 * Validator for drift issue.
 */
const driftIssueValidator = v.object({
  type: v.union(
    v.literal("CONTENT_TYPE_MISSING_IN_DB"),
    v.literal("CONTENT_TYPE_MISSING_IN_CODE"),
    v.literal("FIELD_MISSING_IN_DB"),
    v.literal("FIELD_MISSING_IN_CODE"),
    v.literal("FIELD_TYPE_MISMATCH"),
    v.literal("FIELD_REQUIRED_MISMATCH")
  ),
  severity: v.union(v.literal("error"), v.literal("warning"), v.literal("info")),
  contentTypeName: v.string(),
  fieldName: v.optional(v.string()),
  message: v.string(),
});

/**
 * Compares code-defined and database-defined content types to detect drift.
 */
function detectDrift(
  codeTypes: ContentTypeDefinition[],
  dbTypes: Array<{
    name: string;
    createdBy?: string;
    fields: Array<{ name: string; type: string; required: boolean }>;
  }>
): DriftIssue[] {
  const issues: DriftIssue[] = [];

  const codeTypeMap = new Map(codeTypes.map((t) => [t.slug, t]));
  const dbTypeMap = new Map(dbTypes.map((t) => [t.name, t]));

  // Check code types against database
  for (const codeType of codeTypes) {
    const dbType = dbTypeMap.get(codeType.slug);

    if (!dbType) {
      issues.push({
        type: "CONTENT_TYPE_MISSING_IN_DB",
        severity: "warning",
        contentTypeName: codeType.slug,
        message: `Content type "${codeType.slug}" is defined in code but not synced to database. Call syncCodeDefinedTypes to sync.`,
      });
      continue;
    }

    // Only compare fields for code-created types (avoid comparing UI-created types)
    if (dbType.createdBy !== "code") {
      continue;
    }

    // Compare fields
    const codeFields = toFieldDefinitions(codeType);
    const codeFieldMap = new Map(codeFields.map((f) => [f.name, f]));
    const dbFieldMap = new Map(dbType.fields.map((f) => [f.name, f]));

    // Check for fields in code but not in DB
    for (const codeField of codeFields) {
      const dbField = dbFieldMap.get(codeField.name);

      if (!dbField) {
        issues.push({
          type: "FIELD_MISSING_IN_DB",
          severity: "error",
          contentTypeName: codeType.slug,
          fieldName: codeField.name,
          message: `Field "${codeField.name}" is defined in code but not in database for "${codeType.slug}".`,
        });
        continue;
      }

      // Check type mismatch
      if (codeField.type !== dbField.type) {
        issues.push({
          type: "FIELD_TYPE_MISMATCH",
          severity: "error",
          contentTypeName: codeType.slug,
          fieldName: codeField.name,
          message: `Field "${codeField.name}" type mismatch: code="${codeField.type}", db="${dbField.type}".`,
        });
      }

      // Check required mismatch
      if (codeField.required !== dbField.required) {
        issues.push({
          type: "FIELD_REQUIRED_MISMATCH",
          severity: "warning",
          contentTypeName: codeType.slug,
          fieldName: codeField.name,
          message: `Field "${codeField.name}" required mismatch: code=${codeField.required}, db=${dbField.required}.`,
        });
      }
    }

    // Check for fields in DB but not in code
    for (const dbField of dbType.fields) {
      if (!codeFieldMap.has(dbField.name)) {
        issues.push({
          type: "FIELD_MISSING_IN_CODE",
          severity: "warning",
          contentTypeName: codeType.slug,
          fieldName: dbField.name,
          message: `Field "${dbField.name}" exists in database but not in code for "${codeType.slug}".`,
        });
      }
    }
  }

  // Check for code-created DB types that are no longer in code
  for (const dbType of dbTypes) {
    if (dbType.createdBy === "code" && !codeTypeMap.has(dbType.name)) {
      issues.push({
        type: "CONTENT_TYPE_MISSING_IN_CODE",
        severity: "warning",
        contentTypeName: dbType.name,
        message: `Content type "${dbType.name}" was code-defined but is no longer in code registry.`,
      });
    }
  }

  return issues;
}

/**
 * Compare two field definition arrays to detect if they have changed.
 * Compares field names, types, required status, and options.
 */
function fieldsHaveChanged(
  existingFields: Array<{ name: string; type: string; required: boolean; options?: Record<string, unknown> }>,
  newFields: DatabaseFieldDefinition[]
): boolean {
  if (existingFields.length !== newFields.length) {
    return true;
  }

  const existingMap = new Map(existingFields.map((f) => [f.name, f]));

  for (const newField of newFields) {
    const existing = existingMap.get(newField.name);
    if (!existing) {
      return true;
    }
    if (existing.type !== newField.type) {
      return true;
    }
    if (existing.required !== newField.required) {
      return true;
    }
    if (JSON.stringify(existing.options) !== JSON.stringify(newField.options)) {
      return true;
    }
  }

  return false;
}

export interface SyncResult {
  created: number;
  updated: number;
  unchanged: number;
  removedOrphans: number;
}

/**
 * Syncs all code-defined content types to the database.
 * Creates new DB records for types not in DB, updates existing code-defined
 * types if their schema has changed.
 *
 * This ensures the database schema stays in sync with code definitions,
 * preventing drift that could cause validation issues.
 */
async function syncCodeDefinedTypes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  component: ComponentApi
): Promise<SyncResult> {
  const codeTypes = getAllCodeDefinedTypes();
  const result: SyncResult = { created: 0, updated: 0, unchanged: 0, removedOrphans: 0 };

  for (const codeType of codeTypes) {
    const existing = await ctx.runQuery(component.contentTypes.get, {
      name: codeType.slug,
    });

    const newFields = toFieldDefinitions(codeType);

    if (!existing) {
      await ctx.runMutation(component.contentTypeMutations.createContentType, {
        name: codeType.slug,
        displayName: codeType.meta.displayName || codeType.name,
        description: codeType.meta.description,
        icon: codeType.meta.icon,
        singleton: codeType.meta.singleton ?? false,
        titleField: codeType.meta.titleField,
        slugField: codeType.meta.slugField,
        sortOrder: codeType.meta.sortOrder ?? 0,
        fields: newFields as never,
        createdBy: "code",
      });
      result.created++;
    } else if (existing.createdBy === "code") {
      if (fieldsHaveChanged(existing.fields, newFields)) {
        await ctx.runMutation(component.contentTypeMutations.updateContentType, {
          id: existing._id,
          displayName: codeType.meta.displayName || codeType.name,
          description: codeType.meta.description,
          icon: codeType.meta.icon,
          singleton: codeType.meta.singleton ?? false,
          titleField: codeType.meta.titleField,
          slugField: codeType.meta.slugField,
          sortOrder: codeType.meta.sortOrder ?? 0,
          fields: newFields as never,
          updatedBy: "code",
          force: true,
        });
        result.updated++;
      } else {
        result.unchanged++;
      }
    } else {
      result.unchanged++;
    }
  }

  // Clean up orphaned code-defined types no longer in the code registry
  const codeSlugs = new Set(codeTypes.map((t) => t.slug));
  const dbResult = await ctx.runQuery(component.contentTypes.list, {
    isActive: true,
  });

  for (const dbType of dbResult.page) {
    if (dbType.createdBy === "code" && !codeSlugs.has(dbType.name)) {
      // This type was code-defined but no longer exists in code — remove it
      await ctx.runMutation(component.contentTypeMutations.deleteContentType, {
        id: dbType._id,
        cascade: true,
        hardDelete: false,
        deletedBy: "code-sync",
      });
      result.removedOrphans++;
    }
  }

  return result;
}

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
    syncCodeDefinedTypes: mutationGeneric({
      args: {},
      returns: v.object({
        created: v.number(),
        updated: v.number(),
        unchanged: v.number(),
        removedOrphans: v.number(),
      }),
      handler: async (ctx) => {
        await checkAuth(ctx, { type: "syncContentTypes" });
        return await syncCodeDefinedTypes(ctx, component);
      },
    }),

    checkSchemaDrift: queryGeneric({
      args: {},
      returns: v.array(driftIssueValidator),
      handler: async (ctx): Promise<DriftIssue[]> => {
        await checkAuth(ctx, { type: "checkSchemaDrift" });

        const codeTypes = getAllCodeDefinedTypes();
        const dbResult = await ctx.runQuery(component.contentTypes.list, {});

        return detectDrift(codeTypes, dbResult.page);
      },
    }),

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
        const codeTypeSlugs = new Set(codeDefinedTypes.map((t) => t.slug));

        // Get database-defined types
        const dbResult = await ctx.runQuery(component.contentTypes.list, {
          isActive: args.isActive,
        });

        // Filter out DB types that are also code-defined (code takes precedence)
        // Compare by slug since DB stores slug in `name` field
        const dbTypesFiltered = dbResult.page
          .filter((t) => !codeTypeSlugs.has(t.name))
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
