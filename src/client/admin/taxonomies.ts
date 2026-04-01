/**
 * Taxonomy Operations
 *
 * Operations for managing taxonomies, terms, and their relationships to
 * content entries and media assets.
 */

import { queryGeneric, mutationGeneric } from "convex/server";
import { v } from "convex/values";
import type { ComponentApi } from "../../component/_generated/component.js";
import type { AuthContext, AdminOperation } from "./types.js";
import { paginationOptsValidator, contentStatusValidator } from "./validators.js";

export function createTaxonomiesOperations(
  component: ComponentApi,
  checkAuth: (ctx: AuthContext, operation: AdminOperation) => Promise<string | null>
) {
  async function resolveTaxonomyId(
    ctx: { runQuery: typeof Function.prototype },
    taxonomyIdOrName: string
  ): Promise<string> {
    const taxonomy = await ctx.runQuery(component.taxonomies.get, {
      name: taxonomyIdOrName,
    });
    if (taxonomy) return taxonomy._id;
    return taxonomyIdOrName;
  }

  return {
    // =========================================================================
    // Taxonomy Queries
    // =========================================================================

    getTaxonomy: queryGeneric({
      args: {
        id: v.optional(v.string()),
        name: v.optional(v.string()),
        includeDeleted: v.optional(v.boolean()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getTaxonomy", id: args.id, name: args.name });
        return await ctx.runQuery(component.taxonomies.get, args);
      },
    }),

    listTaxonomies: queryGeneric({
      args: {
        isActive: v.optional(v.boolean()),
        isHierarchical: v.optional(v.boolean()),
        includeDeleted: v.optional(v.boolean()),
        paginationOpts: v.optional(paginationOptsValidator),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "listTaxonomies" });
        return await ctx.runQuery(component.taxonomies.list, args);
      },
    }),

    // =========================================================================
    // Taxonomy Mutations
    // =========================================================================

    createTaxonomy: mutationGeneric({
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
        await checkAuth(ctx, { type: "createTaxonomy" });
        return await ctx.runMutation(
          component.taxonomyMutations.createTaxonomy,
          args
        );
      },
    }),

    updateTaxonomy: mutationGeneric({
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
        await checkAuth(ctx, { type: "updateTaxonomy", id: args.id });
        return await ctx.runMutation(
          component.taxonomyMutations.updateTaxonomy,
          args
        );
      },
    }),

    deleteTaxonomy: mutationGeneric({
      args: {
        id: v.string(),
        userId: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "deleteTaxonomy", id: args.id });
        return await ctx.runMutation(
          component.taxonomyMutations.deleteTaxonomy,
          args
        );
      },
    }),

    restoreTaxonomy: mutationGeneric({
      args: {
        id: v.string(),
        userId: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "restoreTaxonomy", id: args.id });
        return await ctx.runMutation(
          component.taxonomyMutations.restoreTaxonomy,
          args
        );
      },
    }),

    // =========================================================================
    // Term Queries
    // =========================================================================

    getTerm: queryGeneric({
      args: {
        id: v.optional(v.string()),
        taxonomyId: v.optional(v.string()),
        slug: v.optional(v.string()),
        includeDeleted: v.optional(v.boolean()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getTerm", id: args.id });
        const taxonomyId = args.taxonomyId
          ? await resolveTaxonomyId(ctx, args.taxonomyId)
          : undefined;
        return await ctx.runQuery(component.taxonomies.getTerm, { ...args, taxonomyId });
      },
    }),

    listTerms: queryGeneric({
      args: {
        taxonomyId: v.string(),
        parentId: v.optional(v.string()),
        rootOnly: v.optional(v.boolean()),
        search: v.optional(v.string()),
        includeDeleted: v.optional(v.boolean()),
        sortBy: v.optional(
          v.union(
            v.literal("name"),
            v.literal("usageCount"),
            v.literal("sortOrder")
          )
        ),
        sortDirection: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
        paginationOpts: v.optional(paginationOptsValidator),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "listTerms", taxonomyId: args.taxonomyId });
        const taxonomyId = await resolveTaxonomyId(ctx, args.taxonomyId);
        return await ctx.runQuery(component.taxonomies.listTerms, { ...args, taxonomyId });
      },
    }),

    getTermsHierarchy: queryGeneric({
      args: {
        taxonomyId: v.string(),
        includeDeleted: v.optional(v.boolean()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getTermsHierarchy", taxonomyId: args.taxonomyId });
        const taxonomyId = await resolveTaxonomyId(ctx, args.taxonomyId);
        return await ctx.runQuery(
          component.taxonomies.getTermsHierarchy,
          { ...args, taxonomyId }
        );
      },
    }),

    suggestTerms: queryGeneric({
      args: {
        taxonomyId: v.string(),
        query: v.string(),
        limit: v.optional(v.number()),
        excludeIds: v.optional(v.array(v.string())),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "suggestTerms", taxonomyId: args.taxonomyId });
        const taxonomyId = await resolveTaxonomyId(ctx, args.taxonomyId);
        return await ctx.runQuery(component.taxonomies.suggestTerms, { ...args, taxonomyId });
      },
    }),

    countTerms: queryGeneric({
      args: {
        taxonomyId: v.string(),
        includeDeleted: v.optional(v.boolean()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "countTerms", taxonomyId: args.taxonomyId });
        const taxonomyId = await resolveTaxonomyId(ctx, args.taxonomyId);
        return await ctx.runQuery(component.taxonomies.countTerms, { ...args, taxonomyId });
      },
    }),

    // =========================================================================
    // Term Mutations
    // =========================================================================

    createTerm: mutationGeneric({
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
        await checkAuth(ctx, { type: "createTerm", taxonomyId: args.taxonomyId });
        const taxonomyId = await resolveTaxonomyId(ctx, args.taxonomyId);
        return await ctx.runMutation(
          component.taxonomyMutations.createTerm,
          { ...args, taxonomyId }
        );
      },
    }),

    updateTerm: mutationGeneric({
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
        await checkAuth(ctx, { type: "updateTerm", id: args.id });
        return await ctx.runMutation(
          component.taxonomyMutations.updateTerm,
          args
        );
      },
    }),

    deleteTerm: mutationGeneric({
      args: {
        id: v.string(),
        cascade: v.optional(v.boolean()),
        userId: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "deleteTerm", id: args.id });
        return await ctx.runMutation(
          component.taxonomyMutations.deleteTerm,
          args
        );
      },
    }),

    restoreTerm: mutationGeneric({
      args: {
        id: v.string(),
        userId: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "restoreTerm", id: args.id });
        return await ctx.runMutation(
          component.taxonomyMutations.restoreTerm,
          args
        );
      },
    }),

    // =========================================================================
    // Entry-Term Queries
    // =========================================================================

    getTermsByEntry: queryGeneric({
      args: {
        entryId: v.string(),
        taxonomyId: v.optional(v.string()),
        fieldName: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getTermsByEntry", entryId: args.entryId });
        const taxonomyId = args.taxonomyId
          ? await resolveTaxonomyId(ctx, args.taxonomyId)
          : undefined;
        return await ctx.runQuery(component.taxonomies.getTermsByEntry, { ...args, taxonomyId });
      },
    }),

    getEntriesByTerm: queryGeneric({
      args: {
        termId: v.string(),
        status: v.optional(contentStatusValidator),
        paginationOpts: v.optional(paginationOptsValidator),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getEntriesByTerm", termId: args.termId });
        return await ctx.runQuery(component.taxonomies.getEntriesByTerm, {
          termId: args.termId,
          status: args.status as "draft" | "published" | "archived" | "scheduled" | undefined,
          paginationOpts: args.paginationOpts,
        });
      },
    }),

    // =========================================================================
    // Entry-Term Mutations
    // =========================================================================

    setEntryTerms: mutationGeneric({
      args: {
        entryId: v.string(),
        fieldName: v.string(),
        termIds: v.array(v.string()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "setEntryTerms", entryId: args.entryId });
        return await ctx.runMutation(
          component.taxonomyMutations.setEntryTerms,
          args
        );
      },
    }),

    addTermToEntry: mutationGeneric({
      args: {
        entryId: v.string(),
        fieldName: v.string(),
        termId: v.string(),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "addTermToEntry", entryId: args.entryId });
        return await ctx.runMutation(
          component.taxonomyMutations.addTermToEntry,
          args
        );
      },
    }),

    removeTermFromEntry: mutationGeneric({
      args: {
        entryId: v.string(),
        fieldName: v.string(),
        termId: v.string(),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "removeTermFromEntry", entryId: args.entryId });
        return await ctx.runMutation(
          component.taxonomyMutations.removeTermFromEntry,
          args
        );
      },
    }),

    createTermAndAddToEntry: mutationGeneric({
      args: {
        taxonomyId: v.string(),
        name: v.string(),
        entryId: v.string(),
        fieldName: v.string(),
        userId: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "createTermAndAddToEntry", entryId: args.entryId });
        const taxonomyId = await resolveTaxonomyId(ctx, args.taxonomyId);
        return await ctx.runMutation(
          component.taxonomyMutations.createTermAndAddToEntry,
          { ...args, taxonomyId }
        );
      },
    }),

    // =========================================================================
    // Media-Term Queries
    // =========================================================================

    getTermsByMedia: queryGeneric({
      args: {
        mediaId: v.string(),
        taxonomyId: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getTermsByMedia", mediaId: args.mediaId });
        const taxonomyId = args.taxonomyId
          ? await resolveTaxonomyId(ctx, args.taxonomyId)
          : undefined;
        return await ctx.runQuery(component.taxonomies.getTermsByMedia, { ...args, taxonomyId });
      },
    }),

    getMediaByTerm: queryGeneric({
      args: {
        termId: v.string(),
        includeDeleted: v.optional(v.boolean()),
        paginationOpts: v.optional(paginationOptsValidator),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getMediaByTerm", termId: args.termId });
        return await ctx.runQuery(component.taxonomies.getMediaByTerm, args);
      },
    }),

    // =========================================================================
    // Media-Term Mutations
    // =========================================================================

    setMediaTerms: mutationGeneric({
      args: {
        mediaId: v.string(),
        taxonomyId: v.string(),
        termIds: v.array(v.string()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "setMediaTerms", mediaId: args.mediaId });
        const taxonomyId = await resolveTaxonomyId(ctx, args.taxonomyId);
        return await ctx.runMutation(
          component.taxonomyMutations.setMediaTerms,
          { ...args, taxonomyId }
        );
      },
    }),

    addTermToMedia: mutationGeneric({
      args: {
        mediaId: v.string(),
        termId: v.string(),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "addTermToMedia", mediaId: args.mediaId });
        return await ctx.runMutation(
          component.taxonomyMutations.addTermToMedia,
          args
        );
      },
    }),

    removeTermFromMedia: mutationGeneric({
      args: {
        mediaId: v.string(),
        termId: v.string(),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "removeTermFromMedia", mediaId: args.mediaId });
        return await ctx.runMutation(
          component.taxonomyMutations.removeTermFromMedia,
          args
        );
      },
    }),

    createTermAndAddToMedia: mutationGeneric({
      args: {
        taxonomyId: v.string(),
        name: v.string(),
        mediaId: v.string(),
        userId: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "createTermAndAddToMedia", mediaId: args.mediaId });
        const taxonomyId = await resolveTaxonomyId(ctx, args.taxonomyId);
        return await ctx.runMutation(
          component.taxonomyMutations.createTermAndAddToMedia,
          { ...args, taxonomyId }
        );
      },
    }),
  };
}
