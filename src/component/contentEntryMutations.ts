/**
 * Content Entry Mutation Functions
 *
 * Provides mutation functions for creating, updating, and deleting content entries.
 * Content entries are instances of content types that hold the actual content data.
 *
 * Content Lifecycle:
 * 1. Content starts as "draft" status by default
 * 2. Draft content can be edited freely without affecting any published version
 * 3. Publishing changes status to "published" and records publish timestamps
 * 4. Unpublishing reverts status to "draft" for further editing
 */

import { v } from "convex/values";
import { mutation } from "./_generated/server.js";
import {
	contentEntryDoc,
	createContentEntryArgs,
	updateContentEntryArgs,
	publishEntryArgs,
	deleteContentEntryArgs,
	duplicateContentEntryArgs,
	mutationAuthContext,
} from "./validators.js";
import { generateSlug } from "./lib/slugGenerator.js";
import { ensureUniqueSlug } from "./lib/slugUniqueness.js";
import {
	validateContentData,
	ContentTypeSchema,
	FieldDefinition,
} from "./validation.js";
import { validateLockForUpdate } from "./contentLock.js";
import {
	emitEvent,
	contentEntryEventType,
	ContentEntryEventPayload,
} from "./eventEmitter.js";
import {
	contentTypeNotFound,
	contentTypeDeleted,
	contentTypeInactive,
	contentEntryNotFound,
	contentEntryDeleted,
	contentEntryNotDeleted,
	contentEntryAlreadyPublished,
	contentEntryNotPublished,
	contentEntryArchived,
	contentEntryValidationFailed,
	contentEntryLocked,
	contentEntryCreateFailed,
	contentEntryUpdateFailed,
} from "./lib/errors.js";
import { requireMutationAuth, withResourceOwner } from "./lib/mutationAuth.js";
import { isDeleted } from "./lib/softDelete.js";

// =============================================================================
// Create Entry Mutation
// =============================================================================

/**
 * Mutation to create a new content entry.
 *
 * Content entries are created with "draft" status by default. This allows
 * content to be edited and refined before being published to the live site.
 *
 * The mutation will:
 * 1. Validate that the content type exists
 * 2. Generate a slug from the title field (or use provided slug)
 * 3. Ensure the slug is unique within the content type
 * 4. Create the entry with draft status (unless specified otherwise)
 *
 * @param contentTypeId - The ID of the content type this entry belongs to
 * @param data - The content data (validated against content type schema at runtime)
 * @param slug - Optional custom slug (auto-generated from title if not provided)
 * @param locale - Optional locale code for localized content
 * @param primaryEntryId - Reference to primary entry if this is a localized variant
 * @param status - Initial status (defaults to "draft")
 * @param createdBy - Optional user ID for audit trail
 *
 * @returns The created content entry
 *
 * @throws Error if the content type does not exist
 * @throws Error if the content type is not active
 *
 * @example
 * ```typescript
 * // Create a new blog post (starts as draft)
 * const post = await ctx.runMutation(api.contentEntryMutations.createEntry, {
 *   contentTypeId: blogTypeId,
 *   data: {
 *     title: "My First Post",
 *     content: "<p>Hello world!</p>",
 *   },
 *   createdBy: currentUserId,
 * });
 *
 * // Create with explicit status
 * const scheduledPost = await ctx.runMutation(api.contentEntryMutations.createEntry, {
 *   contentTypeId: blogTypeId,
 *   data: { title: "Scheduled Post" },
 *   status: "scheduled",
 *   scheduledPublishAt: Date.now() + 86400000, // Tomorrow
 * });
 * ```
 */
