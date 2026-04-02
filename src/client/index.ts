/**
 * convex-cms
 *
 * A developer-first Convex Component for content management with
 * flexible RBAC and AI-ready architecture.
 *
 * @example
 * ```typescript
 * // Install the component in convex/convex.config.ts
 * import { defineApp } from "convex/server";
 * import convexCms from "convex-cms/convex.config";
 *
 * const app = defineApp();
 * app.use(convexCms);
 * export default app;
 * ```
 *
 * @example
 * ```typescript
 * // Create a configured CMS client with typed methods and RBAC
 * import { createCmsClient } from "convex-cms";
 * import { components } from "./_generated/api";
 *
 * export const cms = createCmsClient(components.convexCms, {
 *   defaultLocale: "en-US",
 *   features: {
 *     versioning: true,
 *     localization: true,
 *   },
 *   // Map user IDs to CMS roles for access control
 *   getUserRole: async ({ userId }) => {
 *     const user = await db.query("users")
 *       .filter(q => q.eq(q.field("_id"), userId))
 *       .first();
 *     return user?.cmsRole ?? null; // "admin" | "editor" | "author" | "viewer"
 *   },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Use typed methods in your functions
 * import { mutation } from "./_generated/server";
 * import { cms } from "./cms";
 *
 * export const createBlogPost = mutation({
 *   args: { title: v.string(), content: v.string() },
 *   handler: async (ctx, args) => {
 *     // Type-safe API with full autocompletion
 *     return await cms.contentEntries.create(ctx, {
 *       contentTypeId: "blog_type_id",
 *       data: { title: args.title, content: args.content },
 *     });
 *   },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Check user permissions before performing actions
 * import { mutation } from "./_generated/server";
 * import { cms } from "./cms";
 *
 * export const publishPost = mutation({
 *   args: { entryId: v.id("contentEntries"), userId: v.string() },
 *   handler: async (ctx, args) => {
 *     // Check if user can publish content
 *     const result = await cms.hasPermissionForUser(args.userId, {
 *       resource: "contentEntries",
 *       action: "publish",
 *     });
 *
 *     if (!result.allowed) {
 *       throw new Error(`User with role '${result.role}' cannot publish content`);
 *     }
 *
 *     return await cms.contentEntries.publish(ctx, { id: args.entryId });
 *   },
 * });
 * ```
 */

// Export types for external use
export * from "./types.js";

// --- Admin API Helper ---
export {
  defineAdminAPI,
  type AdminApiOptions,
  type AdminOperation,
  type BaseAdminAPI,
} from "./admin/index.js";


// Type-safe admin API utilities
export type {
  ContentTypeHelpersSchema,
  ContentTypeSlugs,
  TypedAdminApiOptions,
  TypedAdminAPI,
} from "./admin/types.js";

// --- Admin API Types ---
// export type {
//   AdminApi,
//   AdminContentType,
//   AdminContentEntry,
//   AdminMediaItem,
//   AdminMoveMediaAssetsResult,
//   AdminDeleteContentTypeResult,
//   AdminPaginatedResult,
//   PaginatedContentTypes,
//   PaginatedContentEntries,
//   PaginatedMediaItems,
// } from "./adminApiTypes.js";

// --- CMS Client Factory ---
import {
  type ComponentConfig,
  type FeatureFlags,
  type LocaleCode,
  type GetUserRoleResult,
  type AuthorizationHookContext,
  resolveConfig,
  validateRequiredHooks,
} from "./types.js";

import {
  isUnifiedCmsConfig,
  extractClientConfig,
  type UnifiedCmsConfig,
} from "./config.js";

import {
  type TypedComponentApi,
  type CmsClient,
  // type CmsReadContext,
  // type CmsMutationContext,
  type ConvexContext,
  type PermissionCheckOptions,
  type UserPermissionResult,
  type ResourcePermissionResult,
  type ResourcePermissionGranted,
  ContentTypesApi,
  ContentEntriesApi,
  VersionsApi,
  MediaAssetsApi,
  MediaFoldersApi,
  MediaVariantsApi,
} from "./wrapper.js";

// Re-export authorization hooks execution utilities
export {
  executeAuthorizationHooks,
  operationToRbac,
  contextToRbacOptions,
  createContentEntryAuthContext,
  requireAuthorization as requireAuthorizationHook,
  type ExecuteAuthorizationOptions,
  type AuthorizationResult,
} from "../component/authorizationHooks.js";

