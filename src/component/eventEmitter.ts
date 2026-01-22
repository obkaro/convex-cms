/**
 * Event Emitter Module
 *
 * Internal system to emit events on content changes (created, updated, published, deleted).
 * Events are stored in the cmsEvents table for async processing by external systems,
 * webhooks, audit logging, and other integrations.
 *
 * Design Philosophy:
 * - Events are emitted synchronously within the same transaction as mutations
 * - This ensures atomicity: if the mutation fails, no event is created
 * - Events are stored for later processing (not real-time pub/sub)
 * - Consumers can poll events or use Convex reactivity to process them
 *
 * Usage:
 * ```typescript
 * // In a mutation handler:
 * await emitEvent(ctx, {
 *   eventType: "contentEntry.created",
 *   resourceType: "contentEntry",
 *   resourceId: entry._id.toString(),
 *   action: "created",
 *   payload: { slug: entry.slug, contentTypeName: "blog_post" },
 *   userId: createdBy,
 * });
 * ```
 */

import { v } from "convex/values";
import { mutation, query, internalMutation, MutationCtx } from "./_generated/server.js";

// =============================================================================
// Event Types
// =============================================================================

/**
 * Resource types that can emit events.
 */
export type EventResourceType =
  | "contentEntry"
  | "contentType"
  | "mediaAsset"
  | "mediaFolder";

/**
 * Actions that can be performed on resources.
 */
export type EventAction =
  | "created"
  | "updated"
  | "published"
  | "unpublished"
  | "deleted"
  | "restored"
  | "duplicated"
  | "scheduled";

/**
 * Full event type combining resource and action.
 */
export type EventType = `${EventResourceType}.${EventAction}`;

/**
 * Payload structure for content entry events.
 */
export interface ContentEntryEventPayload {
  slug: string;
  contentTypeName: string;
  contentTypeId: string;
  status: string;
  version: number;
  locale?: string;
  /** For duplicate events, the source entry ID */
  sourceEntryId?: string;
  /** For scheduled events, the scheduled publish time */
  scheduledPublishAt?: number;
  /** Change description if provided */
  changeDescription?: string;
}

/**
 * Payload structure for content type events.
 */
export interface ContentTypeEventPayload {
  name: string;
  displayName: string;
  fieldCount: number;
  isActive: boolean;
  /** For update events, list of changed field names */
  changedFields?: string[];
}

/**
 * Payload structure for media asset events.
 */
export interface MediaAssetEventPayload {
  filename: string;
  mimeType: string;
  type: string;
  size: number;
  folderId?: string;
  folderPath?: string;
}

/**
 * Payload structure for media folder events.
 */
export interface MediaFolderEventPayload {
  name: string;
  path: string;
  parentId?: string;
}

/**
 * Union type for all event payloads.
 */
export type EventPayload =
  | ContentEntryEventPayload
  | ContentTypeEventPayload
  | MediaAssetEventPayload
  | MediaFolderEventPayload;

/**
 * Parameters for emitting an event.
 */
