/**
 * Trash Management Functions
 *
 * Provides functionality for managing soft-deleted content entries in a "trash" system:
 * - List deleted entries with pagination and filtering
 * - Configure retention period for automatic cleanup
 * - Manually empty trash (permanent deletion)
 * - Automatic scheduled cleanup of old deleted items
 *
 * Soft Delete Workflow:
 * 1. User deletes an entry -> `deletedAt` timestamp is set (soft delete)
 * 2. Entry is hidden from normal queries but visible in trash
 * 3. User can restore the entry using `restoreEntry` mutation
 * 4. After retention period, entry is permanently deleted (hard delete)
 *
 * Configuration:
 * - `retentionDays`: How long items stay in trash (default: 30 days)
 * - `autoCleanupEnabled`: Whether to run automatic cleanup (default: true)
 * - Setting `retentionDays` to 0 disables automatic cleanup
 */

import { v } from "convex/values";
import { isDeleted } from "./lib/softDelete.js";
import { stream } from "convex-helpers/server/stream";
import { query, mutation, internalMutation } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import {
	// contentEntryDoc,
	trashConfigDoc,
	updateTrashConfigArgs,
	listTrashArgs,
	emptyTrashArgs,
	emptyTrashResult,
	trashItemDoc,
	DEFAULT_TRASH_RETENTION_DAYS,
} from "./validators.js";
import schema from "./schema.js";

// =============================================================================
// Constants
// =============================================================================

/** Default pagination size for trash listing */
const DEFAULT_NUM_ITEMS = 50;

/** Maximum items per page */
const MAX_NUM_ITEMS = 250;

/** Milliseconds in a day */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// =============================================================================
// Trash Configuration
// =============================================================================

/**
 * Query to get the current trash configuration.
 *
 * If no configuration exists, returns default values.
 * This is useful for displaying settings in the admin UI.
 *
 * @returns Current trash configuration
 *
 * @example
 * ```typescript
 * const config = await ctx.runQuery(api.trash.getTrashConfig, {});
 * console.log(`Retention: ${config.retentionDays} days`);
 * console.log(`Auto-cleanup: ${config.autoCleanupEnabled}`);
 * ```
 */
export const getTrashConfig = query({
	args: {},
	returns: v.object({
		retentionDays: v.number(),
		autoCleanupEnabled: v.boolean(),
		lastCleanupAt: v.optional(v.number()),
		lastCleanupCount: v.optional(v.number()),
	}),
	handler: async (ctx) => {
		// Get the singleton config record
		const config = await ctx.db.query("trashConfig").first();

		if (config) {
			return {
				retentionDays: config.retentionDays,
				autoCleanupEnabled: config.autoCleanupEnabled,
				lastCleanupAt: config.lastCleanupAt,
				lastCleanupCount: config.lastCleanupCount,
			};
		}

		// Return defaults if no config exists
		return {
			retentionDays: DEFAULT_TRASH_RETENTION_DAYS,
			autoCleanupEnabled: true,
			lastCleanupAt: undefined,
			lastCleanupCount: undefined,
		};
	},
});

/**
 * Mutation to update trash configuration settings.
 *
 * Creates the config record if it doesn't exist.
 * Use this to customize retention period or disable auto-cleanup.
 *
 * @param retentionDays - Days to keep items in trash (0 to disable auto-cleanup)
 * @param autoCleanupEnabled - Whether to enable automatic cleanup
 * @param updatedBy - User ID for audit trail
 *
 * @returns Updated configuration
 *
 * @example
 * ```typescript
 * // Set 7-day retention period
 * await ctx.runMutation(api.trash.updateTrashConfig, {
 *   retentionDays: 7,
 *   updatedBy: currentUserId,
 * });
 *
 * // Disable auto-cleanup (keep items forever until manually deleted)
 * await ctx.runMutation(api.trash.updateTrashConfig, {
 *   autoCleanupEnabled: false,
 *   updatedBy: currentUserId,
 * });
 * ```
 */
