/**
 * Unified CMS Configuration
 *
 * This file demonstrates the unified configuration pattern where CMS settings
 * are defined once and used by both createCmsClient and defineAdminAPI.
 *
 * Benefits:
 * - Single source of truth for features, locales, and limits
 * - No duplication between client and admin configurations
 * - Type-safe configuration with full IntelliSense support
 */

import { defineCmsConfig } from "convex-cms";
import type { Id } from "./_generated/dataModel";

export default defineCmsConfig({
	// =========================================================================
	// SHARED - Used by both createCmsClient and defineAdminAPI
	// =========================================================================

	features: {
		versioning: true,
		scheduling: true,
		localization: true,
		mediaManagement: true,
		softDelete: true,
	},

	locale: {
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
		fallbackChains: {
			"es-MX": ["es-ES", "en-US"],
			"es-AR": ["es-ES", "en-US"],
			"en-GB": ["en-US"],
			"ja-JP": ["en-US"],
			"de-DE": ["en-US"],
			"fr-FR": ["en-US"],
		},
		autoGenerateFallbacks: true,
	},

	limits: {
		maxVersionsPerEntry: 50,
	},

	// =========================================================================
	// CLIENT-SPECIFIC - Only used by createCmsClient
	// =========================================================================

	client: {
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

		getUserRole: async (ctx, { userId }) => {
			if (!userId) return null;
			const user = await ctx.db.get(userId as Id<"users">);
			return (user?.cmsRole ?? null) as string | null;
		},

		authorizationHooks: {
			beforeRbac: async (context) => {
				if (context.userId === "system-service-account") {
					const identity = await context.ctx.auth.getUserIdentity();
					if (identity?.subject === context.userId) {
						return {
							allowed: true,
							skipRbac: true,
							reason: "Verified system service account via Convex auth",
						};
					}
				}
				return { allowed: true, skipRbac: false };
			},

			afterRbac: async (context) => {
				const maintenanceMode = false;
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
				return { allowed: true };
			},

			onDeny: async (context) => {
				console.log(`[CMS] Operation denied:`, {
					userId: context.userId,
					operation: context.operation,
					role: context.role,
				});
				return { allowed: false };
			},
		},
	},

	// =========================================================================
	// ADMIN-SPECIFIC - Only used by defineAdminAPI
	// =========================================================================

	admin: {
		// No auth callback for demo - add one in production:
		// auth: async (ctx, operation) => {
		//   const identity = await ctx.auth.getUserIdentity();
		//   if (!identity) throw new Error("Not authenticated");
		//   return identity.subject;
		// },
	},
});
