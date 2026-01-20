/**
 * Settings functions for the admin UI.
 *
 * Manages CMS configuration including locale settings and feature flags.
 * Uses a singleton pattern - only one settings record exists.
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// =============================================================================
// Default Settings
// =============================================================================

/**
 * Default settings applied when no settings exist.
 */
const DEFAULT_SETTINGS = {
  defaultLocale: "en",
  availableLocales: ["en", "es", "fr", "de"],
  features: {
    versioning: true,
    scheduling: true,
    localization: false,
    mediaManagement: true,
  },
};

// =============================================================================
// Queries
// =============================================================================

/**
 * Get current settings.
 * Returns default settings if none have been saved yet.
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("settings").first();

    if (!settings) {
      // Return defaults if no settings exist
      return {
        _id: null,
        ...DEFAULT_SETTINGS,
        updatedBy: undefined,
        _creationTime: undefined,
      };
    }

    return settings;
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Update settings.
 * Creates settings if they don't exist (upsert pattern).
 */
export const update = mutation({
  args: {
    defaultLocale: v.optional(v.string()),
    availableLocales: v.optional(v.array(v.string())),
    features: v.optional(
      v.object({
        versioning: v.boolean(),
        scheduling: v.boolean(),
        localization: v.boolean(),
        mediaManagement: v.boolean(),
      })
    ),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("settings").first();

    if (existing) {
      // Update existing settings
      const updates: Record<string, unknown> = {};

      if (args.defaultLocale !== undefined) {
        updates.defaultLocale = args.defaultLocale;
      }
      if (args.availableLocales !== undefined) {
        updates.availableLocales = args.availableLocales;
      }
      if (args.features !== undefined) {
        updates.features = args.features;
      }
      if (args.updatedBy !== undefined) {
        updates.updatedBy = args.updatedBy;
      }

      await ctx.db.patch(existing._id, updates);

      return await ctx.db.get(existing._id);
    } else {
      // Create new settings with defaults merged
      const newSettings = {
        defaultLocale: args.defaultLocale ?? DEFAULT_SETTINGS.defaultLocale,
        availableLocales:
          args.availableLocales ?? DEFAULT_SETTINGS.availableLocales,
        features: args.features ?? DEFAULT_SETTINGS.features,
        updatedBy: args.updatedBy,
      };

      const id = await ctx.db.insert("settings", newSettings);
      return await ctx.db.get(id);
    }
  },
});

/**
 * Reset settings to defaults.
 */
export const reset = mutation({
  args: {
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("settings").first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...DEFAULT_SETTINGS,
        updatedBy: args.updatedBy,
      });
      return await ctx.db.get(existing._id);
    } else {
      const id = await ctx.db.insert("settings", {
        ...DEFAULT_SETTINGS,
        updatedBy: args.updatedBy,
      });
      return await ctx.db.get(id);
    }
  },
});