// Re-export core authorization and ownership utilities
export {
  // Error class
  UnauthorizedError,
  type AuthorizationErrorCode,

  // Core permission checking
  checkPermission,
  requirePermission,
  type PermissionCheckOptions as CorePermissionCheckOptions,
  type PermissionGranted,
  type PermissionDenied,
  type PermissionCheckResult,

  // Ownership validation helpers
  isResourceOwner,
  requireResourceOwnership,

  // Authorization context helpers
  createAuthContext,
  canPerform,
  mustPerform,
  type AuthorizationContext,
} from "../component/authorization.js";

// Re-export user context handler utilities
export {
  // Types
  type UserContextInput,
  type UserContext,
  type CreateUserContextOptions,
  type UserContextValidationError,
  type UserContextValidationResult,

  // Error class
  UserContextError,

  // Validation functions
  isValidUserId,
  isValidRole,
  validateUserContextInput,

  // User context creation
  resolveUserRole,
  createUserContext,
  createUserContextSync,

  // User ID extraction
  extractUserId,
  extractUserIdFromAuth,

  // Authorization context builders
  buildAuthorizationContext,
  createAnonymousContext,
  createSystemContext,

  // Utility functions
  isAuthenticated,
  hasUserRole,
  isSystemContext,
  getUserDisplayId,
  validateUserContext,
} from "../component/userContext.js";

// Re-export resource permission types from wrapper
export type {
  ResourcePermissionResult,
  ResourcePermissionGranted,
} from "./wrapper.js";

import {
  executeAuthorizationHooks,
  operationToRbac,
  contextToRbacOptions,
  type AuthorizationResult,
} from "../component/authorizationHooks.js";
import { UnauthorizedError as InternalUnauthorizedError } from "../component/authorization.js";
import type { AuthorizationHelper } from "./wrapper.js";
import type { AuthorizationHookContext as InternalAuthHookContext } from "./types.js";

import {
  hasPermission,
  hasContentTypePermission,
  getPermittedContentTypes,
  DEFAULT_ROLES,
  type Resource,
  type Action,
  type OwnershipScope,
} from "../component/roles.js";

// Import locale fallback chain utilities
import {
  resolveFallbackChain,
  getFallbackChain,
  type LocaleFallbackConfig,
  type ResolvedFallbackChain,
} from "../component/localeFallbackChain.js";

// Re-export wrapper types and classes
export * from "./wrapper.js";

// Re-export query builder types and classes
export {
  ContentQueryBuilder,
  createQueryBuilder,
  type SortDirection,
  type SortableField,
  type QueryBuilderResult,
} from "./queryBuilder.js";

/**
 * Creates an enhanced CMS client with typed method wrappers.
 *
 * This is the main entry point for using the Convex CMS component.
 * The returned client provides typed methods for all CMS operations,
 * making it easy to interact with the CMS from your Convex functions.
 *
 * @param componentApi - The component API from `components.convexCms`
 * @param config - Optional configuration options
 * @returns An enhanced CMS client instance with typed methods
 *
 * @example
 * ```typescript
 * import { createCmsClient } from "convex-cms";
 * import { components } from "./_generated/api";
 *
 * // Create with default configuration
 * export const cms = createCmsClient(components.convexCms);
 *
 * // Create with custom configuration
 * export const cms = createCmsClient(components.convexCms, {
 *   defaultLocale: "en-US",
 *   supportedLocales: ["en-US", "es-ES", "fr-FR"],
 *   features: {
 *     versioning: true,
 *     localization: true,
 *     scheduling: true,
 *   },
 *   maxVersionsPerEntry: 100,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Use typed methods in mutations
 * export const createPost = mutation({
 *   args: { title: v.string() },
 *   handler: async (ctx, args) => {
 *     // Create a content type
 *     const blogType = await cms.contentTypes.create(ctx, {
 *       name: "blog_post",
 *       displayName: "Blog Post",
 *       fields: [
 *         { name: "title", label: "Title", type: "text", required: true },
 *       ],
 *     });
 *
 *     // Create an entry
 *     const entry = await cms.contentEntries.create(ctx, {
 *       contentTypeId: blogType._id,
 *       data: { title: args.title },
 *     });
 *
 *     // Publish the entry
 *     return await cms.contentEntries.publish(ctx, { id: entry._id });
 *   },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Check feature flags
 * if (cms.isFeatureEnabled("localization")) {
 *   // Handle localized content
 * }
 *
 * if (cms.isLocaleSupported("es-ES")) {
 *   // Locale is valid
 * }
 * ```
 */
