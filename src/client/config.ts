/**
 * Unified CMS Configuration
 *
 * Enables defining CMS config once and using it with both createCmsClient and defineAdminAPI.
 * This reduces duplication and ensures consistency across the client and admin APIs.
 *
 * @example
 * ```typescript
 * // convex/cms.config.ts
 * import { defineCmsConfig } from "convex-cms/config";
 *
 * export default defineCmsConfig({
 *   features: { versioning: true, scheduling: true },
 *   client: {
 *     getUserRole: async (ctx, { userId }) => {
 *       const user = await ctx.db.get(userId);
 *       return user?.role ?? null;
 *     },
 *   },
 *   admin: {
 *     auth: async (ctx, operation) => {
 *       const identity = await ctx.auth.getUserIdentity();
 *       if (!identity) throw new Error("Not authenticated");
 *       return identity.subject;
 *     },
 *   },
 * });
 * ```
 */

import type { Auth } from "convex/server";
import type {
	FeatureFlags,
	GetUserRoleHook,
	AuthorizationHooks,
	RateLimitHooks,
	CustomRoleInput,
	LocaleCode,
	ComponentConfig,
} from "./types.js";
import type { FieldTypeDefinition } from "./field-types.js";
import type { WorkflowConfig } from "./workflows.js";
import type { AdminOperation, AdminApiOptions } from "./admin/types.js";
import type { AdminConfig } from "./adminConfig.js";
import type { ContentTypeDefinition } from "./schema/types.js";

// =============================================================================
// Shared Configuration
// =============================================================================

/**
 * Configuration shared between client and admin APIs.
 * These settings apply to both sides of the CMS.
 */
export interface SharedCmsConfig {
	/**
	 * Feature flags for enabling/disabling CMS capabilities.
	 * Features are read-only in the admin UI (configured in code).
	 */
	features?: FeatureFlags;

	/**
	 * Localization settings.
	 */
	locale?: {
		defaultLocale?: LocaleCode;
		supportedLocales?: LocaleCode[];
		fallbackChains?: Record<LocaleCode, LocaleCode[]>;
		autoGenerateFallbacks?: boolean;
	};

	/**
	 * System limits.
	 */
	limits?: {
		maxVersionsPerEntry?: number;
		lockDurationMs?: number;
		maxMediaFileSize?: number;
	};
}

// =============================================================================
// Client-Specific Configuration
// =============================================================================

/**
 * Configuration specific to createCmsClient.
 * These options are only used by the client API.
 */
export interface ClientCmsConfig {
	getUserRole?: GetUserRoleHook;
	authorizationHooks?: AuthorizationHooks;
	rateLimitHooks?: RateLimitHooks;
	customRoles?: CustomRoleInput[];
	skipRbac?: boolean;
	permissiveMode?: boolean;
	requireHooks?: Array<"getUserRole" | "authorizationHooks" | "rateLimitHooks">;
	fieldTypes?: FieldTypeDefinition[];
	workflow?: WorkflowConfig;
	contentTypeWorkflows?: Record<string, WorkflowConfig>;
}

// =============================================================================
// Admin API-Specific Configuration
// =============================================================================

/**
 * Configuration specific to defineAdminAPI.
 * These options are only used by the admin API.
 */
export interface AdminApiCmsConfig {
	/**
	 * Authentication callback for admin operations.
	 * Called before each operation to validate access.
	 */
	auth?: (
		ctx: { auth: Auth },
		operation: AdminOperation
	) => Promise<string | null>;
}

// =============================================================================
// UI-Specific Configuration
// =============================================================================

/**
 * Configuration for the admin UI presentation.
 * Used by CmsAdmin component for theming and layout.
 */
export type UiCmsConfig = Partial<AdminConfig>;

// =============================================================================
// Unified Configuration
// =============================================================================

/**
 * Complete unified CMS configuration.
 *
 * Combines shared settings with API-specific overrides.
 * Can be passed to both createCmsClient and defineAdminAPI.
 */
