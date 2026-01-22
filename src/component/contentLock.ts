/**
 * Content Lock Functions
 *
 * Implements optimistic locking for content entries to prevent concurrent edit conflicts.
 * Provides lock acquisition, release, renewal, and status checking.
 *
 * Lock Lifecycle:
 * 1. User acquires lock when opening content for editing
 * 2. Lock auto-expires after configured duration (default 30 minutes)
 * 3. User can renew lock to extend editing session
 * 4. User releases lock when done editing (or lock auto-expires)
 * 5. Admins can force-release locks when needed
 *
 * Lock Behavior:
 * - Only one user can hold a lock at a time
 * - Locks automatically expire to prevent orphaned locks
 * - The lock holder can update their locked entry
 * - Other users receive an error when trying to update locked content
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import {
	acquireLockArgs,
	releaseLockArgs,
	forceReleaseLockArgs,
	renewLockArgs,
	checkLockArgs,
	listLockedEntriesArgs,
	lockStatusDoc,
	lockAcquisitionResult,
	contentEntryDoc,
	DEFAULT_LOCK_DURATION_MS,
	MAX_LOCK_DURATION_MS,
} from "./validators.js";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if a lock is currently active (not expired).
 * @param lockExpiresAt - The lock expiration timestamp
 * @returns true if lock is active, false if expired or not set
 */
function isLockActive(lockExpiresAt: number | undefined): boolean {
	if (lockExpiresAt === undefined) {
		return false;
	}
	return Date.now() < lockExpiresAt;
}

/**
 * Calculates the time remaining on a lock.
 * @param lockExpiresAt - The lock expiration timestamp
 * @returns Time remaining in milliseconds, or 0 if expired
 */
function getTimeRemaining(lockExpiresAt: number | undefined): number {
	if (lockExpiresAt === undefined) {
		return 0;
	}
	const remaining = lockExpiresAt - Date.now();
	return remaining > 0 ? remaining : 0;
}

/**
 * Validates and clamps lock duration to allowed range.
 * @param requestedDuration - Requested lock duration in ms
 * @returns Clamped duration within allowed range
 */
function validateLockDuration(requestedDuration: number | undefined): number {
	const duration = requestedDuration ?? DEFAULT_LOCK_DURATION_MS;

	if (duration <= 0) {
		return DEFAULT_LOCK_DURATION_MS;
	}

	return Math.min(duration, MAX_LOCK_DURATION_MS);
}

// =============================================================================
// Lock Query Functions
// =============================================================================

/**
 * Query to check the lock status of a content entry.
 *
 * Returns detailed information about the current lock state,
 * including whether it's locked, by whom, and how much time remains.
 *
 * @param id - The content entry ID to check
 * @returns Lock status information
 *
 * @example
 * ```typescript
 * const status = await ctx.runQuery(api.contentLock.checkLock, {
 *   id: entryId,
 * });
 * if (status.isLocked && status.lockedBy !== currentUserId) {
 *   console.log(`Entry is locked by ${status.lockedBy}`);
 * }
 * ```
 */
export const checkLock = query({
	args: checkLockArgs.fields,
	returns: lockStatusDoc,
	handler: async (ctx, args) => {
		const { id } = args;

		const entry = await ctx.db.get(id);
		if (!entry) {
			throw new Error(`Content entry not found: ${id}`);
		}

		const _now = Date.now();
		const hasLock =
			entry.lockedBy !== undefined && entry.lockExpiresAt !== undefined;
		const isActive = hasLock && isLockActive(entry.lockExpiresAt);
		const isExpired = hasLock && !isActive;
		const timeRemaining = isActive
			? getTimeRemaining(entry.lockExpiresAt)
			: undefined;

		return {
			isLocked: isActive,
			lockedBy: isActive ? entry.lockedBy : undefined,
			lockExpiresAt: isActive ? entry.lockExpiresAt : undefined,
			timeRemaining,
			isExpired,
		};
	},
});

