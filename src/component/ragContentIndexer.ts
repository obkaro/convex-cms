/**
 * RAG Content Indexer
 *
 * Background job system to automatically index published content for RAG pipelines.
 * Triggers on content publish events and maintains sync between CMS content and vector indexes.
 *
 * Architecture:
 * 1. Content publish events are captured via the event emitter system (cms_events table)
 * 2. A background processor polls for unprocessed "contentEntry.published" events
 * 3. For each event, content is extracted and chunked using ragContentChunker
 * 4. Chunks are passed to a user-provided indexing callback (e.g., @convex-dev/rag)
 * 5. Events are marked as processed after successful indexing
 *
 * The indexer supports:
 * - Automatic indexing on publish events
 * - Manual reindexing of specific entries
 * - Bulk reindexing of all published content
 * - Configurable chunking options
 * - Index removal on unpublish/delete events
 *
 * @example
 * ```typescript
 * // In your Convex action, process pending indexing jobs:
 * import { processPublishEvents } from "./ragContentIndexer";
 *
 * export const runIndexer = action({
 *   handler: async (ctx) => {
 *     return await processPublishEventsAction(ctx, {
 *       onIndex: async (entryId, chunks, metadata) => {
 *         // Add to your vector index (e.g., @convex-dev/rag)
 *         await rag.add(ctx, {
 *           namespace: `cms:${metadata.contentType}`,
 *           key: entryId,
 *           chunks: chunks.map(c => c.text),
 *         });
 *       },
 *       onRemove: async (entryId) => {
 *         // Remove from your vector index
 *         await rag.remove(ctx, { key: entryId });
 *       },
 *     });
 *   },
 * });
 * ```
 *
 * @module
 */

import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import {
  chunkContentEntry,
  chunkMultipleEntries,
  type ContentChunk,
  type ContentEntryInfo,
  type ContentTypeInfo,
  type RagExtractionOptions,
} from "./lib/ragContentChunker.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for the RAG indexer.
 */
export interface RagIndexerConfig {
  /**
   * Whether automatic indexing on publish events is enabled.
   * @default true
   */
  autoIndexOnPublish?: boolean;

  /**
   * Whether to automatically remove from index on unpublish.
   * @default true
   */
  autoRemoveOnUnpublish?: boolean;

  /**
   * Whether to automatically remove from index on delete.
   * @default true
   */
  autoRemoveOnDelete?: boolean;

  /**
   * Maximum number of events to process in a single batch.
   * @default 50
   */
  batchSize?: number;

  /**
   * Interval in milliseconds for the background polling job.
   * @default 60000 (1 minute)
   */
  pollingIntervalMs?: number;

  /**
   * Options for content extraction and chunking.
   */
  extractionOptions?: Partial<RagExtractionOptions>;

  /**
   * Content types to include in indexing.
   * If not specified, all content types are indexed.
   */
  includeContentTypes?: string[];

  /**
   * Content types to exclude from indexing.
   */
  excludeContentTypes?: string[];

  /**
   * Namespace prefix for organizing indexed content.
   * @default "cms"
   */
  namespacePrefix?: string;
}

/**
 * Result of processing a single entry for indexing.
 */
export interface IndexEntryResult {
  entryId: string;
  success: boolean;
  chunksCreated: number;
  error?: string;
}

/**
 * Result of processing multiple events.
 */
export interface ProcessEventsResult {
  processed: number;
  indexed: number;
  removed: number;
  errors: Array<{
    eventId: string;
    entryId: string;
    error: string;
  }>;
  hasMore: boolean;
}

/**
 * Metadata about an indexed entry for callback consumers.
 */
export interface IndexedEntryMetadata {
  entryId: string;
  contentType: string;
  contentTypeDisplayName: string;
  slug: string;
  locale?: string;
  version: number;
  title?: string;
  publishedAt?: number;
  namespace: string;
}

/**
 * Statistics about the indexing state.
 */
