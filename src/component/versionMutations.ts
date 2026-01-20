/**
 * Version Mutation Functions
 *
 * Provides internal mutation functions for creating and managing version snapshots.
 * These functions are used internally by the CMS to maintain version history
 * for content entries.
 *
 * Version snapshots capture:
 * - Complete content data at a point in time
 * - Slug and status when the snapshot was created
 * - Metadata about who created it and why
 * - Whether the snapshot represents a published version
 */

import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server.js";
import {
  createVersionSnapshotArgs,
  contentVersionDoc,
  contentEntryDoc,
  rollbackVersionArgs,
} from "./validators.js";
import {
  versionEntryNotFound,
  versionEntryDeleted,
  versionNotFound,
  versionMismatch,
  versionRollbackFailed,
  internalError,
} from "./lib/errors.js";

// =============================================================================
// Create Version Snapshot (Internal)
// =============================================================================

/**
 * Internal mutation to create a version snapshot of a content entry.
 *
 * This function captures the complete state of a content entry at a specific
 * point in time, storing it in the content_versions table. Snapshots are used
 * for:
 *
 * - **Version History**: Track changes over time for audit and review
 * - **Rollback Support**: Allow reverting to previous versions
 * - **Publishing Records**: Mark which versions were published
 * - **Content Comparison**: Enable diff/compare between versions
 *
 * The snapshot includes:
 * - versionNumber: Current version number from the entry
 * - data: Complete content data snapshot
 * - slug: Slug at the time of snapshot
 * - status: Entry status when snapshot was created
 * - changeDescription: Optional description of changes
 * - createdBy: User who triggered the snapshot
 * - wasPublished: Whether this is a published version
 * - publishedAt: Timestamp if this is a published version
 *
 * @param entryId - The ID of the content entry to snapshot
 * @param changeDescription - Optional description of what changed
 * @param createdBy - User ID for audit trail
 * @param wasPublished - Whether this snapshot represents a publish action
 *
 * @returns The created version snapshot document
 *
 * @throws Error if the entry does not exist
 * @throws Error if the entry has been soft-deleted
 *
 * @example
 * ```typescript
 * // Called internally before a destructive operation
 * await ctx.runMutation(internal.versionMutations.createVersionSnapshot, {
 *   entryId: entryId,
 *   changeDescription: "Pre-update snapshot",
 *   createdBy: userId,
 * });
 *
 * // Called during publish to mark as published version
 * await ctx.runMutation(internal.versionMutations.createVersionSnapshot, {
 *   entryId: entryId,
 *   changeDescription: "Published to production",
 *   createdBy: userId,
 *   wasPublished: true,
 * });
 * ```
 */
export const createVersionSnapshot = internalMutation({
  args: createVersionSnapshotArgs.fields,
  returns: contentVersionDoc,
  handler: async (ctx, args) => {
    const { entryId, changeDescription, createdBy, wasPublished = false } = args;

    // Retrieve the content entry to snapshot
    const entry = await ctx.db.get(entryId);

    if (!entry) {
      throw versionEntryNotFound(entryId as unknown as string);
    }

    // Do not allow snapshots of deleted entries
    if (entry.deletedAt !== undefined) {
      throw versionEntryDeleted(entryId as unknown as string);
    }

    const now = Date.now();

    // Create the version snapshot with complete entry state
    const versionId = await ctx.db.insert("content_versions", {
      entryId,
      versionNumber: entry.version,
      data: entry.data,
      slug: entry.slug,
      status: entry.status,
      changeDescription,
      createdBy,
      wasPublished,
      publishedAt: wasPublished ? now : undefined,
    });

    // Retrieve and return the created version
    const version = await ctx.db.get(versionId);

    if (!version) {
      throw internalError("Failed to create version snapshot");
    }

    return version;
  },
});

// =============================================================================
// Check for Duplicate Version (Internal Helper)
// =============================================================================

/**
 * Internal mutation to check if a version snapshot already exists.
 *
 * This can be used before creating a snapshot to avoid duplicates,
 * particularly useful when the same version might be snapshotted
 * multiple times (e.g., multiple publishes without content changes).
 *
 * @param entryId - The content entry ID
 * @param versionNumber - The version number to check for
 *
 * @returns true if a version with this number exists, false otherwise
 */
export const versionExists = internalMutation({
  args: {
    entryId: v.id("content_entries"),
    versionNumber: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { entryId, versionNumber } = args;

    const existing = await ctx.db
      .query("content_versions")
      .withIndex("by_entry_and_version", (q) =>
        q.eq("entryId", entryId).eq("versionNumber", versionNumber)
      )
      .first();

    return existing !== null;
  },
});

// =============================================================================
// Create Snapshot If Changed (Internal Helper)
// =============================================================================

/**
 * Internal mutation to create a version snapshot only if the version
 * doesn't already exist. This is a convenience function that combines
 * the existence check and creation.
 *
 * Useful for scenarios where you want to snapshot but only if the
 * current version hasn't been captured yet (e.g., auto-save scenarios).
 *
 * @param entryId - The content entry ID
 * @param changeDescription - Optional description of changes
 * @param createdBy - User ID for audit trail
 * @param wasPublished - Whether this is a published version
 *
 * @returns The version snapshot (new or existing), or null if entry not found
 */