export const createEntry = mutation({
	args: {
		...createContentEntryArgs.fields,
		/** Optional auth context for mutation-level authorization */
		_auth: v.optional(mutationAuthContext),
	},
	returns: contentEntryDoc,
	handler: async (ctx, args) => {
		const {
			contentTypeId,
			data,
			locale,
			primaryEntryId,
			createdBy,
			_auth,
		} = args;

		// Authorization check - contentEntries.create permission
		requireMutationAuth(_auth, "contentEntries", "create");

		// Validate content type exists and is active
		const contentType = await ctx.db.get(contentTypeId);
		if (!contentType) {
			throw contentTypeNotFound((contentTypeId as unknown) as string);
		}
		if (!contentType.isActive) {
			throw contentTypeInactive(
				(contentTypeId as unknown) as string,
				contentType.name,
			);
		}
		if (isDeleted(contentType)) {
			throw contentTypeDeleted(
				(contentTypeId as unknown) as string,
				contentType.name,
			);
		}

		// Determine which field to use for slug generation
		const slugField = contentType.slugField ?? "title";
		const contentData = data as Record<string, unknown>;

		// Build the schema for validation
		const schema: ContentTypeSchema = {
			name: contentType.name,
			displayName: contentType.displayName,
			description: contentType.description,
			fields: contentType.fields as FieldDefinition[],
			titleField: contentType.titleField,
			slugField: contentType.slugField,
			singleton: contentType.singleton,
		};

		// Validate content data against the content type schema
		const validationResult = validateContentData(contentData, schema);
		if (!validationResult.valid) {
			throw contentEntryValidationFailed(validationResult.errors);
		}

		// Generate or validate slug
		let slug = args.slug;
		if (!slug) {
			// Generate slug from the slug field value
			const slugSource = contentData[slugField];
			if (typeof slugSource === "string" && slugSource.trim()) {
				slug = generateSlug(slugSource);
			} else {
				// Fallback to "untitled" if no suitable field value
				slug = "untitled";
			}
		}

		// Ensure slug is unique within this content type
		const queryFn = async (candidateSlug: string) => {
			return await ctx.db
				.query("contentEntries")
				.withIndex("by_content_type_and_slug", (q) =>
					q.eq("contentTypeId", contentTypeId).eq("slug", candidateSlug),
				)
				.filter((q) => q.eq(q.field("deletedAt"), undefined))
				.first();
		};

		const uniqueSlug = await ensureUniqueSlug(slug, queryFn);

		// Default to draft status - content should start unpublished
		const status = args.status ?? "draft";

		// Generate searchable text from text fields
		let searchText: string | undefined = "";
		for (const field of contentType.fields) {
			if (field.searchable && contentData[field.name]) {
				const value = contentData[field.name];
				if (typeof value === "string") {
					searchText += ` ${value}`;
				}
			}
		}
		searchText = searchText.trim() || undefined;

		// Create the entry
		const _now = Date.now();
		const entryId = await ctx.db.insert("contentEntries", {
			contentTypeId,
			slug: uniqueSlug,
			status,
			data,
			locale,
			primaryEntryId,
			version: 1,
			createdBy,
			updatedBy: createdBy,
			searchText,
		});

		// Retrieve and return the created entry
		const entry = await ctx.db.get(entryId);
		if (!entry) {
			throw contentEntryCreateFailed((contentTypeId as unknown) as string);
		}

		// Emit content entry created event
		await emitEvent(ctx, {
			eventType: contentEntryEventType("created"),
			resourceType: "contentEntry",
			resourceId: (entryId as unknown) as string,
			action: "created",
			payload: {
				slug: uniqueSlug,
				contentTypeName: contentType.name,
				contentTypeId: (contentTypeId as unknown) as string,
				status,
				version: 1,
				locale,
			} as ContentEntryEventPayload,
			userId: createdBy,
		});

		return entry;
	},
});

// =============================================================================
// Update Entry Mutation
// =============================================================================

/**
 * Mutation to update an existing content entry.
 *
 * Re-validates content against the type schema, optionally regenerates slug,
 * and updates the modification timestamp. Updates are allowed regardless of status:
 * - Draft entries: All fields can be updated freely
 * - Published entries: Updates create a new "working draft" that doesn't
 *   affect the live version until republished
 * - Scheduled entries: Updates modify the scheduled content
 *
 * Key behaviors:
 * 1. **Content Validation**: When data is provided, it's merged with existing data
 *    and validated against the content type schema. Invalid data throws an error.
 * 2. **Slug Handling**: Explicit slug takes precedence. If `regenerateSlug` is true
 *    and data is updated, the slug is regenerated from the slugField value.
 * 3. **Search Text**: Automatically regenerated from searchable fields when data changes.
 * 4. **Version Tracking**: Version number is incremented on every update.
 *
 * @param id - The content entry ID to update
 * @param slug - Optional new slug (uniqueness will be validated)
 * @param data - Optional new content data (merged with existing, then validated)
 * @param status - Optional new status
 * @param scheduledPublishAt - Optional scheduled publish time (for "scheduled" status)
 * @param updatedBy - Optional user ID for audit trail
 * @param regenerateSlug - If true, regenerates slug from slugField when data is updated
 *
 * @returns The updated content entry
 *
 * @throws Error if the entry does not exist
 * @throws Error if the entry has been deleted
 * @throws Error if the content type has been deleted
 * @throws Error if content validation fails
 * @throws Error if the new slug is not unique
 *
 * @example
 * ```typescript
 * // Update content data (validates against schema)
 * await ctx.runMutation(api.contentEntryMutations.updateEntry, {
 *   id: entryId,
 *   data: { title: "Updated Title", content: "<p>New content</p>" },
 *   updatedBy: currentUserId,
 * });
 *
 * // Change slug explicitly
 * await ctx.runMutation(api.contentEntryMutations.updateEntry, {
 *   id: entryId,
 *   slug: "new-url-slug",
 * });
 *
 * // Update title and regenerate slug from it
 * await ctx.runMutation(api.contentEntryMutations.updateEntry, {
 *   id: entryId,
 *   data: { title: "My New Blog Post Title" },
 *   regenerateSlug: true,
 *   updatedBy: currentUserId,
 * });
 * ```
 */