export function createCmsClient(
  componentApi: TypedComponentApi,
  config?: ComponentConfig | UnifiedCmsConfig
): CmsClient {
  // Normalize unified config to ComponentConfig if needed
  const resolvedInputConfig = config && isUnifiedCmsConfig(config)
    ? extractClientConfig(config)
    : config;

  // Validate required hooks at initialization time (fail-fast)
  validateRequiredHooks(resolvedInputConfig);

  // Register custom field types if provided
  if (resolvedInputConfig?.fieldTypes && resolvedInputConfig.fieldTypes.length > 0) {
    const { registerFieldTypes } = require("./field-types.js");
    registerFieldTypes(resolvedInputConfig.fieldTypes);
  }

  const resolvedConfig = resolveConfig(resolvedInputConfig);
  // Store the getUserRole hook from the original config (not resolved)
  const getUserRoleHook = resolvedInputConfig?.getUserRole;
  // Store authorization hooks from config
  const authHooks = resolvedInputConfig?.authorizationHooks;

  // Create authorization helper for API classes (only if getUserRole is configured)
  const authHelper: AuthorizationHelper | undefined = getUserRoleHook
    ? {
        async getUserRole(ctx: ConvexContext, userId: string): Promise<string | null> {
          // Pass ctx to the hook so it can access parent app's database and auth
          return getUserRoleHook(ctx as unknown as import("./types.js").CmsHookContext, { userId });
        },
        async requireAuthorization(
          ctx: ConvexContext,
          context: Omit<InternalAuthHookContext, 'ctx'>
        ): Promise<AuthorizationResult> {
          // Augment the context with ctx for hooks to access
          const fullContext: InternalAuthHookContext = {
            ...context,
            ctx: ctx as unknown as import("./types.js").CmsHookContext,
          };

          const rbacOptions = contextToRbacOptions(fullContext);

          const result = await executeAuthorizationHooks({
            hooks: authHooks,
            context: fullContext,
            rbacOptions: rbacOptions ?? undefined,
            skipRbac: resolvedConfig.skipRbac,
          });

          if (!result.allowed) {
            const rbacMapping = operationToRbac(fullContext.operation);

            throw new InternalUnauthorizedError(
              result.reason ?? "Operation not allowed",
              {
                code:
                  result.rbacResult?.allowed === false
                    ? result.rbacResult.code
                    : "PERMISSION_DENIED",
                resource: rbacMapping?.resource,
                action: rbacMapping?.action,
                role: fullContext.role ?? undefined,
                userId: fullContext.userId,
              }
            );
          }

          return result;
        },
        skipRbac: resolvedConfig.skipRbac ?? false,
      }
    : undefined;

  return {
    config: resolvedConfig,
    api: componentApi,
    contentTypes: new ContentTypesApi(componentApi, resolvedConfig, authHelper),
    contentEntries: new ContentEntriesApi(componentApi, resolvedConfig, authHelper),
    versions: new VersionsApi(componentApi, resolvedConfig, authHelper),
    mediaAssets: new MediaAssetsApi(componentApi, resolvedConfig, authHelper),
    mediaFolders: new MediaFoldersApi(componentApi, resolvedConfig, authHelper),
    mediaVariants: new MediaVariantsApi(componentApi, resolvedConfig),

    isFeatureEnabled(feature: keyof FeatureFlags): boolean {
      return resolvedConfig.features[feature] ?? false;
    },

    isLocaleSupported(locale: LocaleCode): boolean {
      return resolvedConfig.supportedLocales.includes(locale);
    },

    hasUserRoleHook(): boolean {
      return getUserRoleHook !== undefined;
    },

    hasAuthorizationHooks(): boolean {
      if (!authHooks) return false;
      return !!(
        authHooks.beforeRbac ||
        authHooks.afterRbac ||
        authHooks.authorize ||
        authHooks.onDeny ||
        (authHooks.operationHooks && Object.keys(authHooks.operationHooks).length > 0)
      );
    },

    async getUserRole(ctx: ConvexContext, userId: string): Promise<GetUserRoleResult> {
      if (!getUserRoleHook) {
        throw new Error(
          "No getUserRole hook configured. " +
            "Configure a getUserRole function in createCmsClient options to map user IDs to CMS roles."
        );
      }
      return await getUserRoleHook(ctx as unknown as import("./types.js").CmsHookContext, { userId });
    },

    async hasPermissionForUser(
      ctx: ConvexContext,
      userId: string,
      permission: { resource: Resource; action: Action; scope?: OwnershipScope },
      options?: PermissionCheckOptions
    ): Promise<UserPermissionResult> {
      if (!getUserRoleHook) {
        throw new Error(
          "No getUserRole hook configured. " +
            "Configure a getUserRole function in createCmsClient options to map user IDs to CMS roles."
        );
      }

      const role = await getUserRoleHook(ctx as unknown as import("./types.js").CmsHookContext, { userId });

      // If user has no role, they have no permissions
      if (role === null) {
        return {
          allowed: false,
          role: null,
          permission,
        };
      }

      // Merge custom roles from config with any passed options
      const mergedCustomRoles = {
        ...resolvedConfig.customRoles,
        ...options?.customRoles,
      };

      // Check if the role has the requested permission
      const allowed = hasPermission(role, permission, mergedCustomRoles);

      return {
        allowed,
        role,
        permission,
      };
    },

    async authorize(context: AuthorizationHookContext): Promise<any> {
      // Build RBAC options from context
      const rbacOptions = contextToRbacOptions(context);

      return executeAuthorizationHooks({
        hooks: authHooks,
        context,
        rbacOptions: rbacOptions ?? undefined,
        skipRbac: resolvedConfig.skipRbac,
      });
    },

    async requireAuthorization(context: AuthorizationHookContext): Promise<any> {
      const result = await this.authorize(context);

      if (!result.allowed) {
        const rbacMapping = operationToRbac(context.operation);

        throw new InternalUnauthorizedError(
          result.reason ?? "Operation not allowed",
          {
            code: result.rbacResult?.allowed === false
              ? result.rbacResult.code
              : "PERMISSION_DENIED",
            resource: rbacMapping?.resource,
            action: rbacMapping?.action,
            role: context.role ?? undefined,
            userId: context.userId,
          }
        );
      }

      return result;
    },

    // ==========================================================================
    // ==========================================================================
    // Consolidated Locale API (Simplified)
    // ==========================================================================

    /**
     * Consolidated locale API with 3 core methods.
     *
     * Prefer using this namespace over the individual methods below.
     *
     * @example
     * ```typescript
     * // Get locale configuration
     * const config = cms.locale.getConfig();
     * console.log(config.defaultLocale); // "en"
     *
     * // Get fallback chain for a locale
     * const chain = cms.locale.getFallbackChain("es-MX");
     * // ["es-ES", "en-US", "en"]
     *
     * // Resolve locale with full metadata
     * const resolved = cms.locale.resolve("es-MX");
     * // { requestedLocale: "es-MX", fallbackChain: [...], ... }
     * ```
     */
    locale: {
      /**
       * Get the full locale configuration.
       *
       * @returns The configured locale settings including default locale,
       * supported locales, and fallback chains.
       */
      getConfig(): LocaleFallbackConfig {
        return {
          defaultLocale: resolvedConfig.defaultLocale,
          fallbackChains: resolvedConfig.localeFallbackChains,
          autoGenerateFallbacks: resolvedConfig.autoGenerateLocaleFallbacks,
          supportedLocales: resolvedConfig.supportedLocales,
        };
      },

      /**
       * Get the fallback chain for a locale.
       *
       * Returns an array of locale codes to try in order when content
       * is not available in the requested locale.
       *
       * @param locale - The locale code (e.g., "es-MX")
       * @returns Array of fallback locale codes
       *
       * @example
       * ```typescript
       * cms.locale.getFallbackChain("es-MX");
       * // Returns: ["es-ES", "es", "en"]
       * ```
       */
      getFallbackChain(locale: LocaleCode): LocaleCode[] {
        const fallbackConfig = this.getConfig();
        return getFallbackChain(locale, fallbackConfig);
      },

      /**
       * Resolve a locale with full metadata.
       *
       * Returns detailed information about the locale resolution including
       * the fallback chain, whether it's supported, and parsing info.
       *
       * @param locale - The locale code to resolve
       * @returns Resolved fallback chain with metadata
       *
       * @example
       * ```typescript
       * const resolved = cms.locale.resolve("es-MX");
       * // Returns: {
       * //   requestedLocale: "es-MX",
       * //   fallbackChain: ["es-MX", "es-ES", "es", "en"],
       * //   isSupported: true,
       * //   ...
       * // }
       * ```
       */
      resolve(locale: LocaleCode): ResolvedFallbackChain {
        const fallbackConfig = this.getConfig();
        return resolveFallbackChain(locale, fallbackConfig);
      },
    },

    // ==========================================================================
    // Custom Roles Methods
    // ==========================================================================

    getCustomRoles() {
      return resolvedConfig.customRoles;
    },

    getCustomRole(roleName: string) {
      return resolvedConfig.customRoles[roleName];
    },

    isCustomRole(roleName: string): boolean {
      return roleName in resolvedConfig.customRoles;
    },

    async hasContentTypePermissionForUser(
      ctx: ConvexContext,
      userId: string,
      permission: { resource: Resource; action: Action; scope?: OwnershipScope },
      contentTypeName: string
    ) {
      if (!getUserRoleHook) {
        throw new Error(
          "No getUserRole hook configured. " +
            "Configure a getUserRole function in createCmsClient options to map user IDs to CMS roles."
        );
      }

      const role = await getUserRoleHook(ctx as unknown as import("./types.js").CmsHookContext, { userId });

      if (role === null) {
        return {
          allowed: false,
          role: null,
          permission,
        };
      }

      // Use the content-type-aware permission check
      const allowed = hasContentTypePermission(role, permission, {
        customRoles: resolvedConfig.customRoles,
        contentTypeName,
      });

      return {
        allowed,
        role,
        permission,
      };
    },

    async getPermittedContentTypesForUser(ctx: ConvexContext, userId: string, action: Action) {
      if (!getUserRoleHook) {
        throw new Error(
          "No getUserRole hook configured. " +
            "Configure a getUserRole function in createCmsClient options to map user IDs to CMS roles."
        );
      }

      const role = await getUserRoleHook(ctx as unknown as import("./types.js").CmsHookContext, { userId });

      if (role === null) {
        return [];
      }

      return getPermittedContentTypes(role, action, {
        customRoles: resolvedConfig.customRoles,
      });
    },

    getAllRoles() {
      return {
        ...DEFAULT_ROLES,
        ...resolvedConfig.customRoles,
      };
    },

    // ==========================================================================
    // Resource Ownership Methods
    // ==========================================================================

    async canUserPerformOnResource(
      ctx: ConvexContext,
      userId: string,
      resource: Resource,
      action: Action,
      resourceOwnerId?: string
    ): Promise<ResourcePermissionResult> {
      if (!getUserRoleHook) {
        throw new Error(
          "No getUserRole hook configured. " +
            "Configure a getUserRole function in createCmsClient options to map user IDs to CMS roles."
        );
      }

      const role = await getUserRoleHook(ctx as unknown as import("./types.js").CmsHookContext, { userId });

      // If user has no role, they have no permissions
      if (role === null) {
        return {
          allowed: false,
          role: null,
          reason: "No role assigned to user",
          code: "NO_ROLE",
        };
      }

      // Use the core checkPermission function for comprehensive RBAC check
      const { checkPermission } = await import("../component/authorization.js");

      const result = checkPermission({
        userId,
        role,
        resource,
        action,
        resourceOwnerId,
        customRoles: resolvedConfig.customRoles,
      });

      if (result.allowed) {
        return {
          allowed: true,
          role,
          grantedScope: result.grantedScope,
          ownershipVerified: result.ownershipVerified,
        };
      } else {
        return {
          allowed: false,
          role,
          reason: result.reason,
          code: result.code,
          ownershipRequired: result.code === "OWNERSHIP_REQUIRED",
        };
      }
    },

    async requireUserCanPerformOnResource(
      ctx: ConvexContext,
      userId: string,
      resource: Resource,
      action: Action,
      resourceOwnerId?: string
    ): Promise<ResourcePermissionGranted> {
      const result = await this.canUserPerformOnResource(
        ctx,
        userId,
        resource,
        action,
        resourceOwnerId
      );

      if (!result.allowed) {
        throw new InternalUnauthorizedError(
          result.reason ?? "Operation not allowed",
          {
            code: (result.code ?? "PERMISSION_DENIED") as
              | "NO_ROLE"
              | "UNKNOWN_ROLE"
              | "PERMISSION_DENIED"
              | "OWNERSHIP_REQUIRED",
            resource,
            action,
            role: result.role ?? undefined,
            userId,
            requiredScope: result.ownershipRequired ? "own" : undefined,
          }
        );
      }

      return {
        allowed: true,
        role: result.role!,
        grantedScope: result.grantedScope!,
        ownershipVerified: result.ownershipVerified ?? false,
      };
    },

    isOwner(userId: string | undefined, resourceOwnerId: string | undefined): boolean {
      if (userId === undefined || resourceOwnerId === undefined) {
        return false;
      }
      return userId === resourceOwnerId;
    },
  };
}

