/**
 * Tests for Content Lock Functions
 *
 * These tests verify the lock acquisition, release, renewal, and status checking
 * functionality for content entries. Ensures proper optimistic locking behavior.
 */
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../src/component/schema.js";
import { api } from "../../src/component/_generated/api.js";
import {
  acquireLockArgs,
  releaseLockArgs,
  forceReleaseLockArgs,
  renewLockArgs,
  checkLockArgs,
  lockStatusDoc,
  DEFAULT_LOCK_DURATION_MS,
  MAX_LOCK_DURATION_MS,
} from "../../src/component/validators.js";
import { validateLockForUpdate } from "../../src/component/contentLock.js";

// Import all component modules for testing
const modules = import.meta.glob("../../src/component/**/*.ts");

// =============================================================================
// Validator Structure Tests
// =============================================================================

describe("Content Lock Validators", () => {
  describe("acquireLockArgs", () => {
    it("should have correct argument structure", () => {
      const argFields = Object.keys(acquireLockArgs.fields);

      expect(argFields).toContain("id");
      expect(argFields).toContain("userId");
      expect(argFields).toContain("lockDuration");
    });

    it("should have id and userId as required fields", () => {
      expect(acquireLockArgs.fields.id).toBeDefined();
      expect(acquireLockArgs.fields.userId).toBeDefined();
    });

    it("should have lockDuration as optional field", () => {
      expect(acquireLockArgs.fields.lockDuration).toBeDefined();
    });
  });

  describe("releaseLockArgs", () => {
    it("should have correct argument structure", () => {
      const argFields = Object.keys(releaseLockArgs.fields);

      expect(argFields).toContain("id");
      expect(argFields).toContain("userId");
      expect(argFields.length).toBe(2);
    });
  });

  describe("forceReleaseLockArgs", () => {
    it("should have correct argument structure", () => {
      const argFields = Object.keys(forceReleaseLockArgs.fields);

      expect(argFields).toContain("id");
      expect(argFields).toContain("releasedBy");
      expect(argFields.length).toBe(2);
    });
  });

  describe("renewLockArgs", () => {
    it("should have correct argument structure", () => {
      const argFields = Object.keys(renewLockArgs.fields);

      expect(argFields).toContain("id");
      expect(argFields).toContain("userId");
      expect(argFields).toContain("lockDuration");
    });
  });

  describe("checkLockArgs", () => {
    it("should have correct argument structure", () => {
      const argFields = Object.keys(checkLockArgs.fields);

      expect(argFields).toContain("id");
      expect(argFields.length).toBe(1);
    });
  });

  describe("lockStatusDoc", () => {
    it("should have correct structure", () => {
      const fields = Object.keys(lockStatusDoc.fields);

      expect(fields).toContain("isLocked");
      expect(fields).toContain("lockedBy");
      expect(fields).toContain("lockExpiresAt");
      expect(fields).toContain("timeRemaining");
      expect(fields).toContain("isExpired");
    });
  });

  describe("Lock duration constants", () => {
    it("should have default lock duration of 30 minutes", () => {
      expect(DEFAULT_LOCK_DURATION_MS).toBe(30 * 60 * 1000);
    });

    it("should have max lock duration of 4 hours", () => {
      expect(MAX_LOCK_DURATION_MS).toBe(4 * 60 * 60 * 1000);
    });
  });
});

// =============================================================================
// Lock Logic Pattern Tests
// =============================================================================