/**
 * Query to list all locked content entries.
 *
 * Useful for admin dashboards to see which entries are currently
 * being edited and by whom.
 *
 * @param contentTypeId - Optional filter by content type
 * @param lockedBy - Optional filter by locking user
 * @param paginationOpts - Pagination options
 * @returns Paginated list of locked entries
 */
export const listLockedEntries = query({
	args: listLockedEntriesArgs.fields,
	returns: v.object({
		page: v.array(
			v.object({
				...contentEntryDoc.fields,
				timeRemaining: v.optional(v.number()),
			}),
		),
		continueCursor: v.union(v.string(), v.null()),
		isDone: v.boolean(),
	}),
	handler: async (ctx, args) => {
		const { contentTypeId, lockedBy, paginationOpts } = args;
		const _now = Date.now();

		// Query entries with locks using the by_locked index
		const query = ctx.db.query("contentEntries").withIndex("by_locked");

		// Collect all entries with locks
		const allLocked = await query.collect();

		// Filter to only active (non-expired) locks
		const entries = allLocked.filter((entry) => {
			// Must have lock fields set
			if (entry.lockedBy === undefined || entry.lockExpiresAt === undefined) {
				return false;
			}
			// Must not be expired
			if (!isLockActive(entry.lockExpiresAt)) {
				return false;
			}
			// Must not be deleted
			if (entry.deletedAt !== undefined) {
				return false;
			}
			// Apply content type filter if provided
			if (contentTypeId && entry.contentTypeId !== contentTypeId) {
				return false;
			}
			// Apply lockedBy filter if provided
			if (lockedBy && entry.lockedBy !== lockedBy) {
				return false;
			}
			return true;
		});

		// Simple pagination (manual implementation since we filtered in memory)
		const numItems = paginationOpts.numItems ?? 50;
		const cursor = paginationOpts.cursor;

		let startIndex = 0;
		if (cursor) {
			const cursorIndex = entries.findIndex((e) => e._id === cursor);
			if (cursorIndex !== -1) {
				startIndex = cursorIndex + 1;
			}
		}

		const page = entries.slice(startIndex, startIndex + numItems);
		const hasMore = startIndex + numItems < entries.length;
		const nextCursor = hasMore ? page[page.length - 1]?._id ?? null : null;

		// Add time remaining to each entry
		const pageWithRemaining = page.map((entry) => ({
			...entry,
			timeRemaining: getTimeRemaining(entry.lockExpiresAt),
		}));

		return {
			page: pageWithRemaining,
			continueCursor: nextCursor,
			isDone: !hasMore,
		};
	},
});

// =============================================================================
// Lock Mutation Functions
// =============================================================================

/**
 * Mutation to acquire a lock on a content entry.
 *
 * Attempts to acquire an exclusive lock on an entry for editing.
 * The lock will automatically expire after the specified duration.
 *
 * Lock acquisition rules:
 * - If entry is not locked, lock is acquired
 * - If entry is locked by the same user, lock is renewed
 * - If entry is locked by another user and lock is expired, lock is acquired
 * - If entry is locked by another user and lock is active, acquisition fails
 *
 * @param id - The content entry ID to lock
 * @param userId - User ID acquiring the lock
 * @param lockDuration - Optional lock duration (default 30 min, max 4 hours)
 * @returns Lock acquisition result with success status and entry
 *
 * @example
 * ```typescript
 * const result = await ctx.runMutation(api.contentLock.acquireLock, {
 *   id: entryId,
 *   userId: currentUserId,
 *   lockDuration: 60 * 60 * 1000, // 1 hour
 * });
 *
 * if (result.success) {
 *   console.log("Lock acquired, editing enabled");
 * } else {
 *   console.log(`Lock held by ${result.currentLockHolder}`);
 * }
 * ```
 */
