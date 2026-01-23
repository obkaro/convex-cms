/**
 * Taxonomy Mutation Functions
 *
 * Provides mutation functions for managing taxonomies and terms.
 *
 * Available mutations:
 * - Taxonomies: create, update, delete (soft), restore
 * - Terms: create, update, delete (soft), restore, reorder
 * - Entry Tags: setEntryTerms, addTermToEntry, removeTermFromEntry
 */

import { v } from "convex/values";
import { isDeleted } from "./lib/softDelete.js";
import { mutation, MutationCtx } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";
import { generateSlug } from "./lib/slugGenerator.js";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build the full path for a term in a hierarchy.
 */
async function buildTermPath(
	ctx: MutationCtx,
	parentId: Id<"taxonomyTerms"> | undefined,
	slug: string,
): Promise<string> {
	if (!parentId) {
		return `/${slug}`;
	}

	const parent = await ctx.db.get(parentId);
	if (!parent || isDeleted(parent)) {
		return `/${slug}`;
	}

	const parentPath = parent.path ?? `/${parent.slug}`;
	return `${parentPath}/${slug}`;
}

/**
 * Calculate depth based on parent.
 */
async function calculateDepth(
	ctx: MutationCtx,
	parentId: Id<"taxonomyTerms"> | undefined,
): Promise<number> {
	if (!parentId) {
		return 0;
	}

	const parent = await ctx.db.get(parentId);
	if (!parent || isDeleted(parent)) {
		return 0;
	}

	return parent.depth + 1;
}

/**
 * Update all descendant paths when a term is moved.
 */
async function updateDescendantPaths(
	ctx: MutationCtx,
	termId: Id<"taxonomyTerms">,
	oldPath: string,
	newPath: string,
): Promise<void> {
	// Get all terms that start with the old path
	const descendants = await ctx.db
		.query("taxonomyTerms")
		.filter((q) => q.gte(q.field("path"), oldPath))
		.collect();

	for (const desc of descendants) {
		if (desc._id !== termId && desc.path?.startsWith(oldPath + "/")) {
			const updatedPath = desc.path.replace(oldPath, newPath);
			const updatedDepth = updatedPath.split("/").filter((p) => p).length - 1;
			await ctx.db.patch(desc._id, {
				path: updatedPath,
				depth: updatedDepth,
			});
		}
	}
}

// =============================================================================
// Taxonomy Mutations
// =============================================================================

/**
 * Create a new taxonomy.
 *
 * @example
 * ```typescript
 * const taxonomyId = await ctx.runMutation(api.taxonomyMutations.createTaxonomy, {
 *   name: "tags",
 *   displayName: "Tags",
 *   isHierarchical: false,
 *   allowInlineCreation: true,
 * });
 * ```
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
	returns: v.id("taxonomies"),
	handler: async (ctx, args) => {
		const {
			name,
			displayName,
			description,
			isHierarchical,
			allowInlineCreation,
			icon,
			sortOrder,
			userId,
		} = args;

		// Check for duplicate name
		const existing = await ctx.db
			.query("taxonomies")
			.withIndex("by_name", (q) => q.eq("name", name))
			.first();

		if (existing && !isDeleted(existing)) {
			throw new Error(`Taxonomy with name "${name}" already exists`);
		}

		// If there was a soft-deleted taxonomy with this name, restore and update it
		if (existing) {
			await ctx.db.patch(existing._id, {
				displayName,
				description,
				isHierarchical,
				allowInlineCreation,
				icon,
				sortOrder,
				isActive: true,
				deletedAt: undefined,
				updatedBy: userId,
			});
			return existing._id;
		}

		const taxonomyId = await ctx.db.insert("taxonomies", {
			name,
			displayName,
			description,
			isHierarchical,
			allowInlineCreation,
			icon,
			sortOrder,
			isActive: true,
			createdBy: userId,
		});

		return taxonomyId;
	},
});

/**
 * Update an existing taxonomy.
 */