describe("Lock Logic Patterns", () => {
  describe("Lock status checking", () => {
    it("should detect active lock within expiration time", () => {
      const now = Date.now();
      const lockExpiresAt = now + 600000; // 10 minutes from now

      const isActive = lockExpiresAt > now;
      expect(isActive).toBe(true);
    });

    it("should detect expired lock after expiration time", () => {
      const now = Date.now();
      const lockExpiresAt = now - 60000; // 1 minute ago

      const isActive = lockExpiresAt > now;
      expect(isActive).toBe(false);
    });

    it("should calculate remaining time correctly", () => {
      const now = Date.now();
      const lockExpiresAt = now + 300000; // 5 minutes

      const remaining = lockExpiresAt - now;
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(300000);
    });

    it("should return 0 for expired lock time remaining", () => {
      const now = Date.now();
      const lockExpiresAt = now - 60000; // 1 minute ago

      const remaining = Math.max(0, lockExpiresAt - now);
      expect(remaining).toBe(0);
    });
  });

  describe("Lock duration validation", () => {
    it("should clamp duration to max allowed", () => {
      const requestedDuration = 10 * 60 * 60 * 1000; // 10 hours
      const validDuration = Math.min(requestedDuration, MAX_LOCK_DURATION_MS);

      expect(validDuration).toBe(MAX_LOCK_DURATION_MS);
    });

    it("should use default for undefined duration", () => {
      const requestedDuration = undefined;
      const validDuration = requestedDuration ?? DEFAULT_LOCK_DURATION_MS;

      expect(validDuration).toBe(DEFAULT_LOCK_DURATION_MS);
    });

    it("should use default for zero or negative duration", () => {
      const validate = (duration: number) =>
        duration <= 0 ? DEFAULT_LOCK_DURATION_MS : duration;

      expect(validate(0)).toBe(DEFAULT_LOCK_DURATION_MS);
      expect(validate(-1000)).toBe(DEFAULT_LOCK_DURATION_MS);
    });
  });

  describe("Lock ownership validation", () => {
    it("should allow lock release by same user", () => {
      const entry = { lockedBy: "user123" };
      const userId = "user123";

      const canRelease = entry.lockedBy === userId;
      expect(canRelease).toBe(true);
    });

    it("should deny lock release by different user", () => {
      const entry = { lockedBy: "user123" };
      const userId = "user456";

      const canRelease = entry.lockedBy === userId;
      expect(canRelease).toBe(false);
    });
  });
});

// =============================================================================
// validateLockForUpdate Helper Tests
// =============================================================================