export const acquireLock = mutation({
	args: acquireLockArgs.fields,
	returns: lockAcquisitionResult,
	handler: async (ctx, args) => {
		const { id, userId, lockDuration } = args;

		// Retrieve the entry
		const entry = await ctx.db.get(id);
		if (!entry) {
			return {
				success: false,
				error: `Content entry not found: ${id}`,
			};
		}

		// Check if entry is deleted
		if (entry.deletedAt !== undefined) {
			return {
				success: false,
				error: `Content entry has been deleted: ${id}`,
			};
		}

		// Calculate lock expiration
		const validDuration = validateLockDuration(lockDuration);
		const now = Date.now();
		const newLockExpiresAt = now + validDuration;

		// Check current lock status
		const hasExistingLock =
			entry.lockedBy !== undefined && entry.lockExpiresAt !== undefined;
		const isExistingLockActive =
			hasExistingLock && isLockActive(entry.lockExpiresAt);
		const isSameUser = entry.lockedBy === userId;

		// Case 1: Entry is locked by another user with an active lock
		if (isExistingLockActive && !isSameUser) {
			return {
				success: false,
				error: `Entry is locked by another user`,
				currentLockHolder: entry.lockedBy,
				currentLockExpiresAt: entry.lockExpiresAt,
			};
		}

		// Case 2: Same user re-acquiring (renew) OR expired lock OR no lock
		// Acquire/renew the lock
		await ctx.db.patch(id, {
			lockedBy: userId,
			lockExpiresAt: newLockExpiresAt,
		});

		// Fetch updated entry
		const updatedEntry = await ctx.db.get(id);
		if (!updatedEntry) {
			return {
				success: false,
				error: "Failed to retrieve updated entry",
			};
		}

		return {
			success: true,
			entry: updatedEntry,
		};
	},
});

/**
 * Mutation to release a lock on a content entry.
 *
 * Only the lock owner can release their lock. This should be called
 * when the user finishes editing or navigates away from the editor.
 *
 * @param id - The content entry ID to unlock
 * @param userId - User ID releasing the lock (must match lock owner)
 * @returns The unlocked content entry
 *
 * @throws Error if entry not found
 * @throws Error if entry not locked by this user
 *
 * @example
 * ```typescript
 * const entry = await ctx.runMutation(api.contentLock.releaseLock, {
 *   id: entryId,
 *   userId: currentUserId,
 * });
 * console.log("Lock released");
 * ```
 */
export const releaseLock = mutation({
	args: releaseLockArgs.fields,
	returns: contentEntryDoc,
	handler: async (ctx, args) => {
		const { id, userId } = args;

		const entry = await ctx.db.get(id);
		if (!entry) {
			throw new Error(`Content entry not found: ${id}`);
		}

		// Verify the user owns the lock
		if (entry.lockedBy !== userId) {
			if (entry.lockedBy === undefined) {
				throw new Error(`Content entry is not locked: ${id}`);
			}
			throw new Error(`Cannot release lock: entry is locked by another user`);
		}

		// Release the lock
		await ctx.db.patch(id, {
			lockedBy: undefined,
			lockExpiresAt: undefined,
		});

		const updatedEntry = await ctx.db.get(id);
		if (!updatedEntry) {
			throw new Error("Failed to retrieve updated entry");
		}

		return updatedEntry;
	},
});

/**
 * Mutation to force-release a lock (admin operation).
 *
 * Allows administrators to remove locks from entries locked by other users.
 * This should be used sparingly - only when a user has abandoned an editing
 * session without releasing their lock, and the auto-expiry hasn't occurred yet.
 *
 * @param id - The content entry ID to force unlock
 * @param releasedBy - User ID performing the force release (for audit trail)
 * @returns The unlocked content entry
 *
 * @throws Error if entry not found
 * @throws Error if entry is not locked
 *
 * @example
 * ```typescript
 * // Admin forcing release of abandoned lock
 * const entry = await ctx.runMutation(api.contentLock.forceReleaseLock, {
 *   id: entryId,
 *   releasedBy: adminUserId,
 * });
 * console.log("Lock forcibly released");
 * ```
 */