export const updateEntry = mutation({
	args: {
		...updateContentEntryArgs.fields,
		/** Optional auth context for mutation-level authorization */
		_auth: v.optional(mutationAuthContext),
	},
	returns: contentEntryDoc,
	handler: async (ctx, args) => {
		const {
			id,
			slug,
			data,
			status,
			scheduledPublishAt,
			updatedBy,
			regenerateSlug,
			_auth,
		} = args;

		const entry = await ctx.db.get(id);
		if (!entry) {
			throw contentEntryNotFound((id as unknown) as string);
		}
		if (isDeleted(entry)) {
			throw contentEntryDeleted((id as unknown) as string);
		}

		// Authorization check - contentEntries.update permission (with ownership check)
		requireMutationAuth(
			withResourceOwner(_auth, entry.createdBy),
			"contentEntries",
			"update",
		);

		// Check lock status - only the lock holder can update a locked entry
		const lockValidation = validateLockForUpdate(entry, updatedBy);
		if (!lockValidation.isAllowed) {
			// Extract lock info from entry for detailed error
			if (entry.lockedBy && entry.lockExpiresAt) {
				throw contentEntryLocked(
					(id as unknown) as string,
					entry.lockedBy,
					entry.lockExpiresAt,
					updatedBy,
				);
			}
			throw contentEntryLocked(
				(id as unknown) as string,
				"unknown",
				Date.now(),
				updatedBy,
			);
		}

		const contentType = await ctx.db.get(entry.contentTypeId);
		if (!contentType) {
			throw contentTypeNotFound((entry.contentTypeId as unknown) as string);
		}
		if (isDeleted(contentType)) {
			throw contentTypeDeleted(
				(entry.contentTypeId as unknown) as string,
				contentType.name,
			);
		}

		// Build the update object
		const updates: Record<string, unknown> = {
			updatedBy,
		};

		// Merge data if provided, otherwise use existing data
		let mergedData: Record<string, unknown>;
		if (data !== undefined) {
			mergedData = { ...(entry.data as Record<string, unknown>), ...data };
		} else {
			mergedData = entry.data as Record<string, unknown>;
		}

		// Validate content data against the content type schema
		if (data !== undefined) {
			const schema: ContentTypeSchema = {
				name: contentType.name,
				displayName: contentType.displayName,
				description: contentType.description,
				fields: contentType.fields as FieldDefinition[],
				titleField: contentType.titleField,
				slugField: contentType.slugField,
				singleton: contentType.singleton,
			};

			const validationResult = validateContentData(mergedData, schema);
			if (!validationResult.valid) {
				throw contentEntryValidationFailed(validationResult.errors);
			}

			updates.data = mergedData;
		}

		// Helper function for slug uniqueness queries
		const slugQueryFn = async (candidateSlug: string) => {
			const existing = await ctx.db
				.query("contentEntries")
				.withIndex("by_content_type_and_slug", (q) =>
					q.eq("contentTypeId", entry.contentTypeId).eq("slug", candidateSlug),
				)
				.filter((q) => q.eq(q.field("deletedAt"), undefined))
				.first();
			// Exclude current entry from uniqueness check
			if (existing && existing._id !== id) {
				return existing;
			}
			return null;
		};

		// Handle slug: explicit slug takes precedence, then regeneration if requested
		if (slug !== undefined && slug !== entry.slug) {
			// Explicit slug provided - validate and ensure uniqueness
			const uniqueSlug = await ensureUniqueSlug(slug, slugQueryFn, {
				excludeEntryId: (id as unknown) as string,
			});
			updates.slug = uniqueSlug;
		} else if (regenerateSlug && data !== undefined) {
			// Regenerate slug from the slug field value
			const slugField = contentType.slugField ?? "title";
			const slugSource = mergedData[slugField];

			if (typeof slugSource === "string" && slugSource.trim()) {
				const newSlug = generateSlug(slugSource);
				// Only update if the regenerated slug is different from current
				if (newSlug !== entry.slug) {
					const uniqueSlug = await ensureUniqueSlug(newSlug, slugQueryFn, {
						excludeEntryId: (id as unknown) as string,
					});
					updates.slug = uniqueSlug;
				}
			}
		}

		// Update search text if data changed
		if (data !== undefined) {
			let searchText = "";
			for (const field of contentType.fields) {
				if (field.searchable && mergedData[field.name]) {
					const value = mergedData[field.name];
					if (typeof value === "string") {
						searchText += ` ${value}`;
					}
				}
			}
			updates.searchText = searchText.trim() || undefined;
		}

		// Handle status update
		if (status !== undefined) {
			updates.status = status;
		}

		// Handle scheduled publish time
		if (scheduledPublishAt !== undefined) {
			updates.scheduledPublishAt = scheduledPublishAt;
		}

		// Check if content has changed to determine if we need a version snapshot
		const hasDataChanges =
			data !== undefined &&
			JSON.stringify(entry.data) !== JSON.stringify(mergedData);
		const hasSlugChanges = updates.slug !== undefined;

		// Create a version snapshot before updating if content changed
		if (hasDataChanges || hasSlugChanges) {
			await ctx.db.insert("contentVersions", {
				entryId: id,
				versionNumber: entry.version,
				data: entry.data,
				slug: entry.slug,
				status: entry.status,
				changeDescription: "Draft saved",
				createdBy: updatedBy,
				wasPublished: false,
			});
		}

		// Increment version number
		updates.version = entry.version + 1;

		// Apply updates
		await ctx.db.patch(id, updates);

		const updatedEntry = await ctx.db.get(id);
		if (!updatedEntry) {
			throw contentEntryUpdateFailed((id as unknown) as string);
		}

		// Emit content entry updated event
		await emitEvent(ctx, {
			eventType: contentEntryEventType("updated"),
			resourceType: "contentEntry",
			resourceId: (id as unknown) as string,
			action: "updated",
			payload: {
				slug: updatedEntry.slug,
				contentTypeName: contentType.name,
				contentTypeId: (entry.contentTypeId as unknown) as string,
				status: updatedEntry.status,
				version: updatedEntry.version,
				locale: updatedEntry.locale,
			} as ContentEntryEventPayload,
			userId: updatedBy,
		});

		return updatedEntry;
	},
});