// --- Field Validators and Validation ---
export {
  fieldTypeValidator,
  fieldDefinitionValidator,
  contentStatusValidator,
  mediaTypeValidator,
} from "../component/schema.js";

// --- Mutation Argument Validators ---
// These validators can be used in wrapper functions and custom mutations.
// Note: v.id() validators accept strings at runtime, making them work
// across the component boundary.
export {
  // Content Type validators
  createContentTypeArgs,
  updateContentTypeArgs,
  deleteContentTypeArgs,

  // Content Entry validators
  createContentEntryArgs,
  updateContentEntryArgs,
  publishEntryArgs,
  scheduleEntryArgs,
  unpublishEntryArgs,
  deleteContentEntryArgs,
  duplicateContentEntryArgs,

  // Media Asset validators
  createMediaAssetArgs,
  updateMediaAssetArgs,
  deleteMediaAssetArgs,
  restoreMediaAssetArgs,
  moveMediaAssetsArgs,

  // Media Folder validators
  createMediaFolderArgs,
  updateMediaFolderArgs,
  deleteMediaFolderArgs,
  restoreMediaFolderArgs,
  moveFolderArgs,

  // Bulk Operation validators
  bulkPublishArgs,
  bulkUnpublishArgs,
  bulkDeleteArgs,
  bulkUpdateArgs,

  // Version validators
  getVersionHistoryArgs,
  getVersionArgs,
  rollbackVersionArgs,
  compareVersionsArgs,
  createVersionSnapshotArgs,

  // Query validators
  contentQueryArgs,
  mediaQueryArgs,
  listMediaAssetsArgs,

  // Lock validators
  acquireLockArgs,
  releaseLockArgs,
  renewLockArgs,
  checkLockArgs,

  // Trash validators
  updateTrashConfigArgs,
  listTrashArgs,
  emptyTrashArgs,

  // Inferred types from validators
  type CreateContentTypeArgs,
  type UpdateContentTypeArgs,
  type DeleteContentTypeArgs,
  type CreateContentEntryArgs,
  type UpdateContentEntryArgs,
  type DeleteContentEntryArgs,
  type PublishEntryArgs,
  type UnpublishEntryArgs,
  type ScheduleEntryArgs,
  type DuplicateContentEntryArgs,
  type CreateMediaAssetArgs,
  type UpdateMediaAssetArgs,
  type DeleteMediaAssetArgs,
  type RestoreMediaAssetArgs,
  type CreateMediaFolderArgs,
  type UpdateMediaFolderArgs,
  type DeleteMediaFolderArgs,
  type RestoreMediaFolderArgs,
  type MoveFolderArgs,
  type MoveMediaAssetsArgs,
  type BulkPublishArgs,
  type BulkUnpublishArgs,
  type BulkDeleteArgs,
  type BulkUpdateArgs,
  type GetVersionHistoryArgs,
  type GetVersionArgs,
  type RollbackVersionArgs,
  type CompareVersionsArgs,
} from "../component/validators.js";