export const updateTrashConfig = mutation({
	args: updateTrashConfigArgs.fields,
	returns: trashConfigDoc,
	handler: async (ctx, args) => {
		const { retentionDays, autoCleanupEnabled, updatedBy } = args;

		// Validate retention days
		if (retentionDays !== undefined) {
			if (retentionDays < 0 || retentionDays > 365) {
				throw new Error("Retention days must be between 0 and 365");
			}
		}

		// Get existing config
		const existingConfig = await ctx.db.query("trashConfig").first();

		if (existingConfig) {
			// Update existing config
			const updates: Record<string, unknown> = { updatedBy };
			if (retentionDays !== undefined) updates.retentionDays = retentionDays;
			if (autoCleanupEnabled !== undefined)
				updates.autoCleanupEnabled = autoCleanupEnabled;

			await ctx.db.patch(existingConfig._id, updates);
			const updated = await ctx.db.get(existingConfig._id);
			return updated!;
		} else {
			// Create new config with defaults for unspecified fields
			const configId = await ctx.db.insert("trashConfig", {
				retentionDays: retentionDays ?? DEFAULT_TRASH_RETENTION_DAYS,
				autoCleanupEnabled: autoCleanupEnabled ?? true,
				updatedBy,
			});
			const newConfig = await ctx.db.get(configId);
			return newConfig!;
		}
	},
});

// =============================================================================
// List Trash Query
// =============================================================================

/**
 * Paginated response for trash listing.
 */
const paginatedTrashResponse = v.object({
	/** Array of deleted content entries with metadata */
	page: v.array(trashItemDoc),
	/** Cursor for fetching the next page */
	continueCursor: v.union(v.string(), v.null()),
	/** Whether this is the last page */
	isDone: v.boolean(),
	/** Total count of items in trash (approximate) */
	totalCount: v.optional(v.number()),
});

/**
 * Query to list soft-deleted content entries (trash).
 *
 * Returns entries that have been soft-deleted, sorted by deletion time
 * (most recently deleted first). Each entry includes metadata about
 * when it was deleted and when it will expire.
 *
 * @param contentTypeName - Filter by content type name (e.g., "blog_post")
 * @param search - Search within deleted items
 * @param paginationOpts - Standard pagination options
 *
 * @returns Paginated list of deleted entries
 *
 * @example
 * ```typescript
 * // List all trash items
 * const { page, continueCursor, isDone } = await ctx.runQuery(
 *   api.trash.listTrash,
 *   { paginationOpts: { numItems: 20 } }
 * );
 *
 * // Filter by content type
 * const deletedPosts = await ctx.runQuery(api.trash.listTrash, {
 *   contentTypeName: "blog_post",
 *   paginationOpts: { numItems: 20 },
 * });
 *
 * // Each item includes deletion metadata
 * for (const item of page) {
 *   console.log(`${item.slug} - deleted ${item.deletedDaysAgo} days ago`);
 *   if (item.expiresAt) {
 *     console.log(`  Expires: ${new Date(item.expiresAt).toISOString()}`);
 *   }
 * }
 * ```
 */