// =============================================================================
// Publish Entry Mutation
// =============================================================================

/**
 * Mutation to publish a content entry.
 *
 * Publishing transitions an entry from "draft" (or "scheduled") to "published"
 * status, making it visible on the live site.
 *
 * When publishing:
 * - Status is set to "published"
 * - firstPublishedAt is set if this is the first publication
 * - lastPublishedAt is updated to current timestamp
 * - Version is incremented
 * - A version snapshot can be created (if versioning is enabled)
 *
 * @param id - The content entry ID to publish
 * @param changeDescription - Optional description of changes (for version history)
 * @param updatedBy - Optional user ID for audit trail
 *
 * @returns The published content entry
 *
 * @throws Error if the entry does not exist
 * @throws Error if the entry has been deleted
 * @throws Error if the entry is already published
 *
 * @example
 * ```typescript
 * const published = await ctx.runMutation(api.contentEntryMutations.publishEntry, {
 *   id: entryId,
 *   changeDescription: "Initial publication",
 *   updatedBy: currentUserId,
 * });
 * ```
 */
export const publishEntry = mutation({
	args: {
		...publishEntryArgs.fields,
		/** Optional auth context for mutation-level authorization */
		_auth: v.optional(mutationAuthContext),
	},
	returns: contentEntryDoc,
	handler: async (ctx, args) => {
		const { id, changeDescription, updatedBy, _auth } = args;

		const entry = await ctx.db.get(id);
		if (!entry) {
			throw contentEntryNotFound((id as unknown) as string);
		}
		if (isDeleted(entry)) {
			throw contentEntryDeleted((id as unknown) as string);
		}

		// Authorization check - contentEntries.publish permission (with ownership check)
		requireMutationAuth(
			withResourceOwner(_auth, entry.createdBy),
			"contentEntries",
			"publish",
		);

		if (entry.status === "published") {
			throw contentEntryAlreadyPublished((id as unknown) as string);
		}
		if (entry.status === "archived") {
			throw contentEntryArchived((id as unknown) as string);
		}

		const now = Date.now();

		// Create a version snapshot before publishing
		await ctx.db.insert("contentVersions", {
			entryId: id,
			versionNumber: entry.version,
			data: entry.data,
			slug: entry.slug,
			status: entry.status,
			changeDescription,
			createdBy: updatedBy,
			wasPublished: true,
			publishedAt: now,
		});

		// Update the entry to published status
		const updates: Record<string, unknown> = {
			status: "published",
			lastPublishedAt: now,
			version: entry.version + 1,
			updatedBy,
			// Clear scheduled publish time if it was set
			scheduledPublishAt: undefined,
		};

		// Set firstPublishedAt only on first publication
		if (entry.firstPublishedAt === undefined) {
			updates.firstPublishedAt = now;
		}

		await ctx.db.patch(id, updates);

		const publishedEntry = await ctx.db.get(id);
		if (!publishedEntry) {
			throw contentEntryUpdateFailed((id as unknown) as string);
		}

		const contentType = await ctx.db.get(entry.contentTypeId);

		// Emit content entry published event
		await emitEvent(ctx, {
			eventType: contentEntryEventType("published"),
			resourceType: "contentEntry",
			resourceId: (id as unknown) as string,
			action: "published",
			payload: {
				slug: publishedEntry.slug,
				contentTypeName: contentType?.name ?? "unknown",
				contentTypeId: (entry.contentTypeId as unknown) as string,
				status: "published",
				version: publishedEntry.version,
				locale: publishedEntry.locale,
				changeDescription,
			} as ContentEntryEventPayload,
			userId: updatedBy,
		});

		return publishedEntry;
	},
});

