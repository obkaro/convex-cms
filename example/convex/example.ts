/**
 * Example CMS Wrapper Functions
 *
 * This file demonstrates complete wrapper functions for all CMS operations:
 * - Content Type Management
 * - Content Entry CRUD
 * - Publishing Workflow
 * - Version Management
 * - Media Management
 * - Localization
 * - RBAC Utilities
 *
 * These functions show how to properly wrap the CMS client
 * for use in your application.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { cms } from "./cms";

/**
 * The CMS client now properly supports both query and mutation contexts.
 * Read operations (get, list, etc.) accept CmsReadContext which works with QueryCtx.
 * Write operations (create, update, delete, etc.) require CmsMutationContext.
 *
 * No type workarounds needed - simply pass ctx directly to CMS methods.
 */

// =============================================================================
// Content Type Management
// =============================================================================

/**
 * Create the blog post content type with various field types.
 */
export const createBlogPostType = mutation({
	args: {
		userId: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.contentTypes.create(ctx, {
			name: "blog_post",
			displayName: "Blog Post",
			description: "A blog post with rich content",
			singleton: false,
			fields: [
				// Text field
				{
					name: "title",
					label: "Title",
					type: "text",
					required: true,
					localized: true,
				},
				// Slug field
				{
					name: "slug",
					label: "URL Slug",
					type: "text",
					required: true,
				},
				// Rich text field
				{
					name: "content",
					label: "Content",
					type: "richText",
					required: true,
					localized: true,
				},
				// Media field (featured image)
				{
					name: "featuredImage",
					label: "Featured Image",
					type: "media",
					required: false,
				},
				// Reference field (author)
				{
					name: "author",
					label: "Author",
					type: "reference",
					required: true,
				},
				// Select field (category)
				{
					name: "category",
					label: "Category",
					type: "select",
					required: true,
				},
				// Multi-select field (tags)
				{
					name: "tags",
					label: "Tags",
					type: "multiSelect",
					required: false,
				},
				// Datetime field (publish date)
				{
					name: "publishDate",
					label: "Publish Date",
					type: "datetime",
					required: false,
				},
				// JSON field (SEO metadata)
				{
					name: "seoMetadata",
					label: "SEO Metadata",
					type: "json",
					required: false,
				},
			],
			createdBy: args.userId,
		});
	},
});

/**
 * Create an author content type.
 */
export const createAuthorType = mutation({
	args: {
		userId: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.contentTypes.create(ctx, {
			name: "author",
			displayName: "Author",
			description: "Blog post author profile",
			singleton: false,
			fields: [
				{
					name: "name",
					label: "Name",
					type: "text",
					required: true,
				},
				{
					name: "bio",
					label: "Biography",
					type: "richText",
					required: false,
					localized: true,
				},
				{
					name: "avatar",
					label: "Avatar",
					type: "media",
					required: false,
				},
				{
					name: "email",
					label: "Email",
					type: "text",
					required: true,
				},
				{
					name: "socialLinks",
					label: "Social Links",
					type: "json",
					required: false,
				},
			],
			createdBy: args.userId,
		});
	},
});

/**
 * List all content types.
 */
export const listContentTypes = query({
	args: {},
	returns: v.any(),
	handler: async (ctx) => {
		// Cast to any for query context - CMS read methods work with query ctx
		return await cms.contentTypes.list(ctx, {});
	},
});

/**
 * Get a content type by ID.
 */
export const getContentType = query({
	args: {
		id: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.contentTypes.get(ctx, { id: args.id });
	},
});

// =============================================================================
// Content Entry Management
// =============================================================================

/**
 * Create a new content entry.
 */
export const createEntry = mutation({
	args: {
		contentTypeId: v.string(),
		data: v.any(),
		locale: v.optional(v.string()),
		createdBy: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.contentEntries.create(ctx, {
			contentTypeId: args.contentTypeId,
			data: args.data,
			locale: args.locale,
			createdBy: args.createdBy,
		});
	},
});