export interface EmitEventParams {
  eventType: EventType;
  resourceType: EventResourceType;
  resourceId: string;
  action: EventAction;
  payload: EventPayload;
  userId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * CMS Event document structure (as stored in the database).
 */
export interface CMSEvent {
  _id: string;
  _creationTime: number;
  eventType: string;
  resourceType: EventResourceType;
  resourceId: string;
  action: EventAction;
  payload: EventPayload;
  userId?: string;
  processed: boolean;
  processedAt?: number;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Internal Event Emission Helper
// =============================================================================

/**
 * Internal helper function to emit events within mutation handlers.
 *
 * This function inserts an event record into the cmsEvents table.
 * It's designed to be called from within other mutations to ensure
 * the event is part of the same atomic transaction.
 *
 * @param ctx - The mutation context from Convex
 * @param params - Event parameters
 * @returns The created event ID as a string
 */
export async function emitEvent(
  ctx: MutationCtx,
  params: EmitEventParams
): Promise<string> {
  const {
    eventType,
    resourceType,
    resourceId,
    action,
    payload,
    userId,
    correlationId,
    metadata,
  } = params;

  const eventId = await ctx.db.insert("cmsEvents", {
    eventType,
    resourceType,
    resourceId,
    action,
    payload,
    userId,
    processed: false,
    correlationId,
    metadata,
  });

  return eventId;
}

// =============================================================================
// Event Query Functions
// =============================================================================

/**
 * Query to list recent events with optional filtering.
 *
 * @param resourceType - Filter by resource type
 * @param action - Filter by action
 * @param processed - Filter by processed status
 * @param limit - Maximum number of events to return
 *
 * @returns Array of recent events
 */
export const listEvents = query({
  args: {
    resourceType: v.optional(
      v.union(
        v.literal("contentEntry"),
        v.literal("contentType"),
        v.literal("mediaAsset"),
        v.literal("mediaFolder")
      )
    ),
    action: v.optional(
      v.union(
        v.literal("created"),
        v.literal("updated"),
        v.literal("published"),
        v.literal("unpublished"),
        v.literal("deleted"),
        v.literal("restored"),
        v.literal("duplicated"),
        v.literal("scheduled")
      )
    ),
    processed: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    events: v.array(
      v.object({
        _id: v.id("cmsEvents"),
        _creationTime: v.number(),
        eventType: v.string(),
        resourceType: v.union(
          v.literal("contentEntry"),
          v.literal("contentType"),
          v.literal("mediaAsset"),
          v.literal("mediaFolder")
        ),
        resourceId: v.string(),
        action: v.union(
          v.literal("created"),
          v.literal("updated"),
          v.literal("published"),
          v.literal("unpublished"),
          v.literal("deleted"),
          v.literal("restored"),
          v.literal("duplicated"),
          v.literal("scheduled")
        ),
        payload: v.any(),
        userId: v.optional(v.string()),
        processed: v.boolean(),
        processedAt: v.optional(v.number()),
        correlationId: v.optional(v.string()),
        metadata: v.optional(v.any()),
      })
    ),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { resourceType, action, processed, limit = 50 } = args;

    // Collect and filter in memory for other filters
    // (In a production system, you might want more specific indexes)
    let events;
    if (processed !== undefined) {
      events = await ctx.db
        .query("cmsEvents")
        .withIndex("by_processed", (q) => q.eq("processed", processed))
        .order("desc")
        .take(limit * 2);
    } else {
      events = await ctx.db
        .query("cmsEvents")
        .order("desc")
        .take(limit * 2);
    }

    // Apply additional filters
    if (resourceType !== undefined) {
      events = events.filter((e) => e.resourceType === resourceType);
    }
    if (action !== undefined) {
      events = events.filter((e) => e.action === action);
    }

    // Limit results
    const limitedEvents = events.slice(0, limit);
    const hasMore = events.length > limit;

    return {
      events: limitedEvents,
      hasMore,
    };
  },
});

/**
 * Query to get events for a specific resource.
 *
 * @param resourceType - The resource type
 * @param resourceId - The resource ID
 * @param limit - Maximum number of events to return
 *
 * @returns Array of events for the resource
 */
export const getResourceEvents = query({
  args: {
    resourceType: v.union(
      v.literal("contentEntry"),
      v.literal("contentType"),
      v.literal("mediaAsset"),
      v.literal("mediaFolder")
    ),
    resourceId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("cmsEvents"),
      _creationTime: v.number(),
      eventType: v.string(),
      resourceType: v.union(
        v.literal("contentEntry"),
        v.literal("contentType"),
        v.literal("mediaAsset"),
        v.literal("mediaFolder")
      ),
      resourceId: v.string(),
      action: v.union(
        v.literal("created"),
        v.literal("updated"),
        v.literal("published"),
        v.literal("unpublished"),
        v.literal("deleted"),
        v.literal("restored"),
        v.literal("duplicated"),
        v.literal("scheduled")
      ),
      payload: v.any(),
      userId: v.optional(v.string()),
      processed: v.boolean(),
      processedAt: v.optional(v.number()),
      correlationId: v.optional(v.string()),
      metadata: v.optional(v.any()),
    })
  ),
  handler: async (ctx, args) => {
    const { resourceType, resourceId, limit = 50 } = args;

    const events = await ctx.db
      .query("cmsEvents")
      .withIndex("by_resource", (q) =>
        q.eq("resourceType", resourceType).eq("resourceId", resourceId)
      )
      .order("desc")
      .take(limit);

    return events;
  },
});