// =============================================================================
// Unpublish Entry Mutation
// =============================================================================

/**
 * Mutation to unpublish a content entry (revert to draft).
 *
 * Unpublishing transitions an entry from "published" back to "draft" status,
 * removing it from the live site while preserving all content for further editing.
 *
 * This is useful for:
 * - Taking content offline temporarily
 * - Making significant changes before republishing
 * - Seasonal content that needs to be hidden
 *
 * @param id - The content entry ID to unpublish
 * @param updatedBy - Optional user ID for audit trail
 *
 * @returns The unpublished content entry (now in draft status)
 *
 * @throws Error if the entry does not exist
 * @throws Error if the entry has been deleted
 * @throws Error if the entry is not currently published
 *
 * @example
 * ```typescript
 * const draft = await ctx.runMutation(api.contentEntryMutations.unpublishEntry, {
 *   id: entryId,
 *   updatedBy: currentUserId,
 * });
 * console.log(draft.status); // "draft"
 * ```
 */
export const unpublishEntry = mutation({
	args: {
		/** The ID of the content entry to unpublish */
		id: v.id("contentEntries"),
		/** User ID performing the unpublish (for audit trail) */
		updatedBy: v.optional(v.string()),
		/** Optional auth context for mutation-level authorization */
		_auth: v.optional(mutationAuthContext),
	},
	returns: contentEntryDoc,
	handler: async (ctx, args) => {
		const { id, updatedBy, _auth } = args;

		const entry = await ctx.db.get(id);
		if (!entry) {
			throw contentEntryNotFound((id as unknown) as string);
		}
		if (isDeleted(entry)) {
			throw contentEntryDeleted((id as unknown) as string);
		}

		// Authorization check - contentEntries.unpublish permission (with ownership check)
		requireMutationAuth(
			withResourceOwner(_auth, entry.createdBy),
			"contentEntries",
			"unpublish",
		);

		if (entry.status !== "published") {
			throw contentEntryNotPublished((id as unknown) as string, entry.status);
		}

		await ctx.db.patch(id, {
			status: "draft",
			version: entry.version + 1,
			updatedBy,
		});

		const unpublishedEntry = await ctx.db.get(id);
		if (!unpublishedEntry) {
			throw contentEntryUpdateFailed((id as unknown) as string);
		}

		const contentType = await ctx.db.get(entry.contentTypeId);

		// Emit content entry unpublished event
		await emitEvent(ctx, {
			eventType: contentEntryEventType("unpublished"),
			resourceType: "contentEntry",
			resourceId: (id as unknown) as string,
			action: "unpublished",
			payload: {
				slug: unpublishedEntry.slug,
				contentTypeName: contentType?.name ?? "unknown",
				contentTypeId: (entry.contentTypeId as unknown) as string,
				status: "draft",
				version: unpublishedEntry.version,
				locale: unpublishedEntry.locale,
			} as ContentEntryEventPayload,
			userId: updatedBy,
		});

		return unpublishedEntry;
	},
});

// =============================================================================
// Delete Entry Mutation
// =============================================================================

/**
 * Result type for delete operations.
 * Returns the deleted entry with updated deletedAt timestamp.
 */
export const deleteResultDoc = v.object({
	...contentEntryDoc.fields,
	/** Number of associated versions that were cleaned up */
	deletedVersionsCount: v.optional(v.number()),
});

