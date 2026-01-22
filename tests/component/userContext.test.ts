/**
 * User Context Handler Tests
 *
 * Comprehensive test suite for the user context handler module.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  // Types
  type UserContextInput,
  type UserContext,
  type CreateUserContextOptions,
  type UserContextValidationError,
  type UserContextValidationResult,
  // Error class
  UserContextError,
  // Validation functions
  isValidUserId,
  isValidRole,
  validateUserContextInput,
  // Creation functions
  resolveUserRole,
  createUserContext,
  createUserContextSync,
  // Extraction functions
  extractUserId,
  extractUserIdFromAuth,
  // Context builders
  buildAuthorizationContext,
  createAnonymousContext,
  createSystemContext,
  // Utility functions
  isAuthenticated,
  hasUserRole,
  isSystemContext,
  getUserDisplayId,
  validateUserContext,
} from "../../src/component/userContext.js";

import type { GetUserRoleHook, CmsOperation, CmsHookContext } from "../../src/client/types.js";

// =============================================================================
// Test Fixtures
// =============================================================================

// Mock CmsHookContext for testing
const mockCtx: CmsHookContext = {
  db: {
    query: () => ({
      filter: () => ({ first: async () => null, collect: async () => [] }),
      first: async () => null,
      collect: async () => [],
    }),
    get: async () => null,
  } as unknown as CmsHookContext["db"],
  auth: { getUserIdentity: async () => null },
  runMutation: async () => undefined,
  runQuery: async () => undefined,
};

const mockGetUserRole: GetUserRoleHook = vi.fn(async (_ctx, { userId }) => {
  const roles: Record<string, string> = {
    user_admin: "admin",
    user_editor: "editor",
    user_author: "author",
    user_viewer: "viewer",
    user_custom: "blog-author",
  };
  return roles[userId] ?? null;
});

const customRoles = {
  "blog-author": {
    name: "blog-author",
    displayName: "Blog Author",
    description: "Can manage blog posts",
    isSystem: false,
    permissions: [
      { resource: "contentEntries" as const, action: "create" as const },
      { resource: "contentEntries" as const, action: "read" as const },
    ],
  },
};

// =============================================================================
// isValidUserId Tests
// =============================================================================

describe("isValidUserId", () => {
  it("should return true for valid string user IDs", () => {
    expect(isValidUserId("user_123")).toBe(true);
    expect(isValidUserId("abc")).toBe(true);
    expect(isValidUserId("user-with-dashes")).toBe(true);
    expect(isValidUserId("user_with_underscores")).toBe(true);
    expect(isValidUserId("123")).toBe(true);
  });

  it("should return false for empty strings", () => {
    expect(isValidUserId("")).toBe(false);
    expect(isValidUserId("   ")).toBe(false);
    expect(isValidUserId("\t")).toBe(false);
    expect(isValidUserId("\n")).toBe(false);
  });

  it("should return false for non-string values", () => {
    expect(isValidUserId(null)).toBe(false);
    expect(isValidUserId(undefined)).toBe(false);
    expect(isValidUserId(123)).toBe(false);
    expect(isValidUserId({})).toBe(false);
    expect(isValidUserId([])).toBe(false);
  });
});

// =============================================================================
// isValidRole Tests
// =============================================================================

describe("isValidRole", () => {
  it("should return true for built-in roles", () => {
    expect(isValidRole("admin")).toBe(true);
    expect(isValidRole("editor")).toBe(true);
    expect(isValidRole("author")).toBe(true);
    expect(isValidRole("viewer")).toBe(true);
  });

  it("should return true for custom roles when provided", () => {
    expect(isValidRole("blog-author", customRoles)).toBe(true);
  });

  it("should return false for unknown roles", () => {
    expect(isValidRole("unknown")).toBe(false);
    expect(isValidRole("superadmin")).toBe(false);
    expect(isValidRole("blog-author")).toBe(false); // Without custom roles
  });

  it("should return false for null/undefined", () => {
    expect(isValidRole(null)).toBe(false);
    expect(isValidRole(undefined)).toBe(false);
  });
});

// =============================================================================
// validateUserContextInput Tests
// =============================================================================

describe("validateUserContextInput", () => {
  it("should pass validation for valid authenticated input", () => {
    const result = validateUserContextInput({ userId: "user_123" });
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it("should pass validation for anonymous users by default", () => {
    const result = validateUserContextInput({});
    expect(result.valid).toBe(true);
  });

  it("should fail when anonymous is not allowed", () => {
    const result = validateUserContextInput({}, { allowAnonymous: false });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0].code).toBe("ANONYMOUS_NOT_ALLOWED");
  });

  it("should validate user ID format", () => {
    const result = validateUserContextInput({ userId: "" });
    expect(result.valid).toBe(false);
    expect(result.errors![0].code).toBe("INVALID_USER_ID");
  });

  it("should validate role when provided", () => {
    const result = validateUserContextInput({ userId: "user_123", role: "unknown" });
    expect(result.valid).toBe(false);
    expect(result.errors![0].code).toBe("UNKNOWN_ROLE");
  });

  it("should accept custom roles", () => {
    const result = validateUserContextInput(
      { userId: "user_123", role: "blog-author" },
      { customRoles }
    );
    expect(result.valid).toBe(true);
  });

  it("should require role when specified", () => {
    const result = validateUserContextInput(
      { userId: "user_123" },
      { requireRole: true }
    );
    expect(result.valid).toBe(false);
    expect(result.errors![0].code).toBe("ROLE_REQUIRED");
  });
});

// =============================================================================
// resolveUserRole Tests
// =============================================================================

describe("resolveUserRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve role using getUserRole hook", async () => {
    const role = await resolveUserRole(mockCtx, "user_admin", mockGetUserRole);
    expect(role).toBe("admin");
    expect(mockGetUserRole).toHaveBeenCalledWith(mockCtx, { userId: "user_admin" });
  });

  it("should return null when hook is not provided", async () => {
    const role = await resolveUserRole(mockCtx, "user_123");
    expect(role).toBeNull();
  });

  it("should return null for unknown users", async () => {
    const role = await resolveUserRole(mockCtx, "unknown_user", mockGetUserRole);
    expect(role).toBeNull();
  });

  it("should throw UserContextError when hook fails", async () => {
    const failingHook: GetUserRoleHook = vi.fn().mockRejectedValue(new Error("Database error"));

    await expect(resolveUserRole(mockCtx, "user_123", failingHook)).rejects.toThrow(UserContextError);
    await expect(resolveUserRole(mockCtx, "user_123", failingHook)).rejects.toMatchObject({
      code: "HOOK_ERROR",
    });
  });
});

// =============================================================================
// createUserContext Tests
// =============================================================================

describe("createUserContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create context for authenticated user with role", async () => {
    const context = await createUserContext({
      ctx: mockCtx,
      input: { userId: "user_editor" },
      getUserRole: mockGetUserRole,
    });

    expect(context.userId).toBe("user_editor");
    expect(context.role).toBe("editor");
    expect(context.isAuthenticated).toBe(true);
    expect(context.hasRole).toBe(true);
    expect(context.roleDefinition).toBeDefined();
  });

  it("should create context with pre-provided role", async () => {
    const context = await createUserContext({
      input: { userId: "user_123", role: "admin" },
    });

    expect(context.userId).toBe("user_123");
    expect(context.role).toBe("admin");
    expect(context.hasRole).toBe(true);
  });

  it("should create context for anonymous user", async () => {
    const context = await createUserContext({
      input: {},
    });

    expect(context.userId).toBeUndefined();
    expect(context.role).toBeNull();
    expect(context.isAuthenticated).toBe(false);
    expect(context.hasRole).toBe(false);
  });

  it("should throw when anonymous is not allowed", async () => {
    await expect(
      createUserContext({
        input: {},
        allowAnonymous: false,
      })
    ).rejects.toThrow(UserContextError);
  });

  it("should throw when role is required but missing", async () => {
    await expect(
      createUserContext({
        ctx: mockCtx,
        input: { userId: "unknown_user" },
        getUserRole: mockGetUserRole,
        requireRole: true,
      })
    ).rejects.toThrow(UserContextError);
  });

  it("should pass through metadata", async () => {
    const context = await createUserContext({
      input: {
        userId: "user_123",
        role: "viewer",
        email: "test@example.com",
        displayName: "Test User",
        metadata: { tenant: "acme" },
      },
    });

    expect(context.email).toBe("test@example.com");
    expect(context.displayName).toBe("Test User");
    expect(context.metadata).toEqual({ tenant: "acme" });
  });

  it("should support custom roles", async () => {
    const context = await createUserContext({
      input: { userId: "user_123", role: "blog-author" },
      customRoles,
    });

    expect(context.role).toBe("blog-author");
    expect(context.hasRole).toBe(true);
    expect(context.roleDefinition?.name).toBe("blog-author");
  });
});

// =============================================================================
// createUserContextSync Tests
// =============================================================================

describe("createUserContextSync", () => {
  it("should create context synchronously", () => {
    const context = createUserContextSync({
      userId: "user_123",
      role: "editor",
    });

    expect(context.userId).toBe("user_123");
    expect(context.role).toBe("editor");
    expect(context.isAuthenticated).toBe(true);
    expect(context.hasRole).toBe(true);
  });

  it("should handle anonymous users", () => {
    const context = createUserContextSync({});

    expect(context.isAuthenticated).toBe(false);
    expect(context.hasRole).toBe(false);
  });
});

// =============================================================================
// extractUserId Tests
// =============================================================================

describe("extractUserId", () => {
  it("should extract from string", () => {
    expect(extractUserId("user_123")).toBe("user_123");
  });

  it("should extract from object with subject (Convex identity)", () => {
    expect(extractUserId({ subject: "user_123" })).toBe("user_123");
  });

  it("should extract from object with sub (JWT)", () => {
    expect(extractUserId({ sub: "user_123" })).toBe("user_123");
  });

  it("should extract from object with userId", () => {
    expect(extractUserId({ userId: "user_123" })).toBe("user_123");
  });

  it("should extract from object with id", () => {
    expect(extractUserId({ id: "user_123" })).toBe("user_123");
  });

  it("should extract from object with _id (MongoDB style)", () => {
    expect(extractUserId({ _id: "user_123" })).toBe("user_123");
  });

  it("should prioritize fields in correct order", () => {
    // subject takes priority
    expect(extractUserId({ subject: "sub_user", id: "id_user" })).toBe("sub_user");
  });

  it("should return undefined for null/undefined", () => {
    expect(extractUserId(null)).toBeUndefined();
    expect(extractUserId(undefined)).toBeUndefined();
  });

  it("should return undefined for empty objects", () => {
    expect(extractUserId({})).toBeUndefined();
  });
});

// =============================================================================
// extractUserIdFromAuth Tests
// =============================================================================

describe("extractUserIdFromAuth", () => {
  it("should extract from auth context", async () => {
    const authContext = {
      getUserIdentity: vi.fn().mockResolvedValue({ subject: "user_123" }),
    };

    const userId = await extractUserIdFromAuth(authContext);
    expect(userId).toBe("user_123");
  });

  it("should return undefined when not authenticated", async () => {
    const authContext = {
      getUserIdentity: vi.fn().mockResolvedValue(null),
    };

    const userId = await extractUserIdFromAuth(authContext);
    expect(userId).toBeUndefined();
  });
});

// =============================================================================
// buildAuthorizationContext Tests
// =============================================================================

describe("buildAuthorizationContext", () => {
  it("should build authorization context from user context", () => {
    const userContext: UserContext = {
      userId: "user_123",
      role: "editor",
      isAuthenticated: true,
      hasRole: true,
      metadata: { tenant: "acme" },
    };

    const authContext = buildAuthorizationContext(
      userContext,
      "contentEntries.update",
      {
        resourceId: "entry_456",
        resourceOwnerId: "user_123",
        contentTypeId: "type_789",
        contentTypeName: "blog_post",
      }
    );

    expect(authContext.operation).toBe("contentEntries.update");
    expect(authContext.userId).toBe("user_123");
    expect(authContext.role).toBe("editor");
    expect(authContext.resourceId).toBe("entry_456");
    expect(authContext.resourceOwnerId).toBe("user_123");
    expect(authContext.contentTypeId).toBe("type_789");
    expect(authContext.contentTypeName).toBe("blog_post");
    expect(authContext.operationData?._userMetadata).toEqual({ tenant: "acme" });
  });
});

// =============================================================================
// createAnonymousContext Tests
// =============================================================================

describe("createAnonymousContext", () => {
  it("should create anonymous context", () => {
    const context = createAnonymousContext();

    expect(context.userId).toBeUndefined();
    expect(context.role).toBeNull();
    expect(context.isAuthenticated).toBe(false);
    expect(context.hasRole).toBe(false);
  });
});

// =============================================================================
// createSystemContext Tests
// =============================================================================

describe("createSystemContext", () => {
  it("should create system context with admin role", () => {
    const context = createSystemContext();

    expect(context.userId).toBe("_system");
    expect(context.role).toBe("admin");
    expect(context.isAuthenticated).toBe(true);
    expect(context.hasRole).toBe(true);
    expect(context.metadata?.isSystemContext).toBe(true);
  });

  it("should include system ID when provided", () => {
    const context = createSystemContext("scheduled-publisher");

    expect(context.userId).toBe("_system:scheduled-publisher");
    expect(context.metadata?.systemId).toBe("scheduled-publisher");
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe("isAuthenticated", () => {
  it("should return true for authenticated context", () => {
    const context: UserContext = {
      userId: "user_123",
      role: "editor",
      isAuthenticated: true,
      hasRole: true,
    };
    expect(isAuthenticated(context)).toBe(true);
  });

  it("should return false for anonymous context", () => {
    const context = createAnonymousContext();
    expect(isAuthenticated(context)).toBe(false);
  });
});

describe("hasUserRole", () => {
  it("should return true when role matches", () => {
    const context: UserContext = {
      userId: "user_123",
      role: "admin",
      isAuthenticated: true,
      hasRole: true,
    };
    expect(hasUserRole(context, "admin")).toBe(true);
  });

  it("should return false when role does not match", () => {
    const context: UserContext = {
      userId: "user_123",
      role: "editor",
      isAuthenticated: true,
      hasRole: true,
    };
    expect(hasUserRole(context, "admin")).toBe(false);
  });

  it("should return false when context has no role", () => {
    const context = createAnonymousContext();
    expect(hasUserRole(context, "viewer")).toBe(false);
  });
});

describe("isSystemContext", () => {
  it("should return true for system context", () => {
    const context = createSystemContext();
    expect(isSystemContext(context)).toBe(true);
  });

  it("should return false for regular context", () => {
    const context: UserContext = {
      userId: "user_123",
      role: "admin",
      isAuthenticated: true,
      hasRole: true,
    };
    expect(isSystemContext(context)).toBe(false);
  });
});

describe("getUserDisplayId", () => {
  it("should return displayName when available", () => {
    const context: UserContext = {
      userId: "user_123",
      role: "editor",
      isAuthenticated: true,
      hasRole: true,
      displayName: "John Doe",
      email: "john@example.com",
    };
    expect(getUserDisplayId(context)).toBe("John Doe");
  });

  it("should return email when displayName is not available", () => {
    const context: UserContext = {
      userId: "user_123",
      role: "editor",
      isAuthenticated: true,
      hasRole: true,
      email: "john@example.com",
    };
    expect(getUserDisplayId(context)).toBe("john@example.com");
  });

  it("should return userId when no other identifier", () => {
    const context: UserContext = {
      userId: "user_123",
      role: "editor",
      isAuthenticated: true,
      hasRole: true,
    };
    expect(getUserDisplayId(context)).toBe("user_123");
  });

  it("should return formatted system ID for system contexts", () => {
    const context = createSystemContext("scheduler");
    expect(getUserDisplayId(context)).toBe("System (scheduler)");
  });

  it("should return Anonymous for anonymous users", () => {
    const context = createAnonymousContext();
    expect(getUserDisplayId(context)).toBe("Anonymous");
  });
});

// =============================================================================
// validateUserContext Tests
// =============================================================================

describe("validateUserContext", () => {
  it("should pass when no requirements specified", () => {
    const context = createAnonymousContext();
    const result = validateUserContext(context, {});
    expect(result.valid).toBe(true);
  });

  it("should fail when authentication required but missing", () => {
    const context = createAnonymousContext();
    const result = validateUserContext(context, { requireAuthentication: true });
    expect(result.valid).toBe(false);
    expect(result.errors![0].code).toBe("ANONYMOUS_NOT_ALLOWED");
  });

  it("should fail when role required but missing", () => {
    const context: UserContext = {
      userId: "user_123",
      role: null,
      isAuthenticated: true,
      hasRole: false,
    };
    const result = validateUserContext(context, { requireRole: true });
    expect(result.valid).toBe(false);
    expect(result.errors![0].code).toBe("ROLE_REQUIRED");
  });

  it("should fail when role not in allowed list", () => {
    const context: UserContext = {
      userId: "user_123",
      role: "viewer",
      isAuthenticated: true,
      hasRole: true,
    };
    const result = validateUserContext(context, {
      allowedRoles: ["admin", "editor"],
    });
    expect(result.valid).toBe(false);
    expect(result.errors![0].code).toBe("UNKNOWN_ROLE");
  });

  it("should pass when all requirements met", () => {
    const context: UserContext = {
      userId: "user_123",
      role: "admin",
      isAuthenticated: true,
      hasRole: true,
    };
    const result = validateUserContext(context, {
      requireAuthentication: true,
      requireRole: true,
      allowedRoles: ["admin", "editor"],
    });
    expect(result.valid).toBe(true);
    expect(result.context).toBeDefined();
  });
});

// =============================================================================
// UserContextError Tests
// =============================================================================

describe("UserContextError", () => {
  it("should create error with code and message", () => {
    const error = new UserContextError({
      code: "ANONYMOUS_NOT_ALLOWED",
      message: "Authentication required",
    });

    expect(error.code).toBe("ANONYMOUS_NOT_ALLOWED");
    expect(error.message).toBe("Authentication required");
    expect(error.name).toBe("UserContextError");
  });

  it("should include details in JSON output", () => {
    const error = new UserContextError({
      code: "UNKNOWN_ROLE",
      message: "Unknown role",
      details: { role: "superadmin" },
    });

    const json = error.toJSON();
    expect(json.code).toBe("UNKNOWN_ROLE");
    expect(json.details).toEqual({ role: "superadmin" });
  });
});
