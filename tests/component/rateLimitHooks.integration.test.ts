/**
 * Integration test for rate limit hooks - verifies the full export chain works
 * and the feature integrates properly with the CMS client infrastructure.
 */

import { describe, it, expect } from "vitest";

// Import from the public client API (like a parent app would)
import {
  // Main execution functions
  executeRateLimitHooks,
  requireRateLimit,

  // Error class
  RateLimitedError,

  // Context helpers
  createRateLimitContext,
  operationToCategory,

  // Key builders
  createRateLimitKey,
  createRateLimitName,

  // Default configurations
  DEFAULT_TIER_LIMITS,
  getTierLimit,

  // Types are available
  type RateLimitHooks,
  type RateLimitHookContext,
  type RateLimitCheckResult,
  type RateLimitConsumeResult,
  type RateLimitConfigResult,
  type ExecuteRateLimitOptions,
  type RateLimitResult,
  type OperationCategory,
} from "../../src/client/index.js";

// Verify ComponentConfig includes rateLimitHooks
import type { ComponentConfig, ResolvedComponentConfig } from "../../src/client/types.js";
import { resolveConfig } from "../../src/client/types.js";

describe("Rate Limit Hooks Integration", () => {
  describe("Exports are available from client/index.ts", () => {
    it("exports execution functions", () => {
      expect(typeof executeRateLimitHooks).toBe("function");
      expect(typeof requireRateLimit).toBe("function");
    });

    it("exports RateLimitedError class", () => {
      expect(RateLimitedError).toBeDefined();
      const error = new RateLimitedError("Test error");
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe("RATE_LIMITED");
    });

    it("exports context helpers", () => {
      expect(typeof createRateLimitContext).toBe("function");
      expect(typeof operationToCategory).toBe("function");
    });

    it("exports key builders", () => {
      expect(typeof createRateLimitKey).toBe("function");
      expect(typeof createRateLimitName).toBe("function");
    });

    it("exports default tier limits", () => {
      expect(DEFAULT_TIER_LIMITS).toBeDefined();
      expect(typeof getTierLimit).toBe("function");
      expect(DEFAULT_TIER_LIMITS.free).toBeDefined();
      expect(DEFAULT_TIER_LIMITS.pro).toBeDefined();
      expect(DEFAULT_TIER_LIMITS.enterprise).toBeDefined();
    });
  });

  describe("ComponentConfig includes rateLimitHooks", () => {
    it("resolveConfig preserves rateLimitHooks", () => {
      const checkFn = async () => ({ allowed: true });

      const config: ComponentConfig = {
        rateLimitHooks: {
          check: checkFn,
          skipForAdmin: true,
          excludeCategories: ["read"],
        },
      };

      const resolved = resolveConfig(config);

      expect(resolved.rateLimitHooks).toBeDefined();
      expect(resolved.rateLimitHooks?.check).toBe(checkFn);
      expect(resolved.rateLimitHooks?.skipForAdmin).toBe(true);
      expect(resolved.rateLimitHooks?.excludeCategories).toEqual(["read"]);
    });

    it("ResolvedComponentConfig type allows rateLimitHooks to be optional", () => {
      const config: ComponentConfig = {};
      const resolved = resolveConfig(config);

      // This should compile - rateLimitHooks is optional
      expect(resolved.rateLimitHooks).toBeUndefined();
    });
  });

  describe("Full workflow simulation", () => {
    it("simulates a parent app implementing rate limiting", async () => {
      // Simulated rate limit state (in real app, this would be in database)
      const rateLimitState = new Map<string, { count: number; resetAt: number }>();

      // Parent app's rate limit implementation
      const rateLimitHooks: RateLimitHooks = {
        // Get dynamic config based on user role
        getConfig: async (context) => {
          const tierLimits: Record<string, { rate: number; period: number }> = {
            admin: { rate: 1000, period: 60000 },
            editor: { rate: 100, period: 60000 },
            author: { rate: 50, period: 60000 },
            viewer: { rate: 10, period: 60000 },
          };

          return {
            enabled: context.role !== "admin", // Admins exempt
            config: tierLimits[context.role ?? "viewer"],
            key: `${context.userId}:${context.operationCategory}`,
          };
        },

        // Check rate limit
        check: async (context) => {
          if (context.role === "admin") {
            return { allowed: true };
          }

          const key = createRateLimitKey(context);
          const now = Date.now();
          const state = rateLimitState.get(key);

          // Reset if window expired
          if (!state || now > state.resetAt) {
            return {
              allowed: true,
              rateLimitInfo: {
                limitName: createRateLimitName(context),
                remaining: 9, // Will be 9 after consume
                limit: 10,
                windowMs: 60000,
              },
            };
          }

          // Check if over limit
          if (state.count >= 10) {
            return {
              allowed: false,
              retryAt: state.resetAt,
              reason: "Rate limit exceeded",
              rateLimitInfo: {
                limitName: createRateLimitName(context),
                remaining: 0,
                limit: 10,
                windowMs: 60000,
              },
            };
          }

          return { allowed: true };
        },

        // Record rate limit usage
        consume: async (context) => {
          if (context.role === "admin") {
            return { allowed: true, consumed: true };
          }

          const key = createRateLimitKey(context);
          const now = Date.now();
          let state = rateLimitState.get(key);

          if (!state || now > state.resetAt) {
            state = { count: 0, resetAt: now + 60000 };
          }

          state.count++;
          rateLimitState.set(key, state);

          return {
            allowed: true,
            consumed: true,
            rateLimitInfo: {
              remaining: 10 - state.count,
              limit: 10,
            },
          };
        },

        // Skip rate limiting for read operations
        excludeCategories: ["read"],

        // Log when rate limited
        onRateLimited: async (context, result) => {
          console.log(`Rate limited: ${context.userId} on ${context.operation}`);
        },
      };

      // Test 1: Read operations should be skipped
      const readContext = createRateLimitContext("contentEntries.read", {
        userId: "user1",
        role: "viewer",
      });
      const readResult = await executeRateLimitHooks({
        hooks: rateLimitHooks,
        context: readContext,
      });
      expect(readResult.allowed).toBe(true);
      expect(readResult.skipped).toBe(true);

      // Test 2: Write operations should be rate limited
      const writeContext = createRateLimitContext("contentEntries.create", {
        userId: "user1",
        role: "editor",
      });
      const writeResult = await executeRateLimitHooks({
        hooks: rateLimitHooks,
        context: writeContext,
      });
      expect(writeResult.allowed).toBe(true);
      expect(writeResult.skipped).toBe(false);

      // Test 3: Admin users bypass rate limiting
      const adminContext = createRateLimitContext("contentEntries.create", {
        userId: "admin1",
        role: "admin",
      });
      const adminResult = await executeRateLimitHooks({
        hooks: rateLimitHooks,
        context: adminContext,
      });
      expect(adminResult.allowed).toBe(true);
    });

    it("demonstrates error handling with RateLimitedError", async () => {
      const rateLimitHooks: RateLimitHooks = {
        check: async () => ({
          allowed: false,
          retryAt: Date.now() + 30000,
          reason: "Publish limit exceeded (5/day)",
        }),
      };

      const context = createRateLimitContext("contentEntries.publish", {
        userId: "user1",
        role: "author",
      });

      try {
        await requireRateLimit({ hooks: rateLimitHooks, context });
        expect.fail("Should have thrown RateLimitedError");
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitedError);

        const rateLimitError = error as RateLimitedError;
        expect(rateLimitError.code).toBe("RATE_LIMITED");
        expect(rateLimitError.operation).toBe("contentEntries.publish");
        expect(rateLimitError.operationCategory).toBe("publish");
        expect(rateLimitError.retryAt).toBeDefined();

        // Test user-friendly message
        const message = rateLimitError.toUserMessage();
        expect(message).toContain("Publish limit exceeded");
        expect(message).toContain("retry in");
      }
    });
  });
});