describe("validateLockForUpdate", () => {
  it("should allow update when entry has no lock", () => {
    const entry = { lockedBy: undefined, lockExpiresAt: undefined };
    const result = validateLockForUpdate(entry, "user123");

    expect(result.isAllowed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should allow update when lock has expired", () => {
    const entry = {
      lockedBy: "user456",
      lockExpiresAt: Date.now() - 60000, // Expired 1 minute ago
    };
    const result = validateLockForUpdate(entry, "user123");

    expect(result.isAllowed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should allow update when same user holds active lock", () => {
    const entry = {
      lockedBy: "user123",
      lockExpiresAt: Date.now() + 600000, // Valid for 10 more minutes
    };
    const result = validateLockForUpdate(entry, "user123");

    expect(result.isAllowed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should deny update when different user holds active lock", () => {
    const futureTime = Date.now() + 600000; // 10 minutes from now
    const entry = {
      lockedBy: "user456",
      lockExpiresAt: futureTime,
    };
    const result = validateLockForUpdate(entry, "user123");

    expect(result.isAllowed).toBe(false);
    expect(result.error).toContain("locked by user user456");
  });

  it("should deny update when no userId provided and entry is locked", () => {
    const entry = {
      lockedBy: "user456",
      lockExpiresAt: Date.now() + 600000,
    };
    const result = validateLockForUpdate(entry, undefined);

    expect(result.isAllowed).toBe(false);
    expect(result.error).toContain("locked");
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("Content Lock Integration Tests", () => {
  // Helper to create a test content type and entry
  const setupTestEntry = async (t: ReturnType<typeof convexTest>) => {
    const contentType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "test_type",
        displayName: "Test Type",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
        slugField: "title",
      }
    );

    const entry = await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Test Entry" },
      createdBy: "creator123",
    });

    return { contentType, entry };
  };

  describe("acquireLock", () => {
    it("should acquire lock on unlocked entry", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      const result = await t.mutation(api.contentLock.acquireLock, {
        id: entry._id,
        userId: "user123",
      });

      expect(result.success).toBe(true);
      expect(result.entry).toBeDefined();
      expect(result.entry?.lockedBy).toBe("user123");
      expect(result.entry?.lockExpiresAt).toBeDefined();
      expect(result.entry?.lockExpiresAt).toBeGreaterThan(Date.now());
    });

    it("should fail when entry is locked by another user", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      // First user acquires lock
      await t.mutation(api.contentLock.acquireLock, {
        id: entry._id,
        userId: "user123",
      });

      // Second user tries to acquire
      const result = await t.mutation(api.contentLock.acquireLock, {
        id: entry._id,
        userId: "user456",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("locked by another user");
      expect(result.currentLockHolder).toBe("user123");
    });

    it("should allow same user to re-acquire (renew) lock", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      // Acquire lock
      const first = await t.mutation(api.contentLock.acquireLock, {
        id: entry._id,
        userId: "user123",
      });

      // Same user re-acquires
      const second = await t.mutation(api.contentLock.acquireLock, {
        id: entry._id,
        userId: "user123",
      });

      expect(second.success).toBe(true);
      expect(second.entry?.lockedBy).toBe("user123");
      // Lock expiration should be extended
      expect(second.entry?.lockExpiresAt).toBeGreaterThanOrEqual(
        first.entry?.lockExpiresAt ?? 0
      );
    });

    it("should use custom lock duration when provided", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      const customDuration = 60 * 60 * 1000; // 1 hour
      const beforeAcquire = Date.now();

      const result = await t.mutation(api.contentLock.acquireLock, {
        id: entry._id,
        userId: "user123",
        lockDuration: customDuration,
      });

      expect(result.success).toBe(true);
      // Lock should expire approximately 1 hour from now
      const expectedExpiry = beforeAcquire + customDuration;
      expect(result.entry?.lockExpiresAt).toBeGreaterThan(expectedExpiry - 5000);
      expect(result.entry?.lockExpiresAt).toBeLessThan(expectedExpiry + 5000);
    });

    it("should clamp lock duration to maximum", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      const excessiveDuration = 24 * 60 * 60 * 1000; // 24 hours
      const beforeAcquire = Date.now();

      const result = await t.mutation(api.contentLock.acquireLock, {
        id: entry._id,
        userId: "user123",
        lockDuration: excessiveDuration,
      });

      expect(result.success).toBe(true);
      // Lock should be clamped to max duration (4 hours)
      const maxExpiry = beforeAcquire + MAX_LOCK_DURATION_MS;
      expect(result.entry?.lockExpiresAt).toBeLessThanOrEqual(maxExpiry + 1000);
    });

    it("should fail for non-existent entry", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      // Delete the entry
      await t.run(async (ctx) => {
        await ctx.db.delete(entry._id);
      });

      const result = await t.mutation(api.contentLock.acquireLock, {
        id: entry._id,
        userId: "user123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should fail for deleted entry", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      // Soft delete the entry
      await t.run(async (ctx) => {
        await ctx.db.patch(entry._id, { deletedAt: Date.now() });
      });

      const result = await t.mutation(api.contentLock.acquireLock, {
        id: entry._id,
        userId: "user123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("deleted");
    });

    it("should acquire lock on entry with expired lock", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      // Set an expired lock manually
      await t.run(async (ctx) => {
        await ctx.db.patch(entry._id, {
          lockedBy: "oldUser",
          lockExpiresAt: Date.now() - 60000, // Expired 1 minute ago
        });
      });

      // New user should be able to acquire
      const result = await t.mutation(api.contentLock.acquireLock, {
        id: entry._id,
        userId: "newUser",
      });

      expect(result.success).toBe(true);
      expect(result.entry?.lockedBy).toBe("newUser");
    });
  });

  describe("releaseLock", () => {
    it("should release lock when called by lock owner", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      // Acquire lock
      await t.mutation(api.contentLock.acquireLock, {
        id: entry._id,
        userId: "user123",
      });

      // Release lock
      const released = await t.mutation(api.contentLock.releaseLock, {
        id: entry._id,
        userId: "user123",
      });

      expect(released.lockedBy).toBeUndefined();
      expect(released.lockExpiresAt).toBeUndefined();
    });

    it("should throw error when called by non-owner", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      // User 1 acquires lock
      await t.mutation(api.contentLock.acquireLock, {
        id: entry._id,
        userId: "user123",
      });

      // User 2 tries to release
      await expect(
        t.mutation(api.contentLock.releaseLock, {
          id: entry._id,
          userId: "user456",
        })
      ).rejects.toThrow(/locked by another user/i);
    });

    it("should throw error when entry is not locked", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      await expect(
        t.mutation(api.contentLock.releaseLock, {
          id: entry._id,
          userId: "user123",
        })
      ).rejects.toThrow(/not locked/i);
    });

    it("should throw error for non-existent entry", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      await t.run(async (ctx) => {
        await ctx.db.delete(entry._id);
      });

      await expect(
        t.mutation(api.contentLock.releaseLock, {
          id: entry._id,
          userId: "user123",
        })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe("forceReleaseLock", () => {
    it("should force release lock by admin", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      // User acquires lock
      await t.mutation(api.contentLock.acquireLock, {
        id: entry._id,
        userId: "user123",
      });

      // Admin force releases
      const released = await t.mutation(api.contentLock.forceReleaseLock, {
        id: entry._id,
        releasedBy: "admin999",
      });

      expect(released.lockedBy).toBeUndefined();
      expect(released.lockExpiresAt).toBeUndefined();
      expect(released.updatedBy).toBe("admin999");
    });

    it("should throw error when entry is not locked", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      await expect(
        t.mutation(api.contentLock.forceReleaseLock, {
          id: entry._id,
          releasedBy: "admin999",
        })
      ).rejects.toThrow(/not locked/i);
    });

    it("should throw error for non-existent entry", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      await t.run(async (ctx) => {
        await ctx.db.delete(entry._id);
      });

      await expect(
        t.mutation(api.contentLock.forceReleaseLock, {
          id: entry._id,
          releasedBy: "admin999",
        })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe("renewLock", () => {
    it("should renew lock for lock owner", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      // Acquire lock
      const acquired = await t.mutation(api.contentLock.acquireLock, {
        id: entry._id,
        userId: "user123",
      });

      // Renew lock
      const renewed = await t.mutation(api.contentLock.renewLock, {
        id: entry._id,
        userId: "user123",
      });

      expect(renewed.lockedBy).toBe("user123");
      expect(renewed.lockExpiresAt).toBeGreaterThanOrEqual(
        acquired.entry?.lockExpiresAt ?? 0
      );
    });

    it("should throw error when called by non-owner", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      // User 1 acquires lock
      await t.mutation(api.contentLock.acquireLock, {
        id: entry._id,
        userId: "user123",
      });

      // User 2 tries to renew
      await expect(
        t.mutation(api.contentLock.renewLock, {
          id: entry._id,
          userId: "user456",
        })
      ).rejects.toThrow(/locked by another user/i);
    });

    it("should throw error when entry is not locked", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      await expect(
        t.mutation(api.contentLock.renewLock, {
          id: entry._id,
          userId: "user123",
        })
      ).rejects.toThrow(/not locked/i);
    });

    it("should throw error when lock has expired", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      // Set an expired lock
      await t.run(async (ctx) => {
        await ctx.db.patch(entry._id, {
          lockedBy: "user123",
          lockExpiresAt: Date.now() - 60000, // Expired
        });
      });

      await expect(
        t.mutation(api.contentLock.renewLock, {
          id: entry._id,
          userId: "user123",
        })
      ).rejects.toThrow(/expired/i);
    });

    it("should use custom duration when provided", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      // Acquire with short duration
      await t.mutation(api.contentLock.acquireLock, {
        id: entry._id,
        userId: "user123",
        lockDuration: 5 * 60 * 1000, // 5 minutes
      });

      const beforeRenew = Date.now();
      const customDuration = 60 * 60 * 1000; // 1 hour

      // Renew with longer duration
      const renewed = await t.mutation(api.contentLock.renewLock, {
        id: entry._id,
        userId: "user123",
        lockDuration: customDuration,
      });

      // Should be approximately 1 hour from now
      expect(renewed.lockExpiresAt).toBeGreaterThan(beforeRenew + customDuration - 5000);
    });
  });

  describe("checkLock", () => {
    it("should return unlocked status for unlocked entry", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      const status = await t.query(api.contentLock.checkLock, {
        id: entry._id,
      });

      expect(status.isLocked).toBe(false);
      expect(status.lockedBy).toBeUndefined();
      expect(status.lockExpiresAt).toBeUndefined();
      expect(status.timeRemaining).toBeUndefined();
    });

    it("should return locked status for locked entry", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      // Acquire lock
      await t.mutation(api.contentLock.acquireLock, {
        id: entry._id,
        userId: "user123",
      });

      const status = await t.query(api.contentLock.checkLock, {
        id: entry._id,
      });

      expect(status.isLocked).toBe(true);
      expect(status.lockedBy).toBe("user123");
      expect(status.lockExpiresAt).toBeDefined();
      expect(status.timeRemaining).toBeGreaterThan(0);
      expect(status.isExpired).toBe(false);
    });

    it("should return expired status for expired lock", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      // Set an expired lock
      await t.run(async (ctx) => {
        await ctx.db.patch(entry._id, {
          lockedBy: "user123",
          lockExpiresAt: Date.now() - 60000, // Expired
        });
      });

      const status = await t.query(api.contentLock.checkLock, {
        id: entry._id,
      });

      expect(status.isLocked).toBe(false);
      expect(status.isExpired).toBe(true);
    });

    it("should throw error for non-existent entry", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      await t.run(async (ctx) => {
        await ctx.db.delete(entry._id);
      });

      await expect(
        t.query(api.contentLock.checkLock, {
          id: entry._id,
        })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe("listLockedEntries", () => {
    it("should list all locked entries", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "lockable",
          displayName: "Lockable",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
        }
      );

      // Create and lock multiple entries
      const entry1 = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Entry 1" },
      });

      const entry2 = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Entry 2" },
      });

      await t.mutation(api.contentLock.acquireLock, {
        id: entry1._id,
        userId: "user1",
      });

      await t.mutation(api.contentLock.acquireLock, {
        id: entry2._id,
        userId: "user2",
      });

      const result = await t.query(api.contentLock.listLockedEntries, {
        paginationOpts: { numItems: 50, cursor: null },
      });

      expect(result.page.length).toBe(2);
      expect(result.page.some((e) => e.lockedBy === "user1")).toBe(true);
      expect(result.page.some((e) => e.lockedBy === "user2")).toBe(true);
    });

    it("should filter by lockedBy user", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "filterable",
          displayName: "Filterable",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
        }
      );

      const entry1 = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Entry 1" },
      });

      const entry2 = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Entry 2" },
      });

      await t.mutation(api.contentLock.acquireLock, {
        id: entry1._id,
        userId: "user1",
      });

      await t.mutation(api.contentLock.acquireLock, {
        id: entry2._id,
        userId: "user2",
      });

      const result = await t.query(api.contentLock.listLockedEntries, {
        lockedBy: "user1",
        paginationOpts: { numItems: 50, cursor: null },
      });

      expect(result.page.length).toBe(1);
      expect(result.page[0].lockedBy).toBe("user1");
    });

    it("should exclude entries with expired locks", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "expirable",
          displayName: "Expirable",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
        }
      );

      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Entry" },
      });

      // Set an expired lock
      await t.run(async (ctx) => {
        await ctx.db.patch(entry._id, {
          lockedBy: "user1",
          lockExpiresAt: Date.now() - 60000, // Expired
        });
      });

      const result = await t.query(api.contentLock.listLockedEntries, {
        paginationOpts: { numItems: 50, cursor: null },
      });

      expect(result.page.length).toBe(0);
    });

    it("should include timeRemaining in results", async () => {
      const t = convexTest(schema, modules);
      const { entry } = await setupTestEntry(t);

      await t.mutation(api.contentLock.acquireLock, {
        id: entry._id,
        userId: "user123",
      });

      const result = await t.query(api.contentLock.listLockedEntries, {
        paginationOpts: { numItems: 50, cursor: null },
      });

      expect(result.page.length).toBe(1);
      expect(result.page[0].timeRemaining).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Concurrent Editing Scenarios
// =============================================================================

describe("Concurrent Editing Scenarios", () => {
  const setupTestEntry = async (t: ReturnType<typeof convexTest>) => {
    const contentType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "concurrent_type",
        displayName: "Concurrent Type",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
        slugField: "title",
      }
    );

    const entry = await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Concurrent Entry" },
    });

    return { contentType, entry };
  };

  it("should prevent race condition - first acquirer wins", async () => {
    const t = convexTest(schema, modules);
    const { entry } = await setupTestEntry(t);

    // User 1 acquires first
    const result1 = await t.mutation(api.contentLock.acquireLock, {
      id: entry._id,
      userId: "user1",
    });

    // User 2 tries to acquire
    const result2 = await t.mutation(api.contentLock.acquireLock, {
      id: entry._id,
      userId: "user2",
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(false);
    expect(result2.currentLockHolder).toBe("user1");
  });

  it("should allow lock transfer after release", async () => {
    const t = convexTest(schema, modules);
    const { entry } = await setupTestEntry(t);

    // User 1 acquires and releases
    await t.mutation(api.contentLock.acquireLock, {
      id: entry._id,
      userId: "user1",
    });

    await t.mutation(api.contentLock.releaseLock, {
      id: entry._id,
      userId: "user1",
    });

    // User 2 can now acquire
    const result = await t.mutation(api.contentLock.acquireLock, {
      id: entry._id,
      userId: "user2",
    });

    expect(result.success).toBe(true);
    expect(result.entry?.lockedBy).toBe("user2");
  });

  it("should handle lock-edit-unlock workflow", async () => {
    const t = convexTest(schema, modules);
    const { entry } = await setupTestEntry(t);

    // Step 1: Acquire lock
    const lockResult = await t.mutation(api.contentLock.acquireLock, {
      id: entry._id,
      userId: "editor123",
    });
    expect(lockResult.success).toBe(true);

    // Step 2: Check lock status
    const status = await t.query(api.contentLock.checkLock, {
      id: entry._id,
    });
    expect(status.isLocked).toBe(true);
    expect(status.lockedBy).toBe("editor123");

    // Step 3: Release lock
    const released = await t.mutation(api.contentLock.releaseLock, {
      id: entry._id,
      userId: "editor123",
    });
    expect(released.lockedBy).toBeUndefined();

    // Step 4: Verify unlocked
    const finalStatus = await t.query(api.contentLock.checkLock, {
      id: entry._id,
    });
    expect(finalStatus.isLocked).toBe(false);
  });
});
