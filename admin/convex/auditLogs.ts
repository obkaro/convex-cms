/**
 * Wrapper functions for audit log operations.
 *
 * These functions wrap the internal CMS component functions to expose
 * audit trail viewing and management for the admin UI.
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { components } from "./_generated/api";
import {
  auditResourceTypeValidator,
  auditActionValidator,
} from "../../src/component/validators.js";

// =============================================================================
// Queries
// =============================================================================

/**
 * Get audit logs for a specific resource.
 */
export const getResourceLogs = query({
  args: {
    resourceType: auditResourceTypeValidator,
    resourceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(
      components.convexCms.auditLog.getResourceAuditLogs,
      {
        resourceType: args.resourceType,
        resourceId: args.resourceId,
        limit: args.limit,
      }
    );
  },
});

/**
 * Get audit logs by user.
 */
export const getUserLogs = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.auditLog.getUserAuditLogs, {
      userId: args.userId,
      limit: args.limit,
    });
  },
});

/**
 * List audit logs with filtering and pagination.
 */
export const list = query({
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
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.auditLog.listAuditLogs, {
      resourceType: args.resourceType,
      action: args.action,
      userId: args.userId,
      contentTypeName: args.contentTypeName,
      startDate: args.startDate,
      endDate: args.endDate,
      limit: args.limit,
      cursor: args.cursor,
    });
  },
});

/**
 * Get a single audit log by ID.
 */
export const get = query({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.auditLog.getAuditLog, {
      id: args.id,
    });
  },
});

/**
 * Get audit log statistics.
 */
export const getStats = query({
  args: {
    resourceType: v.optional(auditResourceTypeValidator),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.auditLog.getAuditLogStats, {
      resourceType: args.resourceType,
      startDate: args.startDate,
      endDate: args.endDate,
    });
  },
});

/**
 * Get diff between states in an audit log entry.
 */
export const getDiff = query({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.auditLog.getAuditLogDiff, {
      id: args.id,
    });
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Clean up old audit logs.
 * Note: Use with caution - audit logs serve compliance purposes.
 */
export const cleanup = mutation({
  args: {
    retentionDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.auditLog.cleanupOldAuditLogs,
      {
        retentionDays: args.retentionDays,
      }
    );
  },
});