export const updateTaxonomy = mutation({
	args: {
		id: v.id("taxonomies"),
		displayName: v.optional(v.string()),
		description: v.optional(v.string()),
		allowInlineCreation: v.optional(v.boolean()),
		icon: v.optional(v.string()),
		sortOrder: v.optional(v.number()),
		isActive: v.optional(v.boolean()),
		userId: v.optional(v.string()),
	},
	returns: v.id("taxonomies"),
	handler: async (ctx, args) => {
		const { id, userId, ...updates } = args;

		const taxonomy = await ctx.db.get(id);
		if (!taxonomy) {
			throw new Error("Taxonomy not found");
		}

		if (isDeleted(taxonomy)) {
			throw new Error("Cannot update deleted taxonomy");
		}

		// Build update object
		const updateFields: any = { updatedBy: userId };
		if (updates.displayName !== undefined)
			updateFields.displayName = updates.displayName;
		if (updates.description !== undefined)
			updateFields.description = updates.description;
		if (updates.allowInlineCreation !== undefined)
			updateFields.allowInlineCreation = updates.allowInlineCreation;
		if (updates.icon !== undefined) updateFields.icon = updates.icon;
		if (updates.sortOrder !== undefined)
			updateFields.sortOrder = updates.sortOrder;
		if (updates.isActive !== undefined)
			updateFields.isActive = updates.isActive;

		await ctx.db.patch(id, updateFields);

		return id;
	},
});

/**
 * Soft delete a taxonomy.
 */
export const deleteTaxonomy = mutation({
	args: {
		id: v.id("taxonomies"),
		userId: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { id, userId } = args;

		const taxonomy = await ctx.db.get(id);
		if (!taxonomy) {
			throw new Error("Taxonomy not found");
		}

		if (isDeleted(taxonomy)) {
			return null; // Already deleted
		}

		// Soft delete the taxonomy
		await ctx.db.patch(id, {
			deletedAt: Date.now(),
			isActive: false,
			updatedBy: userId,
		});

		// Also soft delete all terms in this taxonomy
		const terms = await ctx.db
			.query("taxonomyTerms")
			.withIndex("by_taxonomy", (q) => q.eq("taxonomyId", id))
			.collect();

		for (const term of terms) {
			if (!isDeleted(term)) {
				await ctx.db.patch(term._id, {
					deletedAt: Date.now(),
					updatedBy: userId,
				});
			}
		}

		return null;
	},
});

/**
 * Restore a soft-deleted taxonomy.
 */
export const restoreTaxonomy = mutation({
	args: {
		id: v.id("taxonomies"),
		userId: v.optional(v.string()),
	},
	returns: v.id("taxonomies"),
	handler: async (ctx, args) => {
		const { id, userId } = args;

		const taxonomy = await ctx.db.get(id);
		if (!taxonomy) {
			throw new Error("Taxonomy not found");
		}

		if (!isDeleted(taxonomy)) {
			return id; // Not deleted
		}

		await ctx.db.patch(id, {
			deletedAt: undefined,
			isActive: true,
			updatedBy: userId,
		});

		return id;
	},
});

// =============================================================================
// Term Mutations
// =============================================================================

/**
 * Create a new taxonomy term.
 *
 * @example
 * ```typescript
 * // Create a flat tag
 * const tagId = await ctx.runMutation(api.taxonomyMutations.createTerm, {
 *   taxonomyId: tagsTaxonomyId,
 *   name: "JavaScript",
 * });
 *
 * // Create a hierarchical category
 * const categoryId = await ctx.runMutation(api.taxonomyMutations.createTerm, {
 *   taxonomyId: categoriesTaxonomyId,
 *   name: "Web Development",
 *   parentId: techCategoryId,
 * });
 * ```
 */