/**
 * Get a content entry by ID with optional locale resolution.
 */
export const getEntry = query({
	args: {
		id: v.string(),
		locale: v.optional(v.string()),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.contentEntries.get(ctx, {
			id: args.id,
			locale: args.locale,
		});
	},
});

/**
 * List content entries with filters and pagination.
 */
export const listEntries = query({
	args: {
		contentTypeId: v.optional(v.string()),
		status: v.optional(
			v.union(
				v.literal("draft"),
				v.literal("published"),
				v.literal("archived"),
			),
		),
		locale: v.optional(v.string()),
		limit: v.optional(v.number()),
		cursor: v.optional(v.string()),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.contentEntries.list(ctx, {
			contentTypeId: args.contentTypeId,
			status: args.status,
			locale: args.locale,
			paginationOpts: {
				numItems: args.limit ?? 20,
				cursor: args.cursor ?? null,
			},
		});
	},
});

/**
 * Update a content entry.
 */
export const updateEntry = mutation({
	args: {
		id: v.string(),
		data: v.any(),
		updatedBy: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.contentEntries.update(ctx, {
			id: args.id,
			data: args.data,
			updatedBy: args.updatedBy,
		});
	},
});

/**
 * Delete a content entry (soft delete if enabled).
 */
export const deleteEntry = mutation({
	args: {
		id: v.string(),
		deletedBy: v.string(),
		hardDelete: v.optional(v.boolean()),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.contentEntries.delete(ctx, {
			id: args.id,
			deletedBy: args.deletedBy,
			hardDelete: args.hardDelete,
		});
	},
});

// =============================================================================
// Publishing Workflow
// =============================================================================

/**
 * Publish a content entry.
 */
export const publishEntry = mutation({
	args: {
		id: v.string(),
		updatedBy: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		// Check permission first
		const permission = await cms.hasPermissionForUser(ctx, args.updatedBy, {
			resource: "contentEntries",
			action: "publish",
		});

		if (!permission.allowed) {
			throw new Error(
				`User with role '${permission.role}' cannot publish content`,
			);
		}

		return await cms.contentEntries.publish(ctx, {
			id: args.id,
			updatedBy: args.updatedBy,
		});
	},
});

/**
 * Unpublish a content entry.
 */
export const unpublishEntry = mutation({
	args: {
		id: v.string(),
		updatedBy: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.contentEntries.unpublish(ctx, {
			id: args.id,
			updatedBy: args.updatedBy,
		});
	},
});

/**
 * Schedule an entry for future publication.
 */
export const scheduleEntry = mutation({
	args: {
		id: v.string(),
		publishAt: v.number(),
		updatedBy: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.contentEntries.schedule(ctx, {
			id: args.id,
			publishAt: args.publishAt,
			updatedBy: args.updatedBy,
		});
	},
});

/**
 * Bulk publish multiple entries.
 */
