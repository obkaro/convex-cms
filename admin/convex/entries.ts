/**
 * Wrapper functions for content entry operations.
 *
 * These functions wrap the internal CMS component functions to expose
 * them as public API for the admin UI.
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { components } from "./_generated/api";

// =============================================================================
// Queries
// =============================================================================

/**
 * List content entries with optional filtering.
 */
export const list = query({
  args: {
    contentTypeId: v.optional(v.string()),
    contentTypeName: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("scheduled"),
        v.literal("archived")
      )
    ),
    search: v.optional(v.string()),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.contentEntries.list, {
      contentTypeId: args.contentTypeId,
      contentTypeName: args.contentTypeName,
      status: args.status,
      search: args.search,
      paginationOpts: args.paginationOpts,
    });
  },
});

/**
 * Get a single content entry by ID.
 * Returns null for invalid ID formats (graceful handling for UI).
 */
export const get = query({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate that the ID looks like a valid Convex ID before querying
    // Convex IDs are alphanumeric strings starting with specific prefixes
    // Invalid format strings would cause ArgumentValidationError in the component
    if (!args.id || !/^[a-z0-9]+$/i.test(args.id) || args.id.length < 10) {
      return null;
    }

    try {
      return await ctx.runQuery(components.convexCms.contentEntries.get, {
        id: args.id as any,
      });
    } catch (error) {
      // Return null for validation errors (invalid ID format)
      if (error instanceof Error && error.message.includes("ArgumentValidationError")) {
        return null;
      }
      throw error;
    }
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new content entry.
 */
export const create = mutation({
  args: {
    contentTypeId: v.string(),
    data: v.any(),
    slug: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("scheduled"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.contentEntryMutations.createEntry, {
      contentTypeId: args.contentTypeId,
      data: args.data,
      slug: args.slug,
      status: args.status,
    });
  },
});

/**
 * Update an existing content entry.
 */
export const update = mutation({
  args: {
    id: v.string(),
    data: v.optional(v.any()),
    slug: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("scheduled"),
        v.literal("archived")
      )
    ),
    regenerateSlug: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.contentEntryMutations.updateEntry, {
      id: args.id,
      data: args.data,
      slug: args.slug,
      status: args.status,
      regenerateSlug: args.regenerateSlug,
    });
  },
});

/**
 * Publish a content entry.
 */
export const publish = mutation({
  args: {
    id: v.string(),
    changeDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.contentEntryMutations.publishEntry, {
      id: args.id,
      changeDescription: args.changeDescription,
    });
  },
});

/**
 * Unpublish a content entry.
 */
export const unpublish = mutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.contentEntryMutations.unpublishEntry, {
      id: args.id,
    });
  },
});

/**
 * Delete a content entry.
 */
export const remove = mutation({
  args: {
    id: v.string(),
    hardDelete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.contentEntryMutations.deleteEntry, {
      id: args.id,
      hardDelete: args.hardDelete,
    });
  },
});

/**
 * Duplicate a content entry.
 * Creates a copy with a new unique slug, useful for templating workflows.
 */
export const duplicate = mutation({
  args: {
    sourceEntryId: v.string(),
    slug: v.optional(v.string()),
    copyMediaReferences: v.optional(v.boolean()),
    locale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.contentEntryMutations.duplicateEntry, {
      sourceEntryId: args.sourceEntryId,
      slug: args.slug,
      copyMediaReferences: args.copyMediaReferences,
      locale: args.locale,
    });
  },
});

// =============================================================================
// Scheduled Publishing
// =============================================================================

/**
 * Schedule a content entry for future publication.
 * Creates a Convex scheduled function that will automatically publish at the specified time.
 */
export const schedule = mutation({
  args: {
    id: v.string(),
    publishAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.scheduledPublish.scheduleEntry, {
      id: args.id,
      publishAt: args.publishAt,
    });
  },
});

/**
 * Cancel a scheduled publication and revert to draft.
 */
export const cancelSchedule = mutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.scheduledPublish.cancelScheduledPublish, {
      id: args.id,
    });
  },
});

/**
 * Get all entries scheduled for publication within a time range.
 */
export const getScheduled = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    contentTypeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.scheduledPublish.getScheduledEntries, {
      from: args.from,
      to: args.to,
      contentTypeId: args.contentTypeId,
    });
  },
});
