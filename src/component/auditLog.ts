/**
 * Audit Log Module
 *
 * Comprehensive audit logging for all CMS operations.
 * Records user, action, timestamp, and before/after states.
 * Provides query functions for audit trail retrieval and filtering.
 *
 * Design Philosophy:
 * - Audit logs are immutable once created (append-only)
 * - Complete before/after snapshots enable diff analysis
 * - Rich filtering supports compliance and security auditing
 * - Optimized for read-heavy audit trail queries
 *
 * Usage:
 * ```typescript
 * // In a mutation handler:
 * await logAuditEntry(ctx, {
 *   resourceType: "contentEntry",
 *   resourceId: entry._id.toString(),
 *   action: "updated",
 *   userId: updatedBy,
 *   previousState: oldEntry,
 *   newState: newEntry,
 * });
 * ```
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server.js";

// =============================================================================
// Audit Log Types
// =============================================================================

/**
 * Resource types that can be audited.
 */
export type AuditResourceType =
  | "contentEntry"
  | "contentType"
  | "mediaAsset"
  | "mediaFolder"
  | "settings";

/**
 * Actions that can be audited.
 */
export type AuditAction =
  | "created"
  | "updated"
  | "published"
  | "unpublished"
  | "deleted"
  | "restored"
  | "duplicated"
  | "scheduled"
  | "locked"
  | "unlocked"
  | "rolledBack"
  | "migrated";

/**
 * Parameters for creating an audit log entry.
 */
export interface LogAuditEntryParams {
  resourceType: AuditResourceType;
  resourceId: string;
  action: AuditAction;
  userId?: string;
  userDisplayName?: string;
  previousState?: unknown;
  newState?: unknown;
  changeSummary?: string;
  changedFields?: string[];
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  contentTypeName?: string;
  entrySlug?: string;
}

/**
 * Audit log entry as stored in the database.
 */
export interface AuditLogEntry {
  _id: string;
  _creationTime: number;
  resourceType: AuditResourceType;
  resourceId: string;
  action: AuditAction;
  userId?: string;
  userDisplayName?: string;
  previousState?: unknown;
  newState?: unknown;
  changeSummary?: string;
  changedFields?: string[];
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  contentTypeName?: string;
  entrySlug?: string;
}

/**
 * Filters for querying audit logs.
 */
export interface AuditLogFilters {
  resourceType?: AuditResourceType;
  resourceId?: string;
  action?: AuditAction;
  userId?: string;
  contentTypeName?: string;
  startDate?: number;
  endDate?: number;
}

// =============================================================================
// Validators
// =============================================================================

/**
 * Validator for audit resource type.
 */
export const auditResourceTypeValidator = v.union(
  v.literal("contentEntry"),
  v.literal("contentType"),
  v.literal("mediaAsset"),
  v.literal("mediaFolder"),
  v.literal("settings")
);

/**
 * Validator for audit action.
 */
export const auditActionValidator = v.union(
  v.literal("created"),
  v.literal("updated"),
  v.literal("published"),
  v.literal("unpublished"),
  v.literal("deleted"),
  v.literal("restored"),
  v.literal("duplicated"),
  v.literal("scheduled"),
  v.literal("locked"),
  v.literal("unlocked"),
  v.literal("rolledBack"),
  v.literal("migrated")
);

/**
 * Validator for audit log document.
 */
export const auditLogDocValidator = v.object({
  _id: v.id("audit_logs"),
  _creationTime: v.number(),
  resourceType: auditResourceTypeValidator,
  resourceId: v.string(),
  action: auditActionValidator,
  userId: v.optional(v.string()),
  userDisplayName: v.optional(v.string()),
  previousState: v.optional(v.any()),
  newState: v.optional(v.any()),
  changeSummary: v.optional(v.string()),
  changedFields: v.optional(v.array(v.string())),
  ipAddress: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  sessionId: v.optional(v.string()),
  requestId: v.optional(v.string()),
  metadata: v.optional(v.any()),
  contentTypeName: v.optional(v.string()),
  entrySlug: v.optional(v.string()),
});

// =============================================================================
// Internal Helper: Log Audit Entry
// =============================================================================

/**
 * Internal helper function to create an audit log entry within mutation handlers.
 *
 * This function inserts an audit log record into the audit_logs table.
 * It's designed to be called from within other mutations to ensure
 * the audit log is part of the same atomic transaction.
 *
 * @param ctx - The mutation context
 * @param params - Audit log parameters
 * @returns The created audit log ID
 */