export const createTerm = mutation({
	args: {
		taxonomyId: v.id("taxonomies"),
		name: v.string(),
		slug: v.optional(v.string()),
		description: v.optional(v.string()),
		parentId: v.optional(v.id("taxonomyTerms")),
		color: v.optional(v.string()),
		icon: v.optional(v.string()),
		sortOrder: v.optional(v.number()),
		userId: v.optional(v.string()),
	},
	returns: v.id("taxonomyTerms"),
	handler: async (ctx, args) => {
		const {
			taxonomyId,
			name,
			description,
			parentId,
			color,
			icon,
			sortOrder,
			userId,
		} = args;

		// Verify taxonomy exists
		const taxonomy = await ctx.db.get(taxonomyId);
		if (!taxonomy || isDeleted(taxonomy)) {
			throw new Error("Taxonomy not found");
		}

		// Check if hierarchy is allowed
		if (parentId && !taxonomy.isHierarchical) {
			throw new Error("Cannot create nested terms in a flat taxonomy");
		}

		// Verify parent exists if specified
		if (parentId) {
			const parent = await ctx.db.get(parentId);
			if (!parent || isDeleted(parent)) {
				throw new Error("Parent term not found");
			}
			if (parent.taxonomyId !== taxonomyId) {
				throw new Error("Parent term belongs to a different taxonomy");
			}
		}

		// Generate or validate slug
		const slug = args.slug || generateSlug(name);

		// Check for duplicate slug in taxonomy
		const existing = await ctx.db
			.query("taxonomyTerms")
			.withIndex("by_taxonomy_and_slug", (q) =>
				q.eq("taxonomyId", taxonomyId).eq("slug", slug),
			)
			.first();

		if (existing && !isDeleted(existing)) {
			throw new Error(
				`Term with slug "${slug}" already exists in this taxonomy`,
			);
		}

		// Calculate path and depth
		const path = await buildTermPath(ctx, parentId, slug);
		const depth = await calculateDepth(ctx, parentId);

		// Build searchText for search index
		const searchText = [name, description].filter(Boolean).join(" ");

		const termId = await ctx.db.insert("taxonomyTerms", {
			taxonomyId,
			slug,
			name,
			description,
			parentId,
			path,
			depth,
			color,
			icon,
			sortOrder,
			usageCount: 0,
			searchText,
			createdBy: userId,
		});

		return termId;
	},
});

/**
 * Update an existing term.
 */
export const updateTerm = mutation({
	args: {
		id: v.id("taxonomyTerms"),
		name: v.optional(v.string()),
		slug: v.optional(v.string()),
		description: v.optional(v.string()),
		parentId: v.optional(v.union(v.id("taxonomyTerms"), v.null())),
		color: v.optional(v.string()),
		icon: v.optional(v.string()),
		sortOrder: v.optional(v.number()),
		userId: v.optional(v.string()),
	},
	returns: v.id("taxonomyTerms"),
	handler: async (ctx, args) => {
		const { id, userId, ...updates } = args;

		const term = await ctx.db.get(id);
		if (!term) {
			throw new Error("Term not found");
		}

		if (isDeleted(term)) {
			throw new Error("Cannot update deleted term");
		}

		const taxonomy = await ctx.db.get(term.taxonomyId);
		if (!taxonomy || isDeleted(taxonomy)) {
			throw new Error("Taxonomy not found");
		}

		// Build update object
		const updateFields: any = { updatedBy: userId };

		if (updates.name !== undefined) {
			updateFields.name = updates.name;
			// Update searchText
			updateFields.searchText = [
				updates.name,
				updates.description ?? term.description,
			]
				.filter(Boolean)
				.join(" ");
		}

		if (updates.description !== undefined) {
			updateFields.description = updates.description;
			if (!updates.name) {
				updateFields.searchText = [term.name, updates.description]
					.filter(Boolean)
					.join(" ");
			}
		}

		if (updates.color !== undefined) updateFields.color = updates.color;
		if (updates.icon !== undefined) updateFields.icon = updates.icon;
		if (updates.sortOrder !== undefined)
			updateFields.sortOrder = updates.sortOrder;

		// Handle slug change
		if (updates.slug !== undefined && updates.slug !== term.slug) {
			// Check for duplicate
			const existing = await ctx.db
				.query("taxonomyTerms")
				.withIndex("by_taxonomy_and_slug", (q) =>
					q.eq("taxonomyId", term.taxonomyId).eq("slug", updates.slug!),
				)
				.first();

			if (existing && existing._id !== id && !isDeleted(existing)) {
				throw new Error(`Term with slug "${updates.slug}" already exists`);
			}

			updateFields.slug = updates.slug;

			// Update path for this term and descendants
			const oldPath = term.path ?? `/${term.slug}`;
			const newPath = await buildTermPath(ctx, term.parentId, updates.slug);
			updateFields.path = newPath;

			// Update descendants if this term h
			await updateDescendantPaths(ctx, id, oldPath, newPath);
		}

		// Handle parent change (moving in hierarchy)
		if (updates.parentId !== undefined) {
			const newParentId =
				updates.parentId === null ? undefined : updates.parentId;

			if (!taxonomy.isHierarchical && newParentId) {
				throw new Error("Cannot create nested terms in a flat taxonomy");
			}

			// Verify new parent if specified
			if (newParentId) {
				const newParent = await ctx.db.get(newParentId);
				if (!newParent || isDeleted(newParent)) {
					throw new Error("New parent term not found");
				}
				if (newParent.taxonomyId !== term.taxonomyId) {
					throw new Error("New parent belongs to a different taxonomy");
				}

				// Check for circular reference
				let current: any = newParent;
				while (current) {
					if (current._id === id) {
						throw new Error("Cannot move term under its own descendant");
					}
					if (current.parentId) {
						current = await ctx.db.get(current.parentId);
					} else {
						break;
					}
				}
			}

			updateFields.parentId = newParentId;
			updateFields.depth = await calculateDepth(ctx, newParentId);

			// Update path
			const slug = updates.slug ?? term.slug;
			const oldPath = term.path ?? `/${term.slug}`;
			const newPath = await buildTermPath(ctx, newParentId, slug);
			updateFields.path = newPath;

			// Update descendants
			await updateDescendantPaths(ctx, id, oldPath, newPath);
		}

		await ctx.db.patch(id, updateFields);

		return id;
	},
});