// Re-export field type constants
export {
  fieldTypes,
  contentStatuses,
  mediaTypes,
} from "../component/schema.js";

// Re-export runtime validation functions
export {
  validateTextField,
  validateRichTextField,
  validateNumberField,
  validateBooleanField,
  validateDateField,
  validateReferenceField,
  validateMediaField,
  validateSelectField,
  validateMultiSelectField,
  validateJsonField,
  validateFieldValue,
  validateLocalizedFieldValue,
  validateContentData,
  applyFieldDefaults,
  getFieldType,
  isFieldRequired,
} from "../component/validation.js";

// Re-export validation types
export type {
  FieldOptions,
  FieldDefinition as RuntimeFieldDefinition,
  ContentTypeSchema as RuntimeContentTypeSchema,
  ContentData as RuntimeContentData,
  ValidationError,
  ValidationErrorCode,
  ValidationResult,
  LocalizedValidationOptions,
  ContentValidationOptions,
} from "../component/validation.js";

// --- Locale Field Utilities ---
export {
  // Type guards
  isLocalizedFieldValue,
  isFieldLocalized,

  // Field value operations
  getLocalizedValue,
  setLocalizedValue,
  removeLocale,
  mergeLocalizedValues,
  getAvailableLocales,
  hasLocale,

  // Content data operations
  resolveContentData,
  setLocalizedContentData,
  getTranslationStatus,

  // Locale content resolution (query enhancement)
  resolveLocaleContent,
  resolveLocaleContentBatch,
} from "../component/localeFields.js";

