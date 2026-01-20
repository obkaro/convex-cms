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
  contentStatusValidator,
  createContentEntryArgs,
  updateContentEntryArgs,
  publishEntryArgs,
  deleteContentEntryArgs,
} from "./validators.js";
import { generateSlug } from "./lib/slugGenerator.js";
import { ensureUniqueSlug } from "./lib/slugUniqueness.js";

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
  args: createContentEntryArgs.fields,
  returns: contentEntryDoc,
  handler: async (ctx, args) => {
    const { contentTypeId, data, locale, primaryEntryId, createdBy } = args;

    // Validate content type exists and is active
    const contentType = await ctx.db.get(contentTypeId);
    if (!contentType) {
      throw new Error(`Content type not found: ${contentTypeId}`);
    }
    if (!contentType.isActive) {
      throw new Error(`Content type is not active: ${contentType.name}`);
    }
    if (contentType.deletedAt !== undefined) {
      throw new Error(`Content type has been deleted: ${contentType.name}`);
    }

    // Determine which field to use for slug generation
    const slugField = contentType.slugField ?? "title";
    const contentData = data as Record<string, unknown>;

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
        .query("content_entries")
        .withIndex("by_content_type_and_slug", (q) =>
          q.eq("contentTypeId", contentTypeId).eq("slug", candidateSlug)
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
    const now = Date.now();
    const entryId = await ctx.db.insert("content_entries", {
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
      throw new Error("Failed to create content entry");
    }

    return entry;
  },
});

// =============================================================================
// Update Entry Mutation
// =============================================================================

/**
 * Mutation to update an existing content entry.
 *
 * Updates are allowed regardless of status, but the behavior differs:
 * - Draft entries: All fields can be updated freely
 * - Published entries: Updates create a new "working draft" that doesn't
 *   affect the live version until republished
 * - Scheduled entries: Updates modify the scheduled content
 *
 * @param id - The content entry ID to update
 * @param slug - Optional new slug (uniqueness will be validated)
 * @param data - Optional new content data (merged with existing)
 * @param status - Optional new status
 * @param scheduledPublishAt - Optional scheduled publish time (for "scheduled" status)
 * @param updatedBy - Optional user ID for audit trail
 *
 * @returns The updated content entry
 *
 * @throws Error if the entry does not exist
 * @throws Error if the entry has been deleted
 * @throws Error if the new slug is not unique
 *
 * @example
 * ```typescript
 * // Update content data
 * await ctx.runMutation(api.contentEntryMutations.updateEntry, {
 *   id: entryId,
 *   data: { title: "Updated Title" },
 *   updatedBy: currentUserId,
 * });
 *
 * // Change slug
 * await ctx.runMutation(api.contentEntryMutations.updateEntry, {
 *   id: entryId,
 *   slug: "new-url-slug",
 * });
 * ```
 */