export const bulkPublish = mutation({
	args: {
		ids: v.array(v.string()),
		updatedBy: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		const results = [];
		for (const id of args.ids) {
			try {
				const result = await cms.contentEntries.publish(ctx, {
					id: id,
					updatedBy: args.updatedBy,
				});
				results.push({ id, success: true, result });
			} catch (error) {
				results.push({
					id,
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}
		return results;
	},
});

// =============================================================================
// Version Management
// =============================================================================

/**
 * Get version history for an entry.
 */
export const getVersionHistory = query({
	args: {
		entryId: v.string(),
		limit: v.optional(v.number()),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.versions.getHistory(ctx, {
			entryId: args.entryId,
			paginationOpts: {
				numItems: args.limit ?? 10,
				cursor: null,
			},
		});
	},
});

/**
 * Get a specific version.
 */
export const getVersion = query({
	args: {
		entryId: v.string(),
		versionId: v.optional(v.string()),
		versionNumber: v.optional(v.number()),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.versions.get(ctx, {
			entryId: args.entryId,
			versionId: args.versionId,
			versionNumber: args.versionNumber,
		});
	},
});

/**
 * Rollback to a previous version.
 */
export const rollbackToVersion = mutation({
	args: {
		entryId: v.string(),
		versionNumber: v.number(),
		updatedBy: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.versions.rollback(ctx, {
			entryId: args.entryId,
			versionNumber: args.versionNumber,
			updatedBy: args.updatedBy,
		});
	},
});

/**
 * Compare two versions.
 */
export const compareVersions = query({
	args: {
		entryId: v.string(),
		fromVersionNumber: v.number(),
		toVersionNumber: v.number(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.versions.compare(ctx, {
			entryId: args.entryId,
			fromVersionNumber: args.fromVersionNumber,
			toVersionNumber: args.toVersionNumber,
		});
	},
});

// =============================================================================
// Media Management
// =============================================================================

/**
 * Generate an upload URL for file storage.
 */
export const generateUploadUrl = mutation({
	args: {},
	returns: v.string(),
	handler: async (ctx) => {
		return await ctx.storage.generateUploadUrl();
	},
});

/**
 * Create a media asset after upload.
 */
export const createMediaAsset = mutation({
	args: {
		storageId: v.string(),
		name: v.string(),
		mimeType: v.string(),
		size: v.optional(v.number()),
		parentId: v.optional(v.string()),
		altText: v.optional(v.string()),
		title: v.optional(v.string()),
		createdBy: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.mediaAssets.create(ctx, {
			storageId: args.storageId,
			name: args.name,
			mimeType: args.mimeType,
			size: args.size,
			parentId: args.parentId,
			altText: args.altText,
			title: args.title,
			createdBy: args.createdBy,
		});
	},
});

/**
 * List media assets with optional folder and type filtering.
 */
export const listMediaAssets = query({
	args: {
		folderId: v.optional(v.string()),
		type: v.optional(
			v.union(
				v.literal("image"),
				v.literal("video"),
				v.literal("audio"),
				v.literal("document"),
				v.literal("other"),
			),
		),
		limit: v.optional(v.number()),
		cursor: v.optional(v.string()),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.mediaAssets.list(ctx, {
			folderId: args.folderId,
			type: args.type,
			paginationOpts: {
				numItems: args.limit ?? 24,
				cursor: args.cursor ?? null,
			},
		});
	},
});

/**
 * Get a single media asset.
 */
export const getMediaAsset = query({
	args: {
		id: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.mediaAssets.get(ctx, { id: args.id });
	},
});

/**
 * Create a media folder.
 */
export const createMediaFolder = mutation({
	args: {
		name: v.string(),
		parentId: v.optional(v.string()),
		createdBy: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.mediaFolders.create(ctx, {
			name: args.name,
			parentId: args.parentId,
			createdBy: args.createdBy,
		});
	},
});

/**
 * List media folders.
 */
export const listMediaFolders = query({
	args: {
		parentId: v.optional(v.string()),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.mediaFolders.list(ctx, {
			parentId: args.parentId,
		});
	},
});

/**
 * Move an asset to a different folder.
 */
export const moveAsset = mutation({
	args: {
		assetId: v.string(),
		targetFolderId: v.optional(v.string()),
		updatedBy: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.mediaAssets.update(ctx, {
			id: args.assetId,
			parentId: args.targetFolderId,
			updatedBy: args.updatedBy,
		});
	},
});

// =============================================================================
// Localization
// =============================================================================

/**
 * Create a localized content entry.
 */
export const createLocalizedEntry = mutation({
	args: {
		contentTypeId: v.string(),
		data: v.any(),
		locale: v.string(),
		createdBy: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.contentEntries.create(ctx, {
			contentTypeId: args.contentTypeId,
			data: args.data,
			locale: args.locale,
			createdBy: args.createdBy,
		});
	},
});

/**
 * Get an entry with locale fallback resolution.
 */
export const getWithLocaleFallback = query({
	args: {
		id: v.string(),
		locale: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		// Use the CMS locale resolution with fallback chain
		const fallbackChain = cms.locale.getFallbackChain(args.locale);

		// Try each locale in the chain
		for (const tryLocale of [args.locale, ...fallbackChain]) {
			const entry = await cms.contentEntries.get(ctx, {
				id: args.id,
				locale: tryLocale,
			});

			if (entry) {
				return {
					entry,
					resolvedLocale: tryLocale,
					requestedLocale: args.locale,
					usedFallback: tryLocale !== args.locale,
				};
			}
		}

		return null;
	},
});

/**
 * Get the locale configuration.
 */
export const getLocaleConfig = query({
	args: {},
	returns: v.any(),
	handler: async () => {
		return cms.locale.getConfig();
	},
});

// =============================================================================
// RBAC Utilities
// =============================================================================

/**
 * Check if a user has a specific permission.
 * Uses mutation context because authorization hooks may need db/auth access.
 */
export const checkPermission = mutation({
	args: {
		userId: v.string(),
		resource: v.union(
			v.literal("contentTypes"),
			v.literal("contentEntries"),
			v.literal("mediaAssets"),
			v.literal("mediaFolders"),
			v.literal("versions"),
		),
		action: v.union(
			v.literal("create"),
			v.literal("read"),
			v.literal("update"),
			v.literal("delete"),
			v.literal("publish"),
			v.literal("unpublish"),
			v.literal("schedule"),
			v.literal("restore"),
		),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.hasPermissionForUser(ctx, args.userId, {
			resource: args.resource,
			action: args.action,
		});
	},
});

/**
 * Get all available roles (built-in + custom).
 */
export const getAllRoles = query({
	args: {},
	returns: v.any(),
	handler: async () => {
		return cms.getAllRoles();
	},
});

/**
 * Get a user's CMS role.
 * Uses mutation context because the getUserRole hook may need db/auth access.
 */
export const getUserRole = mutation({
	args: {
		userId: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await cms.getUserRole(ctx, args.userId);
	},
});

// =============================================================================
// User Management (for testing)
// =============================================================================

/**
 * Create a test user.
 */
export const createUser = mutation({
	args: {
		name: v.string(),
		email: v.string(),
		cmsRole: v.optional(
			v.union(
				v.literal("admin"),
				v.literal("editor"),
				v.literal("author"),
				v.literal("viewer"),
			),
		),
	},
	returns: v.id("users"),
	handler: async (ctx, args) => {
		return await ctx.db.insert("users", {
			name: args.name,
			email: args.email,
			cmsRole: args.cmsRole,
			createdAt: Date.now(),
		});
	},
});

/**
 * Get a user by email.
 */
export const getUserByEmail = query({
	args: {
		email: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		return await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", args.email))
			.first();
	},
});

/**
 * List all users.
 */
export const listUsers = query({
	args: {},
	returns: v.any(),
	handler: async (ctx) => {
		return await ctx.db.query("users").collect();
	},
});

// =============================================================================
// Search & Query Building
// =============================================================================

/**
 * Search content entries by text.
 */
export const searchEntries = query({
	args: {
		query: v.string(),
		contentTypeId: v.optional(v.string()),
		status: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		// This would use the search functionality from the CMS
		// For now, return a simple filter-based search
		const entries = await cms.contentEntries.list(ctx, {
			contentTypeId: args.contentTypeId,
			status: args.status,
			paginationOpts: {
				numItems: args.limit ?? 20,
				cursor: null,
			},
		});

		// Client-side filter by query (in production, use proper search)
		const filtered = entries.page.filter((entry: any) => {
			const data = JSON.stringify(entry.data).toLowerCase();
			return data.includes(args.query.toLowerCase());
		});

		return {
			...entries,
			page: filtered,
		};
	},
});
