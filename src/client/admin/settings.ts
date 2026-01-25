/**
 * Admin Settings Operations
 *
 * Wraps component settings functions with auth checks and
 * merges code-defined features with runtime settings.
 */

import { queryGeneric, mutationGeneric } from "convex/server";
import { v } from "convex/values";
import type { ComponentApi } from "../../component/_generated/component.js";
import type { AdminOperation, AuthContext, FeatureFlagsConfig, ResolvedFeatureFlags } from "./types.js";
import { adminSettingsDoc } from "./validators.js";

type CheckAuthFn = (ctx: AuthContext, operation: AdminOperation) => Promise<string | null>;

const DEFAULT_FEATURES: ResolvedFeatureFlags = {
	versioning: true,
	scheduling: true,
	localization: false,
	mediaManagement: true,
};

function resolveFeatures(config?: FeatureFlagsConfig): ResolvedFeatureFlags {
	return {
		...DEFAULT_FEATURES,
		...config,
	};
}

export function createSettingsOperations(
	component: ComponentApi,
	checkAuth: CheckAuthFn,
	options: { features?: FeatureFlagsConfig } = {}
) {
	const resolvedFeatures = resolveFeatures(options.features);

	return {
		getSettings: queryGeneric({
			args: {},
			returns: adminSettingsDoc,
			handler: async (ctx) => {
				await checkAuth(ctx, { type: "getSettings" });

				const result = await ctx.runQuery(component.settings.getSettings, {
					features: resolvedFeatures,
				});

				return {
					_id: result._id ? String(result._id) : null,
					_creationTime: result._creationTime,
					defaultLocale: result.defaultLocale,
					availableLocales: result.availableLocales,
					features: result.features,
					updatedBy: result.updatedBy,
				};
			},
		}),

		updateSettings: mutationGeneric({
			args: {
				defaultLocale: v.optional(v.string()),
				availableLocales: v.optional(v.array(v.string())),
				updatedBy: v.optional(v.string()),
			},
			returns: adminSettingsDoc,
			handler: async (ctx, args) => {
				await checkAuth(ctx, { type: "updateSettings" });

				const result = await ctx.runMutation(component.settings.updateSettings, {
					defaultLocale: args.defaultLocale,
					availableLocales: args.availableLocales,
					updatedBy: args.updatedBy,
				});

				return {
					_id: String(result._id),
					_creationTime: result._creationTime,
					defaultLocale: result.defaultLocale,
					availableLocales: result.availableLocales,
					features: resolvedFeatures,
					updatedBy: result.updatedBy,
				};
			},
		}),

		resetSettings: mutationGeneric({
			args: {
				updatedBy: v.optional(v.string()),
			},
			returns: adminSettingsDoc,
			handler: async (ctx, args) => {
				await checkAuth(ctx, { type: "resetSettings" });

				const result = await ctx.runMutation(component.settings.resetSettings, {
					updatedBy: args.updatedBy,
				});

				return {
					_id: String(result._id),
					_creationTime: result._creationTime,
					defaultLocale: result.defaultLocale,
					availableLocales: result.availableLocales,
					features: resolvedFeatures,
					updatedBy: result.updatedBy,
				};
			},
		}),
	};
}
