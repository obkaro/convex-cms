/**
 * Bulk Operations for Content Entries
 *
 * Provides mutations for performing bulk operations on content entries:
 * - bulkPublish: Publish multiple entries at once
 * - bulkUnpublish: Revert multiple entries to draft
 * - bulkDelete: Delete multiple entries (soft or hard)
 * - bulkUpdate: Update multiple entries with the same changes
 *
 * All operations process entries in a single transaction for atomicity,
 * respecting Convex limits (max 16,000 documents written per transaction).
 * The BULK_OPERATION_BATCH_SIZE constant defines the maximum entries per call.
 *
 * For larger datasets, callers should batch IDs into chunks of BULK_OPERATION_BATCH_SIZE
 * and call the appropriate bulk operation for each batch.
 */

import { v } from "convex/values";
import { mutation } from "./_generated/server.js";
import {
	bulkPublishArgs,
	bulkUnpublishArgs,
	bulkDeleteArgs,
	bulkUpdateArgs,
	bulkOperationResult,
	BULK_OPERATION_BATCH_SIZE,
} from "./validators.js";
import {
	validateContentData,
	ContentTypeSchema,
	FieldDefinition,
} from "./validation.js";
import { Id } from "./_generated/dataModel.js";

// =============================================================================
// Types
// =============================================================================

interface BulkOperationItemResult {
	id: Id<"contentEntries">;
	success: boolean;
	error?: string;
}

interface BulkOperationResult {
	total: number;
	succeeded: number;
	failed: number;
	results: BulkOperationItemResult[];
}

// =============================================================================
// Bulk Publish Mutation
// =============================================================================

/**
 * Mutation to publish multiple content entries in a single transaction.
 *
 * Publishes entries that are in draft or scheduled status. Already published
 * entries are skipped with a success status. Deleted or archived entries
 * will fail with an error message.
 *
 * For each entry published:
 * - Status is set to "published"
 * - firstPublishedAt is set (if first publication)
 * - lastPublishedAt is updated
 * - Version is incremented
 * - A version snapshot is created
 *
 * @param ids - Array of content entry IDs to publish (max BULK_OPERATION_BATCH_SIZE)
 * @param changeDescription - Optional description for version history
 * @param updatedBy - User ID for audit trail
 *
 * @returns BulkOperationResult with success/failure details for each entry
 *
 * @example
 * ```typescript
 * const result = await ctx.runMutation(api.bulkOperations.bulkPublish, {
 *   ids: [entry1._id, entry2._id, entry3._id],
 *   changeDescription: "Publishing launch content",
 *   updatedBy: currentUserId,
 * });
 * console.log(`Published ${result.succeeded} of ${result.total} entries`);
 * ```
 */
