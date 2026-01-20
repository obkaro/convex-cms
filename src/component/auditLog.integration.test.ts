/**
 * Integration Tests for Audit Log Module
 *
 * Verifies that audit log queries and mutations work correctly with convex-test.
 *
 * Note: These tests require a Convex development environment with generated files.
 * Run `npx convex dev` or `npx convex codegen` before running these tests.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import {
  detectChangedFields,
  generateChangeSummary,
} from "./auditLog.js";

// Import all component modules for testing
const modules = import.meta.glob("./**/*.ts");

describe("Audit Log Integration Tests", () => {
  describe("logAuditEntry via internalLogAuditEntry", () => {
    it("should create audit log entry in database", async () => {
      const t = convexTest(schema, modules);

      // Create an audit log entry
      const auditLogId = await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "test-entry-123",
        action: "created",
        userId: "user-1",
        userDisplayName: "Test User",
        newState: { title: "Test Entry", status: "draft" },
        contentTypeName: "blog_post",
        entrySlug: "test-entry",
      });

      expect(auditLogId).toBeDefined();
      expect(typeof auditLogId).toBe("string");

      // Verify the entry was created
      const logs = await t.run(async (ctx) => {
        return await ctx.db.query("audit_logs").collect();
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].resourceType).toBe("contentEntry");
      expect(logs[0].resourceId).toBe("test-entry-123");
      expect(logs[0].action).toBe("created");
      expect(logs[0].userId).toBe("user-1");
      expect(logs[0].userDisplayName).toBe("Test User");
    });

    it("should store change summary and changedFields for updates", async () => {
      const t = convexTest(schema, modules);

      const previousState = { title: "Old Title", status: "draft" };
      const newState = { title: "New Title", status: "published" };

      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "test-entry-456",
        action: "updated",
        userId: "user-1",
        previousState,
        newState,
        changedFields: ["title", "status"],
        changeSummary: "Updated 2 fields: title, status",
      });

      const logs = await t.run(async (ctx) => {
        return await ctx.db.query("audit_logs").collect();
      });

      expect(logs[0].changeSummary).toContain("Updated 2 fields");
      expect(logs[0].changedFields).toEqual(["title", "status"]);
    });

    it("should store previousState and newState correctly", async () => {
      const t = convexTest(schema, modules);

      const previousState = { title: "Old", count: 5 };
      const newState = { title: "New", count: 10 };

      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "test-entry-789",
        action: "updated",
        previousState,
        newState,
      });

      const logs = await t.run(async (ctx) => {
        return await ctx.db.query("audit_logs").collect();
      });

      expect(logs[0].previousState).toEqual(previousState);
      expect(logs[0].newState).toEqual(newState);
    });

    it("should store optional security/audit fields", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "test-entry-security",
        action: "updated",
        userId: "user-1",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        sessionId: "session-123",
        requestId: "req-abc-123",
        metadata: { source: "api", version: "1.0" },
      });

      const logs = await t.run(async (ctx) => {
        return await ctx.db.query("audit_logs").collect();
      });

      expect(logs[0].ipAddress).toBe("192.168.1.1");
      expect(logs[0].userAgent).toBe("Mozilla/5.0");
      expect(logs[0].sessionId).toBe("session-123");
      expect(logs[0].requestId).toBe("req-abc-123");
      expect(logs[0].metadata).toEqual({ source: "api", version: "1.0" });
    });
  });

  describe("Query: getResourceAuditLogs", () => {
    it("should return logs for a specific resource", async () => {
      const t = convexTest(schema, modules);

      // Create multiple audit logs for different resources
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-A",
        action: "created",
        userId: "user-1",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-A",
        action: "updated",
        userId: "user-1",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-B",
        action: "created",
        userId: "user-2",
      });

      // Query for entry-A only
      const result = await t.query(api.auditLog.getResourceAuditLogs, {
        resourceType: "contentEntry",
        resourceId: "entry-A",
      });

      expect(result).toHaveLength(2);
      expect(result.every((log) => log.resourceId === "entry-A")).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const t = convexTest(schema, modules);

      // Create 5 logs for the same resource
      for (let i = 0; i < 5; i++) {
        await t.mutation(api.auditLog.internalLogAuditEntry, {
          resourceType: "contentEntry",
          resourceId: "entry-limited",
          action: "updated",
        });
      }

      const result = await t.query(api.auditLog.getResourceAuditLogs, {
        resourceType: "contentEntry",
        resourceId: "entry-limited",
        limit: 3,
      });

      expect(result).toHaveLength(3);
    });
  });

  describe("Query: getUserAuditLogs", () => {
    it("should return logs by a specific user", async () => {
      const t = convexTest(schema, modules);

      // Create logs from different users
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-1",
        action: "created",
        userId: "user-A",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-2",
        action: "updated",
        userId: "user-A",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "mediaAsset",
        resourceId: "asset-1",
        action: "created",
        userId: "user-B",
      });

      // Query for user-A only
      const result = await t.query(api.auditLog.getUserAuditLogs, {
        userId: "user-A",
      });

      expect(result).toHaveLength(2);
      expect(result.every((log) => log.userId === "user-A")).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const t = convexTest(schema, modules);

      for (let i = 0; i < 5; i++) {
        await t.mutation(api.auditLog.internalLogAuditEntry, {
          resourceType: "contentEntry",
          resourceId: `entry-${i}`,
          action: "created",
          userId: "prolific-user",
        });
      }

      const result = await t.query(api.auditLog.getUserAuditLogs, {
        userId: "prolific-user",
        limit: 2,
      });

      expect(result).toHaveLength(2);
    });
  });

  describe("Query: listAuditLogs", () => {
    it("should filter by action", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-1",
        action: "created",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-2",
        action: "published",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-3",
        action: "published",
      });

      const result = await t.query(api.auditLog.listAuditLogs, {
        action: "published",
      });

      expect(result.logs).toHaveLength(2);
      expect(result.logs.every((log) => log.action === "published")).toBe(true);
    });

    it("should filter by resourceType", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-1",
        action: "created",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "mediaAsset",
        resourceId: "asset-1",
        action: "created",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "mediaAsset",
        resourceId: "asset-2",
        action: "created",
      });

      const result = await t.query(api.auditLog.listAuditLogs, {
        resourceType: "mediaAsset",
      });

      expect(result.logs).toHaveLength(2);
      expect(result.logs.every((log) => log.resourceType === "mediaAsset")).toBe(true);
    });

    it("should support pagination with limit", async () => {
      const t = convexTest(schema, modules);

      // Create many logs
      for (let i = 0; i < 10; i++) {
        await t.mutation(api.auditLog.internalLogAuditEntry, {
          resourceType: "contentEntry",
          resourceId: `entry-${i}`,
          action: "created",
        });
      }

      const result = await t.query(api.auditLog.listAuditLogs, {
        limit: 5,
      });

      expect(result.logs).toHaveLength(5);
      expect(result.hasMore).toBe(true);
    });

    it("should filter by userId", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-1",
        action: "created",
        userId: "admin-user",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-2",
        action: "created",
        userId: "regular-user",
      });

      const result = await t.query(api.auditLog.listAuditLogs, {
        userId: "admin-user",
      });

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].userId).toBe("admin-user");
    });

    it("should filter by contentTypeName", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-1",
        action: "created",
        contentTypeName: "blog_post",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-2",
        action: "created",
        contentTypeName: "page",
      });

      const result = await t.query(api.auditLog.listAuditLogs, {
        contentTypeName: "blog_post",
      });

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].contentTypeName).toBe("blog_post");
    });

    it("should filter by combined resourceType and action", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-1",
        action: "published",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-2",
        action: "created",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "mediaAsset",
        resourceId: "asset-1",
        action: "published",
      });

      const result = await t.query(api.auditLog.listAuditLogs, {
        resourceType: "contentEntry",
        action: "published",
      });

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].resourceType).toBe("contentEntry");
      expect(result.logs[0].action).toBe("published");
    });
  });

  describe("Query: getAuditLog", () => {
    it("should return a single audit log by ID", async () => {
      const t = convexTest(schema, modules);

      const auditLogId = await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentType",
        resourceId: "type-1",
        action: "created",
        userId: "admin",
      });

      const result = await t.query(api.auditLog.getAuditLog, {
        id: auditLogId,
      });

      expect(result).not.toBeNull();
      expect(result?.resourceType).toBe("contentType");
      expect(result?.action).toBe("created");
      expect(result?.userId).toBe("admin");
    });

    it("should return null for non-existent ID", async () => {
      const t = convexTest(schema, modules);

      // Create and delete a log to get valid but non-existent ID
      const auditLogId = await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentType",
        resourceId: "type-temp",
        action: "created",
      });

      await t.run(async (ctx) => {
        await ctx.db.delete(auditLogId);
      });

      const result = await t.query(api.auditLog.getAuditLog, {
        id: auditLogId,
      });

      expect(result).toBeNull();
    });
  });

  describe("Query: getAuditLogStats", () => {
    it("should return correct total count", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-1",
        action: "created",
        userId: "user-1",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-2",
        action: "created",
        userId: "user-1",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-1",
        action: "published",
        userId: "user-2",
      });

      const stats = await t.query(api.auditLog.getAuditLogStats, {});

      expect(stats.totalCount).toBe(3);
    });

    it("should return correct action counts", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-1",
        action: "created",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-2",
        action: "created",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-1",
        action: "published",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-3",
        action: "deleted",
      });

      const stats = await t.query(api.auditLog.getAuditLogStats, {});

      expect(stats.actionCounts.created).toBe(2);
      expect(stats.actionCounts.published).toBe(1);
      expect(stats.actionCounts.deleted).toBe(1);
    });

    it("should return correct top users ranking", async () => {
      const t = convexTest(schema, modules);

      // user-1 makes 3 actions
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-1",
        action: "created",
        userId: "user-1",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-2",
        action: "created",
        userId: "user-1",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-3",
        action: "updated",
        userId: "user-1",
      });
      // user-2 makes 1 action
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-1",
        action: "published",
        userId: "user-2",
      });

      const stats = await t.query(api.auditLog.getAuditLogStats, {});

      expect(stats.topUsers.length).toBe(2);
      expect(stats.topUsers[0].userId).toBe("user-1");
      expect(stats.topUsers[0].count).toBe(3);
      expect(stats.topUsers[1].userId).toBe("user-2");
      expect(stats.topUsers[1].count).toBe(1);
    });

    it("should filter by resourceType", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-1",
        action: "created",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "mediaAsset",
        resourceId: "asset-1",
        action: "created",
      });
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "mediaAsset",
        resourceId: "asset-2",
        action: "created",
      });

      const stats = await t.query(api.auditLog.getAuditLogStats, {
        resourceType: "mediaAsset",
      });

      expect(stats.totalCount).toBe(2);
    });
  });

  describe("Query: getAuditLogDiff", () => {
    it("should return correct diff for update actions with stored changedFields", async () => {
      const t = convexTest(schema, modules);

      const auditLogId = await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-1",
        action: "updated",
        previousState: { title: "Old", count: 5, status: "draft" },
        newState: { title: "New", count: 10, status: "draft" },
        changedFields: ["title", "count"],
      });

      const diff = await t.query(api.auditLog.getAuditLogDiff, {
        id: auditLogId,
      });

      expect(diff.hasChanges).toBe(true);
      expect(diff.changedFields).toContain("title");
      expect(diff.changedFields).toContain("count");
      expect(diff.changedFields).not.toContain("status");
      expect(diff.fieldDiffs).toContainEqual({
        field: "title",
        previousValue: "Old",
        newValue: "New",
      });
      expect(diff.fieldDiffs).toContainEqual({
        field: "count",
        previousValue: 5,
        newValue: 10,
      });
    });

    it("should compute diff when changedFields not stored", async () => {
      const t = convexTest(schema, modules);

      const auditLogId = await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-1",
        action: "updated",
        previousState: { title: "Old Title", description: "Same" },
        newState: { title: "New Title", description: "Same" },
      });

      const diff = await t.query(api.auditLog.getAuditLogDiff, {
        id: auditLogId,
      });

      expect(diff.hasChanges).toBe(true);
      expect(diff.changedFields).toContain("title");
      expect(diff.changedFields).not.toContain("description");
    });

    it("should return hasChanges false for non-existent log", async () => {
      const t = convexTest(schema, modules);

      const auditLogId = await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-1",
        action: "created",
      });

      await t.run(async (ctx) => {
        await ctx.db.delete(auditLogId);
      });

      const diff = await t.query(api.auditLog.getAuditLogDiff, {
        id: auditLogId,
      });

      expect(diff.hasChanges).toBe(false);
      expect(diff.changedFields).toEqual([]);
      expect(diff.fieldDiffs).toEqual([]);
    });
  });

  describe("Mutation: cleanupOldAuditLogs", () => {
    it("should not delete recent logs with default retention", async () => {
      const t = convexTest(schema, modules);

      // Create recent logs
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-1",
        action: "created",
      });

      // Run cleanup with default retention (365 days)
      const result = await t.mutation(api.auditLog.cleanupOldAuditLogs, {});

      expect(result.deletedCount).toBe(0);

      // Verify logs still exist
      const logs = await t.run(async (ctx) => {
        return await ctx.db.query("audit_logs").collect();
      });
      expect(logs).toHaveLength(1);
    });

    it("should return deletedCount of 0 for new logs with short retention", async () => {
      const t = convexTest(schema, modules);

      // Create a log
      await t.mutation(api.auditLog.internalLogAuditEntry, {
        resourceType: "contentEntry",
        resourceId: "entry-1",
        action: "created",
      });

      // Even with 0 day retention, the log was just created so it won't be deleted
      const result = await t.mutation(api.auditLog.cleanupOldAuditLogs, {
        retentionDays: 0,
      });

      // The log is brand new, so still within cutoff
      expect(result.deletedCount).toBe(0);
    });
  });
});

describe("Audit Log Helper Functions", () => {
  describe("detectChangedFields", () => {
    it("should handle complex nested objects", () => {
      const prev = {
        data: { nested: { value: 1 } },
        array: [1, 2, 3],
      };
      const next = {
        data: { nested: { value: 2 } },
        array: [1, 2, 4],
      };

      const changes = detectChangedFields(prev, next);

      expect(changes).toContain("data");
      expect(changes).toContain("array");
    });
  });

  describe("generateChangeSummary", () => {
    it("should handle all action types", () => {
      const actions = [
        "created",
        "updated",
        "published",
        "unpublished",
        "deleted",
        "restored",
        "duplicated",
        "scheduled",
        "locked",
        "unlocked",
        "rolledBack",
        "migrated",
      ] as const;

      for (const action of actions) {
        const summary = generateChangeSummary(action, "contentEntry");
        expect(summary).toBeDefined();
        expect(summary.length).toBeGreaterThan(0);
      }
    });
  });
});