/**
 * Soft delete a term.
 */
export const deleteTerm = mutation({
	args: {
		id: v.id("taxonomyTerms"),
		cascade: v.optional(v.boolean()),
		userId: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { id, cascade = true, userId } = args;

		const term = await ctx.db.get(id);
		if (!term) {
			throw new Error("Term not found");
		}

		if (isDeleted(term)) {
			return null;
		}

		// Check for children
		const children = await ctx.db
			.query("taxonomyTerms")
			.withIndex("by_parent", (q) => q.eq("parentId", id))
			.collect();

		const activeChildren = children.filter((c) => !isDeleted(c));

		if (activeChildren.length > 0 && !cascade) {
			throw new Error(
				"Cannot delete term with children. Use cascade=true or delete children first.",
			);
		}

		// Delete this term
		await ctx.db.patch(id, {
			deletedAt: Date.now(),
			updatedBy: userId,
		});

		// Also delete children if cascading
		if (cascade) {
			for (const child of activeChildren) {
				await ctx.db.patch(child._id, {
					deletedAt: Date.now(),
					updatedBy: userId,
				});
			}
		}

		// Remove entry tag associations
		const associations = await ctx.db
			.query("contentEntryTags")
			.withIndex("by_term", (q) => q.eq("termId", id))
			.collect();

		for (const assoc of associations) {
			await ctx.db.delete(assoc._id);
		}

		// Remove media asset tag associations
		const mediaAssociations = await ctx.db
			.query("mediaAssetTags")
			.withIndex("by_term", (q) => q.eq("termId", id))
			.collect();

		for (const assoc of mediaAssociations) {
			await ctx.db.delete(assoc._id);
		}

		return null;
	},
});

/**
 * Restore a soft-deleted term.
 */
export const restoreTerm = mutation({
	args: {
		id: v.id("taxonomyTerms"),
		userId: v.optional(v.string()),
	},
	returns: v.id("taxonomyTerms"),
	handler: async (ctx, args) => {
		const { id, userId } = args;

		const term = await ctx.db.get(id);
		if (!term) {
			throw new Error("Term not found");
		}

		if (!isDeleted(term)) {
			return id;
		}

		// Make sure parent exists if there is one
		if (term.parentId) {
			const parent = await ctx.db.get(term.parentId);
			if (!parent || isDeleted(parent)) {
				// Restore as root term
				await ctx.db.patch(id, {
					deletedAt: undefined,
					parentId: undefined,
					path: `/${term.slug}`,
					depth: 0,
					updatedBy: userId,
				});
				return id;
			}
		}

		await ctx.db.patch(id, {
			deletedAt: undefined,
			updatedBy: userId,
		});

		return id;
	},
});

// =============================================================================
// Entry Tag Mutations
// =============================================================================

/**
 * Set the terms for an entry field (replaces all existing terms).
 *
 * @example
 * ```typescript
 * await ctx.runMutation(api.taxonomyMutations.setEntryTerms, {
 *   entryId: blogPostId,
 *   fieldName: "tags",
 *   termIds: [javascriptTagId, reactTagId, typescriptTagId],
 * });
 * ```
 */