export const listTrash = query({
	args: listTrashArgs.fields,
	returns: paginatedTrashResponse,
	handler: async (ctx, args) => {
		const { contentTypeName, search, paginationOpts } = args;

		// Clamp pagination
		const numItems = Math.min(
			Math.max(1, paginationOpts.numItems ?? DEFAULT_NUM_ITEMS),
			MAX_NUM_ITEMS,
		);

		const clampedPaginationOpts = {
			...paginationOpts,
			numItems,
		};

		// Get trash config for retention period
		const config = await ctx.db.query("trashConfig").first();
		const retentionDays = config?.retentionDays ?? DEFAULT_TRASH_RETENTION_DAYS;
		const now = Date.now();

		// Build the query using the by_deleted index
		const streamDb = stream(ctx.db, schema);

		// Query deleted entries (where deletedAt is defined)
		// We use filterWith to handle the complex filtering
		const baseQuery = streamDb.query("contentEntries");

		const filteredQuery = baseQuery.order("desc").filterWith(async (entry) => {
			// Must be deleted
			if (!isDeleted(entry)) {
				return false;
			}

			// Filter by content type name if specified
			if (contentTypeName && entry.contentTypeName !== contentTypeName) {
				return false;
			}

			// Simple text search if provided
			if (search && search.trim().length > 0) {
				const searchLower = search.toLowerCase();
				const slugMatch = entry.slug?.toLowerCase().includes(searchLower);
				const searchTextMatch = entry.searchText
					?.toLowerCase()
					.includes(searchLower);
				if (!slugMatch && !searchTextMatch) {
					return false;
				}
			}

			return true;
		});

		// Execute pagination
		const result = await filteredQuery.paginate({
			...clampedPaginationOpts,
			maximumRowsRead: numItems * 10,
		});

		// Enrich results with deletion metadata
		const enrichedPage = result.page.map((entry) => {
			const deletedAt = entry.deletedAt!;
			const deletedDaysAgo = Math.floor((now - deletedAt) / MS_PER_DAY);

			// Calculate expiration time based on retention
			let expiresAt: number | undefined;
			if (retentionDays > 0) {
				expiresAt = deletedAt + retentionDays * MS_PER_DAY;
			}

			return {
				...entry,
				deletedDaysAgo,
				expiresAt,
				contentTypeName: entry.contentTypeName,
			};
		});

		return {
			page: enrichedPage,
			continueCursor: result.continueCursor,
			isDone: result.isDone,
		};
	},
});

/**
 * Query to get trash statistics.
 *
 * Returns counts and metadata about items in trash.
 * Useful for displaying trash status in the admin UI.
 *
 * @returns Trash statistics
 */
export const getTrashStats = query({
	args: {},
	returns: v.object({
		/** Total number of items in trash */
		totalCount: v.number(),
		/** Number of items that have expired (past retention period) */
		expiredCount: v.number(),
		/** Oldest item deletion date */
		oldestDeletedAt: v.optional(v.number()),
		/** Most recent item deletion date */
		newestDeletedAt: v.optional(v.number()),
		/** Current retention period in days */
		retentionDays: v.number(),
	}),
	handler: async (ctx) => {
		// Get trash config
		const config = await ctx.db.query("trashConfig").first();
		const retentionDays = config?.retentionDays ?? DEFAULT_TRASH_RETENTION_DAYS;
		const now = Date.now();
		const expirationThreshold = now - retentionDays * MS_PER_DAY;

		// Query all deleted entries
		const deletedEntries = await ctx.db
			.query("contentEntries")
			.filter((q) => q.neq(q.field("deletedAt"), undefined))
			.collect();

		let totalCount = 0;
		let expiredCount = 0;
		let oldestDeletedAt: number | undefined;
		let newestDeletedAt: number | undefined;

		for (const entry of deletedEntries) {
			if (!isDeleted(entry)) continue;
			const deletedAt = entry.deletedAt!;

			totalCount++;

			if (retentionDays > 0 && deletedAt < expirationThreshold) {
				expiredCount++;
			}

			if (oldestDeletedAt === undefined || deletedAt < oldestDeletedAt) {
				oldestDeletedAt = deletedAt;
			}
			if (newestDeletedAt === undefined || deletedAt > newestDeletedAt) {
				newestDeletedAt = deletedAt;
			}
		}

		return {
			totalCount,
			expiredCount,
			oldestDeletedAt,
			newestDeletedAt,
			retentionDays,
		};
	},
});

// =============================================================================
// Empty Trash Mutation
// =============================================================================

