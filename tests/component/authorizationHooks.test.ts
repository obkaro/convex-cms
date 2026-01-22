/**
 * Authorization Hooks Tests
 *
 * Tests for the authorization hooks infrastructure that enables
 * custom permission logic beyond the built-in RBAC system.
 */

import { describe, it, expect, vi } from "vitest";
import {
  executeAuthorizationHooks,
  operationToRbac,
  contextToRbacOptions,
  createContentEntryAuthContext,
  requireAuthorization,
} from "../../src/component/authorizationHooks.js";
import type {
  AuthorizationHooks,
  AuthorizationHookContext,
  AuthorizationHookResult,
} from "../../src/client/types.js";
import { UnauthorizedError } from "../../src/component/authorization.js";
import type { CmsHookContext } from "../../src/client/types.js";

// Mock CmsHookContext for tests
const mockCtx: CmsHookContext = {
  db: {
    query: () => ({
      filter: () => ({ first: async () => null, collect: async () => [] }),
      first: async () => null,
      collect: async () => [],
    }),
    get: async () => null,
  },
  auth: {
    getUserIdentity: async () => null,
  },
  runMutation: async () => undefined,
  runQuery: async () => undefined,
};

// =============================================================================
// operationToRbac Tests
// =============================================================================

describe("operationToRbac", () => {
  it("should map content type operations correctly", () => {
    expect(operationToRbac("contentTypes.create")).toEqual({
      resource: "contentTypes",
      action: "create",
    });
    expect(operationToRbac("contentTypes.read")).toEqual({
      resource: "contentTypes",
      action: "read",
    });
    expect(operationToRbac("contentTypes.update")).toEqual({
      resource: "contentTypes",
      action: "update",
    });
    expect(operationToRbac("contentTypes.delete")).toEqual({
      resource: "contentTypes",
      action: "delete",
    });
  });

  it("should map content entry operations correctly", () => {
    expect(operationToRbac("contentEntries.create")).toEqual({
      resource: "contentEntries",
      action: "create",
    });
    expect(operationToRbac("contentEntries.publish")).toEqual({
      resource: "contentEntries",
      action: "publish",
    });
    expect(operationToRbac("contentEntries.unpublish")).toEqual({
      resource: "contentEntries",
      action: "unpublish",
    });
    expect(operationToRbac("contentEntries.restore")).toEqual({
      resource: "contentEntries",
      action: "restore",
    });
  });

  it("should map schedule to update permission", () => {
    expect(operationToRbac("contentEntries.schedule")).toEqual({
      resource: "contentEntries",
      action: "update",
    });
  });

  it("should map media operations correctly", () => {
    expect(operationToRbac("mediaAssets.create")).toEqual({
      resource: "mediaAssets",
      action: "create",
    });
    expect(operationToRbac("mediaFolders.move")).toEqual({
      resource: "mediaFolders",
      action: "update",
    });
  });

  it("should map version operations to content entry permissions", () => {
    expect(operationToRbac("versions.read")).toEqual({
      resource: "contentEntries",
      action: "read",
    });
    expect(operationToRbac("versions.rollback")).toEqual({
      resource: "contentEntries",
      action: "update",
    });
  });
});

// =============================================================================
// contextToRbacOptions Tests
// =============================================================================

describe("contextToRbacOptions", () => {
  it("should create RBAC options from context", () => {
    const context: AuthorizationHookContext = {
      ctx: mockCtx,
      operation: "contentEntries.update",
      userId: "user123",
      role: "editor",
      resourceId: "entry456",
      resourceOwnerId: "user789",
    };

    const result = contextToRbacOptions(context);

    expect(result).toEqual({
      userId: "user123",
      role: "editor",
      resource: "contentEntries",
      action: "update",
      resourceOwnerId: "user789",
    });
  });

  it("should handle null role", () => {
    const context: AuthorizationHookContext = {
      ctx: mockCtx,
      operation: "contentEntries.read",
      userId: "user123",
      role: null,
    };

    const result = contextToRbacOptions(context);

    expect(result?.role).toBe(null);
  });

  it("should handle undefined userId", () => {
    const context: AuthorizationHookContext = {
      ctx: mockCtx,
      operation: "contentEntries.read",
      role: "viewer",
    };

    const result = contextToRbacOptions(context);

    expect(result?.userId).toBeUndefined();
  });
});