export const setEntryTerms = mutation({
	args: {
		entryId: v.id("contentEntries"),
		fieldName: v.string(),
		termIds: v.array(v.id("taxonomyTerms")),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { entryId, fieldName, termIds } = args;

		// Verify entry exists
		const entry = await ctx.db.get(entryId);
		if (!entry || isDeleted(entry)) {
			throw new Error("Content entry not found");
		}

		// Get existing associations for this field
		const existing = await ctx.db
			.query("contentEntryTags")
			.withIndex("by_entry_and_field", (q) =>
				q.eq("entryId", entryId).eq("fieldName", fieldName),
			)
			.collect();

		const existingTermIds = new Set(existing.map((e) => e.termId));
		const newTermIds = new Set(termIds);

		// Calculate terms to remove and add
		const toRemove = existing.filter((e) => !newTermIds.has(e.termId));
		const toAdd = termIds.filter((id) => !existingTermIds.has(id));

		// Remove old associations and update usage counts
		for (const assoc of toRemove) {
			const term = await ctx.db.get(assoc.termId);
			if (term && term.usageCount > 0) {
				await ctx.db.patch(assoc.termId, {
					usageCount: term.usageCount - 1,
				});
			}
			await ctx.db.delete(assoc._id);
		}

		// Add new associations and update usage counts
		for (let i = 0; i < toAdd.length; i++) {
			const termId = toAdd[i];
			const term = await ctx.db.get(termId);
			if (!term || isDeleted(term)) {
				continue; // Skip invalid terms
			}

			// Update usage count
			await ctx.db.patch(termId, {
				usageCount: term.usageCount + 1,
			});

			// Create association
			await ctx.db.insert("contentEntryTags", {
				entryId,
				termId,
				taxonomyId: term.taxonomyId,
				fieldName,
				sortOrder: i,
			});
		}

		// Update sort order for existing items that weren't removed
		const remainingExisting = existing.filter((e) => newTermIds.has(e.termId));
		for (const assoc of remainingExisting) {
			const newIndex = termIds.indexOf(assoc.termId);
			if (newIndex !== assoc.sortOrder) {
				await ctx.db.patch(assoc._id, { sortOrder: newIndex });
			}
		}

		return null;
	},
});

/**
 * Add a single term to an entry field.
 */