// Re-export locale field types
export type {
  LocalizedFieldValue,
  FieldValue,
  LocaleResolutionOptions,
  LocaleResolutionResult,
  ResolveContentDataOptions,
  ResolvedContentData,
  LocaleResolvedEntry,
  ResolveLocaleOptions,
} from "../component/localeFields.js";

// --- Locale Fallback Chain ---
export {
  // Configuration utilities
  createFallbackConfig,
  validateFallbackConfig,

  // Chain resolution functions
  resolveFallbackChain,
  getFallbackChain,
  buildLocaleResolutionOptions,

  // Locale parsing utilities
  parseLocale,
  formatLocale,
  getLocaleHierarchy,

  // Preset fallback chains
  FALLBACK_PRESETS,
  mergeFallbackPresets,

  // Default configuration
  DEFAULT_FALLBACK_CONFIG,
} from "../component/localeFallbackChain.js";

// Re-export locale fallback chain types
export type {
  LocaleCode,
  LocaleFallbackConfig,
  ResolvedFallbackChain,
  BuildFallbackChainOptions,
  ParsedLocale,
} from "../component/localeFallbackChain.js";

// Re-export slug utilities
export {
  generateSlug,
  isValidSlug,
  generateUniqueSlug,
} from "../component/lib/slugGenerator.js";

