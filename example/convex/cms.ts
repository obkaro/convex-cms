/**
 * CMS Client Configuration
 *
 * This file demonstrates a complete CMS client setup with:
 * - Locale configuration with fallback chains
 * - Feature flags for versioning, localization, scheduling
 * - Custom roles with permissions
 * - Authorization hooks (beforeRbac, afterRbac, onDeny)
 * - User role mapping from the app's users table
 */

import { createCmsClient } from "convex-cms";
import { components } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Configured CMS client with full feature demonstration.
 *
 * @example
 * ```typescript
 * import { cms } from "./cms";
 *
 * // Use in a mutation
 * export const createPost = mutation({
 *   args: { title: v.string(), createdBy: v.string() },
 *   handler: async (ctx, args) => {
 *     return await cms.contentEntries.create(ctx, {
 *       contentTypeId,
 *       data: { title: args.title },
 *       createdBy: args.createdBy,
 *     });
 *   },
 * });
 * ```
 */
export const cms = createCmsClient(components.convexCms, {
	defaultLocale: "en-US",

	supportedLocales: [
		"en-US",
		"en-GB",
		"es-ES",
		"es-MX",
		"fr-FR",
		"de-DE",
		"ja-JP",
	],

	localeFallbackChains: {
		"es-MX": ["es-ES", "en-US"],
		"es-AR": ["es-ES", "en-US"],
		"en-GB": ["en-US"],
		"ja-JP": ["en-US"],
		"de-DE": ["en-US"],
		"fr-FR": ["en-US"],
	},

	/** Auto-generate fallback chains based on locale hierarchy (e.g., es-MX -> es -> default) */
	autoGenerateLocaleFallbacks: true,

	features: {
		versioning: true,
		localization: true,
		scheduling: true,
		softDelete: true,
	},

	/** Maximum versions to keep per entry (oldest are pruned) */
	maxVersionsPerEntry: 50,

	/**
	 * Custom roles extend or replace built-in roles.
	 * Each role defines its permissions for resources and actions.
	 */
	customRoles: [
		{
			name: "moderator",
			displayName: "Moderator",
			description: "Editor with publishing rights for blog content only",
			permissions: [
				{ resource: "contentTypes", action: "read" },
				{ resource: "contentEntries", action: "create" },
				{ resource: "contentEntries", action: "read" },
				{ resource: "contentEntries", action: "update" },
				{ resource: "contentEntries", action: "publish" },
				{ resource: "contentEntries", action: "unpublish" },
				{ resource: "mediaItems", action: "create" },
				{ resource: "mediaItems", action: "read" },
				{ resource: "mediaItems", action: "update" },
				{ resource: "mediaItems", action: "delete" },
			],
		},
	],

	/**
	 * Map user IDs to CMS roles.
	 *
	 * This hook is called whenever the CMS needs to determine a user's role.
	 * It has access to the parent app's database context to look up users.
	 *
	 * @param ctx - The Convex context (has access to parent app's db)
	 * @param userId - The user ID to look up
	 * @returns The user's CMS role, or null if no role assigned
	 */
	getUserRole: async (ctx, { userId }) => {
		if (!userId) return null;
		// Get the user in our users table by id
		const user = await ctx.db.get(userId as Id<"users">);

		// Return the user's CMS role directly (string | null)
		// Cast is safe because schema defines cmsRole as string literal union
		return (user?.cmsRole ?? null) as string | null;
	},

	authorizationHooks: {
		/**
		 * Called before RBAC checks.
		 * Can bypass RBAC entirely by returning { allowed: true, skipRbac: true }.
		 *
		 * Use cases:
		 * - Allow system/service accounts to bypass all checks
		 * - Implement custom business logic that overrides RBAC
		 *
		 * SECURITY: Always verify system accounts before granting access.
		 * If possible, use admin role instead.
		 * Never trust userId alone - it can be spoofed by malicious callers.
		 */
		beforeRbac: async (context) => {
			if (context.userId === "system-service-account") {
				const identity = await context.ctx.auth.getUserIdentity();

				// Verify the authenticated user matches the claimed userId
				if (identity?.subject === context.userId) {
					return {
						allowed: true,
						skipRbac: true,
						reason: "Verified system service account via Convex auth",
					};
				}
			}

			// Continue with normal RBAC flow
			return { allowed: true, skipRbac: false };
		},

		/**
		 * Called after RBAC checks pass.
		 * Can add additional restrictions beyond RBAC.
		 *
		 * Use cases:
		 * - Enforce content type-specific rules
		 * - Check external permissions systems
		 * - Implement time-based access restrictions
		 */
		afterRbac: async (context) => {
			// Example: Restrict publishing during maintenance window
			const maintenanceMode = false; // Would come from env/config
			if (
				maintenanceMode &&
				context.operation.includes("publish") &&
				context.role !== "admin"
			) {
				return {
					allowed: false,
					reason: "Publishing is disabled during maintenance",
				};
			}

			// Allow the operation
			return { allowed: true };
		},

		/**
		 * Called when an operation is denied.
		 * Use for logging, analytics, or triggering alerts.
		 * Must return AuthorizationHookResult.
		 */
		onDeny: async (context) => {
			// Log denied operations for security monitoring
			console.log(`[CMS] Operation denied:`, {
				userId: context.userId,
				operation: context.operation,
				role: context.role,
			});
			return { allowed: false };
		},
	},
});