// =============================================================================
// createContentEntryAuthContext Tests
// =============================================================================

describe("createContentEntryAuthContext", () => {
  it("should create context with all fields", () => {
    const context = createContentEntryAuthContext(
      "contentEntries.publish",
      "user123",
      "editor",
      { _id: "entry456", createdBy: "user789", contentTypeId: "type1" },
      { _id: "type1", name: "blog_post" },
      { changeDescription: "Initial publish" }
    );

    expect(context).toEqual({
      operation: "contentEntries.publish",
      userId: "user123",
      role: "editor",
      resourceId: "entry456",
      resourceOwnerId: "user789",
      contentTypeId: "type1",
      contentTypeName: "blog_post",
      operationData: { changeDescription: "Initial publish" },
    });
  });

  it("should handle missing entry", () => {
    const context = createContentEntryAuthContext(
      "contentEntries.create",
      "user123",
      "author",
      undefined,
      { _id: "type1", name: "article" },
      { data: { title: "New Article" } }
    );

    expect(context.operation).toBe("contentEntries.create");
    expect(context.userId).toBe("user123");
    expect(context.resourceId).toBeUndefined();
    expect(context.resourceOwnerId).toBeUndefined();
    expect(context.contentTypeId).toBe("type1");
  });

  it("should handle null role", () => {
    const context = createContentEntryAuthContext(
      "contentEntries.read",
      "user123",
      null
    );

    expect(context.role).toBe(null);
  });
});

// =============================================================================
// executeAuthorizationHooks Tests
// =============================================================================