export const updateEntry = mutation({
  args: updateContentEntryArgs.fields,
  returns: contentEntryDoc,
  handler: async (ctx, args) => {
    const { id, slug, data, status, scheduledPublishAt, updatedBy } = args;

    // Retrieve the existing entry
    const entry = await ctx.db.get(id);
    if (!entry) {
      throw new Error(`Content entry not found: ${id}`);
    }
    if (entry.deletedAt !== undefined) {
      throw new Error(`Content entry has been deleted: ${id}`);
    }

    // Build the update object
    const updates: Record<string, unknown> = {
      updatedBy,
    };

    // Handle slug update with uniqueness check
    if (slug !== undefined && slug !== entry.slug) {
      const queryFn = async (candidateSlug: string) => {
        const existing = await ctx.db
          .query("content_entries")
          .withIndex("by_content_type_and_slug", (q) =>
            q.eq("contentTypeId", entry.contentTypeId).eq("slug", candidateSlug)
          )
          .filter((q) => q.eq(q.field("deletedAt"), undefined))
          .first();
        // Exclude current entry from uniqueness check
        if (existing && existing._id !== id) {
          return existing;
        }
        return null;
      };

      const uniqueSlug = await ensureUniqueSlug(slug, queryFn, {
        excludeEntryId: id as unknown as string,
      });
      updates.slug = uniqueSlug;
    }

    // Handle data update (merge with existing data)
    if (data !== undefined) {
      const mergedData = { ...(entry.data as Record<string, unknown>), ...data };
      updates.data = mergedData;

      // Update search text if data changed
      const contentType = await ctx.db.get(entry.contentTypeId);
      if (contentType) {
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
    }

    // Handle status update
    if (status !== undefined) {
      updates.status = status;
    }

    // Handle scheduled publish time
    if (scheduledPublishAt !== undefined) {
      updates.scheduledPublishAt = scheduledPublishAt;
    }

    // Increment version number
    updates.version = entry.version + 1;

    // Apply updates
    await ctx.db.patch(id, updates);

    // Return the updated entry
    const updatedEntry = await ctx.db.get(id);
    if (!updatedEntry) {
      throw new Error("Failed to retrieve updated entry");
    }

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
  args: publishEntryArgs.fields,
  returns: contentEntryDoc,
  handler: async (ctx, args) => {
    const { id, changeDescription, updatedBy } = args;

    // Retrieve the existing entry
    const entry = await ctx.db.get(id);
    if (!entry) {
      throw new Error(`Content entry not found: ${id}`);
    }
    if (entry.deletedAt !== undefined) {
      throw new Error(`Content entry has been deleted: ${id}`);
    }
    if (entry.status === "published") {
      throw new Error(`Content entry is already published: ${id}`);
    }
    if (entry.status === "archived") {
      throw new Error(`Cannot publish archived content. Restore it first: ${id}`);
    }

    const now = Date.now();

    // Create a version snapshot before publishing
    await ctx.db.insert("content_versions", {
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

    // Return the published entry
    const publishedEntry = await ctx.db.get(id);
    if (!publishedEntry) {
      throw new Error("Failed to retrieve published entry");
    }

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
    id: v.id("content_entries"),
    /** User ID performing the unpublish (for audit trail) */
    updatedBy: v.optional(v.string()),
  },
  returns: contentEntryDoc,
  handler: async (ctx, args) => {
    const { id, updatedBy } = args;

    // Retrieve the existing entry
    const entry = await ctx.db.get(id);
    if (!entry) {
      throw new Error(`Content entry not found: ${id}`);
    }
    if (entry.deletedAt !== undefined) {
      throw new Error(`Content entry has been deleted: ${id}`);
    }
    if (entry.status !== "published") {
      throw new Error(`Content entry is not published. Current status: ${entry.status}`);
    }

    // Update status to draft
    await ctx.db.patch(id, {
      status: "draft",
      version: entry.version + 1,
      updatedBy,
    });

    // Return the unpublished entry
    const unpublishedEntry = await ctx.db.get(id);
    if (!unpublishedEntry) {
      throw new Error("Failed to retrieve unpublished entry");
    }

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
const deleteResultDoc = v.object({
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
  args: deleteContentEntryArgs.fields,
  returns: deleteResultDoc,
  handler: async (ctx, args) => {
    const { id, deletedBy, hardDelete = false } = args;

    // Retrieve the content entry by ID
    const entry = await ctx.db.get(id);

    // Validate entry exists
    if (!entry) {
      throw new Error(`Content entry not found: ${id}`);
    }

    // For soft delete, check if already deleted
    if (!hardDelete && entry.deletedAt !== undefined) {
      throw new Error(`Content entry has already been deleted: ${id}`);
    }

    // Get all associated versions for this entry
    const versions = await ctx.db
      .query("content_versions")
      .withIndex("by_entry", (q) => q.eq("entryId", id))
      .collect();

    const deletedVersionsCount = versions.length;

    if (hardDelete) {
      // Hard delete: permanently remove all versions
      for (const version of versions) {
        await ctx.db.delete(version._id);
      }

      // Permanently delete the entry itself
      await ctx.db.delete(id);

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

      // Return the updated entry
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
    id: v.id("content_entries"),
    /** User ID performing the restoration (for audit trail) */
    restoredBy: v.optional(v.string()),
  },
  returns: contentEntryDoc,
  handler: async (ctx, args) => {
    const { id, restoredBy } = args;

    // Retrieve the content entry by ID
    const entry = await ctx.db.get(id);

    // Validate entry exists
    if (!entry) {
      throw new Error(`Content entry not found: ${id}`);
    }

    // Validate entry is soft-deleted
    if (entry.deletedAt === undefined) {
      throw new Error(`Content entry is not deleted: ${id}`);
    }

    // Remove the deletedAt marker to restore the entry
    await ctx.db.patch(id, {
      deletedAt: undefined,
      updatedBy: restoredBy,
    });

    // Return the restored entry
    return {
      ...entry,
      deletedAt: undefined,
      updatedBy: restoredBy ?? entry.updatedBy,
    };
  },
});