export const createVersionSnapshotIfNotExists = internalMutation({
  args: createVersionSnapshotArgs.fields,
  returns: v.union(contentVersionDoc, v.null()),
  handler: async (ctx, args) => {
    const { entryId, changeDescription, createdBy, wasPublished = false } = args;

    // Retrieve the content entry
    const entry = await ctx.db.get(entryId);

    if (!entry) {
      return null;
    }

    // Do not process deleted entries
    if (entry.deletedAt !== undefined) {
      return null;
    }

    // Check if this version already has a snapshot
    const existing = await ctx.db
      .query("content_versions")
      .withIndex("by_entry_and_version", (q) =>
        q.eq("entryId", entryId).eq("versionNumber", entry.version)
      )
      .first();

    // Return existing if found
    if (existing) {
      return existing;
    }

    const now = Date.now();

    // Create new snapshot
    const versionId = await ctx.db.insert("content_versions", {
      entryId,
      versionNumber: entry.version,
      data: entry.data,
      slug: entry.slug,
      status: entry.status,
      changeDescription,
      createdBy,
      wasPublished,
      publishedAt: wasPublished ? now : undefined,
    });

    const version = await ctx.db.get(versionId);

    return version ?? null;
  },
});

// =============================================================================
// Rollback Version (Public)
// =============================================================================

/**
 * Mutation to restore a content entry to a previous version.
 *
 * This is the core rollback functionality that allows users to revert content
 * to any previously captured version state. Importantly, rollback is a
 * **non-destructive operation** - it creates a new version with the restored
 * content rather than actually "going back in time."
 *
 * ## How Rollback Works
 *
 * 1. **Validate**: Ensure the entry and target version exist and are accessible
 * 2. **Snapshot Current State**: Create a version snapshot of the current state
 *    before making any changes (preserves ability to "undo" the rollback)
 * 3. **Restore Content**: Update the entry's `data` and `slug` from the target version
 * 4. **Increment Version**: The entry's version number is incremented (normal update behavior)
 * 5. **Create Rollback Snapshot**: Create a new version snapshot documenting the rollback
 *
 * ## What Gets Restored
 *
 * - **data**: The complete content data object from the target version
 * - **slug**: The URL-friendly slug from the target version
 *
 * ## What Does NOT Get Restored
 *
 * - **status**: The current publish status is preserved (a rollback doesn't
 *   unpublish or publish content automatically)
 * - **scheduledPublishAt**: Scheduling is not affected
 * - **Publishing timestamps**: firstPublishedAt/lastPublishedAt are preserved
 *
 * ## Use Cases
 *
 * - **Accidental Changes**: Undo unwanted edits by restoring to a known good state
 * - **Content Review**: Compare and restore to previously approved versions
 * - **A/B Testing**: Switch between content variants by rolling back
 * - **Emergency Fixes**: Quickly revert problematic changes in production
 *
 * @param entryId - The ID of the content entry to roll back
 * @param versionNumber - The version number to restore to
 * @param updatedBy - Optional user ID for audit trail
 *
 * @returns The updated content entry with restored content
 *
 * @throws Error if the entry does not exist
 * @throws Error if the entry has been soft-deleted
 * @throws Error if the target version does not exist
 * @throws Error if the target version doesn't belong to this entry
 *
 * @example
 * ```typescript
 * // Restore entry to version 3
 * const restored = await ctx.runMutation(api.versionMutations.rollbackVersion, {
 *   entryId: myEntryId,
 *   versionNumber: 3,
 *   updatedBy: currentUserId,
 * });
 *
 * console.log(`Rolled back to version 3, now at version ${restored.version}`);
 * // Note: The entry is now at a new version number (e.g., 7), not version 3
 * // The content matches what was in version 3
 * ```
 */
export const rollbackVersion = mutation({
  args: rollbackVersionArgs.fields,
  returns: contentEntryDoc,
  handler: async (ctx, args) => {
    const { entryId, versionNumber, updatedBy } = args;

    // Step 1: Validate the entry exists and is not deleted
    const entry = await ctx.db.get(entryId);

    if (!entry) {
      throw versionEntryNotFound(entryId as unknown as string);
    }

    if (entry.deletedAt !== undefined) {
      throw versionEntryDeleted(entryId as unknown as string);
    }

    // Step 2: Retrieve the target version to restore
    const targetVersion = await ctx.db
      .query("content_versions")
      .withIndex("by_entry_and_version", (q) =>
        q.eq("entryId", entryId).eq("versionNumber", versionNumber)
      )
      .first();

    if (!targetVersion) {
      throw versionNotFound(entryId as unknown as string, versionNumber);
    }

    // Security: Verify the version belongs to this entry (defensive check)
    if (targetVersion.entryId !== entryId) {
      throw versionMismatch(entryId as unknown as string, targetVersion._id as unknown as string);
    }

    // Step 3: Snapshot the current state before rollback (for undo capability)
    // This allows users to "undo" a rollback by rolling back to this snapshot
    const preRollbackSnapshot = await ctx.db.insert("content_versions", {
      entryId,
      versionNumber: entry.version,
      data: entry.data,
      slug: entry.slug,
      status: entry.status,
      changeDescription: `Pre-rollback snapshot (before restoring to version ${versionNumber})`,
      createdBy: updatedBy,
      wasPublished: false,
    });

    // Step 4: Update the entry with restored content
    // Note: We restore data and slug, but preserve the current status
    const newVersionNumber = entry.version + 1;

    await ctx.db.patch(entryId, {
      data: targetVersion.data,
      slug: targetVersion.slug,
      version: newVersionNumber,
      updatedBy,
    });

    // Step 5: Create a snapshot documenting the rollback
    await ctx.db.insert("content_versions", {
      entryId,
      versionNumber: newVersionNumber,
      data: targetVersion.data,
      slug: targetVersion.slug,
      status: entry.status, // Preserve current status
      changeDescription: `Rolled back to version ${versionNumber}`,
      createdBy: updatedBy,
      wasPublished: false,
    });

    // Return the updated entry
    const updatedEntry = await ctx.db.get(entryId);

    if (!updatedEntry) {
      throw versionRollbackFailed(entryId as unknown as string);
    }

    return updatedEntry;
  },
});