describe("executeAuthorizationHooks", () => {
  describe("no hooks configured", () => {
    it("should allow operation when no hooks and RBAC passes", async () => {
      const result = await executeAuthorizationHooks({
        context: {
          ctx: mockCtx,
          operation: "contentEntries.read",
          userId: "user123",
          role: "editor",
        },
        rbacOptions: {
          userId: "user123",
          role: "editor",
          resource: "contentEntries",
          action: "read",
        },
      });

      expect(result.allowed).toBe(true);
    });

    it("should deny operation when RBAC fails", async () => {
      const result = await executeAuthorizationHooks({
        context: {
          ctx: mockCtx,
          operation: "contentEntries.create",
          userId: "user123",
          role: "viewer",
        },
        rbacOptions: {
          userId: "user123",
          role: "viewer",
          resource: "contentEntries",
          action: "create",
        },
      });

      expect(result.allowed).toBe(false);
      expect(result.deniedBy).toBe("rbac");
    });

    it("should allow operation when skipRbac is true", async () => {
      const result = await executeAuthorizationHooks({
        context: {
          ctx: mockCtx,
          operation: "contentEntries.create",
          userId: "user123",
          role: "viewer", // Would normally be denied
        },
        rbacOptions: {
          userId: "user123",
          role: "viewer",
          resource: "contentEntries",
          action: "create",
        },
        skipRbac: true,
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe("beforeRbac hook", () => {
    it("should deny early when beforeRbac returns allowed: false", async () => {
      const hooks: AuthorizationHooks = {
        beforeRbac: async () => ({
          allowed: false,
          reason: "System in maintenance mode",
        }),
      };

      const result = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.create",
          userId: "user123",
          role: "admin",
        },
        rbacOptions: {
          userId: "user123",
          role: "admin",
          resource: "contentEntries",
          action: "create",
        },
      });

      expect(result.allowed).toBe(false);
      expect(result.deniedBy).toBe("beforeRbac");
      expect(result.reason).toBe("System in maintenance mode");
    });

    it("should skip RBAC when beforeRbac returns skipRbac: true", async () => {
      const hooks: AuthorizationHooks = {
        beforeRbac: async () => ({
          allowed: true,
          skipRbac: true,
        } as AuthorizationHookResult & { skipRbac?: boolean }),
      };

      // User with viewer role trying to create - would fail RBAC
      const result = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.create",
          userId: "user123",
          role: "viewer",
        },
        rbacOptions: {
          userId: "user123",
          role: "viewer",
          resource: "contentEntries",
          action: "create",
        },
      });

      expect(result.allowed).toBe(true);
    });

    it("should pass modifiedData from beforeRbac", async () => {
      const hooks: AuthorizationHooks = {
        beforeRbac: async () => ({
          allowed: true,
          modifiedData: { filtered: true },
        }),
      };

      const result = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.read",
          role: "editor",
        },
        rbacOptions: {
          role: "editor",
          resource: "contentEntries",
          action: "read",
        },
      });

      expect(result.allowed).toBe(true);
      expect(result.modifiedData).toEqual({ filtered: true });
    });
  });

  describe("afterRbac hook", () => {
    it("should deny when afterRbac returns allowed: false", async () => {
      const hooks: AuthorizationHooks = {
        afterRbac: async () => ({
          allowed: false,
          reason: "Rate limit exceeded",
        }),
      };

      const result = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.create",
          userId: "user123",
          role: "editor",
        },
        rbacOptions: {
          userId: "user123",
          role: "editor",
          resource: "contentEntries",
          action: "create",
        },
      });

      expect(result.allowed).toBe(false);
      expect(result.deniedBy).toBe("afterRbac");
      expect(result.reason).toBe("Rate limit exceeded");
    });

    it("should only run afterRbac when RBAC passes", async () => {
      const afterRbacMock = vi.fn(async () => ({ allowed: true }));
      const hooks: AuthorizationHooks = {
        afterRbac: afterRbacMock,
      };

      // RBAC will fail for viewer creating content
      await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.create",
          userId: "user123",
          role: "viewer",
        },
        rbacOptions: {
          userId: "user123",
          role: "viewer",
          resource: "contentEntries",
          action: "create",
        },
      });

      // afterRbac should not have been called since RBAC failed
      expect(afterRbacMock).not.toHaveBeenCalled();
    });

    it("should merge modifiedData from afterRbac", async () => {
      const hooks: AuthorizationHooks = {
        beforeRbac: async () => ({
          allowed: true,
          modifiedData: { fromBefore: true },
        }),
        afterRbac: async () => ({
          allowed: true,
          modifiedData: { fromAfter: true },
        }),
      };

      const result = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.read",
          role: "editor",
        },
        rbacOptions: {
          role: "editor",
          resource: "contentEntries",
          action: "read",
        },
      });

      expect(result.allowed).toBe(true);
      expect(result.modifiedData).toEqual({
        fromBefore: true,
        fromAfter: true,
      });
    });
  });

  describe("operationHooks", () => {
    it("should run operation-specific hook", async () => {
      const hooks: AuthorizationHooks = {
        operationHooks: {
          "contentEntries.publish": async (context) => ({
            allowed: context.contentTypeName !== "legal_document",
            reason: context.contentTypeName === "legal_document"
              ? "Legal documents require special approval"
              : undefined,
          }),
        },
      };

      // Non-legal document should pass
      const allowedResult = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.publish",
          userId: "user123",
          role: "editor",
          contentTypeName: "blog_post",
        },
        rbacOptions: {
          userId: "user123",
          role: "editor",
          resource: "contentEntries",
          action: "publish",
        },
      });

      expect(allowedResult.allowed).toBe(true);

      // Legal document should fail
      const deniedResult = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.publish",
          userId: "user123",
          role: "editor",
          contentTypeName: "legal_document",
        },
        rbacOptions: {
          userId: "user123",
          role: "editor",
          resource: "contentEntries",
          action: "publish",
        },
      });

      expect(deniedResult.allowed).toBe(false);
      expect(deniedResult.deniedBy).toBe("operationHook");
      expect(deniedResult.reason).toBe("Legal documents require special approval");
    });

    it("should not run operation hook for different operations", async () => {
      const publishHookMock = vi.fn(async () => ({ allowed: false }));
      const hooks: AuthorizationHooks = {
        operationHooks: {
          "contentEntries.publish": publishHookMock,
        },
      };

      // This is a create operation, not publish
      await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.create",
          userId: "user123",
          role: "editor",
        },
        rbacOptions: {
          userId: "user123",
          role: "editor",
          resource: "contentEntries",
          action: "create",
        },
      });

      expect(publishHookMock).not.toHaveBeenCalled();
    });
  });

  describe("authorize hook", () => {
    it("should receive RBAC decision when RBAC passes", async () => {
      let receivedContext: any = null;

      const hooks: AuthorizationHooks = {
        authorize: async (context) => {
          receivedContext = context;
          return { allowed: true };
        },
      };

      await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.read",
          userId: "user123",
          role: "editor",
        },
        rbacOptions: {
          userId: "user123",
          role: "editor",
          resource: "contentEntries",
          action: "read",
        },
      });

      expect(receivedContext).not.toBeNull();
      expect(receivedContext.defaultDecision).toBeDefined();
      expect(receivedContext.defaultDecision.allowed).toBe(true);
      expect(receivedContext.defaultDecision.grantedScope).toBe("all");
    });

    it("should receive RBAC decision when RBAC denies", async () => {
      let receivedContext: any = null;

      const hooks: AuthorizationHooks = {
        authorize: async (context) => {
          receivedContext = context;
          // Pass through the RBAC decision
          return {
            allowed: context.defaultDecision.allowed,
            reason: context.defaultDecision.reason,
          };
        },
      };

      await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.create",
          userId: "user123",
          role: "viewer", // Viewers can't create
        },
        rbacOptions: {
          userId: "user123",
          role: "viewer",
          resource: "contentEntries",
          action: "create",
        },
      });

      expect(receivedContext).not.toBeNull();
      expect(receivedContext.defaultDecision.allowed).toBe(false);
      expect(receivedContext.defaultDecision.code).toBe("PERMISSION_DENIED");
      expect(receivedContext.defaultDecision.reason).toContain("does not have create permission");
    });

    it("should allow authorize hook to override RBAC denial", async () => {
      const hooks: AuthorizationHooks = {
        authorize: async (context) => {
          // Override RBAC denial for premium users (simulated)
          if (!context.defaultDecision.allowed && context.userId === "premium_user") {
            return { allowed: true };
          }
          return {
            allowed: context.defaultDecision.allowed,
            reason: context.defaultDecision.reason,
          };
        },
      };

      // Premium user can create even though RBAC would deny
      const premiumResult = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.create",
          userId: "premium_user",
          role: "viewer", // Normally denied
        },
        rbacOptions: {
          userId: "premium_user",
          role: "viewer",
          resource: "contentEntries",
          action: "create",
        },
      });

      expect(premiumResult.allowed).toBe(true);

      // Regular user is still denied
      const regularResult = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.create",
          userId: "regular_user",
          role: "viewer",
        },
        rbacOptions: {
          userId: "regular_user",
          role: "viewer",
          resource: "contentEntries",
          action: "create",
        },
      });

      expect(regularResult.allowed).toBe(false);
    });

    it("should allow authorize hook to deny when RBAC passes", async () => {
      const hooks: AuthorizationHooks = {
        authorize: async (context) => {
          // Extra restriction: deny publish on sensitive content types
          if (
            context.defaultDecision.allowed &&
            context.operation === "contentEntries.publish" &&
            context.contentTypeName === "sensitive_data"
          ) {
            return {
              allowed: false,
              reason: "Sensitive data requires manager approval",
            };
          }
          return { allowed: context.defaultDecision.allowed };
        },
      };

      // Sensitive content is denied even though RBAC would allow
      const sensitiveResult = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.publish",
          userId: "user123",
          role: "editor",
          contentTypeName: "sensitive_data",
        },
        rbacOptions: {
          userId: "user123",
          role: "editor",
          resource: "contentEntries",
          action: "publish",
        },
      });

      expect(sensitiveResult.allowed).toBe(false);
      expect(sensitiveResult.reason).toBe("Sensitive data requires manager approval");
      expect(sensitiveResult.deniedBy).toBe("authorize");

      // Regular content is allowed
      const regularResult = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.publish",
          userId: "user123",
          role: "editor",
          contentTypeName: "blog_post",
        },
        rbacOptions: {
          userId: "user123",
          role: "editor",
          resource: "contentEntries",
          action: "publish",
        },
      });

      expect(regularResult.allowed).toBe(true);
    });

    it("should pass modifiedData from authorize hook", async () => {
      const hooks: AuthorizationHooks = {
        authorize: async (_context) => {
          return {
            allowed: true,
            modifiedData: { authorizeTag: "processed" },
          };
        },
      };

      const result = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.read",
          role: "editor",
        },
        rbacOptions: {
          role: "editor",
          resource: "contentEntries",
          action: "read",
        },
      });

      expect(result.allowed).toBe(true);
      expect(result.modifiedData).toEqual({ authorizeTag: "processed" });
    });

    it("should not run authorize hook if beforeRbac denies without onDeny override", async () => {
      const authorizeMock = vi.fn(async () => ({ allowed: true }));

      const hooks: AuthorizationHooks = {
        beforeRbac: async () => ({
          allowed: false,
          reason: "Blocked early",
        }),
        authorize: authorizeMock,
      };

      await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.read",
          role: "editor",
        },
        rbacOptions: {
          role: "editor",
          resource: "contentEntries",
          action: "read",
        },
      });

      expect(authorizeMock).not.toHaveBeenCalled();
    });

    it("should run afterRbac only if authorize allows", async () => {
      const afterRbacMock = vi.fn(async () => ({ allowed: true }));

      const hooks: AuthorizationHooks = {
        authorize: async () => ({
          allowed: false,
          reason: "Blocked by authorize",
        }),
        afterRbac: afterRbacMock,
      };

      await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.read",
          role: "editor",
        },
        rbacOptions: {
          role: "editor",
          resource: "contentEntries",
          action: "read",
        },
      });

      // afterRbac should not be called since authorize denied
      expect(afterRbacMock).not.toHaveBeenCalled();
    });

    it("should call onDeny when authorize denies", async () => {
      const onDenyMock = vi.fn(async () => ({ allowed: false }));

      const hooks: AuthorizationHooks = {
        authorize: async () => ({
          allowed: false,
          reason: "Authorize blocked it",
        }),
        onDeny: onDenyMock,
      };

      await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.read",
          role: "editor",
        },
        rbacOptions: {
          role: "editor",
          resource: "contentEntries",
          action: "read",
        },
      });

      expect(onDenyMock).toHaveBeenCalled();
      // Type assertion needed because vitest mock types may be empty array
      const mockCalls = onDenyMock.mock.calls as unknown as Array<[AuthorizationHookContext]>;
      const callContext = mockCalls[0]?.[0];
      expect(callContext?.operationData?.deniedBy).toBe("authorize");
    });

    it("should allow onDeny to override authorize denial", async () => {
      const hooks: AuthorizationHooks = {
        authorize: async () => ({
          allowed: false,
          reason: "Authorize blocked it",
        }),
        onDeny: async (context) => {
          // Admin can override authorize denial
          if (context.role === "admin") {
            return { allowed: true };
          }
          return { allowed: false };
        },
      };

      // Admin gets override
      const adminResult = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.read",
          userId: "admin123",
          role: "admin",
        },
        rbacOptions: {
          userId: "admin123",
          role: "admin",
          resource: "contentEntries",
          action: "read",
        },
      });

      expect(adminResult.allowed).toBe(true);

      // Editor is still denied
      const editorResult = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.read",
          userId: "editor123",
          role: "editor",
        },
        rbacOptions: {
          userId: "editor123",
          role: "editor",
          resource: "contentEntries",
          action: "read",
        },
      });

      expect(editorResult.allowed).toBe(false);
    });

    it("should handle authorize hook errors gracefully", async () => {
      const hooks: AuthorizationHooks = {
        authorize: async () => {
          throw new Error("Authorize hook crashed");
        },
      };

      const result = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.read",
          role: "editor",
        },
        rbacOptions: {
          role: "editor",
          resource: "contentEntries",
          action: "read",
        },
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Authorize hook crashed");
      expect(result.deniedBy).toBe("authorize");
    });

    it("should work correctly in the full hook chain", async () => {
      const callOrder: string[] = [];

      const hooks: AuthorizationHooks = {
        beforeRbac: async () => {
          callOrder.push("beforeRbac");
          return { allowed: true };
        },
        authorize: async (context) => {
          callOrder.push("authorize");
          // Log the RBAC decision
          callOrder.push(`rbacAllowed:${context.defaultDecision.allowed}`);
          return { allowed: true };
        },
        afterRbac: async () => {
          callOrder.push("afterRbac");
          return { allowed: true };
        },
        operationHooks: {
          "contentEntries.publish": async () => {
            callOrder.push("operationHook");
            return { allowed: true };
          },
        },
      };

      const result = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.publish",
          userId: "user123",
          role: "editor",
        },
        rbacOptions: {
          userId: "user123",
          role: "editor",
          resource: "contentEntries",
          action: "publish",
        },
      });

      expect(result.allowed).toBe(true);
      expect(callOrder).toEqual([
        "beforeRbac",
        "authorize",
        "rbacAllowed:true",
        "afterRbac",
        "operationHook",
      ]);
    });
  });

  describe("onDeny hook", () => {
    it("should call onDeny when beforeRbac denies", async () => {
      const onDenyMock = vi.fn(async (_context: AuthorizationHookContext) => ({
        allowed: false,
      }));

      const hooks: AuthorizationHooks = {
        beforeRbac: async () => ({
          allowed: false,
          reason: "Blocked by beforeRbac",
        }),
        onDeny: onDenyMock,
      };

      await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.create",
          userId: "user123",
          role: "editor",
        },
        rbacOptions: {
          userId: "user123",
          role: "editor",
          resource: "contentEntries",
          action: "create",
        },
      });

      expect(onDenyMock).toHaveBeenCalled();
      const callContext = onDenyMock.mock.calls[0][0];
      expect(callContext.operationData?.deniedBy).toBe("beforeRbac");
    });

    it("should allow onDeny to override denial", async () => {
      const hooks: AuthorizationHooks = {
        afterRbac: async () => ({
          allowed: false,
          reason: "Temporarily blocked",
        }),
        onDeny: async (context) => {
          // Override for admin users
          if (context.role === "admin") {
            return { allowed: true };
          }
          return { allowed: false };
        },
      };

      // Admin should be allowed (onDeny overrides)
      const adminResult = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.create",
          userId: "admin123",
          role: "admin",
        },
        rbacOptions: {
          userId: "admin123",
          role: "admin",
          resource: "contentEntries",
          action: "create",
        },
      });

      expect(adminResult.allowed).toBe(true);

      // Editor should still be denied
      const editorResult = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.create",
          userId: "editor123",
          role: "editor",
        },
        rbacOptions: {
          userId: "editor123",
          role: "editor",
          resource: "contentEntries",
          action: "create",
        },
      });

      expect(editorResult.allowed).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should treat hook errors as denials", async () => {
      const hooks: AuthorizationHooks = {
        beforeRbac: async () => {
          throw new Error("Hook crashed");
        },
      };

      const result = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.read",
          role: "editor",
        },
        rbacOptions: {
          role: "editor",
          resource: "contentEntries",
          action: "read",
        },
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Hook crashed");
    });

    it("should handle non-Error throws", async () => {
      const hooks: AuthorizationHooks = {
        afterRbac: async () => {
          throw "String error";
        },
      };

      const result = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.read",
          role: "editor",
        },
        rbacOptions: {
          role: "editor",
          resource: "contentEntries",
          action: "read",
        },
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Authorization hook failed");
    });
  });

  describe("complex scenarios", () => {
    it("should handle full hook chain", async () => {
      const callOrder: string[] = [];

      const hooks: AuthorizationHooks = {
        beforeRbac: async () => {
          callOrder.push("beforeRbac");
          return { allowed: true };
        },
        afterRbac: async () => {
          callOrder.push("afterRbac");
          return { allowed: true };
        },
        operationHooks: {
          "contentEntries.publish": async () => {
            callOrder.push("operationHook");
            return { allowed: true };
          },
        },
      };

      const result = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.publish",
          userId: "user123",
          role: "editor",
        },
        rbacOptions: {
          userId: "user123",
          role: "editor",
          resource: "contentEntries",
          action: "publish",
        },
      });

      expect(result.allowed).toBe(true);
      expect(callOrder).toEqual(["beforeRbac", "afterRbac", "operationHook"]);
    });

    it("should handle ownership-based authorization for authors", async () => {
      const hooks: AuthorizationHooks = {
        afterRbac: async (context) => {
          // Additional team-based check
          if (context.operationData?.teamId !== "team1") {
            return {
              allowed: false,
              reason: "Not a member of the content team",
            };
          }
          return { allowed: true };
        },
      };

      // Same team should pass
      const sameTeamResult = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.update",
          userId: "author1",
          role: "author",
          resourceOwnerId: "author1",
          operationData: { teamId: "team1" },
        },
        rbacOptions: {
          userId: "author1",
          role: "author",
          resource: "contentEntries",
          action: "update",
          resourceOwnerId: "author1",
        },
      });

      expect(sameTeamResult.allowed).toBe(true);

      // Different team should fail
      const differentTeamResult = await executeAuthorizationHooks({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.update",
          userId: "author1",
          role: "author",
          resourceOwnerId: "author1",
          operationData: { teamId: "team2" },
        },
        rbacOptions: {
          userId: "author1",
          role: "author",
          resource: "contentEntries",
          action: "update",
          resourceOwnerId: "author1",
        },
      });

      expect(differentTeamResult.allowed).toBe(false);
    });
  });
});