export async function logAuditEntry(
  ctx: { db: { insert: (table: "audit_logs", doc: Record<string, unknown>) => Promise<unknown> } },
  params: LogAuditEntryParams
): Promise<string> {
  const {
    resourceType,
    resourceId,
    action,
    userId,
    userDisplayName,
    previousState,
    newState,
    changeSummary,
    changedFields,
    ipAddress,
    userAgent,
    sessionId,
    requestId,
    metadata,
    contentTypeName,
    entrySlug,
  } = params;

  // Auto-generate change summary if not provided for update actions
  let summary = changeSummary;
  if (!summary && action === "updated" && changedFields && changedFields.length > 0) {
    summary = `Updated ${changedFields.length} field${changedFields.length > 1 ? "s" : ""}: ${changedFields.slice(0, 5).join(", ")}${changedFields.length > 5 ? "..." : ""}`;
  }

  const auditLogId = await ctx.db.insert("audit_logs", {
    resourceType,
    resourceId,
    action,
    userId,
    userDisplayName,
    previousState,
    newState,
    changeSummary: summary,
    changedFields,
    ipAddress,
    userAgent,
    sessionId,
    requestId,
    metadata,
    contentTypeName,
    entrySlug,
  });

  return auditLogId as unknown as string;
}

/**
 * Helper to detect changed fields between two objects.
 * Useful for automatically populating changedFields in audit logs.
 */
export function detectChangedFields(
  previousState: Record<string, unknown> | undefined | null,
  newState: Record<string, unknown> | undefined | null
): string[] {
  if (!previousState || !newState) {
    return [];
  }

  const changedFields: string[] = [];
  const allKeys = new Set([...Object.keys(previousState), ...Object.keys(newState)]);

  for (const key of allKeys) {
    // Skip internal fields
    if (key.startsWith("_")) continue;

    const oldValue = previousState[key];
    const newValue = newState[key];

    // Simple comparison (deep comparison for objects)
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changedFields.push(key);
    }
  }

  return changedFields;
}

/**
 * Helper to generate a human-readable change summary.
 */