/**
 * Mutation to permanently delete items from trash.
 *
 * This performs a hard delete, removing entries and all their version history.
 * This action cannot be undone.
 *
 * Options:
 * - Delete all trash items
 * - Delete only items older than a specified number of days
 * - Delete only items of a specific content type
 *
 * @param olderThanDays - Only delete items deleted more than this many days ago
 * @param contentTypeName - Only delete items of this content type name
 * @param deletedBy - User performing the operation (for logging)
 *
 * @returns Count of deleted items and any errors
 *
 * @example
 * ```typescript
 * // Empty all trash
 * const result = await ctx.runMutation(api.trash.emptyTrash, {
 *   deletedBy: currentUserId,
 * });
 * console.log(`Permanently deleted ${result.deletedCount} items`);
 *
 * // Delete only items older than 7 days
 * await ctx.runMutation(api.trash.emptyTrash, {
 *   olderThanDays: 7,
 *   deletedBy: currentUserId,
 * });
 *
 * // Delete only deleted blog posts
 * await ctx.runMutation(api.trash.emptyTrash, {
 *   contentTypeName: "blog_post",
 *   deletedBy: currentUserId,
 * });
 * ```
 */
export const emptyTrash = mutation({
	args: emptyTrashArgs.fields,
	returns: emptyTrashResult,
	handler: async (ctx, args) => {
		const { olderThanDays, contentTypeName } = args;

		const now = Date.now();
		let cutoffTime: number | undefined;

		if (olderThanDays !== undefined) {
			cutoffTime = now - olderThanDays * MS_PER_DAY;
		}

		// Query all deleted entries
		const deletedEntries = await ctx.db
			.query("contentEntries")
			.filter((q) => q.neq(q.field("deletedAt"), undefined))
			.collect();

		let deletedCount = 0;
		let deletedVersionsCount = 0;
		const errors: Array<{
			id: typeof deletedEntries[0]["_id"];
			error: string;
		}> = [];

		for (const entry of deletedEntries) {
			// Skip if not actually deleted
			if (!isDeleted(entry)) continue;
			const deletedAt = entry.deletedAt!;

			// Apply filters
			if (cutoffTime !== undefined && deletedAt > cutoffTime) {
				continue; // Not old enough
			}
			if (
				contentTypeName !== undefined &&
				entry.contentTypeName !== contentTypeName
			) {
				continue; // Wrong content type
			}

			try {
				// Delete all versions for this entry
				const versions = await ctx.db
					.query("contentVersions")
					.withIndex("by_entry", (q) => q.eq("entryId", entry._id))
					.collect();

				for (const version of versions) {
					await ctx.db.delete(version._id);
					deletedVersionsCount++;
				}

				// Delete the entry itself
				await ctx.db.delete(entry._id);
				deletedCount++;
			} catch (error) {
				errors.push({
					id: entry._id,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		return {
			deletedCount,
			deletedVersionsCount,
			errors,
		};
	},
});

// =============================================================================
// Scheduled Cleanup Functions
// =============================================================================

/**
 * Internal mutation for scheduled trash cleanup.
 *
 * This is called by the scheduler to automatically delete items that have
 * exceeded the retention period. It runs periodically (e.g., daily) and
 * processes items in batches to respect Convex transaction limits.
 *
 * The function:
 * 1. Checks if auto-cleanup is enabled
 * 2. Finds all items past the retention period
 * 3. Permanently deletes them and their versions
 * 4. Updates the config with cleanup stats
 * 5. Reschedules itself for the next run
 */
export const executeTrashCleanup = internalMutation({
	args: {},
	handler: async (ctx) => {
		// Get trash configuration
		const config = await ctx.db.query("trashConfig").first();

		// If no config exists, create one with defaults
		if (!config) {
			await ctx.db.insert("trashConfig", {
				retentionDays: DEFAULT_TRASH_RETENTION_DAYS,
				autoCleanupEnabled: true,
			});
			return;
		}

		// Check if auto-cleanup is enabled
		if (!config.autoCleanupEnabled) {
			console.log("Trash auto-cleanup is disabled, skipping");
			return;
		}

		// Check if retention is set (0 = no auto-cleanup)
		if (config.retentionDays === 0) {
			console.log("Trash retention is 0 days (disabled), skipping cleanup");
			return;
		}

		const now = Date.now();
		const cutoffTime = now - config.retentionDays * MS_PER_DAY;

		// Find expired items
		const expiredEntries = await ctx.db
			.query("contentEntries")
			.filter((q) => q.neq(q.field("deletedAt"), undefined))
			.collect();

		let deletedCount = 0;

		for (const entry of expiredEntries) {
			// Skip if not actually deleted or not expired
			if (!isDeleted(entry)) continue;
			if (entry.deletedAt! > cutoffTime) continue;

			try {
				// Delete all versions
				const versions = await ctx.db
					.query("contentVersions")
					.withIndex("by_entry", (q) => q.eq("entryId", entry._id))
					.collect();

				for (const version of versions) {
					await ctx.db.delete(version._id);
				}

				// Delete the entry
				await ctx.db.delete(entry._id);
				deletedCount++;
			} catch (error) {
				console.error(`Failed to delete expired entry ${entry._id}:`, error);
			}
		}

		// Update config with cleanup stats
		await ctx.db.patch(config._id, {
			lastCleanupAt: now,
			lastCleanupCount: deletedCount,
		});

		console.log(
			`Trash cleanup completed: ${deletedCount} items permanently deleted`,
		);
	},
});

/**
 * Mutation to manually trigger trash cleanup.
 *
 * Use this to run cleanup on-demand instead of waiting for the scheduled job.
 * Useful for testing or when you need immediate cleanup.
 *
 * @param updatedBy - User triggering the cleanup
 *
 * @returns Cleanup result statistics
 */
export const runTrashCleanup = mutation({
	args: {
		updatedBy: v.optional(v.string()),
	},
	returns: v.object({
		deletedCount: v.number(),
		message: v.string(),
	}),
	handler: async (ctx, args) => {
		// Get trash configuration
		const config = await ctx.db.query("trashConfig").first();
		const retentionDays = config?.retentionDays ?? DEFAULT_TRASH_RETENTION_DAYS;

		if (retentionDays === 0) {
			return {
				deletedCount: 0,
				message: "Retention is set to 0 days (disabled). No items deleted.",
			};
		}

		const now = Date.now();
		const cutoffTime = now - retentionDays * MS_PER_DAY;

		// Find expired items
		const expiredEntries = await ctx.db
			.query("contentEntries")
			.filter((q) => q.neq(q.field("deletedAt"), undefined))
			.collect();

		let deletedCount = 0;

		for (const entry of expiredEntries) {
			if (!isDeleted(entry)) continue;
			if (entry.deletedAt! > cutoffTime) continue;

			// Delete versions
			const versions = await ctx.db
				.query("contentVersions")
				.withIndex("by_entry", (q) => q.eq("entryId", entry._id))
				.collect();

			for (const version of versions) {
				await ctx.db.delete(version._id);
			}

			// Delete entry
			await ctx.db.delete(entry._id);
			deletedCount++;
		}

		// Update config stats if it exists
		if (config) {
			await ctx.db.patch(config._id, {
				lastCleanupAt: now,
				lastCleanupCount: deletedCount,
				updatedBy: args.updatedBy,
			});
		}

		return {
			deletedCount,
			message: `Successfully deleted ${deletedCount} items older than ${retentionDays} days.`,
		};
	},
});

/**
 * Mutation to schedule periodic trash cleanup.
 *
 * Call this once during setup to enable automatic trash cleanup.
 * The function schedules itself to run daily.
 *
 * @param intervalMs - Cleanup interval in milliseconds (default: 24 hours)
 */
export const scheduleTrashCleanup = mutation({
	args: {
		/** Interval between cleanups in milliseconds. Default is 24 hours. */
		intervalMs: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const intervalMs = args.intervalMs ?? 24 * 60 * 60 * 1000; // Default: 24 hours

		// Schedule the cleanup to run
		await ctx.scheduler.runAfter(
			intervalMs,
			internal.trash.executeTrashCleanup,
			{},
		);

		console.log(
			`Trash cleanup scheduled to run in ${intervalMs / 1000 / 60} minutes`,
		);
	},
});