export interface UnifiedCmsConfig extends SharedCmsConfig {
	client?: ClientCmsConfig;
	admin?: AdminApiCmsConfig;
	ui?: UiCmsConfig;

	/**
	 * @deprecated Content types are now automatically read from the registry.
	 * Use `cms.defineContent()` to register content types - they will be
	 * automatically available in the admin API without needing to pass them here.
	 *
	 * This field is ignored if provided.
	 */
	contentTypes?: ContentTypeDefinition[];
}

// =============================================================================
// Type Guards and Helpers
// =============================================================================

/**
 * Check if a config object is a UnifiedCmsConfig (vs legacy direct options).
 *
 * Discriminates by checking for unified-specific properties.
 */
export function isUnifiedCmsConfig(
	config: unknown
): config is UnifiedCmsConfig {
	if (!config || typeof config !== "object") return false;

	const c = config as Record<string, unknown>;

	// Check for unified-specific structure
	// Unified configs have nested client/admin/ui objects or structured locale/limits
	if ("client" in c || "admin" in c || "ui" in c) {
		return true;
	}

	// Also check for structured locale/limits (unified pattern)
	if (
		"locale" in c &&
		typeof c.locale === "object" &&
		c.locale !== null &&
		"defaultLocale" in (c.locale as object)
	) {
		return true;
	}

	if (
		"limits" in c &&
		typeof c.limits === "object" &&
		c.limits !== null &&
		("maxVersionsPerEntry" in (c.limits as object) ||
			"lockDurationMs" in (c.limits as object))
	) {
		return true;
	}

	return false;
}

/**
 * Type-safe helper for defining CMS configuration.
 *
 * Provides autocomplete and validation for unified config structure.
 *
 * @example
 * ```typescript
 * export default defineCmsConfig({
 *   features: { versioning: true },
 *   client: { getUserRole: myHook },
 * });
 * ```
 */
export function defineCmsConfig<T extends UnifiedCmsConfig>(config: T): T {
	return config;
}

/**
 * Extract ComponentConfig from UnifiedCmsConfig for createCmsClient.
 *
 * Maps unified config structure to the flat ComponentConfig format.
 */
export function extractClientConfig(config: UnifiedCmsConfig): ComponentConfig {
	return {
		// Shared settings
		defaultLocale: config.locale?.defaultLocale,
		supportedLocales: config.locale?.supportedLocales,
		localeFallbackChains: config.locale?.fallbackChains,
		autoGenerateLocaleFallbacks: config.locale?.autoGenerateFallbacks,
		features: config.features,
		maxVersionsPerEntry: config.limits?.maxVersionsPerEntry,
		lockDurationMs: config.limits?.lockDurationMs,
		maxMediaFileSize: config.limits?.maxMediaFileSize,

		// Client-specific settings
		getUserRole: config.client?.getUserRole,
		authorizationHooks: config.client?.authorizationHooks,
		rateLimitHooks: config.client?.rateLimitHooks,
		customRoles: config.client?.customRoles,
		skipRbac: config.client?.skipRbac,
		permissiveMode: config.client?.permissiveMode,
		requireHooks: config.client?.requireHooks,
		fieldTypes: config.client?.fieldTypes,
		workflow: config.client?.workflow,
		contentTypeWorkflows: config.client?.contentTypeWorkflows,
	};
}

/**
 * Extract AdminApiOptions from UnifiedCmsConfig for defineAdminAPI.
 *
 * Maps unified config structure to the AdminApiOptions format.
 * Note: contentTypes is now read from registry, not from config.
 */
export function extractAdminConfig(config: UnifiedCmsConfig): AdminApiOptions {
	return {
		auth: config.admin?.auth,
		features: config.features
			? {
					versioning: config.features.versioning,
					scheduling: config.features.scheduling,
					localization: config.features.localization,
					mediaManagement: config.features.mediaManagement,
				}
			: undefined,
	};
}

/**
 * Extract UI config from UnifiedCmsConfig for CmsAdmin component.
 */
export function extractUiConfig(
	config: UnifiedCmsConfig
): Partial<AdminConfig> {
	return config.ui ?? {};
}