export function generateChangeSummary(
  action: AuditAction,
  resourceType: AuditResourceType,
  changedFields?: string[],
  metadata?: Record<string, unknown>
): string {
  const resourceName = resourceType.replace(/([A-Z])/g, " $1").toLowerCase().trim();

  switch (action) {
    case "created":
      return `Created new ${resourceName}`;
    case "updated":
      if (changedFields && changedFields.length > 0) {
        return `Updated ${changedFields.length} field${changedFields.length > 1 ? "s" : ""}: ${changedFields.slice(0, 3).join(", ")}${changedFields.length > 3 ? "..." : ""}`;
      }
      return `Updated ${resourceName}`;
    case "published":
      return `Published ${resourceName}`;
    case "unpublished":
      return `Unpublished ${resourceName} (reverted to draft)`;
    case "deleted":
      return metadata?.hardDelete ? `Permanently deleted ${resourceName}` : `Moved ${resourceName} to trash`;
    case "restored":
      return `Restored ${resourceName} from trash`;
    case "duplicated":
      return `Duplicated ${resourceName}`;
    case "scheduled":
      return `Scheduled ${resourceName} for publication`;
    case "locked":
      return `Locked ${resourceName} for editing`;
    case "unlocked":
      return `Released lock on ${resourceName}`;
    case "rolledBack":
      const version = metadata?.toVersion;
      return version ? `Rolled back to version ${version}` : `Rolled back to previous version`;
    case "migrated":
      return `Applied migration to ${resourceName}`;
    default:
      return `Performed ${action} on ${resourceName}`;
  }
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Query to get audit logs for a specific resource.
 *
 * @param resourceType - The resource type
 * @param resourceId - The resource ID
 * @param limit - Maximum number of logs to return (default: 50)
 *
 * @returns Array of audit log entries for the resource, ordered by creation time (newest first)
 */
export const getResourceAuditLogs = query({
  args: {
    resourceType: auditResourceTypeValidator,
    resourceId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(auditLogDocValidator),
  handler: async (ctx, args) => {
    const { resourceType, resourceId, limit = 50 } = args;

    const logs = await ctx.db
      .query("audit_logs")
      .withIndex("by_resource", (q) =>
        q.eq("resourceType", resourceType).eq("resourceId", resourceId)
      )
      .order("desc")
      .take(limit);

    return logs;
  },
});

/**
 * Query to get audit logs by user.
 *
 * @param userId - The user ID
 * @param limit - Maximum number of logs to return (default: 50)
 *
 * @returns Array of audit log entries by the user, ordered by creation time (newest first)
 */
export const getUserAuditLogs = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(auditLogDocValidator),
  handler: async (ctx, args) => {
    const { userId, limit = 50 } = args;

    const logs = await ctx.db
      .query("audit_logs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return logs;
  },
});

/**
 * Query to list audit logs with filtering and pagination.
 *
 * @param resourceType - Filter by resource type
 * @param action - Filter by action
 * @param userId - Filter by user ID
 * @param contentTypeName - Filter by content type name (for content entries)
 * @param startDate - Filter logs created after this timestamp
 * @param endDate - Filter logs created before this timestamp
 * @param limit - Maximum number of logs to return (default: 50)
 * @param cursor - Cursor for pagination
 *
 * @returns Paginated audit log entries
 */
export const listAuditLogs = query({
  args: {
    resourceType: v.optional(auditResourceTypeValidator),
    action: v.optional(auditActionValidator),
    userId: v.optional(v.string()),
    contentTypeName: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    logs: v.array(auditLogDocValidator),
    hasMore: v.boolean(),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const {
      resourceType,
      action,
      userId,
      contentTypeName,
      startDate,
      endDate,
      limit = 50,
    } = args;

    // Start with the most specific index based on filters
    let queryBuilder;

    if (userId && action) {
      queryBuilder = ctx.db
        .query("audit_logs")
        .withIndex("by_user_and_action", (q) =>
          q.eq("userId", userId).eq("action", action)
        );
    } else if (resourceType && action) {
      queryBuilder = ctx.db
        .query("audit_logs")
        .withIndex("by_resource_type_and_action", (q) =>
          q.eq("resourceType", resourceType).eq("action", action)
        );
    } else if (userId) {
      queryBuilder = ctx.db
        .query("audit_logs")
        .withIndex("by_user", (q) => q.eq("userId", userId));
    } else if (contentTypeName) {
      queryBuilder = ctx.db
        .query("audit_logs")
        .withIndex("by_content_type", (q) => q.eq("contentTypeName", contentTypeName));
    } else if (action) {
      queryBuilder = ctx.db
        .query("audit_logs")
        .withIndex("by_action", (q) => q.eq("action", action));
    } else if (resourceType) {
      queryBuilder = ctx.db
        .query("audit_logs")
        .withIndex("by_resource_type", (q) => q.eq("resourceType", resourceType));
    } else {
      queryBuilder = ctx.db.query("audit_logs");
    }

    // Fetch more than needed to apply additional filters
    let logs = await queryBuilder.order("desc").take(limit * 3);

    // Apply time-based filters in memory
    if (startDate !== undefined) {
      logs = logs.filter((log) => log._creationTime >= startDate);
    }
    if (endDate !== undefined) {
      logs = logs.filter((log) => log._creationTime <= endDate);
    }

    // Apply any remaining filters not covered by the index
    if (resourceType && !action) {
      logs = logs.filter((log) => log.resourceType === resourceType);
    }

    // Limit results
    const limitedLogs = logs.slice(0, limit);
    const hasMore = logs.length > limit;
    const nextCursor = hasMore && limitedLogs.length > 0
      ? limitedLogs[limitedLogs.length - 1]._id
      : undefined;

    return {
      logs: limitedLogs,
      hasMore,
      nextCursor,
    };
  },
});

/**
 * Query to get a single audit log entry by ID.
 *
 * @param id - The audit log entry ID
 *
 * @returns The audit log entry or null if not found
 */
export const getAuditLog = query({
  args: {
    id: v.id("audit_logs"),
  },
  returns: v.union(auditLogDocValidator, v.null()),
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.id);
    return log;
  },
});

/**
 * Query to get audit log statistics.
 *
 * @param resourceType - Filter by resource type
 * @param startDate - Filter logs created after this timestamp
 * @param endDate - Filter logs created before this timestamp
 *
 * @returns Statistics about audit logs
 */