export type { SlugOptions } from "../component/lib/slugGenerator.js";

// --- Deep Reference Resolution ---
export {
  // Core resolution functions
  resolveEntryReferences,
  resolveEntryReferencesBatch,

  // Utility functions
  findCircularReferenceMarkers,
  flattenResolvedReferences,
  countResolvedReferences,
} from "../component/lib/deepReferenceResolver.js";

// Re-export deep reference resolution types from component
export type {
  FieldDefinitionForResolver,
} from "../component/lib/deepReferenceResolver.js";

// Note: DeepResolveOptions, ResolvedContentEntry, and BatchResolveResult
// are already exported from ./types.js above

// --- RBAC Utilities ---
export {
  // Role constants
  roleNames,
  type RoleName,
  roleNameValidator,

  // Resource and action constants
  resources,
  type Resource,
  resourceValidator,
  actions,
  type Action,
  actionValidator,

  // Permission types
  type OwnershipScope,
  type Permission,
  permissionValidator,
  type RoleDefinition,

  // Default roles
  ADMIN_ROLE,
  EDITOR_ROLE,
  AUTHOR_ROLE,
  VIEWER_ROLE,
  DEFAULT_ROLES,
  DEFAULT_ROLES_LIST,

  // Permission check utilities
  hasPermission,
  getRolePermissions,
  getRole,
  isBuiltInRole,
  getResourcePermissions,
  canAccessResource,
  permissionMatches,

  // Custom role types
  type ContentTypePermission,
  type CustomRoleConfig,
  type ExtendRoleConfig,
  type ExtendedRoleDefinition,
  type ContentTypePermissionCheckOptions,

  // Custom role factory functions
  createCustomRole,
  extendRole,
  mergeRolesWithDefaults,
  buildCustomRolesRecord,

  // Content-type-aware permission checking
  hasContentTypePermission,
  getPermittedContentTypes,
  getExcludedContentTypes,

  // Permission factory helpers for custom roles
  fullCrudForContentType,
  publishPermissionsForContentType,
  readOnlyForContentType,

  // Validation utilities
  validateCustomRoleConfig,
  validateExtendRoleConfig,
} from "../component/roles.js";

// Re-export custom role types from types.ts for convenience
export type {
  CustomRoleDefinition,
  CustomRoleInput,
  CustomPermission,
} from "./types.js";

// --- Rate Limiting ---
export {
  // Main execution functions
  executeRateLimitHooks,
  requireRateLimit,

  // Error class
  RateLimitedError,

  // Context creation helpers
  createRateLimitContext,
  operationToCategory,

  // Key/name builders
  createRateLimitKey,
  createRateLimitName,

  // Default configurations
  DEFAULT_TIER_LIMITS,
  getTierLimit,

  // Types
  type ExecuteRateLimitOptions,
  type RateLimitResult,
  type UserTier,
} from "../component/rateLimitHooks.js";

// Re-export rate limit types from types.ts for convenience
export type {
  RateLimitHooks,
  RateLimitHookContext,
  RateLimitCheckResult,
  RateLimitConsumeResult,
  RateLimitConfigResult,
  RateLimitCheckHook,
  RateLimitConsumeHook,
  RateLimitConfigHook,
  OperationCategory,
} from "./types.js";