/**
 * Mutation to delete a content entry.
 *
 * By default, performs a soft delete by setting the `deletedAt` timestamp.
 * This allows the entry to be recovered later if needed.
 *
 * When `hardDelete` is true, permanently removes the entry and all
 * associated version snapshots from the database.
 *
 * @param id - The content entry ID to delete
 * @param deletedBy - Optional user ID for audit trail
 * @param hardDelete - If true, permanently deletes entry and versions (default: false)
 *
 * @returns The deleted content entry (with deletedAt set for soft deletes)
 *
 * @throws Error if the entry does not exist
 * @throws Error if the entry has already been deleted (for soft deletes)
 *
 * @example
 * ```typescript
 * // Soft delete (default) - entry can be recovered
 * const deleted = await ctx.runMutation(api.contentEntryMutations.deleteEntry, {
 *   id: entryId,
 *   deletedBy: currentUserId,
 * });
 *
 * // Hard delete - permanently removes entry and all versions
 * await ctx.runMutation(api.contentEntryMutations.deleteEntry, {
 *   id: entryId,
 *   deletedBy: currentUserId,
 *   hardDelete: true,
 * });
 * ```
 */
export const deleteEntry = mutation({
	args: {
		...deleteContentEntryArgs.fields,
		/** Optional auth context for mutation-level authorization */
		_auth: v.optional(mutationAuthContext),
	},
	returns: deleteResultDoc,
	handler: async (ctx, args) => {
		const { id, deletedBy, hardDelete = false, _auth } = args;

		const entry = await ctx.db.get(id);

		if (!entry) {
			throw contentEntryNotFound((id as unknown) as string);
		}

		// Authorization check - contentEntries.delete permission (with ownership check)
		requireMutationAuth(
			withResourceOwner(_auth, entry.createdBy),
			"contentEntries",
			"delete",
		);

		// For soft delete, check if already deleted
		if (!hardDelete && isDeleted(entry)) {
			throw contentEntryDeleted((id as unknown) as string);
		}

		// Get all associated versions for this entry
		const versions = await ctx.db
			.query("contentVersions")
			.withIndex("by_entry", (q) => q.eq("entryId", id))
			.collect();

		const deletedVersionsCount = versions.length;

		const contentType = await ctx.db.get(entry.contentTypeId);

		if (hardDelete) {
			// Hard delete: permanently remove all versions
			for (const version of versions) {
				await ctx.db.delete(version._id);
			}

			// Permanently delete the entry itself
			await ctx.db.delete(id);

			// Emit content entry deleted event (for hard delete)
			await emitEvent(ctx, {
				eventType: contentEntryEventType("deleted"),
				resourceType: "contentEntry",
				resourceId: (id as unknown) as string,
				action: "deleted",
				payload: {
					slug: entry.slug,
					contentTypeName: contentType?.name ?? "unknown",
					contentTypeId: (entry.contentTypeId as unknown) as string,
					status: entry.status,
					version: entry.version,
					locale: entry.locale,
				} as ContentEntryEventPayload,
				userId: deletedBy,
				metadata: { hardDelete: true },
			});

			// Return the entry as it was before deletion
			return {
				...entry,
				deletedAt: Date.now(),
				updatedBy: deletedBy,
				deletedVersionsCount,
			};
		} else {
			// Soft delete: set deletedAt timestamp
			const now = Date.now();

			await ctx.db.patch(id, {
				deletedAt: now,
				updatedBy: deletedBy,
			});

			// Emit content entry deleted event (for soft delete)
			await emitEvent(ctx, {
				eventType: contentEntryEventType("deleted"),
				resourceType: "contentEntry",
				resourceId: (id as unknown) as string,
				action: "deleted",
				payload: {
					slug: entry.slug,
					contentTypeName: contentType?.name ?? "unknown",
					contentTypeId: (entry.contentTypeId as unknown) as string,
					status: entry.status,
					version: entry.version,
					locale: entry.locale,
				} as ContentEntryEventPayload,
				userId: deletedBy,
				metadata: { hardDelete: false },
			});

			return {
				...entry,
				deletedAt: now,
				updatedBy: deletedBy ?? entry.updatedBy,
				deletedVersionsCount,
			};
		}
	},
});

/**
 * Mutation to restore a soft-deleted content entry.
 *
 * Removes the `deletedAt` timestamp from the entry, making it active again.
 * Only works for soft-deleted entries; hard-deleted entries cannot be recovered.
 *
 * @param id - The content entry ID to restore
 * @param restoredBy - Optional user ID for audit trail
 *
 * @returns The restored content entry
 *
 * @throws Error if the entry does not exist
 * @throws Error if the entry is not soft-deleted
 *
 * @example
 * ```typescript
 * const restored = await ctx.runMutation(api.contentEntryMutations.restoreEntry, {
 *   id: entryId,
 *   restoredBy: currentUserId,
 * });
 * ```
 */