export const bulkPublish = mutation({
	args: bulkPublishArgs.fields,
	returns: bulkOperationResult,
	handler: async (ctx, args): Promise<BulkOperationResult> => {
		const { ids, changeDescription, updatedBy } = args;

		// Validate batch size
		if (ids.length > BULK_OPERATION_BATCH_SIZE) {
			throw new Error(
				`Batch size exceeds limit. Maximum ${BULK_OPERATION_BATCH_SIZE} entries per operation, got ${ids.length}.`,
			);
		}

		if (ids.length === 0) {
			return { total: 0, succeeded: 0, failed: 0, results: [] };
		}

		const results: BulkOperationItemResult[] = [];
		const now = Date.now();

		for (const id of ids) {
			try {
				const entry = await ctx.db.get(id);

				if (!entry) {
					results.push({ id, success: false, error: "Entry not found" });
					continue;
				}

				if (entry.deletedAt !== undefined) {
					results.push({ id, success: false, error: "Entry has been deleted" });
					continue;
				}

				if (entry.status === "published") {
					// Already published - treat as success (idempotent)
					results.push({ id, success: true });
					continue;
				}

				if (entry.status === "archived") {
					results.push({
						id,
						success: false,
						error: "Cannot publish archived content. Restore it first.",
					});
					continue;
				}

				// Create version snapshot before publishing
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

				// Build the update object
				const updates: Record<string, unknown> = {
					status: "published",
					lastPublishedAt: now,
					version: entry.version + 1,
					updatedBy,
					scheduledPublishAt: undefined,
				};

				// Set firstPublishedAt only on first publication
				if (entry.firstPublishedAt === undefined) {
					updates.firstPublishedAt = now;
				}

				await ctx.db.patch(id, updates);
				results.push({ id, success: true });
			} catch (error) {
				results.push({
					id,
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		const succeeded = results.filter((r) => r.success).length;
		return {
			total: ids.length,
			succeeded,
			failed: ids.length - succeeded,
			results,
		};
	},
});

// =============================================================================
// Bulk Unpublish Mutation
// =============================================================================

/**
 * Mutation to unpublish multiple content entries in a single transaction.
 *
 * Reverts published entries to draft status. Non-published entries are
 * skipped with a success status (idempotent behavior). Deleted entries
 * will fail with an error message.
 *
 * For each entry unpublished:
 * - Status is set to "draft"
 * - Version is incremented
 * - Publication timestamps are preserved for history
 *
 * @param ids - Array of content entry IDs to unpublish (max BULK_OPERATION_BATCH_SIZE)
 * @param updatedBy - User ID for audit trail
 *
 * @returns BulkOperationResult with success/failure details for each entry
 *
 * @example
 * ```typescript
 * const result = await ctx.runMutation(api.bulkOperations.bulkUnpublish, {
 *   ids: [entry1._id, entry2._id],
 *   updatedBy: currentUserId,
 * });
 * ```
 */
export const bulkUnpublish = mutation({
	args: bulkUnpublishArgs.fields,
	returns: bulkOperationResult,
	handler: async (ctx, args): Promise<BulkOperationResult> => {
		const { ids, updatedBy } = args;

		// Validate batch size
		if (ids.length > BULK_OPERATION_BATCH_SIZE) {
			throw new Error(
				`Batch size exceeds limit. Maximum ${BULK_OPERATION_BATCH_SIZE} entries per operation, got ${ids.length}.`,
			);
		}

		if (ids.length === 0) {
			return { total: 0, succeeded: 0, failed: 0, results: [] };
		}

		const results: BulkOperationItemResult[] = [];

		for (const id of ids) {
			try {
				const entry = await ctx.db.get(id);

				if (!entry) {
					results.push({ id, success: false, error: "Entry not found" });
					continue;
				}

				if (entry.deletedAt !== undefined) {
					results.push({ id, success: false, error: "Entry has been deleted" });
					continue;
				}

				if (entry.status !== "published") {
					// Not published - treat as success (idempotent)
					results.push({ id, success: true });
					continue;
				}

				// Update status to draft
				await ctx.db.patch(id, {
					status: "draft",
					version: entry.version + 1,
					updatedBy,
				});

				results.push({ id, success: true });
			} catch (error) {
				results.push({
					id,
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		const succeeded = results.filter((r) => r.success).length;
		return {
			total: ids.length,
			succeeded,
			failed: ids.length - succeeded,
			results,
		};
	},
});

// =============================================================================
// Bulk Delete Mutation
// =============================================================================

/**
 * Mutation to delete multiple content entries in a single transaction.
 *
 * By default, performs soft delete by setting deletedAt timestamp.
 * When hardDelete is true, permanently removes entries and all versions.
 *
 * Soft Delete:
 * - Sets deletedAt timestamp
 * - Entries can be restored later
 * - Already deleted entries are skipped
 *
 * Hard Delete:
 * - Permanently removes entry document
 * - Deletes all version snapshots
 * - Cannot be undone
 *
 * @param ids - Array of content entry IDs to delete (max BULK_OPERATION_BATCH_SIZE)
 * @param deletedBy - User ID for audit trail
 * @param hardDelete - If true, permanently delete entries and versions
 *
 * @returns BulkOperationResult with success/failure details for each entry
 *
 * @example
 * ```typescript
 * // Soft delete (default)
 * const result = await ctx.runMutation(api.bulkOperations.bulkDelete, {
 *   ids: [entry1._id, entry2._id],
 *   deletedBy: currentUserId,
 * });
 *
 * // Hard delete
 * const result = await ctx.runMutation(api.bulkOperations.bulkDelete, {
 *   ids: [entry1._id, entry2._id],
 *   deletedBy: currentUserId,
 *   hardDelete: true,
 * });
 * ```
 */
export const bulkDelete = mutation({
	args: bulkDeleteArgs.fields,
	returns: bulkOperationResult,
	handler: async (ctx, args): Promise<BulkOperationResult> => {
		const { ids, deletedBy, hardDelete = false } = args;

		// Validate batch size
		if (ids.length > BULK_OPERATION_BATCH_SIZE) {
			throw new Error(
				`Batch size exceeds limit. Maximum ${BULK_OPERATION_BATCH_SIZE} entries per operation, got ${ids.length}.`,
			);
		}

		if (ids.length === 0) {
			return { total: 0, succeeded: 0, failed: 0, results: [] };
		}

		const results: BulkOperationItemResult[] = [];
		const now = Date.now();

		for (const id of ids) {
			try {
				const entry = await ctx.db.get(id);

				if (!entry) {
					results.push({ id, success: false, error: "Entry not found" });
					continue;
				}

				// For soft delete, skip already deleted entries
				if (!hardDelete && entry.deletedAt !== undefined) {
					// Already deleted - treat as success (idempotent)
					results.push({ id, success: true });
					continue;
				}

				if (hardDelete) {
					// Hard delete: remove all versions first
					const versions = await ctx.db
						.query("contentVersions")
						.withIndex("by_entry", (q) => q.eq("entryId", id))
						.collect();

					for (const version of versions) {
						await ctx.db.delete(version._id);
					}

					// Delete the entry itself
					await ctx.db.delete(id);
				} else {
					// Soft delete: set deletedAt timestamp
					await ctx.db.patch(id, {
						deletedAt: now,
						updatedBy: deletedBy,
					});
				}

				results.push({ id, success: true });
			} catch (error) {
				results.push({
					id,
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		const succeeded = results.filter((r) => r.success).length;
		return {
			total: ids.length,
			succeeded,
			failed: ids.length - succeeded,
			results,
		};
	},
});

// =============================================================================
// Bulk Update Mutation
// =============================================================================

/**
 * Mutation to update multiple content entries with the same changes.
 *
 * Applies the same data updates and/or status change to all specified entries.
 * Each entry is validated against its content type schema before updating.
 *
 * Data is merged with existing data for each entry (partial updates).
 * Status can be changed independently of data updates.
 *
 * @param ids - Array of content entry IDs to update (max BULK_OPERATION_BATCH_SIZE)
 * @param data - Data to merge into each entry
 * @param status - New status to apply to all entries
 * @param updatedBy - User ID for audit trail
 *
 * @returns BulkOperationResult with success/failure details for each entry
 *
 * @example
 * ```typescript
 * // Update data for multiple entries
 * const result = await ctx.runMutation(api.bulkOperations.bulkUpdate, {
 *   ids: [entry1._id, entry2._id, entry3._id],
 *   data: { featured: true, category: "news" },
 *   updatedBy: currentUserId,
 * });
 *
 * // Change status for multiple entries
 * const result = await ctx.runMutation(api.bulkOperations.bulkUpdate, {
 *   ids: [entry1._id, entry2._id],
 *   status: "archived",
 *   updatedBy: currentUserId,
 * });
 * ```
 */
export const bulkUpdate = mutation({
	args: bulkUpdateArgs.fields,
	returns: bulkOperationResult,
	handler: async (ctx, args): Promise<BulkOperationResult> => {
		const { ids, data, status, updatedBy } = args;

		// Validate batch size
		if (ids.length > BULK_OPERATION_BATCH_SIZE) {
			throw new Error(
				`Batch size exceeds limit. Maximum ${BULK_OPERATION_BATCH_SIZE} entries per operation, got ${ids.length}.`,
			);
		}

		if (ids.length === 0) {
			return { total: 0, succeeded: 0, failed: 0, results: [] };
		}

		// Check that at least one update field is provided
		if (data === undefined && status === undefined) {
			throw new Error(
				"At least one of 'data' or 'status' must be provided for bulk update",
			);
		}

		const results: BulkOperationItemResult[] = [];

		// Cache content types to avoid repeated lookups
		const contentTypeCache = new Map<
			string,
			{
				name: string;
				displayName: string;
				description?: string;
				fields: FieldDefinition[];
				titleField?: string;
				slugField?: string;
				singleton?: boolean;
			}
		>();

		for (const id of ids) {
			try {
				const entry = await ctx.db.get(id);

				if (!entry) {
					results.push({ id, success: false, error: "Entry not found" });
					continue;
				}

				if (entry.deletedAt !== undefined) {
					results.push({ id, success: false, error: "Entry has been deleted" });
					continue;
				}

				// Build updates object
				const updates: Record<string, unknown> = {
					updatedBy,
					version: entry.version + 1,
				};

				// Handle data update with validation
				if (data !== undefined) {
					// Get content type (from cache or database)
					const contentTypeId = entry.contentTypeId.toString();
					let contentType = contentTypeCache.get(contentTypeId);

					if (!contentType) {
						const dbContentType = await ctx.db.get(entry.contentTypeId);
						if (!dbContentType) {
							results.push({
								id,
								success: false,
								error: "Content type not found",
							});
							continue;
						}
						if (dbContentType.deletedAt !== undefined) {
							results.push({
								id,
								success: false,
								error: "Content type has been deleted",
							});
							continue;
						}

						contentType = {
							name: dbContentType.name,
							displayName: dbContentType.displayName,
							description: dbContentType.description,
							fields: dbContentType.fields as FieldDefinition[],
							titleField: dbContentType.titleField,
							slugField: dbContentType.slugField,
							singleton: dbContentType.singleton,
						};
						contentTypeCache.set(contentTypeId, contentType);
					}

					// Merge data with existing
					const mergedData = {
						...(entry.data as Record<string, unknown>),
						...(data as Record<string, unknown>),
					};

					// Validate merged data against schema
					const schema: ContentTypeSchema = {
						name: contentType.name,
						displayName: contentType.displayName,
						description: contentType.description,
						fields: contentType.fields,
						titleField: contentType.titleField,
						slugField: contentType.slugField,
						singleton: contentType.singleton,
					};

					const validationResult = validateContentData(mergedData, schema);
					if (!validationResult.valid) {
						const errorMessages = validationResult.errors
							.map((e) => `${e.field}: ${e.message}`)
							.join("; ");
						results.push({
							id,
							success: false,
							error: `Validation failed: ${errorMessages}`,
						});
						continue;
					}

					updates.data = mergedData;

					// Regenerate searchText from searchable fields
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

				await ctx.db.patch(id, updates);
				results.push({ id, success: true });
			} catch (error) {
				results.push({
					id,
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		const succeeded = results.filter((r) => r.success).length;
		return {
			total: ids.length,
			succeeded,
			failed: ids.length - succeeded,
			results,
		};
	},
});

// =============================================================================
// Bulk Restore Mutation
// =============================================================================

/**
 * Mutation to restore multiple soft-deleted content entries.
 *
 * Removes the deletedAt marker from entries, making them active again.
 * Only works for soft-deleted entries. Non-deleted entries are skipped
 * with a success status (idempotent behavior).
 *
 * @param ids - Array of content entry IDs to restore (max BULK_OPERATION_BATCH_SIZE)
 * @param restoredBy - User ID for audit trail
 *
 * @returns BulkOperationResult with success/failure details for each entry
 *
 * @example
 * ```typescript
 * const result = await ctx.runMutation(api.bulkOperations.bulkRestore, {
 *   ids: [deletedEntry1._id, deletedEntry2._id],
 *   restoredBy: currentUserId,
 * });
 * ```
 */
export const bulkRestore = mutation({
	args: {
		ids: v.array(v.id("contentEntries")),
		restoredBy: v.optional(v.string()),
	},
	returns: bulkOperationResult,
	handler: async (ctx, args): Promise<BulkOperationResult> => {
		const { ids, restoredBy } = args;

		// Validate batch size
		if (ids.length > BULK_OPERATION_BATCH_SIZE) {
			throw new Error(
				`Batch size exceeds limit. Maximum ${BULK_OPERATION_BATCH_SIZE} entries per operation, got ${ids.length}.`,
			);
		}

		if (ids.length === 0) {
			return { total: 0, succeeded: 0, failed: 0, results: [] };
		}

		const results: BulkOperationItemResult[] = [];

		for (const id of ids) {
			try {
				const entry = await ctx.db.get(id);

				if (!entry) {
					results.push({ id, success: false, error: "Entry not found" });
					continue;
				}

				if (entry.deletedAt === undefined) {
					// Not deleted - treat as success (idempotent)
					results.push({ id, success: true });
					continue;
				}

				// Restore the entry
				await ctx.db.patch(id, {
					deletedAt: undefined,
					updatedBy: restoredBy,
				});

				results.push({ id, success: true });
			} catch (error) {
				results.push({
					id,
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		const succeeded = results.filter((r) => r.success).length;
		return {
			total: ids.length,
			succeeded,
			failed: ids.length - succeeded,
			results,
		};
	},
});