// --- Agent Tools ---
// Agent tools are available via a separate import path to avoid requiring
// the optional @convex-dev/agent peer dependency for all users:
//
// import { createCmsTools } from "convex-cms/agent";
//
// See ./agentTools.ts for the full API.

// --- Semantic Field Helpers ---
export { fields } from "./fields.js";

// --- Code-Only Schema System ---
export {
  // Core functions
  defineContentType,
  createContentSchema,
  toFieldDefinitions,

  // Runtime utilities
  isContentTypeDefinition,

  // Typed client factory
  createTypedCmsClient,
  TypedContentEntriesApiImpl,

  // Schema drift detection
  detectSchemaDrift,
  formatDriftReport,
  hasErrors as hasDriftErrors,
  filterReportByContentTypes,

  // Type code generation
  generateTypesFromDatabase,
  generateTypesFromDefinitions,
  validateGeneratedCode,
} from "./schema/index.js";

// --- Unified CMS Factory (Advanced API) ---
export {
  createCms,
  createTypedHelpers,
  createTaxonomyHelpers,
  type CmsInstance,
  type ContentTypeHelpers,
  type TypedHelpersResult,
  type DefineContentConfig,
  type ContentDisplayConfig,
  type ContentEntryWithData,
  type DefineContentListOptions,
  type DefineContentPaginatedResult,
  type TaxonomyHelpers,
  type TaxonomyTerm,
  type Taxonomy,
} from "./defineContent.js";

// Re-export schema types
export type {
  // Core definition types
  CmsObjectValidator,
  ContentTypeConfig,
  ContentTypeDefinition,
  ContentTypeMeta,
  FieldMeta,
  FieldRenderAs,

  // Type inference utilities
  InferContentType,
  InferSchema,
  ContentSchema,
  SchemaContentTypeNames,
  SchemaContentType,
  ContentTypeFieldNames,

  // Schema instance type
  ContentSchemaInstance,
  DatabaseFieldDefinition,
} from "./schema/index.js";

// Re-export schema config types from types.ts
export type {
  ContentSchemaConfig,
  ContentTypeDefinitionBase,
} from "./types.js";

// Re-export typed client types for schema-aware access
export type {
  TypedContentEntry,
  TypedPaginationResult,
  TypedContentEntriesApi,
  TypedCreateEntryOptions,
  TypedUpdateEntryOptions,
  TypedListEntriesOptions,
  SchemaDataType,
  ValidContentTypeName,
  HasContentType,
  GetContentTypeDefinition,
  TypedCmsClientConfig,
  TypedCmsClient,
  // Schema drift detection types
  DriftSeverity,
  DriftType,
  DriftIssue,
  DriftSummary,
  SchemaDriftReport,
  DetectDriftOptions,
  // Type code generation types
  CodegenOptions,
  CodegenResult,
} from "./schema/index.js";

// --- Custom Field Types ---
export {
  defineFieldType,
  registerFieldType,
  registerFieldTypes,
  getFieldTypeDefinition,
  getAllFieldTypes,
  getCustomFieldTypes,
  isBuiltInFieldType,
  isCustomFieldType,
  hasFieldType,
  getFieldTypeDefaultValue,
  getFieldTypeIcon,
  BUILT_IN_TYPES,
  type FieldTypeDefinition,
  type FieldValidationResult,
} from "./field-types.js";

// --- Custom Workflows ---
export {
  defineWorkflow,
  getWorkflowState,
  getAvailableTransitions,
  canTransition,
  isPublishedState,
  getInitialState,
  getAllPublishedStates,
  validateWorkflowTransition,
  DEFAULT_WORKFLOW,
  type WorkflowConfig,
  type WorkflowState,
  type WorkflowStateColor,
} from "./workflows.js";

// --- Admin UI Configuration ---
export {
  defineAdminConfig,
  resolveAdminConfig,
  adminConfigSchema,
  type AdminConfig,
  type NavItem,
} from "./adminConfig.js";

// --- Unified CMS Configuration ---
export {
  defineCmsConfig,
  isUnifiedCmsConfig,
  extractClientConfig,
  extractAdminConfig,
  extractUiConfig,
  type UnifiedCmsConfig,
  type SharedCmsConfig,
  type ClientCmsConfig,
  type AdminApiCmsConfig,
  type UiCmsConfig,
} from "./config.js";