export const addTermToEntry = mutation({
	args: {
		entryId: v.id("contentEntries"),
		fieldName: v.string(),
		termId: v.id("taxonomyTerms"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { entryId, fieldName, termId } = args;

		// Verify entry exists
		const entry = await ctx.db.get(entryId);
		if (!entry || isDeleted(entry)) {
			throw new Error("Content entry not found");
		}

		// Verify term exists
		const term = await ctx.db.get(termId);
		if (!term || isDeleted(term)) {
			throw new Error("Term not found");
		}

		// Check if already associated
		const existing = await ctx.db
			.query("contentEntryTags")
			.withIndex("by_entry_and_field", (q) =>
				q.eq("entryId", entryId).eq("fieldName", fieldName),
			)
			.collect();

		if (existing.some((e) => e.termId === termId)) {
			return null; // Already associated
		}

		// Update usage count
		await ctx.db.patch(termId, {
			usageCount: term.usageCount + 1,
		});

		// Create association
		await ctx.db.insert("contentEntryTags", {
			entryId,
			termId,
			taxonomyId: term.taxonomyId,
			fieldName,
			sortOrder: existing.length,
		});

		return null;
	},
});

/**
 * Remove a single term from an entry field.
 */
export const removeTermFromEntry = mutation({
	args: {
		entryId: v.id("contentEntries"),
		fieldName: v.string(),
		termId: v.id("taxonomyTerms"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { entryId, fieldName, termId } = args;

		// Find the association
		const associations = await ctx.db
			.query("contentEntryTags")
			.withIndex("by_entry_and_field", (q) =>
				q.eq("entryId", entryId).eq("fieldName", fieldName),
			)
			.collect();

		const assoc = associations.find((a) => a.termId === termId);
		if (!assoc) {
			return null; // Not associated
		}

		// Update usage count
		const term = await ctx.db.get(termId);
		if (term && term.usageCount > 0) {
			await ctx.db.patch(termId, {
				usageCount: term.usageCount - 1,
			});
		}

		// Delete association
		await ctx.db.delete(assoc._id);

		return null;
	},
});

/**
 * Create a term and add it to an entry in one operation.
 * Useful for inline tag creation.
 */
export const createTermAndAddToEntry = mutation({
	args: {
		taxonomyId: v.id("taxonomies"),
		name: v.string(),
		entryId: v.id("contentEntries"),
		fieldName: v.string(),
		userId: v.optional(v.string()),
	},
	returns: v.id("taxonomyTerms"),
	handler: async (ctx, args) => {
		const { taxonomyId, name, entryId, fieldName, userId } = args;

		// Verify taxonomy allows inline creation
		const taxonomy = await ctx.db.get(taxonomyId);
		if (!taxonomy || isDeleted(taxonomy)) {
			throw new Error("Taxonomy not found");
		}

		if (!taxonomy.allowInlineCreation) {
			throw new Error("Inline term creation is not allowed for this taxonomy");
		}

		// Generate slug
		const slug = generateSlug(name);

		// Check if term already exists
		const existingTerm = await ctx.db
			.query("taxonomyTerms")
			.withIndex("by_taxonomy_and_slug", (q) =>
				q.eq("taxonomyId", taxonomyId).eq("slug", slug),
			)
			.first();

		let termId: Id<"taxonomyTerms">;

		if (existingTerm && !isDeleted(existingTerm)) {
			// Use existing term
			termId = existingTerm._id;
		} else if (existingTerm) {
			// Restore soft-deleted term
			await ctx.db.patch(existingTerm._id, {
				deletedAt: undefined,
				name,
				searchText: name,
				updatedBy: userId,
			});
			termId = existingTerm._id;
		} else {
			// Create new term
			termId = await ctx.db.insert("taxonomyTerms", {
				taxonomyId,
				slug,
				name,
				depth: 0,
				usageCount: 0,
				searchText: name,
				createdBy: userId,
			});
		}

		// Add to entry
		const existingAssoc = await ctx.db
			.query("contentEntryTags")
			.withIndex("by_entry_and_field", (q) =>
				q.eq("entryId", entryId).eq("fieldName", fieldName),
			)
			.collect();

		if (!existingAssoc.some((a) => a.termId === termId)) {
			// Get the term for usage count update
			const termDoc = await ctx.db.get(termId);
			if (termDoc) {
				await ctx.db.patch(termId, {
					usageCount: termDoc.usageCount + 1,
				});
			}

			await ctx.db.insert("contentEntryTags", {
				entryId,
				termId,
				taxonomyId,
				fieldName,
				sortOrder: existingAssoc.length,
			});
		}

		return termId;
	},
});

// =============================================================================
// Media Asset Tag Mutations
// =============================================================================

/**
 * Set the terms for a media asset in a taxonomy (replaces all existing terms).
 *
 * @example
 * ```typescript
 * await ctx.runMutation(api.taxonomyMutations.setMediaTerms, {
 *   mediaId: imageId,
 *   taxonomyId: categoriesTaxonomyId,
 *   termIds: [landscapeTagId, summerTagId],
 * });
 * ```
 */
export const setMediaTerms = mutation({
	args: {
		mediaId: v.id("mediaItems"),
		taxonomyId: v.id("taxonomies"),
		termIds: v.array(v.id("taxonomyTerms")),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { mediaId, taxonomyId, termIds } = args;

		const media = await ctx.db.get(mediaId);
		if (!media || isDeleted(media)) {
			throw new Error("Media asset not found");
		}

		const taxonomy = await ctx.db.get(taxonomyId);
		if (!taxonomy || isDeleted(taxonomy)) {
			throw new Error("Taxonomy not found");
		}

		const existing = await ctx.db
			.query("mediaAssetTags")
			.withIndex("by_media_and_taxonomy", (q) =>
				q.eq("mediaId", mediaId).eq("taxonomyId", taxonomyId),
			)
			.collect();

		const existingTermIds = new Set(existing.map((e) => e.termId));
		const newTermIds = new Set(termIds);

		const toRemove = existing.filter((e) => !newTermIds.has(e.termId));
		const toAdd = termIds.filter((id) => !existingTermIds.has(id));

		for (const assoc of toRemove) {
			const term = await ctx.db.get(assoc.termId);
			if (term && term.usageCount > 0) {
				await ctx.db.patch(assoc.termId, {
					usageCount: term.usageCount - 1,
				});
			}
			await ctx.db.delete(assoc._id);
		}

		for (let i = 0; i < toAdd.length; i++) {
			const termId = toAdd[i];
			const term = await ctx.db.get(termId);
			if (!term || isDeleted(term)) {
				continue;
			}

			if (term.taxonomyId !== taxonomyId) {
				continue;
			}

			await ctx.db.patch(termId, {
				usageCount: term.usageCount + 1,
			});

			await ctx.db.insert("mediaAssetTags", {
				mediaId,
				termId,
				taxonomyId,
				sortOrder: i,
			});
		}

		const remainingExisting = existing.filter((e) => newTermIds.has(e.termId));
		for (const assoc of remainingExisting) {
			const newIndex = termIds.indexOf(assoc.termId);
			if (newIndex !== assoc.sortOrder) {
				await ctx.db.patch(assoc._id, { sortOrder: newIndex });
			}
		}

		return null;
	},
});

/**
 * Add a single term to a media asset.
 */
export const addTermToMedia = mutation({
	args: {
		mediaId: v.id("mediaItems"),
		termId: v.id("taxonomyTerms"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { mediaId, termId } = args;

		const media = await ctx.db.get(mediaId);
		if (!media || isDeleted(media)) {
			throw new Error("Media asset not found");
		}

		const term = await ctx.db.get(termId);
		if (!term || isDeleted(term)) {
			throw new Error("Term not found");
		}

		const existing = await ctx.db
			.query("mediaAssetTags")
			.withIndex("by_media", (q) => q.eq("mediaId", mediaId))
			.collect();

		if (existing.some((e) => e.termId === termId)) {
			return null;
		}

		await ctx.db.patch(termId, {
			usageCount: term.usageCount + 1,
		});

		await ctx.db.insert("mediaAssetTags", {
			mediaId,
			termId,
			taxonomyId: term.taxonomyId,
			sortOrder: existing.length,
		});

		return null;
	},
});

/**
 * Remove a single term from a media asset.
 */
export const removeTermFromMedia = mutation({
	args: {
		mediaId: v.id("mediaItems"),
		termId: v.id("taxonomyTerms"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { mediaId, termId } = args;

		const associations = await ctx.db
			.query("mediaAssetTags")
			.withIndex("by_media", (q) => q.eq("mediaId", mediaId))
			.collect();

		const assoc = associations.find((a) => a.termId === termId);
		if (!assoc) {
			return null;
		}

		const term = await ctx.db.get(termId);
		if (term && term.usageCount > 0) {
			await ctx.db.patch(termId, {
				usageCount: term.usageCount - 1,
			});
		}

		await ctx.db.delete(assoc._id);

		return null;
	},
});

/**
 * Create a term and add it to a media asset in one operation.
 * Useful for inline tag creation in the media library.
 */
export const createTermAndAddToMedia = mutation({
	args: {
		taxonomyId: v.id("taxonomies"),
		name: v.string(),
		mediaId: v.id("mediaItems"),
		userId: v.optional(v.string()),
	},
	returns: v.id("taxonomyTerms"),
	handler: async (ctx, args) => {
		const { taxonomyId, name, mediaId, userId } = args;

		const taxonomy = await ctx.db.get(taxonomyId);
		if (!taxonomy || isDeleted(taxonomy)) {
			throw new Error("Taxonomy not found");
		}

		if (!taxonomy.allowInlineCreation) {
			throw new Error("Inline term creation is not allowed for this taxonomy");
		}

		const slug = generateSlug(name);

		const existingTerm = await ctx.db
			.query("taxonomyTerms")
			.withIndex("by_taxonomy_and_slug", (q) =>
				q.eq("taxonomyId", taxonomyId).eq("slug", slug),
			)
			.first();

		let termId: Id<"taxonomyTerms">;

		if (existingTerm && !isDeleted(existingTerm)) {
			termId = existingTerm._id;
		} else if (existingTerm) {
			await ctx.db.patch(existingTerm._id, {
				deletedAt: undefined,
				name,
				searchText: name,
				updatedBy: userId,
			});
			termId = existingTerm._id;
		} else {
			termId = await ctx.db.insert("taxonomyTerms", {
				taxonomyId,
				slug,
				name,
				depth: 0,
				usageCount: 0,
				searchText: name,
				createdBy: userId,
			});
		}

		const existingAssoc = await ctx.db
			.query("mediaAssetTags")
			.withIndex("by_media", (q) => q.eq("mediaId", mediaId))
			.collect();

		if (!existingAssoc.some((a) => a.termId === termId)) {
			const termDoc = await ctx.db.get(termId);
			if (termDoc) {
				await ctx.db.patch(termId, {
					usageCount: termDoc.usageCount + 1,
				});
			}

			await ctx.db.insert("mediaAssetTags", {
				mediaId,
				termId,
				taxonomyId,
				sortOrder: existingAssoc.length,
			});
		}

		return termId;
	},
});
