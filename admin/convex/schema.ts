import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Admin UI Schema
 *
 * This schema defines tables specific to the admin UI,
 * separate from the core CMS component schema.
 */
const schema = defineSchema({
  /**
   * Settings Table
   *
   * Stores CMS configuration settings as a singleton.
   * Only one record should exist in this table.
   */
  settings: defineTable({
    /** Default locale for content creation */
    defaultLocale: v.string(),
    /** Available locales */
    availableLocales: v.array(v.string()),

    /** Feature flags */
    features: v.object({
      /** Enable content versioning and rollback */
      versioning: v.boolean(),
      /** Enable scheduled publishing */
      scheduling: v.boolean(),
      /** Enable multi-language support */
      localization: v.boolean(),
      /** Enable media library */
      mediaManagement: v.boolean(),
    }),

    /** User who last updated settings */
    updatedBy: v.optional(v.string()),
  }),
});

export default schema;
