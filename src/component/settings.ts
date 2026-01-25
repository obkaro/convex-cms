/**
 * CMS Settings - Component Functions
 *
 * Runtime settings stored in the component database.
 * Feature flags are passed as arguments from the admin API layer,
 * keeping code-defined features read-only.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { featureFlagsValidator, updateCmsSettingsArgs } from "./validators";

const DEFAULT_RUNTIME_SETTINGS = {
	defaultLocale: "en",
	availableLocales: ["en", "es", "fr", "de"],
};

const DEFAULT_FEATURES = {
	versioning: true,
	scheduling: true,
	localization: false,
	mediaManagement: true,
};

export const getSettings = query({
	args: {
		features: v.optional(featureFlagsValidator),
	},
	returns: v.object({
		_id: v.union(v.id("cmsSettings"), v.null()),
		_creationTime: v.optional(v.number()),
		defaultLocale: v.string(),
		availableLocales: v.array(v.string()),
		features: featureFlagsValidator,
		updatedBy: v.optional(v.string()),
	}),
	handler: async (ctx, args) => {
		const settings = await ctx.db.query("cmsSettings").first();

		const features = {
			...DEFAULT_FEATURES,
			...args.features,
		};

		if (!settings) {
			return {
				_id: null,
				_creationTime: undefined,
				...DEFAULT_RUNTIME_SETTINGS,
				features,
				updatedBy: undefined,
			};
		}

		return {
			...settings,
			features,
		};
	},
});

export const updateSettings = mutation({
	args: updateCmsSettingsArgs.fields,
	returns: v.object({
		_id: v.id("cmsSettings"),
		_creationTime: v.number(),
		defaultLocale: v.string(),
		availableLocales: v.array(v.string()),
		updatedBy: v.optional(v.string()),
	}),
	handler: async (ctx, args) => {
		const existing = await ctx.db.query("cmsSettings").first();

		if (existing) {
			const updates: Record<string, unknown> = {};
			if (args.defaultLocale !== undefined) {
				updates.defaultLocale = args.defaultLocale;
			}
			if (args.availableLocales !== undefined) {
				updates.availableLocales = args.availableLocales;
			}
			if (args.updatedBy !== undefined) {
				updates.updatedBy = args.updatedBy;
			}

			await ctx.db.patch(existing._id, updates);
			const result = await ctx.db.get(existing._id);
			if (!result) throw new Error("Settings not found after update");
			return result;
		}

		const id = await ctx.db.insert("cmsSettings", {
			defaultLocale: args.defaultLocale ?? DEFAULT_RUNTIME_SETTINGS.defaultLocale,
			availableLocales: args.availableLocales ?? DEFAULT_RUNTIME_SETTINGS.availableLocales,
			updatedBy: args.updatedBy,
		});

		const result = await ctx.db.get(id);
		if (!result) throw new Error("Settings not found after insert");
		return result;
	},
});

export const resetSettings = mutation({
	args: {
		updatedBy: v.optional(v.string()),
	},
	returns: v.object({
		_id: v.id("cmsSettings"),
		_creationTime: v.number(),
		defaultLocale: v.string(),
		availableLocales: v.array(v.string()),
		updatedBy: v.optional(v.string()),
	}),
	handler: async (ctx, args) => {
		const existing = await ctx.db.query("cmsSettings").first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				...DEFAULT_RUNTIME_SETTINGS,
				updatedBy: args.updatedBy,
			});
			const result = await ctx.db.get(existing._id);
			if (!result) throw new Error("Settings not found after reset");
			return result;
		}

		const id = await ctx.db.insert("cmsSettings", {
			...DEFAULT_RUNTIME_SETTINGS,
			updatedBy: args.updatedBy,
		});

		const result = await ctx.db.get(id);
		if (!result) throw new Error("Settings not found after insert");
		return result;
	},
});
