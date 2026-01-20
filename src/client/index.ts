/**
 * @convex-cms/core
 *
 * A developer-first Convex Component for content management with
 * flexible RBAC and AI-ready architecture.
 *
 * @example
 * ```typescript
 * // Install the component in convex/convex.config.ts
 * import { defineApp } from "convex/server";
 * import convexCms from "@convex-cms/core/convex.config";
 *
 * const app = defineApp();
 * app.use(convexCms);
 * export default app;
 * ```
 *
 * @example
 * ```typescript
 * // Create a configured CMS client with typed methods and RBAC
 * import { createCmsClient } from "@convex-cms/core";
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
 *   args: { entryId: v.id("content_entries"), userId: v.string() },
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

// =============================================================================
// CMS Client Factory (Enhanced with Typed Methods)
// =============================================================================

import {
  type ComponentConfig,
  type ResolvedComponentConfig,
  type FeatureFlags,
  type LocaleCode,
  type GetUserRoleResult,
  type AuthorizationHooks,
  type AuthorizationHook,
  type AuthorizationHookContext,
  type AuthorizationHookResult,
  type CmsOperation,
  resolveConfig,
  validateRequiredHooks,
  MissingHookError,
} from "./types.js";

import {
  type TypedComponentApi,
  type EnhancedCmsClient,
  type ConvexContext,
  type PermissionCheckOptions,
  type UserPermissionResult,
  ContentTypesApi,
  ContentEntriesApi,
  VersionsApi,
  MediaAssetsApi,
  MediaFoldersApi,
  MediaVariantsApi,
  createEnhancedCmsClient as createEnhancedCmsClientInternal,
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

// Import the authorization hooks execution utilities for use in createCmsClient
import {
  executeAuthorizationHooks as executeAuthHooks,
  operationToRbac as opToRbac,
  contextToRbacOptions as ctxToRbacOpts,
} from "../component/authorizationHooks.js";

// Import UnauthorizedError for internal use (already re-exported above)
import { UnauthorizedError as UnauthorizedErrorInternal } from "../component/authorization.js";

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
  buildLocaleResolutionOptions,
  parseLocale,
  getLocaleHierarchy,
  type LocaleFallbackConfig,
  type ResolvedFallbackChain,
  type ParsedLocale,
} from "../component/localeFallbackChain.js";

// Import locale resolution types
import type { LocaleResolutionOptions } from "../component/localeFields.js";

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
 * import { createCmsClient } from "@convex-cms/core";
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
  config?: ComponentConfig
): EnhancedCmsClient {
  // Validate required hooks at initialization time (fail-fast)
  validateRequiredHooks(config);

  const resolvedConfig = resolveConfig(config);
  // Store the getUserRole hook from the original config (not resolved)
  const getUserRoleHook = config?.getUserRole;
  // Store authorization hooks from config
  const authHooks = config?.authorizationHooks;

  return {
    config: resolvedConfig,
    api: componentApi,
    contentTypes: new ContentTypesApi(componentApi, resolvedConfig),
    contentEntries: new ContentEntriesApi(componentApi, resolvedConfig),
    versions: new VersionsApi(componentApi, resolvedConfig),
    mediaAssets: new MediaAssetsApi(componentApi, resolvedConfig),
    mediaFolders: new MediaFoldersApi(componentApi, resolvedConfig),
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

    async getUserRole(userId: string): Promise<GetUserRoleResult> {
      if (!getUserRoleHook) {
        throw new Error(
          "No getUserRole hook configured. " +
            "Configure a getUserRole function in createCmsClient options to map user IDs to CMS roles."
        );
      }
      return await getUserRoleHook({ userId });
    },

    async hasPermissionForUser(
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

      const role = await getUserRoleHook({ userId });

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
      const rbacOptions = ctxToRbacOpts(context);

      return executeAuthHooks({
        hooks: authHooks,
        context,
        rbacOptions: rbacOptions ?? undefined,
        skipRbac: resolvedConfig.skipRbac,
      });
    },

    async requireAuthorization(context: AuthorizationHookContext): Promise<any> {
      const result = await this.authorize(context);

      if (!result.allowed) {
        const rbacMapping = opToRbac(context.operation);

        throw new UnauthorizedErrorInternal(
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
    // Locale Fallback Chain Methods
    // ==========================================================================

    getLocaleFallbackConfig(): LocaleFallbackConfig {
      return {
        defaultLocale: resolvedConfig.defaultLocale,
        fallbackChains: resolvedConfig.localeFallbackChains,
        autoGenerateFallbacks: resolvedConfig.autoGenerateLocaleFallbacks,
        supportedLocales: resolvedConfig.supportedLocales,
      };
    },

    getLocaleFallbackChain(locale: LocaleCode): LocaleCode[] {
      const fallbackConfig = this.getLocaleFallbackConfig();
      return getFallbackChain(locale, fallbackConfig);
    },

    resolveLocaleFallbackChain(locale: LocaleCode): ResolvedFallbackChain {
      const fallbackConfig = this.getLocaleFallbackConfig();
      return resolveFallbackChain(locale, fallbackConfig);
    },

    buildLocaleResolutionOptions(locale: LocaleCode): LocaleResolutionOptions {
      const fallbackConfig = this.getLocaleFallbackConfig();
      return buildLocaleResolutionOptions(locale, fallbackConfig);
    },

    parseLocale(locale: LocaleCode): ParsedLocale | null {
      return parseLocale(locale);
    },

    getLocaleHierarchy(locale: LocaleCode): LocaleCode[] {
      return getLocaleHierarchy(locale);
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

      const role = await getUserRoleHook({ userId });

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

    async getPermittedContentTypesForUser(userId: string, action: Action) {
      if (!getUserRoleHook) {
        throw new Error(
          "No getUserRole hook configured. " +
            "Configure a getUserRole function in createCmsClient options to map user IDs to CMS roles."
        );
      }

      const role = await getUserRoleHook({ userId });

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
      userId: string,
      resource: Resource,
      action: Action,
      resourceOwnerId?: string
    ): Promise<import("./wrapper.js").ResourcePermissionResult> {
      if (!getUserRoleHook) {
        throw new Error(
          "No getUserRole hook configured. " +
            "Configure a getUserRole function in createCmsClient options to map user IDs to CMS roles."
        );
      }

      const role = await getUserRoleHook({ userId });

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
      userId: string,
      resource: Resource,
      action: Action,
      resourceOwnerId?: string
    ): Promise<import("./wrapper.js").ResourcePermissionGranted> {
      const result = await this.canUserPerformOnResource(
        userId,
        resource,
        action,
        resourceOwnerId
      );

      if (!result.allowed) {
        throw new UnauthorizedErrorInternal(
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

// Backwards compatibility alias
export { createCmsClient as createEnhancedCmsClient };

// =============================================================================
// Field Validators and Validation Functions
// =============================================================================

// Re-export Convex validators from schema
export {
  fieldTypeValidator,
  fieldDefinitionValidator,
  contentStatusValidator,
  mediaTypeValidator,
} from "../component/schema.js";

// Re-export field type constants
export {
  fieldTypes,
  contentStatuses,
  mediaTypes,
} from "../component/validators.js";

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

// =============================================================================
// Locale-Specific Content Field Storage and Resolution
// =============================================================================

// Re-export locale field types and utilities
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

// =============================================================================
// Locale Fallback Chain Configuration and Utilities
// =============================================================================

// Re-export locale fallback chain utilities
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

// =============================================================================
// Deep Reference Resolution (Recursive with Depth Limiting)
// =============================================================================

// Re-export deep reference resolution utilities from component
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

// =============================================================================
// RBAC Utilities
// =============================================================================

// Re-export RBAC types and utilities from component
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

// =============================================================================
// Rate Limiting Hooks Infrastructure
// =============================================================================

// Re-export rate limit hook execution utilities
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

// =============================================================================
// Agent Tools (@convex-dev/agent Integration)
// =============================================================================

// Re-export agent tools for AI agent integration
export {
  // Main factory function
  createCmsTools,

  // Types
  type AgentComponentApi,
  type CmsTools,
  type CmsToolName,
  type CreateCmsToolsOptions,

  // Zod schemas for tool arguments (useful for custom tool creation)
  fieldTypeSchema,
  contentStatusSchema,
  mediaTypeSchema,
  fieldOptionsSchema,
  fieldDefinitionSchema,
  filterOperatorSchema,
  fieldFilterSchema,

  // Content Type schemas
  createContentTypeArgsSchema,
  updateContentTypeArgsSchema,
  listContentTypesArgsSchema,
  getContentTypeArgsSchema,

  // Content Entry schemas
  createContentEntryArgsSchema,
  updateContentEntryArgsSchema,
  publishEntryArgsSchema,
  unpublishEntryArgsSchema,
  scheduleEntryArgsSchema,
  deleteContentEntryArgsSchema,
  duplicateContentEntryArgsSchema,
  listContentEntriesArgsSchema,
  getContentEntryArgsSchema,
  restoreContentEntryArgsSchema,

  // Media Asset schemas
  createMediaAssetArgsSchema,
  updateMediaAssetArgsSchema,
  listMediaAssetsArgsSchema,
  getMediaAssetArgsSchema,
  deleteMediaAssetArgsSchema,

  // Bulk Operation schemas
  bulkPublishArgsSchema,
  bulkUnpublishArgsSchema,
  bulkDeleteArgsSchema,

  // Search schema
  searchContentArgsSchema,
} from "./agentTools.js";
