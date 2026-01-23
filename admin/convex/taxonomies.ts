/**
 * Wrapper functions for taxonomy operations.
 *
 * These functions wrap the internal CMS component functions to expose
 * taxonomy and term management for the admin UI.
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { components } from "./_generated/api";

// =============================================================================
// Taxonomy Queries
// =============================================================================

/**
 * Get a single taxonomy by ID or name.
 */
export const get = query({
  args: {
    id: v.optional(v.string()),
    name: v.optional(v.string()),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.taxonomies.get, {
      id: args.id,
      name: args.name,
      includeDeleted: args.includeDeleted,
    });
  },
});

/**
 * List all taxonomies with optional filtering.
 */
export const list = query({
  args: {
    isActive: v.optional(v.boolean()),
    isHierarchical: v.optional(v.boolean()),
    includeDeleted: v.optional(v.boolean()),
    paginationOpts: v.optional(
      v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null()),
      })
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.taxonomies.list, {
      isActive: args.isActive,
      isHierarchical: args.isHierarchical,
      includeDeleted: args.includeDeleted,
      paginationOpts: args.paginationOpts,
    });
  },
});

// =============================================================================
// Term Queries
// =============================================================================

/**
 * Get a single term by ID or by taxonomy+slug.
 */
export const getTerm = query({
  args: {
    id: v.optional(v.string()),
    taxonomyId: v.optional(v.string()),
    slug: v.optional(v.string()),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.taxonomies.getTerm, {
      id: args.id,
      taxonomyId: args.taxonomyId,
      slug: args.slug,
      includeDeleted: args.includeDeleted,
    });
  },
});

/**
 * List terms within a taxonomy.
 */
export const listTerms = query({
  args: {
    taxonomyId: v.string(),
    parentId: v.optional(v.string()),
    rootOnly: v.optional(v.boolean()),
    search: v.optional(v.string()),
    includeDeleted: v.optional(v.boolean()),
    sortBy: v.optional(
      v.union(v.literal("name"), v.literal("usageCount"), v.literal("sortOrder"))
    ),
    sortDirection: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    paginationOpts: v.optional(
      v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null()),
      })
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.taxonomies.listTerms, {
      taxonomyId: args.taxonomyId,
      parentId: args.parentId,
      rootOnly: args.rootOnly,
      search: args.search,
      includeDeleted: args.includeDeleted,
      sortBy: args.sortBy,
      sortDirection: args.sortDirection,
      paginationOpts: args.paginationOpts,
    });
  },
});

/**
 * Get terms as a hierarchical tree structure.
 */
export const getTermsHierarchy = query({
  args: {
    taxonomyId: v.string(),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(
      components.convexCms.taxonomies.getTermsHierarchy,
      {
        taxonomyId: args.taxonomyId,
        includeDeleted: args.includeDeleted,
      }
    );
  },
});

/**
 * Get term suggestions for autocomplete.
 */
export const suggestTerms = query({
  args: {
    taxonomyId: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
    excludeIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.taxonomies.suggestTerms, {
      taxonomyId: args.taxonomyId,
      query: args.query,
      limit: args.limit,
      excludeIds: args.excludeIds,
    });
  },
});

/**
 * Get all terms associated with a content entry.
 */
export const getTermsByEntry = query({
  args: {
    entryId: v.string(),
    taxonomyId: v.optional(v.string()),
    fieldName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.taxonomies.getTermsByEntry, {
      entryId: args.entryId,
      taxonomyId: args.taxonomyId,
      fieldName: args.fieldName,
    });
  },
});

/**
 * Count terms in a taxonomy.
 */
export const countTerms = query({
  args: {
    taxonomyId: v.string(),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.taxonomies.countTerms, {
      taxonomyId: args.taxonomyId,
      includeDeleted: args.includeDeleted,
    });
  },
});

/**
 * Get content entries associated with a term.
 * Useful for showing related content or filtering by taxonomy.
 */
export const getEntriesByTerm = query({
  args: {
    termId: v.string(),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("archived"),
        v.literal("scheduled")
      )
    ),
    paginationOpts: v.optional(
      v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null()),
      })
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.taxonomies.getEntriesByTerm, {
      termId: args.termId,
      status: args.status,
      paginationOpts: args.paginationOpts,
    });
  },
});

// =============================================================================
// Taxonomy Mutations
// =============================================================================

/**
 * Create a new taxonomy.
 */