export const restoreEntry = mutation({
	args: {
		/** The ID of the content entry to restore */
		id: v.id("contentEntries"),
		/** User ID performing the restoration (for audit trail) */
		restoredBy: v.optional(v.string()),
		/** Optional auth context for mutation-level authorization */
		_auth: v.optional(mutationAuthContext),
	},
	returns: contentEntryDoc,
	handler: async (ctx, args) => {
		const { id, restoredBy, _auth } = args;

		const entry = await ctx.db.get(id);

		if (!entry) {
			throw contentEntryNotFound((id as unknown) as string);
		}

		// Authorization check - contentEntries.restore permission (with ownership check)
		requireMutationAuth(
			withResourceOwner(_auth, entry.createdBy),
			"contentEntries",
			"restore",
		);

		if (!isDeleted(entry)) {
			throw contentEntryNotDeleted((id as unknown) as string);
		}

		// Remove the deletedAt marker to restore the entry
		await ctx.db.patch(id, {
			deletedAt: undefined,
			updatedBy: restoredBy,
		});

		const contentType = await ctx.db.get(entry.contentTypeId);

		// Emit content entry restored event
		await emitEvent(ctx, {
			eventType: contentEntryEventType("restored"),
			resourceType: "contentEntry",
			resourceId: (id as unknown) as string,
			action: "restored",
			payload: {
				slug: entry.slug,
				contentTypeName: contentType?.name ?? "unknown",
				contentTypeId: (entry.contentTypeId as unknown) as string,
				status: entry.status,
				version: entry.version,
				locale: entry.locale,
			} as ContentEntryEventPayload,
			userId: restoredBy,
		});

		return {
			...entry,
			deletedAt: undefined,
			updatedBy: restoredBy ?? entry.updatedBy,
		};
	},
});

// =============================================================================
// Duplicate Entry Mutation
// =============================================================================

/**
 * Mutation to duplicate (clone) an existing content entry.
 *
 * Creates a new content entry with the same data as the source entry,
 * but with a new unique slug. The duplicated entry is always created
 * as a draft, regardless of the source entry's status.
 *
 * This is useful for:
 * - Content templating workflows (copy a template to create new content)
 * - Creating localized variants of content
 * - Quick duplication of similar content pieces
 *
 * Key behaviors:
 * 1. **Data Cloning**: All content data is deep-copied to the new entry
 * 2. **Media References**: By default, media references (IDs) are copied,
 *    pointing to the same media assets. Set `copyMediaReferences: false`
 *    to clear media fields in the duplicate.
 * 3. **Slug Generation**: A new unique slug is generated from the source
 *    entry's slug (e.g., "my-post" → "my-post-1") unless a custom slug
 *    is provided.
 * 4. **Status Reset**: The duplicate always starts as "draft" with version 1
 * 5. **Timestamps Reset**: Publishing timestamps are cleared in the duplicate
 *
 * @param sourceEntryId - The ID of the content entry to duplicate
 * @param slug - Optional custom slug (auto-generated if not provided)
 * @param copyMediaReferences - Whether to copy media IDs (default: true)
 * @param locale - Optional locale for the duplicated entry
 * @param createdBy - Optional user ID for audit trail
 *
 * @returns The newly created duplicate content entry
 *
 * @throws Error if the source entry does not exist
 * @throws Error if the source entry has been deleted
 * @throws Error if the content type does not exist or is not active
 *
 * @example
 * ```typescript
 * // Simple duplication (keeps all media references)
 * const duplicate = await ctx.runMutation(api.contentEntryMutations.duplicateEntry, {
 *   sourceEntryId: originalPostId,
 *   createdBy: currentUserId,
 * });
 *
 * // Duplicate with custom slug
 * const duplicate = await ctx.runMutation(api.contentEntryMutations.duplicateEntry, {
 *   sourceEntryId: templateId,
 *   slug: "new-post-from-template",
 *   createdBy: currentUserId,
 * });
 *
 * // Duplicate without media references (for a fresh start)
 * const duplicate = await ctx.runMutation(api.contentEntryMutations.duplicateEntry, {
 *   sourceEntryId: originalPostId,
 *   copyMediaReferences: false,
 *   createdBy: currentUserId,
 * });
 * ```
 */
