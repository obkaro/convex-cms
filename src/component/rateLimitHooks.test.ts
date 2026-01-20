/**
 * Tests for Rate Limit Hooks Execution Module
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  executeRateLimitHooks,
  requireRateLimit,
  RateLimitedError,
  createRateLimitContext,
  operationToCategory,
  createRateLimitKey,
  createRateLimitName,
  DEFAULT_TIER_LIMITS,
  getTierLimit,
  type ExecuteRateLimitOptions,
  type RateLimitResult,
} from "./rateLimitHooks.js";
import type {
  RateLimitHooks,
  RateLimitHookContext,
  RateLimitCheckResult,
  RateLimitConsumeResult,
  CmsOperation,
  OperationCategory,
} from "../client/types.js";

// =============================================================================
// Test Utilities
// =============================================================================

function createTestContext(
  operation: CmsOperation,
  options: Partial<RateLimitHookContext> = {}
): RateLimitHookContext {
  return {
    operation,
    operationCategory: operationToCategory(operation),
    userId: "user123",
    role: "editor",
    timestamp: Date.now(),
    ...options,
  };
}

// =============================================================================
// operationToCategory Tests
// =============================================================================

describe("operationToCategory", () => {
  it("categorizes read operations correctly", () => {
    expect(operationToCategory("contentEntries.read")).toBe("read");
    expect(operationToCategory("contentTypes.read")).toBe("read");
    expect(operationToCategory("mediaAssets.read")).toBe("read");
    expect(operationToCategory("versions.read")).toBe("read");
  });

  it("categorizes write operations correctly", () => {
    expect(operationToCategory("contentEntries.create")).toBe("write");
    expect(operationToCategory("contentEntries.update")).toBe("write");
    expect(operationToCategory("contentEntries.delete")).toBe("write");
    expect(operationToCategory("contentEntries.restore")).toBe("write");
  });

  it("categorizes publish operations correctly", () => {
    expect(operationToCategory("contentEntries.publish")).toBe("publish");
    expect(operationToCategory("contentEntries.unpublish")).toBe("publish");
    expect(operationToCategory("contentEntries.schedule")).toBe("publish");
  });

  it("categorizes media operations correctly", () => {
    expect(operationToCategory("mediaAssets.create")).toBe("media");
    expect(operationToCategory("mediaAssets.update")).toBe("media");
    expect(operationToCategory("mediaAssets.delete")).toBe("media");
    expect(operationToCategory("mediaFolders.create")).toBe("media");
    expect(operationToCategory("mediaFolders.move")).toBe("media");
  });

  it("categorizes admin operations correctly", () => {
    expect(operationToCategory("contentTypes.create")).toBe("admin");
    expect(operationToCategory("contentTypes.update")).toBe("admin");
    expect(operationToCategory("contentTypes.delete")).toBe("admin");
  });
});

// =============================================================================
// createRateLimitContext Tests
// =============================================================================

describe("createRateLimitContext", () => {
  it("creates context with required fields", () => {
    const context = createRateLimitContext("contentEntries.create", {
      userId: "user456",
      role: "admin",
    });

    expect(context.operation).toBe("contentEntries.create");
    expect(context.operationCategory).toBe("write");
    expect(context.userId).toBe("user456");
    expect(context.role).toBe("admin");
    expect(typeof context.timestamp).toBe("number");
  });

  it("includes optional fields when provided", () => {
    const context = createRateLimitContext("contentEntries.create", {
      userId: "user789",
      role: "editor",
      contentTypeId: "ct123",
      contentTypeName: "blog_post",
      metadata: { tier: "pro" },
    });

    expect(context.contentTypeId).toBe("ct123");
    expect(context.contentTypeName).toBe("blog_post");
    expect(context.metadata).toEqual({ tier: "pro" });
  });
});

// =============================================================================
// createRateLimitKey Tests
// =============================================================================

describe("createRateLimitKey", () => {
  it("creates default key with userId and category", () => {
    const context = createTestContext("contentEntries.create");
    const key = createRateLimitKey(context);
    expect(key).toBe("user123:write");
  });

  it("creates key with anonymous when no userId", () => {
    const context = createTestContext("contentEntries.create", {
      userId: undefined,
    });
    const key = createRateLimitKey(context);
    expect(key).toBe("anonymous:write");
  });

  it("includes operation when specified", () => {
    const context = createTestContext("contentEntries.create");
    const key = createRateLimitKey(context, { includeOperation: true });
    expect(key).toBe("user123:contentEntries.create");
  });

  it("includes content type when specified", () => {
    const context = createTestContext("contentEntries.create", {
      contentTypeName: "blog_post",
    });
    const key = createRateLimitKey(context, { includeContentType: true });
    expect(key).toBe("user123:write:blog_post");
  });

  it("includes prefix when specified", () => {
    const context = createTestContext("contentEntries.create");
    const key = createRateLimitKey(context, { prefix: "cms" });
    expect(key).toBe("cms:user123:write");
  });

  it("combines all options", () => {
    const context = createTestContext("contentEntries.create", {
      contentTypeName: "blog_post",
    });
    const key = createRateLimitKey(context, {
      prefix: "cms",
      includeOperation: true,
      includeContentType: true,
    });
    expect(key).toBe("cms:user123:contentEntries.create:blog_post");
  });
});

// =============================================================================
// createRateLimitName Tests
// =============================================================================

describe("createRateLimitName", () => {
  it("creates name with default prefix", () => {
    const context = createTestContext("contentEntries.create");
    const name = createRateLimitName(context);
    expect(name).toBe("cms.write");
  });

  it("creates name with custom prefix", () => {
    const context = createTestContext("contentEntries.publish");
    const name = createRateLimitName(context, "myapp");
    expect(name).toBe("myapp.publish");
  });
});

// =============================================================================
// DEFAULT_TIER_LIMITS and getTierLimit Tests
// =============================================================================

describe("DEFAULT_TIER_LIMITS", () => {
  it("has expected tier definitions", () => {
    expect(DEFAULT_TIER_LIMITS).toHaveProperty("free");
    expect(DEFAULT_TIER_LIMITS).toHaveProperty("pro");
    expect(DEFAULT_TIER_LIMITS).toHaveProperty("enterprise");
  });

  it("has expected categories for each tier", () => {
    for (const tier of ["free", "pro", "enterprise"] as const) {
      expect(DEFAULT_TIER_LIMITS[tier]).toHaveProperty("read");
      expect(DEFAULT_TIER_LIMITS[tier]).toHaveProperty("write");
      expect(DEFAULT_TIER_LIMITS[tier]).toHaveProperty("publish");
      expect(DEFAULT_TIER_LIMITS[tier]).toHaveProperty("media");
      expect(DEFAULT_TIER_LIMITS[tier]).toHaveProperty("admin");
    }
  });

  it("pro has higher limits than free", () => {
    expect(DEFAULT_TIER_LIMITS.pro.read.rate).toBeGreaterThan(
      DEFAULT_TIER_LIMITS.free.read.rate
    );
    expect(DEFAULT_TIER_LIMITS.pro.write.rate).toBeGreaterThan(
      DEFAULT_TIER_LIMITS.free.write.rate
    );
  });

  it("enterprise has higher limits than pro", () => {
    expect(DEFAULT_TIER_LIMITS.enterprise.read.rate).toBeGreaterThan(
      DEFAULT_TIER_LIMITS.pro.read.rate
    );
    expect(DEFAULT_TIER_LIMITS.enterprise.write.rate).toBeGreaterThan(
      DEFAULT_TIER_LIMITS.pro.write.rate
    );
  });
});

describe("getTierLimit", () => {
  it("returns correct limit for tier and category", () => {
    const limit = getTierLimit("free", "write");
    expect(limit).toEqual({ rate: 10, period: 60000 });
  });

  it("returns different limits for different tiers", () => {
    const freeLimit = getTierLimit("free", "read");
    const proLimit = getTierLimit("pro", "read");
    expect(proLimit.rate).toBeGreaterThan(freeLimit.rate);
  });
});

// =============================================================================
// RateLimitedError Tests
// =============================================================================

describe("RateLimitedError", () => {
  it("creates error with message", () => {
    const error = new RateLimitedError("Rate limit exceeded");
    expect(error.message).toBe("Rate limit exceeded");
    expect(error.name).toBe("RateLimitedError");
    expect(error.code).toBe("RATE_LIMITED");
  });

  it("creates error with options", () => {
    const error = new RateLimitedError("Too many requests", {
      retryAt: Date.now() + 10000,
      operation: "contentEntries.create",
      operationCategory: "write",
      rateLimitInfo: {
        limitName: "cms.write",
        remaining: 0,
        limit: 10,
      },
    });

    expect(error.retryAt).toBeDefined();
    expect(error.operation).toBe("contentEntries.create");
    expect(error.operationCategory).toBe("write");
    expect(error.rateLimitInfo?.limitName).toBe("cms.write");
  });

  it("toUserMessage returns retry info", () => {
    const retryAt = Date.now() + 5000;
    const error = new RateLimitedError("Rate limit exceeded", { retryAt });
    const message = error.toUserMessage();
    expect(message).toContain("Rate limit exceeded");
    expect(message).toContain("retry in");
  });

  it("toUserMessage returns simple message when no retry time", () => {
    const error = new RateLimitedError("Rate limit exceeded");
    expect(error.toUserMessage()).toBe("Rate limit exceeded");
  });
});

// =============================================================================
// executeRateLimitHooks Tests
// =============================================================================

describe("executeRateLimitHooks", () => {
  describe("when no hooks configured", () => {
    it("returns allowed and skipped", async () => {
      const result = await executeRateLimitHooks({
        context: createTestContext("contentEntries.create"),
      });

      expect(result.allowed).toBe(true);
      expect(result.skipped).toBe(true);
    });

    it("returns allowed when hooks object is empty", async () => {
      const result = await executeRateLimitHooks({
        hooks: {},
        context: createTestContext("contentEntries.create"),
      });

      expect(result.allowed).toBe(true);
      expect(result.skipped).toBe(true);
    });
  });

  describe("when operation is excluded", () => {
    it("returns allowed and skipped", async () => {
      const hooks: RateLimitHooks = {
        excludeOperations: ["contentEntries.create"],
        check: vi.fn(),
      };

      const result = await executeRateLimitHooks({
        hooks,
        context: createTestContext("contentEntries.create"),
      });

      expect(result.allowed).toBe(true);
      expect(result.skipped).toBe(true);
      expect(hooks.check).not.toHaveBeenCalled();
    });
  });

  describe("when category is excluded", () => {
    it("returns allowed and skipped", async () => {
      const hooks: RateLimitHooks = {
        excludeCategories: ["read"],
        check: vi.fn(),
      };

      const result = await executeRateLimitHooks({
        hooks,
        context: createTestContext("contentEntries.read"),
      });

      expect(result.allowed).toBe(true);
      expect(result.skipped).toBe(true);
      expect(hooks.check).not.toHaveBeenCalled();
    });
  });

  describe("when admin is exempted", () => {
    it("returns allowed and skipped for admin users", async () => {
      const hooks: RateLimitHooks = {
        skipForAdmin: true,
        check: vi.fn(),
      };

      const result = await executeRateLimitHooks({
        hooks,
        context: createTestContext("contentEntries.create", { role: "admin" }),
      });

      expect(result.allowed).toBe(true);
      expect(result.skipped).toBe(true);
      expect(hooks.check).not.toHaveBeenCalled();
    });

    it("does not exempt non-admin users", async () => {
      const hooks: RateLimitHooks = {
        skipForAdmin: true,
        check: vi.fn().mockResolvedValue({ allowed: true }),
      };

      const result = await executeRateLimitHooks({
        hooks,
        context: createTestContext("contentEntries.create", { role: "editor" }),
      });

      expect(hooks.check).toHaveBeenCalled();
    });
  });

  describe("check hook execution", () => {
    it("calls check hook with context", async () => {
      const checkFn = vi.fn().mockResolvedValue({ allowed: true });
      const hooks: RateLimitHooks = { check: checkFn };
      const context = createTestContext("contentEntries.create");

      await executeRateLimitHooks({ hooks, context });

      expect(checkFn).toHaveBeenCalledWith(context);
    });

    it("returns allowed when check passes", async () => {
      const hooks: RateLimitHooks = {
        check: vi.fn().mockResolvedValue({ allowed: true }),
      };

      const result = await executeRateLimitHooks({
        hooks,
        context: createTestContext("contentEntries.create"),
      });

      expect(result.allowed).toBe(true);
      expect(result.skipped).toBe(false);
    });

    it("returns denied when check fails", async () => {
      const hooks: RateLimitHooks = {
        check: vi.fn().mockResolvedValue({
          allowed: false,
          retryAt: Date.now() + 10000,
          reason: "Too many requests",
        }),
      };

      const result = await executeRateLimitHooks({
        hooks,
        context: createTestContext("contentEntries.create"),
      });

      expect(result.allowed).toBe(false);
      expect(result.retryAt).toBeDefined();
      expect(result.reason).toBe("Too many requests");
    });

    it("handles check hook errors gracefully (fail-open)", async () => {
      const hooks: RateLimitHooks = {
        check: vi.fn().mockRejectedValue(new Error("Hook error")),
      };

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await executeRateLimitHooks({
        hooks,
        context: createTestContext("contentEntries.create"),
      });

      expect(result.allowed).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("consume hook execution", () => {
    it("calls consume hook after check passes", async () => {
      const checkFn = vi.fn().mockResolvedValue({ allowed: true });
      const consumeFn = vi.fn().mockResolvedValue({ allowed: true, consumed: true });
      const hooks: RateLimitHooks = { check: checkFn, consume: consumeFn };
      const context = createTestContext("contentEntries.create");

      await executeRateLimitHooks({ hooks, context });

      expect(checkFn).toHaveBeenCalled();
      expect(consumeFn).toHaveBeenCalledWith(context);
    });

    it("does not call consume when check fails", async () => {
      const consumeFn = vi.fn();
      const hooks: RateLimitHooks = {
        check: vi.fn().mockResolvedValue({ allowed: false }),
        consume: consumeFn,
      };

      await executeRateLimitHooks({
        hooks,
        context: createTestContext("contentEntries.create"),
      });

      expect(consumeFn).not.toHaveBeenCalled();
    });

    it("returns denied when consume fails", async () => {
      const hooks: RateLimitHooks = {
        check: vi.fn().mockResolvedValue({ allowed: true }),
        consume: vi.fn().mockResolvedValue({
          allowed: false,
          consumed: false,
          reason: "Race condition - limit reached",
        }),
      };

      const result = await executeRateLimitHooks({
        hooks,
        context: createTestContext("contentEntries.create"),
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Race condition - limit reached");
    });
  });

  describe("config hook execution", () => {
    it("calls getConfig hook before check", async () => {
      const getConfigFn = vi.fn().mockResolvedValue({
        enabled: true,
        config: { rate: 10, period: 60000 },
      });
      const checkFn = vi.fn().mockResolvedValue({ allowed: true });
      const hooks: RateLimitHooks = { getConfig: getConfigFn, check: checkFn };
      const context = createTestContext("contentEntries.create");

      const result = await executeRateLimitHooks({ hooks, context });

      expect(getConfigFn).toHaveBeenCalledWith(context);
      expect(result.config?.enabled).toBe(true);
    });

    it("skips rate limiting when config says disabled", async () => {
      const checkFn = vi.fn();
      const hooks: RateLimitHooks = {
        getConfig: vi.fn().mockResolvedValue({ enabled: false }),
        check: checkFn,
      };

      const result = await executeRateLimitHooks({
        hooks,
        context: createTestContext("contentEntries.create"),
      });

      expect(result.allowed).toBe(true);
      expect(result.skipped).toBe(true);
      expect(checkFn).not.toHaveBeenCalled();
    });
  });

  describe("operation-specific hooks", () => {
    it("uses operation-specific check hook when provided", async () => {
      const globalCheck = vi.fn().mockResolvedValue({ allowed: true });
      const operationCheck = vi.fn().mockResolvedValue({ allowed: false, reason: "Publish limit reached" });

      const hooks: RateLimitHooks = {
        check: globalCheck,
        operationHooks: {
          "contentEntries.publish": {
            check: operationCheck,
          },
        },
      };

      const result = await executeRateLimitHooks({
        hooks,
        context: createTestContext("contentEntries.publish"),
      });

      expect(globalCheck).not.toHaveBeenCalled();
      expect(operationCheck).toHaveBeenCalled();
      expect(result.allowed).toBe(false);
    });

    it("falls back to global hook when operation hook not defined", async () => {
      const globalCheck = vi.fn().mockResolvedValue({ allowed: true });

      const hooks: RateLimitHooks = {
        check: globalCheck,
        operationHooks: {},
      };

      await executeRateLimitHooks({
        hooks,
        context: createTestContext("contentEntries.create"),
      });

      expect(globalCheck).toHaveBeenCalled();
    });
  });

  describe("onRateLimited callback", () => {
    it("calls onRateLimited when rate limited", async () => {
      const onRateLimitedFn = vi.fn();
      const hooks: RateLimitHooks = {
        check: vi.fn().mockResolvedValue({
          allowed: false,
          reason: "Limit exceeded",
        }),
        onRateLimited: onRateLimitedFn,
      };
      const context = createTestContext("contentEntries.create");

      await executeRateLimitHooks({ hooks, context });

      expect(onRateLimitedFn).toHaveBeenCalledWith(context, {
        allowed: false,
        reason: "Limit exceeded",
      });
    });

    it("does not call onRateLimited when allowed", async () => {
      const onRateLimitedFn = vi.fn();
      const hooks: RateLimitHooks = {
        check: vi.fn().mockResolvedValue({ allowed: true }),
        onRateLimited: onRateLimitedFn,
      };

      await executeRateLimitHooks({
        hooks,
        context: createTestContext("contentEntries.create"),
      });

      expect(onRateLimitedFn).not.toHaveBeenCalled();
    });

    it("handles onRateLimited errors gracefully", async () => {
      const hooks: RateLimitHooks = {
        check: vi.fn().mockResolvedValue({ allowed: false }),
        onRateLimited: vi.fn().mockRejectedValue(new Error("Callback error")),
      };

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Should not throw
      const result = await executeRateLimitHooks({
        hooks,
        context: createTestContext("contentEntries.create"),
      });

      expect(result.allowed).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("rateLimitInfo passthrough", () => {
    it("includes rateLimitInfo in result", async () => {
      const hooks: RateLimitHooks = {
        check: vi.fn().mockResolvedValue({
          allowed: true,
          rateLimitInfo: {
            limitName: "cms.write",
            remaining: 5,
            limit: 10,
            windowMs: 60000,
          },
        }),
      };

      const result = await executeRateLimitHooks({
        hooks,
        context: createTestContext("contentEntries.create"),
      });

      expect(result.rateLimitInfo).toEqual({
        limitName: "cms.write",
        remaining: 5,
        limit: 10,
        windowMs: 60000,
      });
    });
  });
});

// =============================================================================
// requireRateLimit Tests
// =============================================================================

describe("requireRateLimit", () => {
  it("returns result when allowed", async () => {
    const hooks: RateLimitHooks = {
      check: vi.fn().mockResolvedValue({ allowed: true }),
    };

    const result = await requireRateLimit({
      hooks,
      context: createTestContext("contentEntries.create"),
    });

    expect(result.allowed).toBe(true);
  });

  it("throws RateLimitedError when rate limited", async () => {
    const hooks: RateLimitHooks = {
      check: vi.fn().mockResolvedValue({
        allowed: false,
        retryAt: Date.now() + 10000,
        reason: "Too many requests",
      }),
    };

    await expect(
      requireRateLimit({
        hooks,
        context: createTestContext("contentEntries.create"),
      })
    ).rejects.toThrow(RateLimitedError);
  });

  it("includes operation info in error", async () => {
    const hooks: RateLimitHooks = {
      check: vi.fn().mockResolvedValue({ allowed: false }),
    };

    try {
      await requireRateLimit({
        hooks,
        context: createTestContext("contentEntries.publish"),
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitedError);
      const rateLimitError = error as RateLimitedError;
      expect(rateLimitError.operation).toBe("contentEntries.publish");
      expect(rateLimitError.operationCategory).toBe("publish");
    }
  });
});

// =============================================================================
// Integration-style Tests
// =============================================================================

describe("Rate Limiting Integration", () => {
  it("supports convex-helpers style rate limiting", async () => {
    // Simulate convex-helpers defineRateLimits behavior
    const rateLimitStore = new Map<string, { tokens: number; lastRefill: number }>();

    const simulatedRateLimit = async (
      name: string,
      key: string,
      config: { rate: number; period: number }
    ) => {
      const fullKey = `${name}:${key}`;
      const now = Date.now();
      let state = rateLimitStore.get(fullKey);

      if (!state) {
        state = { tokens: config.rate, lastRefill: now };
        rateLimitStore.set(fullKey, state);
      }

      // Refill tokens
      const elapsed = now - state.lastRefill;
      const refillAmount = Math.floor((elapsed / config.period) * config.rate);
      state.tokens = Math.min(config.rate, state.tokens + refillAmount);
      state.lastRefill = now;

      if (state.tokens > 0) {
        state.tokens--;
        return { ok: true, retryAt: undefined };
      } else {
        return { ok: false, retryAt: now + config.period };
      }
    };

    const hooks: RateLimitHooks = {
      check: async (context) => {
        const result = await simulatedRateLimit(
          `cms.${context.operationCategory}`,
          context.userId ?? "anonymous",
          { rate: 2, period: 60000 }
        );
        return {
          allowed: result.ok,
          retryAt: result.retryAt,
        };
      },
    };

    // First request should succeed
    const result1 = await executeRateLimitHooks({
      hooks,
      context: createTestContext("contentEntries.create"),
    });
    expect(result1.allowed).toBe(true);

    // Second request should succeed
    const result2 = await executeRateLimitHooks({
      hooks,
      context: createTestContext("contentEntries.create"),
    });
    expect(result2.allowed).toBe(true);

    // Third request should be rate limited
    const result3 = await executeRateLimitHooks({
      hooks,
      context: createTestContext("contentEntries.create"),
    });
    expect(result3.allowed).toBe(false);
  });

  it("supports tiered rate limiting based on user role", async () => {
    const hooks: RateLimitHooks = {
      getConfig: async (context) => {
        const tierLimits = {
          admin: { rate: 100, period: 60000 },
          editor: { rate: 50, period: 60000 },
          author: { rate: 10, period: 60000 },
          viewer: { rate: 5, period: 60000 },
        };

        const config = tierLimits[context.role as keyof typeof tierLimits] ?? tierLimits.viewer;

        return {
          enabled: true,
          config,
          key: `${context.userId}:${context.role}`,
        };
      },
      check: async () => ({ allowed: true }),
    };

    const adminResult = await executeRateLimitHooks({
      hooks,
      context: createTestContext("contentEntries.create", { role: "admin" }),
    });

    expect(adminResult.config?.config?.rate).toBe(100);

    const viewerResult = await executeRateLimitHooks({
      hooks,
      context: createTestContext("contentEntries.create", { role: "viewer" }),
    });

    expect(viewerResult.config?.config?.rate).toBe(5);
  });
});