export const createTaxonomy = mutation({
  args: {
    name: v.string(),
    displayName: v.string(),
    description: v.optional(v.string()),
    isHierarchical: v.boolean(),
    allowInlineCreation: v.boolean(),
    icon: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.taxonomyMutations.createTaxonomy,
      args
    );
  },
});

/**
 * Update an existing taxonomy.
 */
export const updateTaxonomy = mutation({
  args: {
    id: v.string(),
    displayName: v.optional(v.string()),
    description: v.optional(v.string()),
    allowInlineCreation: v.optional(v.boolean()),
    icon: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.taxonomyMutations.updateTaxonomy,
      {
        id: args.id,
        displayName: args.displayName,
        description: args.description,
        allowInlineCreation: args.allowInlineCreation,
        icon: args.icon,
        sortOrder: args.sortOrder,
        isActive: args.isActive,
        userId: args.userId,
      }
    );
  },
});

/**
 * Soft delete a taxonomy.
 */
export const deleteTaxonomy = mutation({
  args: {
    id: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.taxonomyMutations.deleteTaxonomy,
      {
        id: args.id,
        userId: args.userId,
      }
    );
  },
});

/**
 * Restore a soft-deleted taxonomy.
 */
export const restoreTaxonomy = mutation({
  args: {
    id: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.taxonomyMutations.restoreTaxonomy,
      {
        id: args.id,
        userId: args.userId,
      }
    );
  },
});

// =============================================================================
// Term Mutations
// =============================================================================

/**
 * Create a new term.
 */
export const createTerm = mutation({
  args: {
    taxonomyId: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    parentId: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.taxonomyMutations.createTerm,
      {
        taxonomyId: args.taxonomyId,
        name: args.name,
        slug: args.slug,
        description: args.description,
        parentId: args.parentId,
        color: args.color,
        icon: args.icon,
        sortOrder: args.sortOrder,
        userId: args.userId,
      }
    );
  },
});

/**
 * Update an existing term.
 */
export const updateTerm = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    parentId: v.optional(v.union(v.string(), v.null())),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.taxonomyMutations.updateTerm,
      {
        id: args.id,
        name: args.name,
        slug: args.slug,
        description: args.description,
        parentId: args.parentId,
        color: args.color,
        icon: args.icon,
        sortOrder: args.sortOrder,
        userId: args.userId,
      }
    );
  },
});

/**
 * Soft delete a term.
 */
export const deleteTerm = mutation({
  args: {
    id: v.string(),
    cascade: v.optional(v.boolean()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.taxonomyMutations.deleteTerm,
      {
        id: args.id,
        cascade: args.cascade,
        userId: args.userId,
      }
    );
  },
});

/**
 * Restore a soft-deleted term.
 */
export const restoreTerm = mutation({
  args: {
    id: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.taxonomyMutations.restoreTerm,
      {
        id: args.id,
        userId: args.userId,
      }
    );
  },
});

// =============================================================================
// Entry Term Mutations
// =============================================================================

/**
 * Set the terms for an entry field (replaces all existing).
 */
export const setEntryTerms = mutation({
  args: {
    entryId: v.string(),
    fieldName: v.string(),
    termIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.taxonomyMutations.setEntryTerms,
      {
        entryId: args.entryId,
        fieldName: args.fieldName,
        termIds: args.termIds,
      }
    );
  },
});

/**
 * Add a single term to an entry field.
 */
export const addTermToEntry = mutation({
  args: {
    entryId: v.string(),
    fieldName: v.string(),
    termId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.taxonomyMutations.addTermToEntry,
      {
        entryId: args.entryId,
        fieldName: args.fieldName,
        termId: args.termId,
      }
    );
  },
});

/**
 * Remove a single term from an entry field.
 */
export const removeTermFromEntry = mutation({
  args: {
    entryId: v.string(),
    fieldName: v.string(),
    termId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.taxonomyMutations.removeTermFromEntry,
      {
        entryId: args.entryId,
        fieldName: args.fieldName,
        termId: args.termId,
      }
    );
  },
});

/**
 * Create a term and add it to an entry in one operation.
 * Useful for inline tag creation.
 */
export const createTermAndAddToEntry = mutation({
  args: {
    taxonomyId: v.string(),
    name: v.string(),
    entryId: v.string(),
    fieldName: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.taxonomyMutations.createTermAndAddToEntry,
      {
        taxonomyId: args.taxonomyId,
        name: args.name,
        entryId: args.entryId,
        fieldName: args.fieldName,
        userId: args.userId,
      }
    );
  },
});