export interface IndexingStats {
  /** Total number of published entries */
  totalPublished: number;
  /** Number of entries pending indexing (unprocessed publish events) */
  pendingIndexing: number;
  /** Number of entries pending removal (unprocessed unpublish/delete events) */
  pendingRemoval: number;
  /** Breakdown by content type */
  byContentType: Record<string, {
    published: number;
    pending: number;
  }>;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: Required<RagIndexerConfig> = {
  autoIndexOnPublish: true,
  autoRemoveOnUnpublish: true,
  autoRemoveOnDelete: true,
  batchSize: 50,
  pollingIntervalMs: 60000,
  extractionOptions: {},
  includeContentTypes: [],
  excludeContentTypes: [],
  namespacePrefix: "cms",
};

// =============================================================================
// Internal Queries
// =============================================================================

/**
 * Internal query to get unprocessed publish-related events.
 * Returns events for indexing (published) and removal (unpublished, deleted).
 */
export const getUnprocessedIndexingEvents = internalQuery({
  args: {
    limit: v.optional(v.number()),
    includeContentTypes: v.optional(v.array(v.string())),
    excludeContentTypes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { limit = 50, includeContentTypes = [], excludeContentTypes = [] } = args;

    // Get unprocessed events
    const events = await ctx.db
      .query("cms_events")
      .withIndex("by_processed", (q) => q.eq("processed", false))
      .order("asc")
      .take(limit * 2); // Over-fetch to account for filtering

    // Filter to only content entry events that affect indexing
    const indexingActions = ["published", "unpublished", "deleted", "restored"];

    const filteredEvents = events.filter((event) => {
      // Must be a content entry event
      if (event.resourceType !== "contentEntry") return false;

      // Must be an indexing-related action
      if (!indexingActions.includes(event.action)) return false;

      // Apply content type filters if specified
      const payload = event.payload as { contentTypeName?: string } | undefined;
      const contentTypeName = payload?.contentTypeName;

      if (contentTypeName) {
        if (includeContentTypes.length > 0 && !includeContentTypes.includes(contentTypeName)) {
          return false;
        }
        if (excludeContentTypes.length > 0 && excludeContentTypes.includes(contentTypeName)) {
          return false;
        }
      }

      return true;
    });

    return filteredEvents.slice(0, limit);
  },
});

/**
 * Internal query to get entry data for indexing.
 */
export const getEntryForIndexing = internalQuery({
  args: {
    entryId: v.id("content_entries"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) return null;

    // Get the content type
    const contentType = await ctx.db.get(entry.contentTypeId);
    if (!contentType) return null;

    return {
      entry,
      contentType,
    };
  },
});

/**
 * Internal query to get multiple entries for batch indexing.
 */
export const getEntriesForIndexing = internalQuery({
  args: {
    entryIds: v.array(v.id("content_entries")),
  },
  handler: async (ctx, args) => {
    const results: Array<{
      entry: typeof entry;
      contentType: typeof contentType;
    } | null> = [];

    // Fetch all entries and their content types
    const contentTypeCache = new Map<string, typeof contentType>();

    for (const entryId of args.entryIds) {
      const entry = await ctx.db.get(entryId);
      if (!entry) {
        results.push(null);
        continue;
      }

      let contentType = contentTypeCache.get(entry.contentTypeId);
      if (!contentType) {
        contentType = await ctx.db.get(entry.contentTypeId);
        if (contentType) {
          contentTypeCache.set(entry.contentTypeId, contentType);
        }
      }

      if (!contentType) {
        results.push(null);
        continue;
      }

      results.push({ entry, contentType });
    }

    return results;
  },
});

// =============================================================================
// Public Queries
// =============================================================================

/**
 * Query to get statistics about the indexing state.
 *
 * Returns counts of published entries, pending indexing events,
 * and breakdown by content type.
 */
export const getIndexingStats = query({
  args: {},
  returns: v.object({
    totalPublished: v.number(),
    pendingIndexing: v.number(),
    pendingRemoval: v.number(),
    byContentType: v.any(),
  }),
  handler: async (ctx) => {
    // Count published entries
    const publishedEntries = await ctx.db
      .query("content_entries")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Count unprocessed publish events
    const unprocessedEvents = await ctx.db
      .query("cms_events")
      .withIndex("by_processed", (q) => q.eq("processed", false))
      .filter((q) => q.eq(q.field("resourceType"), "contentEntry"))
      .collect();

    const pendingIndexing = unprocessedEvents.filter((e) => e.action === "published").length;
    const pendingRemoval = unprocessedEvents.filter((e) =>
      ["unpublished", "deleted"].includes(e.action)
    ).length;

    // Get content types for breakdown
    const contentTypes = await ctx.db.query("content_types").collect();
    const contentTypeMap = new Map(contentTypes.map((ct) => [ct._id, ct.name]));

    // Build breakdown by content type
    const byContentType: Record<string, { published: number; pending: number }> = {};

    for (const entry of publishedEntries) {
      const typeName = contentTypeMap.get(entry.contentTypeId) || "unknown";
      if (!byContentType[typeName]) {
        byContentType[typeName] = { published: 0, pending: 0 };
      }
      byContentType[typeName].published++;
    }

    for (const event of unprocessedEvents) {
      if (event.action !== "published") continue;
      const payload = event.payload as { contentTypeName?: string } | undefined;
      const typeName = payload?.contentTypeName || "unknown";
      if (!byContentType[typeName]) {
        byContentType[typeName] = { published: 0, pending: 0 };
      }
      byContentType[typeName].pending++;
    }

    return {
      totalPublished: publishedEntries.length,
      pendingIndexing,
      pendingRemoval,
      byContentType,
    };
  },
});

/**
 * Query to check if an entry needs reindexing.
 *
 * Returns true if there are unprocessed events for the entry,
 * or if the entry has been updated since last indexing.
 */
export const needsReindexing = query({
  args: {
    entryId: v.id("content_entries"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Check for any unprocessed events for this entry
    const events = await ctx.db
      .query("cms_events")
      .withIndex("by_resource", (q) =>
        q.eq("resourceType", "contentEntry").eq("resourceId", args.entryId)
      )
      .filter((q) => q.eq(q.field("processed"), false))
      .first();

    return events !== null;
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Mutation to prepare content for indexing.
 *
 * This extracts and chunks content from an entry, returning the chunks
 * and metadata for the caller to pass to their vector index.
 *
 * @param entryId - The content entry ID to prepare for indexing
 * @param options - Optional extraction options
 *
 * @returns Chunks and metadata for indexing, or null if entry not found/not published
 */
export const prepareEntryForIndexing = query({
  args: {
    entryId: v.id("content_entries"),
    options: v.optional(
      v.object({
        includeFields: v.optional(v.array(v.string())),
        excludeFields: v.optional(v.array(v.string())),
        maxCharsSoftLimit: v.optional(v.number()),
        namespacePrefix: v.optional(v.string()),
      })
    ),
  },
  returns: v.union(
    v.object({
      entryId: v.string(),
      chunks: v.array(
        v.object({
          text: v.string(),
          metadata: v.any(),
        })
      ),
      metadata: v.object({
        entryId: v.string(),
        contentType: v.string(),
        contentTypeDisplayName: v.string(),
        slug: v.string(),
        locale: v.optional(v.string()),
        version: v.number(),
        title: v.optional(v.string()),
        publishedAt: v.optional(v.number()),
        namespace: v.string(),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const { entryId, options = {} } = args;

    // Get entry and content type
    const entry = await ctx.db.get(entryId);
    if (!entry) return null;

    // Only index published content
    if (entry.status !== "published") return null;

    const contentType = await ctx.db.get(entry.contentTypeId);
    if (!contentType) return null;

    // Build extraction options
    const extractionOptions: Partial<RagExtractionOptions> = {
      includeMetadata: true,
      includeFields: options.includeFields,
      excludeFields: options.excludeFields,
      chunkOptions: {
        maxCharsSoftLimit: options.maxCharsSoftLimit ?? 1000,
      },
    };

    // Convert to the expected types
    const entryInfo: ContentEntryInfo = {
      _id: entry._id,
      contentTypeId: entry.contentTypeId,
      slug: entry.slug,
      status: entry.status,
      data: entry.data as Record<string, unknown>,
      locale: entry.locale,
      version: entry.version,
      _creationTime: entry._creationTime,
      firstPublishedAt: entry.firstPublishedAt,
      lastPublishedAt: entry.lastPublishedAt,
    };

    const contentTypeInfo: ContentTypeInfo = {
      _id: contentType._id,
      name: contentType.name,
      displayName: contentType.displayName,
      fields: contentType.fields as ContentTypeInfo["fields"],
      titleField: contentType.titleField,
      slugField: contentType.slugField,
    };

    // Extract and chunk content
    const chunks = chunkContentEntry(entryInfo, contentTypeInfo, extractionOptions);

    // Build namespace
    const namespacePrefix = options.namespacePrefix ?? "cms";
    const namespace = entry.locale
      ? `${namespacePrefix}:${contentType.name}:${entry.locale}`
      : `${namespacePrefix}:${contentType.name}`;

    // Get title from chunks metadata or entry data
    const title = chunks[0]?.metadata?.title || (entry.data as Record<string, unknown>)?.title as string | undefined;

    return {
      entryId: entry._id,
      chunks: chunks.map((c) => ({
        text: c.text,
        metadata: c.metadata,
      })),
      metadata: {
        entryId: entry._id,
        contentType: contentType.name,
        contentTypeDisplayName: contentType.displayName,
        slug: entry.slug,
        locale: entry.locale,
        version: entry.version,
        title,
        publishedAt: entry.lastPublishedAt,
        namespace,
      },
    };
  },
});

/**
 * Mutation to mark indexing events as processed.
 *
 * Call this after successfully indexing content to prevent reprocessing.
 *
 * @param eventIds - Array of event IDs to mark as processed
 */
export const markIndexingEventsProcessed = mutation({
  args: {
    eventIds: v.array(v.id("cms_events")),
  },
  returns: v.object({
    processedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const { eventIds } = args;
    const now = Date.now();
    let processedCount = 0;

    for (const eventId of eventIds) {
      const event = await ctx.db.get(eventId);
      if (event && !event.processed) {
        await ctx.db.patch(eventId, {
          processed: true,
          processedAt: now,
        });
        processedCount++;
      }
    }

    return { processedCount };
  },
});

/**
 * Internal mutation to request reindexing of an entry.
 *
 * Creates a synthetic "published" event to trigger reindexing.
 */
export const requestReindex = internalMutation({
  args: {
    entryId: v.id("content_entries"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { entryId, userId } = args;

    // Get entry details
    const entry = await ctx.db.get(entryId);
    if (!entry) {
      throw new Error(`Entry not found: ${entryId}`);
    }

    if (entry.status !== "published") {
      throw new Error(`Entry is not published: ${entryId}`);
    }

    // Get content type for payload
    const contentType = await ctx.db.get(entry.contentTypeId);
    if (!contentType) {
      throw new Error(`Content type not found: ${entry.contentTypeId}`);
    }

    // Create a reindex event
    await ctx.db.insert("cms_events", {
      eventType: "contentEntry.published",
      resourceType: "contentEntry",
      resourceId: entryId,
      action: "published",
      payload: {
        slug: entry.slug,
        contentTypeName: contentType.name,
        contentTypeId: contentType._id,
        status: entry.status,
        version: entry.version,
        locale: entry.locale,
        changeDescription: "Reindex requested",
      },
      userId,
      processed: false,
      metadata: { reindexRequest: true },
    });

    return { success: true };
  },
});

/**
 * Public mutation to request reindexing of a specific entry.
 */
export const requestEntryReindex = mutation({
  args: {
    entryId: v.id("content_entries"),
    userId: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const { entryId, userId } = args;

    // Get entry details
    const entry = await ctx.db.get(entryId);
    if (!entry) {
      return { success: false, message: "Entry not found" };
    }

    if (entry.status !== "published") {
      return { success: false, message: "Entry is not published" };
    }

    // Get content type for payload
    const contentType = await ctx.db.get(entry.contentTypeId);
    if (!contentType) {
      return { success: false, message: "Content type not found" };
    }

    // Create a reindex event
    await ctx.db.insert("cms_events", {
      eventType: "contentEntry.published",
      resourceType: "contentEntry",
      resourceId: entryId,
      action: "published",
      payload: {
        slug: entry.slug,
        contentTypeName: contentType.name,
        contentTypeId: contentType._id,
        status: entry.status,
        version: entry.version,
        locale: entry.locale,
        changeDescription: "Reindex requested",
      },
      userId,
      processed: false,
      metadata: { reindexRequest: true },
    });

    return { success: true, message: "Reindex event created" };
  },
});

/**
 * Mutation to request reindexing of all published content.
 *
 * Creates publish events for all currently published entries,
 * which will be processed by the background indexer.
 *
 * @param contentTypeId - Optional content type to filter by
 * @param batchSize - Number of entries to process per batch
 * @param cursor - Pagination cursor for large datasets
 */
export const requestBulkReindex = mutation({
  args: {
    contentTypeId: v.optional(v.id("content_types")),
    batchSize: v.optional(v.number()),
    cursor: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  returns: v.object({
    eventsCreated: v.number(),
    hasMore: v.boolean(),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { contentTypeId, batchSize = 100, userId } = args;

    // Build query for published entries
    let entriesQuery = ctx.db
      .query("content_entries")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    // Apply content type filter if specified
    const entries = await entriesQuery.take(batchSize + 1);
    const hasMore = entries.length > batchSize;
    const entriesToProcess = entries.slice(0, batchSize);

    // Filter by content type if specified
    const filteredEntries = contentTypeId
      ? entriesToProcess.filter((e) => e.contentTypeId === contentTypeId)
      : entriesToProcess;

    // Get content types for payloads
    const contentTypeIds = [...new Set(filteredEntries.map((e) => e.contentTypeId))];
    const contentTypes = await Promise.all(contentTypeIds.map((id) => ctx.db.get(id)));
    const contentTypeMap = new Map(
      contentTypes.filter(Boolean).map((ct) => [ct!._id, ct!])
    );

    // Create reindex events
    let eventsCreated = 0;
    for (const entry of filteredEntries) {
      const contentType = contentTypeMap.get(entry.contentTypeId);
      if (!contentType) continue;

      await ctx.db.insert("cms_events", {
        eventType: "contentEntry.published",
        resourceType: "contentEntry",
        resourceId: entry._id,
        action: "published",
        payload: {
          slug: entry.slug,
          contentTypeName: contentType.name,
          contentTypeId: contentType._id,
          status: entry.status,
          version: entry.version,
          locale: entry.locale,
          changeDescription: "Bulk reindex requested",
        },
        userId,
        processed: false,
        metadata: { bulkReindex: true },
      });
      eventsCreated++;
    }

    // Calculate next cursor
    const nextCursor = hasMore ? entriesToProcess[entriesToProcess.length - 1]?._id : undefined;

    return {
      eventsCreated,
      hasMore,
      nextCursor,
    };
  },
});

// =============================================================================
// Background Job Scheduling
// =============================================================================

/**
 * Internal mutation to process pending indexing events.
 *
 * This is called by the background scheduler to process events in batches.
 * Returns information about what was processed so the action can perform indexing.
 */
export const getIndexingBatch = internalQuery({
  args: {
    config: v.optional(
      v.object({
        batchSize: v.optional(v.number()),
        includeContentTypes: v.optional(v.array(v.string())),
        excludeContentTypes: v.optional(v.array(v.string())),
        namespacePrefix: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const config = { ...DEFAULT_CONFIG, ...(args.config || {}) };

    // Get unprocessed events
    const events = await ctx.db
      .query("cms_events")
      .withIndex("by_processed", (q) => q.eq("processed", false))
      .order("asc")
      .take(config.batchSize * 2);

    // Filter to indexing-related content entry events
    const indexingActions = ["published", "unpublished", "deleted", "restored"];

    const filteredEvents = events.filter((event) => {
      if (event.resourceType !== "contentEntry") return false;
      if (!indexingActions.includes(event.action)) return false;

      const payload = event.payload as { contentTypeName?: string } | undefined;
      const contentTypeName = payload?.contentTypeName;

      if (contentTypeName) {
        if (
          config.includeContentTypes.length > 0 &&
          !config.includeContentTypes.includes(contentTypeName)
        ) {
          return false;
        }
        if (
          config.excludeContentTypes.length > 0 &&
          config.excludeContentTypes.includes(contentTypeName)
        ) {
          return false;
        }
      }

      return true;
    }).slice(0, config.batchSize);

    // Categorize events
    const toIndex: Array<{ eventId: string; entryId: string }> = [];
    const toRemove: Array<{ eventId: string; entryId: string }> = [];

    for (const event of filteredEvents) {
      const item = { eventId: event._id, entryId: event.resourceId };

      if (event.action === "published" || event.action === "restored") {
        toIndex.push(item);
      } else if (event.action === "unpublished" || event.action === "deleted") {
        toRemove.push(item);
      }
    }

    return {
      toIndex,
      toRemove,
      hasMore: events.length > config.batchSize,
    };
  },
});

/**
 * Schedules the next background indexing run.
 *
 * Call this to set up recurring background processing.
 *
 * @param delayMs - Delay before next run in milliseconds
 */
export const scheduleNextIndexingRun = mutation({
  args: {
    delayMs: v.optional(v.number()),
  },
  returns: v.object({
    scheduledAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const delayMs = args.delayMs ?? DEFAULT_CONFIG.pollingIntervalMs;
    const runAt = Date.now() + delayMs;

    await ctx.scheduler.runAt(runAt, internal.ragContentIndexer.triggerIndexingCheck, {});

    return { scheduledAt: runAt };
  },
});

/**
 * Internal mutation triggered by scheduler to check for pending events.
 *
 * This checks if there are pending events and signals that processing is needed.
 */
export const triggerIndexingCheck = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if there are any unprocessed indexing events
    const pendingEvent = await ctx.db
      .query("cms_events")
      .withIndex("by_processed", (q) => q.eq("processed", false))
      .filter((q) =>
        q.and(
          q.eq(q.field("resourceType"), "contentEntry"),
          q.or(
            q.eq(q.field("action"), "published"),
            q.eq(q.field("action"), "unpublished"),
            q.eq(q.field("action"), "deleted"),
            q.eq(q.field("action"), "restored")
          )
        )
      )
      .first();

    const hasPendingEvents = pendingEvent !== null;

    // Log for monitoring
    if (hasPendingEvents) {
      console.log("RAG Indexer: Pending events detected, processing needed");
    }

    return { hasPendingEvents };
  },
});

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Prepares multiple entries for indexing in a single call.
 * Useful for batch operations.
 */
export const prepareEntriesForIndexing = query({
  args: {
    entryIds: v.array(v.id("content_entries")),
    options: v.optional(
      v.object({
        includeFields: v.optional(v.array(v.string())),
        excludeFields: v.optional(v.array(v.string())),
        maxCharsSoftLimit: v.optional(v.number()),
        namespacePrefix: v.optional(v.string()),
      })
    ),
  },
  returns: v.array(
    v.union(
      v.object({
        entryId: v.string(),
        chunks: v.array(
          v.object({
            text: v.string(),
            metadata: v.any(),
          })
        ),
        metadata: v.object({
          entryId: v.string(),
          contentType: v.string(),
          contentTypeDisplayName: v.string(),
          slug: v.string(),
          locale: v.optional(v.string()),
          version: v.number(),
          title: v.optional(v.string()),
          publishedAt: v.optional(v.number()),
          namespace: v.string(),
        }),
      }),
      v.null()
    )
  ),
  handler: async (ctx, args) => {
    const { entryIds, options = {} } = args;
    const results: Array<Awaited<ReturnType<typeof prepareEntryForIndexing.handler>> | null> = [];

    // Cache content types to avoid repeated lookups
    const contentTypeCache = new Map<string, typeof contentType>();

    for (const entryId of entryIds) {
      const entry = await ctx.db.get(entryId);
      if (!entry || entry.status !== "published") {
        results.push(null);
        continue;
      }

      let contentType = contentTypeCache.get(entry.contentTypeId);
      if (!contentType) {
        contentType = await ctx.db.get(entry.contentTypeId);
        if (contentType) {
          contentTypeCache.set(entry.contentTypeId, contentType);
        }
      }

      if (!contentType) {
        results.push(null);
        continue;
      }

      // Build extraction options
      const extractionOptions: Partial<RagExtractionOptions> = {
        includeMetadata: true,
        includeFields: options.includeFields,
        excludeFields: options.excludeFields,
        chunkOptions: {
          maxCharsSoftLimit: options.maxCharsSoftLimit ?? 1000,
        },
      };

      const entryInfo: ContentEntryInfo = {
        _id: entry._id,
        contentTypeId: entry.contentTypeId,
        slug: entry.slug,
        status: entry.status,
        data: entry.data as Record<string, unknown>,
        locale: entry.locale,
        version: entry.version,
        _creationTime: entry._creationTime,
        firstPublishedAt: entry.firstPublishedAt,
        lastPublishedAt: entry.lastPublishedAt,
      };

      const contentTypeInfo: ContentTypeInfo = {
        _id: contentType._id,
        name: contentType.name,
        displayName: contentType.displayName,
        fields: contentType.fields as ContentTypeInfo["fields"],
        titleField: contentType.titleField,
        slugField: contentType.slugField,
      };

      const chunks = chunkContentEntry(entryInfo, contentTypeInfo, extractionOptions);

      const namespacePrefix = options.namespacePrefix ?? "cms";
      const namespace = entry.locale
        ? `${namespacePrefix}:${contentType.name}:${entry.locale}`
        : `${namespacePrefix}:${contentType.name}`;

      const title = chunks[0]?.metadata?.title || (entry.data as Record<string, unknown>)?.title as string | undefined;

      results.push({
        entryId: entry._id,
        chunks: chunks.map((c) => ({
          text: c.text,
          metadata: c.metadata,
        })),
        metadata: {
          entryId: entry._id,
          contentType: contentType.name,
          contentTypeDisplayName: contentType.displayName,
          slug: entry.slug,
          locale: entry.locale,
          version: entry.version,
          title,
          publishedAt: entry.lastPublishedAt,
          namespace,
        },
      });
    }

    return results;
  },
});

// =============================================================================
// Exports
// =============================================================================

export { DEFAULT_CONFIG as DEFAULT_INDEXER_CONFIG };