export const forceReleaseLock = mutation({
	args: forceReleaseLockArgs.fields,
	returns: contentEntryDoc,
	handler: async (ctx, args) => {
		const { id, releasedBy } = args;

		const entry = await ctx.db.get(id);
		if (!entry) {
			throw new Error(`Content entry not found: ${id}`);
		}

		// Check if entry is actually locked
		if (entry.lockedBy === undefined) {
			throw new Error(`Content entry is not locked: ${id}`);
		}

		// Force release the lock
		await ctx.db.patch(id, {
			lockedBy: undefined,
			lockExpiresAt: undefined,
			// Track who force-released in updatedBy for audit purposes
			updatedBy: releasedBy,
		});

		const updatedEntry = await ctx.db.get(id);
		if (!updatedEntry) {
			throw new Error("Failed to retrieve updated entry");
		}

		return updatedEntry;
	},
});

/**
 * Mutation to renew an existing lock.
 *
 * Extends the lock expiration time for continued editing sessions.
 * Only the lock owner can renew their lock.
 *
 * This is typically called periodically by the client to keep the lock
 * active during long editing sessions.
 *
 * @param id - The content entry ID whose lock to renew
 * @param userId - User ID renewing the lock (must match lock owner)
 * @param lockDuration - Optional new lock duration (default 30 min, max 4 hours)
 * @returns The entry with renewed lock
 *
 * @throws Error if entry not found
 * @throws Error if entry not locked by this user
 *
 * @example
 * ```typescript
 * // Renew lock every 15 minutes during editing
 * setInterval(async () => {
 *   await ctx.runMutation(api.contentLock.renewLock, {
 *     id: entryId,
 *     userId: currentUserId,
 *   });
 * }, 15 * 60 * 1000);
 * ```
 */
export const renewLock = mutation({
	args: renewLockArgs.fields,
	returns: contentEntryDoc,
	handler: async (ctx, args) => {
		const { id, userId, lockDuration } = args;

		const entry = await ctx.db.get(id);
		if (!entry) {
			throw new Error(`Content entry not found: ${id}`);
		}

		// Verify the user owns the lock
		if (entry.lockedBy !== userId) {
			if (entry.lockedBy === undefined) {
				throw new Error(`Content entry is not locked: ${id}`);
			}
			throw new Error(`Cannot renew lock: entry is locked by another user`);
		}

		// Check if lock has already expired
		if (!isLockActive(entry.lockExpiresAt)) {
			throw new Error(
				`Lock has expired and cannot be renewed. Please acquire a new lock.`,
			);
		}

		// Calculate new lock expiration
		const validDuration = validateLockDuration(lockDuration);
		const now = Date.now();
		const newLockExpiresAt = now + validDuration;

		// Renew the lock
		await ctx.db.patch(id, {
			lockExpiresAt: newLockExpiresAt,
		});

		const updatedEntry = await ctx.db.get(id);
		if (!updatedEntry) {
			throw new Error("Failed to retrieve updated entry");
		}

		return updatedEntry;
	},
});

// =============================================================================
// Internal Helper for Update Validation
// =============================================================================

/**
 * Validates that a user can update a locked entry.
 * This is exported for use by contentEntryMutations.
 *
 * @param entry - The content entry to check
 * @param userId - The user attempting the update
 * @returns Object with isAllowed boolean and optional error message
 */
export function validateLockForUpdate(
	entry: { lockedBy?: string; lockExpiresAt?: number },
	userId: string | undefined,
): { isAllowed: boolean; error?: string } {
	// If no lock, update is allowed
	if (entry.lockedBy === undefined || entry.lockExpiresAt === undefined) {
		return { isAllowed: true };
	}

	// If lock has expired, update is allowed
	if (!isLockActive(entry.lockExpiresAt)) {
		return { isAllowed: true };
	}

	// If same user holds the lock, update is allowed
	if (userId && entry.lockedBy === userId) {
		return { isAllowed: true };
	}

	// Another user holds an active lock
	return {
		isAllowed: false,
		error: `Cannot update: entry is locked by user ${
			entry.lockedBy
		}. Lock expires at ${new Date(entry.lockExpiresAt).toISOString()}`,
	};
}