/**
 * Query to get unprocessed events for async processing.
 *
 * This is useful for building event processors that handle events
 * asynchronously (e.g., sending webhooks, updating search indexes).
 *
 * @param limit - Maximum number of events to return
 *
 * @returns Array of unprocessed events
 */
export const getUnprocessedEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("cmsEvents"),
      _creationTime: v.number(),
      eventType: v.string(),
      resourceType: v.union(
        v.literal("contentEntry"),
        v.literal("contentType"),
        v.literal("mediaAsset"),
        v.literal("mediaFolder")
      ),
      resourceId: v.string(),
      action: v.union(
        v.literal("created"),
        v.literal("updated"),
        v.literal("published"),
        v.literal("unpublished"),
        v.literal("deleted"),
        v.literal("restored"),
        v.literal("duplicated"),
        v.literal("scheduled")
      ),
      payload: v.any(),
      userId: v.optional(v.string()),
      processed: v.boolean(),
      processedAt: v.optional(v.number()),
      correlationId: v.optional(v.string()),
      metadata: v.optional(v.any()),
    })
  ),
  handler: async (ctx, args) => {
    const { limit = 100 } = args;

    const events = await ctx.db
      .query("cmsEvents")
      .withIndex("by_processed", (q) => q.eq("processed", false))
      .order("asc") // Process oldest first
      .take(limit);

    return events;
  },
});

// =============================================================================
// Event Mutation Functions
// =============================================================================

/**
 * Mutation to mark events as processed.
 *
 * This should be called by event processors after successfully
 * handling an event. This enables at-least-once processing semantics.
 *
 * @param eventIds - Array of event IDs to mark as processed
 *
 * @returns Count of events marked as processed
 */
export const markEventsProcessed = mutation({
  args: {
    eventIds: v.array(v.id("cmsEvents")),
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
 * Internal mutation to emit an event from scheduled functions.
 *
 * This is used by internal scheduled functions that need to emit events
 * but don't have direct access to the emitEvent helper.
 */
export const internalEmitEvent = internalMutation({
  args: {
    eventType: v.string(),
    resourceType: v.union(
      v.literal("contentEntry"),
      v.literal("contentType"),
      v.literal("mediaAsset"),
      v.literal("mediaFolder")
    ),
    resourceId: v.string(),
    action: v.union(
      v.literal("created"),
      v.literal("updated"),
      v.literal("published"),
      v.literal("unpublished"),
      v.literal("deleted"),
      v.literal("restored"),
      v.literal("duplicated"),
      v.literal("scheduled")
    ),
    payload: v.any(),
    userId: v.optional(v.string()),
    correlationId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.id("cmsEvents"),
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("cmsEvents", {
      eventType: args.eventType,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      action: args.action,
      payload: args.payload,
      userId: args.userId,
      processed: false,
      correlationId: args.correlationId,
      metadata: args.metadata,
    });

    return eventId;
  },
});

/**
 * Mutation to clean up old processed events.
 *
 * Events older than the retention period are permanently deleted.
 * This helps prevent unbounded growth of the events table.
 *
 * @param retentionDays - Number of days to retain processed events (default: 30)
 *
 * @returns Count of events deleted
 */
export const cleanupOldEvents = mutation({
  args: {
    retentionDays: v.optional(v.number()),
  },
  returns: v.object({
    deletedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const { retentionDays = 30 } = args;
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    // Get old processed events
    const oldEvents = await ctx.db
      .query("cmsEvents")
      .withIndex("by_processed", (q) => q.eq("processed", true))
      .filter((q) => q.lt(q.field("_creationTime"), cutoffTime))
      .take(1000); // Batch limit for safety

    for (const event of oldEvents) {
      await ctx.db.delete(event._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

// =============================================================================
// Event Type Builders
// =============================================================================

/**
 * Helper function to build a content entry event type string.
 */
export function contentEntryEventType(action: EventAction): EventType {
  return `contentEntry.${action}`;
}

/**
 * Helper function to build a content type event type string.
 */
export function contentTypeEventType(action: EventAction): EventType {
  return `contentType.${action}`;
}

/**
 * Helper function to build a media asset event type string.
 */
export function mediaAssetEventType(action: EventAction): EventType {
  return `mediaAsset.${action}`;
}

/**
 * Helper function to build a media folder event type string.
 */
export function mediaFolderEventType(action: EventAction): EventType {
  return `mediaFolder.${action}`;
}