export const getAuditLogStats = query({
  args: {
    resourceType: v.optional(auditResourceTypeValidator),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.object({
    totalCount: v.number(),
    actionCounts: v.any(),
    topUsers: v.array(
      v.object({
        userId: v.string(),
        count: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const { resourceType, startDate, endDate } = args;

    let queryBuilder;
    if (resourceType) {
      queryBuilder = ctx.db
        .query("audit_logs")
        .withIndex("by_resource_type", (q) => q.eq("resourceType", resourceType));
    } else {
      queryBuilder = ctx.db.query("audit_logs");
    }

    let logs = await queryBuilder.collect();

    // Apply time-based filters
    if (startDate !== undefined) {
      logs = logs.filter((log) => log._creationTime >= startDate);
    }
    if (endDate !== undefined) {
      logs = logs.filter((log) => log._creationTime <= endDate);
    }

    // Calculate action counts
    const actionCounts: Record<string, number> = {};
    for (const log of logs) {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    }

    // Calculate top users
    const userCounts: Record<string, number> = {};
    for (const log of logs) {
      if (log.userId) {
        userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
      }
    }

    const topUsers = Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalCount: logs.length,
      actionCounts,
      topUsers,
    };
  },
});

/**
 * Query to compare two versions of a resource using audit logs.
 * Returns the diff between previousState and newState for an update action.
 *
 * @param id - The audit log entry ID (should be an "updated" action)
 *
 * @returns The diff between states
 */
export const getAuditLogDiff = query({
  args: {
    id: v.id("audit_logs"),
  },
  returns: v.object({
    hasChanges: v.boolean(),
    changedFields: v.array(v.string()),
    fieldDiffs: v.array(
      v.object({
        field: v.string(),
        previousValue: v.optional(v.any()),
        newValue: v.optional(v.any()),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.id);

    if (!log) {
      return {
        hasChanges: false,
        changedFields: [],
        fieldDiffs: [],
      };
    }

    const { previousState, newState, changedFields } = log;

    // If changedFields is already stored, use it
    if (changedFields && changedFields.length > 0) {
      const fieldDiffs = changedFields.map((field) => ({
        field,
        previousValue: previousState ? (previousState as Record<string, unknown>)[field] : undefined,
        newValue: newState ? (newState as Record<string, unknown>)[field] : undefined,
      }));

      return {
        hasChanges: true,
        changedFields,
        fieldDiffs,
      };
    }

    // Otherwise, compute the diff
    const detectedChanges = detectChangedFields(
      previousState as Record<string, unknown> | undefined,
      newState as Record<string, unknown> | undefined
    );

    const fieldDiffs = detectedChanges.map((field) => ({
      field,
      previousValue: previousState ? (previousState as Record<string, unknown>)[field] : undefined,
      newValue: newState ? (newState as Record<string, unknown>)[field] : undefined,
    }));

    return {
      hasChanges: detectedChanges.length > 0,
      changedFields: detectedChanges,
      fieldDiffs,
    };
  },
});

// =============================================================================
// Mutation Functions
// =============================================================================

/**
 * Internal mutation to create an audit log entry.
 * Used by scheduled functions and internal operations.
 */
export const internalLogAuditEntry = internalMutation({
  args: {
    resourceType: auditResourceTypeValidator,
    resourceId: v.string(),
    action: auditActionValidator,
    userId: v.optional(v.string()),
    userDisplayName: v.optional(v.string()),
    previousState: v.optional(v.any()),
    newState: v.optional(v.any()),
    changeSummary: v.optional(v.string()),
    changedFields: v.optional(v.array(v.string())),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    requestId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    contentTypeName: v.optional(v.string()),
    entrySlug: v.optional(v.string()),
  },
  returns: v.id("audit_logs"),
  handler: async (ctx, args) => {
    const auditLogId = await ctx.db.insert("audit_logs", {
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      action: args.action,
      userId: args.userId,
      userDisplayName: args.userDisplayName,
      previousState: args.previousState,
      newState: args.newState,
      changeSummary: args.changeSummary,
      changedFields: args.changedFields,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      sessionId: args.sessionId,
      requestId: args.requestId,
      metadata: args.metadata,
      contentTypeName: args.contentTypeName,
      entrySlug: args.entrySlug,
    });

    return auditLogId;
  },
});

/**
 * Mutation to clean up old audit logs.
 *
 * Note: This is typically NOT recommended for audit logs as they serve
 * compliance purposes. Only use this if you have a specific retention policy.
 *
 * @param retentionDays - Number of days to retain audit logs (default: 365)
 *
 * @returns Count of audit logs deleted
 */
export const cleanupOldAuditLogs = mutation({
  args: {
    retentionDays: v.optional(v.number()),
  },
  returns: v.object({
    deletedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const { retentionDays = 365 } = args;
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    // Get old audit logs
    const oldLogs = await ctx.db
      .query("audit_logs")
      .filter((q) => q.lt(q.field("_creationTime"), cutoffTime))
      .take(1000); // Batch limit for safety

    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

// =============================================================================
// Convenience Functions for Common Audit Scenarios
// =============================================================================

/**
 * Helper to create an audit log for content entry operations.
 */
export async function logContentEntryAudit(
  ctx: { db: { insert: (table: "audit_logs", doc: Record<string, unknown>) => Promise<unknown> } },
  params: {
    entryId: string;
    action: AuditAction;
    userId?: string;
    userDisplayName?: string;
    previousState?: unknown;
    newState?: unknown;
    contentTypeName?: string;
    entrySlug?: string;
    changedFields?: string[];
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
  }
): Promise<string> {
  const {
    entryId,
    action,
    previousState,
    newState,
    contentTypeName,
    entrySlug,
    changedFields,
    ...rest
  } = params;

  // Auto-detect changed fields if not provided
  const detectedChanges = changedFields ?? detectChangedFields(
    previousState as Record<string, unknown> | undefined,
    newState as Record<string, unknown> | undefined
  );

  return logAuditEntry(ctx, {
    resourceType: "contentEntry",
    resourceId: entryId,
    action,
    previousState,
    newState,
    contentTypeName,
    entrySlug,
    changedFields: detectedChanges.length > 0 ? detectedChanges : undefined,
    changeSummary: generateChangeSummary(action, "contentEntry", detectedChanges, rest.metadata),
    ...rest,
  });
}

/**
 * Helper to create an audit log for content type operations.
 */
export async function logContentTypeAudit(
  ctx: { db: { insert: (table: "audit_logs", doc: Record<string, unknown>) => Promise<unknown> } },
  params: {
    contentTypeId: string;
    action: AuditAction;
    userId?: string;
    userDisplayName?: string;
    previousState?: unknown;
    newState?: unknown;
    contentTypeName?: string;
    changedFields?: string[];
    metadata?: Record<string, unknown>;
  }
): Promise<string> {
  const {
    contentTypeId,
    action,
    previousState,
    newState,
    changedFields,
    ...rest
  } = params;

  const detectedChanges = changedFields ?? detectChangedFields(
    previousState as Record<string, unknown> | undefined,
    newState as Record<string, unknown> | undefined
  );

  return logAuditEntry(ctx, {
    resourceType: "contentType",
    resourceId: contentTypeId,
    action,
    previousState,
    newState,
    changedFields: detectedChanges.length > 0 ? detectedChanges : undefined,
    changeSummary: generateChangeSummary(action, "contentType", detectedChanges, rest.metadata),
    ...rest,
  });
}

/**
 * Helper to create an audit log for media asset operations.
 */
export async function logMediaAssetAudit(
  ctx: { db: { insert: (table: "audit_logs", doc: Record<string, unknown>) => Promise<unknown> } },
  params: {
    assetId: string;
    action: AuditAction;
    userId?: string;
    userDisplayName?: string;
    previousState?: unknown;
    newState?: unknown;
    changedFields?: string[];
    metadata?: Record<string, unknown>;
  }
): Promise<string> {
  const {
    assetId,
    action,
    previousState,
    newState,
    changedFields,
    ...rest
  } = params;

  const detectedChanges = changedFields ?? detectChangedFields(
    previousState as Record<string, unknown> | undefined,
    newState as Record<string, unknown> | undefined
  );

  return logAuditEntry(ctx, {
    resourceType: "mediaAsset",
    resourceId: assetId,
    action,
    previousState,
    newState,
    changedFields: detectedChanges.length > 0 ? detectedChanges : undefined,
    changeSummary: generateChangeSummary(action, "mediaAsset", detectedChanges, rest.metadata),
    ...rest,
  });
}

/**
 * Helper to create an audit log for media folder operations.
 */
export async function logMediaFolderAudit(
  ctx: { db: { insert: (table: "audit_logs", doc: Record<string, unknown>) => Promise<unknown> } },
  params: {
    folderId: string;
    action: AuditAction;
    userId?: string;
    userDisplayName?: string;
    previousState?: unknown;
    newState?: unknown;
    changedFields?: string[];
    metadata?: Record<string, unknown>;
  }
): Promise<string> {
  const {
    folderId,
    action,
    previousState,
    newState,
    changedFields,
    ...rest
  } = params;

  const detectedChanges = changedFields ?? detectChangedFields(
    previousState as Record<string, unknown> | undefined,
    newState as Record<string, unknown> | undefined
  );

  return logAuditEntry(ctx, {
    resourceType: "mediaFolder",
    resourceId: folderId,
    action,
    previousState,
    newState,
    changedFields: detectedChanges.length > 0 ? detectedChanges : undefined,
    changeSummary: generateChangeSummary(action, "mediaFolder", detectedChanges, rest.metadata),
    ...rest,
  });
}