export const duplicateEntry = mutation({
	args: {
		...duplicateContentEntryArgs.fields,
		/** Optional auth context for mutation-level authorization */
		_auth: v.optional(mutationAuthContext),
	},
	returns: contentEntryDoc,
	handler: async (ctx, args) => {
		const {
			sourceEntryId,
			slug,
			copyMediaReferences = true,
			locale,
			createdBy,
			_auth,
		} = args;

		// Authorization check - contentEntries.create permission (duplicate creates a new entry)
		requireMutationAuth(_auth, "contentEntries", "create");

		const sourceEntry = await ctx.db.get(sourceEntryId);
		if (!sourceEntry) {
			throw contentEntryNotFound((sourceEntryId as unknown) as string);
		}
		if (isDeleted(sourceEntry)) {
			throw contentEntryDeleted((sourceEntryId as unknown) as string);
		}

		// Retrieve and validate the content type
		const contentType = await ctx.db.get(sourceEntry.contentTypeId);
		if (!contentType) {
			throw contentTypeNotFound(
				(sourceEntry.contentTypeId as unknown) as string,
			);
		}
		if (!contentType.isActive) {
			throw contentTypeInactive(
				(sourceEntry.contentTypeId as unknown) as string,
				contentType.name,
			);
		}
		if (isDeleted(contentType)) {
			throw contentTypeDeleted(
				(sourceEntry.contentTypeId as unknown) as string,
				contentType.name,
			);
		}

		// Deep copy the content data
		const newData: Record<string, unknown> = JSON.parse(
			JSON.stringify(sourceEntry.data),
		);

		// Optionally clear media references
		if (!copyMediaReferences) {
			const fields = contentType.fields as FieldDefinition[];
			for (const field of fields) {
				if (field.type === "media" && newData[field.name] !== undefined) {
					// Clear media field - set to null for single, empty array for multiple
					const isMultiple = field.options?.multiple;
					newData[field.name] = isMultiple ? [] : null;
				}
			}
		}

		// Build the schema for validation
		const schema: ContentTypeSchema = {
			name: contentType.name,
			displayName: contentType.displayName,
			description: contentType.description,
			fields: contentType.fields as FieldDefinition[],
			titleField: contentType.titleField,
			slugField: contentType.slugField,
			singleton: contentType.singleton,
		};

		// Validate the cloned data against the content type schema
		const validationResult = validateContentData(newData, schema);
		if (!validationResult.valid) {
			throw contentEntryValidationFailed(validationResult.errors);
		}

		// Generate or validate slug
		let targetSlug = slug;
		if (!targetSlug) {
			// Generate a slug based on the source entry's slug
			// This will result in something like "original-slug-1" if "original-slug" exists
			targetSlug = sourceEntry.slug;
		}

		// Ensure slug is unique within this content type
		const queryFn = async (candidateSlug: string) => {
			return await ctx.db
				.query("contentEntries")
				.withIndex("by_content_type_and_slug", (q) =>
					q
						.eq("contentTypeId", sourceEntry.contentTypeId)
						.eq("slug", candidateSlug),
				)
				.filter((q) => q.eq(q.field("deletedAt"), undefined))
				.first();
		};

		const uniqueSlug = await ensureUniqueSlug(targetSlug, queryFn);

		// Generate searchable text from text fields
		let searchText: string | undefined = "";
		for (const field of contentType.fields) {
			if (field.searchable && newData[field.name]) {
				const value = newData[field.name];
				if (typeof value === "string") {
					searchText += ` ${value}`;
				}
			}
		}
		searchText = searchText.trim() || undefined;

		// Create the duplicate entry (always as draft with version 1)
		const entryId = await ctx.db.insert("contentEntries", {
			contentTypeId: sourceEntry.contentTypeId,
			slug: uniqueSlug,
			status: "draft",
			data: newData,
			locale: locale ?? sourceEntry.locale,
			// Don't copy primaryEntryId - this is a new independent entry
			version: 1,
			// Reset publishing timestamps - this is a new entry
			firstPublishedAt: undefined,
			lastPublishedAt: undefined,
			scheduledPublishAt: undefined,
			// Don't copy locks
			lockedBy: undefined,
			lockExpiresAt: undefined,
			// Set new audit trail
			createdBy,
			updatedBy: createdBy,
			searchText,
		});

		// Retrieve and return the created entry
		const entry = await ctx.db.get(entryId);
		if (!entry) {
			throw contentEntryCreateFailed(
				(sourceEntry.contentTypeId as unknown) as string,
			);
		}

		// Emit content entry duplicated event
		await emitEvent(ctx, {
			eventType: contentEntryEventType("duplicated"),
			resourceType: "contentEntry",
			resourceId: (entryId as unknown) as string,
			action: "duplicated",
			payload: {
				slug: uniqueSlug,
				contentTypeName: contentType.name,
				contentTypeId: (sourceEntry.contentTypeId as unknown) as string,
				status: "draft",
				version: 1,
				locale: locale ?? sourceEntry.locale,
				sourceEntryId: (sourceEntryId as unknown) as string,
			} as ContentEntryEventPayload,
			userId: createdBy,
		});

		return entry;
	},
});