// =============================================================================
// requireAuthorization Tests
// =============================================================================

describe("requireAuthorization", () => {
  it("should return result when allowed", async () => {
    const result = await requireAuthorization({
      context: {
        ctx: mockCtx,
        operation: "contentEntries.read",
        userId: "user123",
        role: "editor",
      },
      rbacOptions: {
        userId: "user123",
        role: "editor",
        resource: "contentEntries",
        action: "read",
      },
    });

    expect(result.allowed).toBe(true);
  });

  it("should throw UnauthorizedError when denied", async () => {
    await expect(
      requireAuthorization({
        context: {
          ctx: mockCtx,
          operation: "contentEntries.create",
          userId: "user123",
          role: "viewer",
        },
        rbacOptions: {
          userId: "user123",
          role: "viewer",
          resource: "contentEntries",
          action: "create",
        },
      })
    ).rejects.toThrow(UnauthorizedError);
  });

  it("should include context info in error", async () => {
    try {
      await requireAuthorization({
        context: {
          ctx: mockCtx,
          operation: "contentTypes.delete",
          userId: "user123",
          role: "editor",
        },
        rbacOptions: {
          userId: "user123",
          role: "editor",
          resource: "contentTypes",
          action: "delete",
        },
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedError);
      const authError = error as UnauthorizedError;
      expect(authError.resource).toBe("contentTypes");
      expect(authError.action).toBe("delete");
      expect(authError.userId).toBe("user123");
    }
  });

  it("should throw with custom reason from hooks", async () => {
    const hooks: AuthorizationHooks = {
      beforeRbac: async () => ({
        allowed: false,
        reason: "Custom denial reason from hook",
      }),
    };

    try {
      await requireAuthorization({
        hooks,
        context: {
          ctx: mockCtx,
          operation: "contentEntries.create",
          userId: "user123",
          role: "admin",
        },
        rbacOptions: {
          userId: "user123",
          role: "admin",
          resource: "contentEntries",
          action: "create",
        },
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedError);
      const authError = error as UnauthorizedError;
      expect(authError.message).toBe("Custom denial reason from hook");
    }
  });
});
