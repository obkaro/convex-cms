/**
 * Authorization Module Tests
 *
 * Comprehensive tests for the permission checking system.
 * Tests cover:
 * - UnauthorizedError construction and serialization
 * - checkPermission for all scenarios (granted, denied, ownership)
 * - requirePermission throwing behavior
 * - Ownership validation helpers
 * - Authorization context helpers
 */

import { describe, it, expect } from "vitest";
import {
  UnauthorizedError,
  checkPermission,
  requirePermission,
  isResourceOwner,
  requireResourceOwnership,
  createAuthContext,
  canPerform,
  mustPerform,
  type PermissionCheckOptions,
  type AuthorizationContext,
} from "./authorization.js";
import type { RoleDefinition } from "./roles.js";

// =============================================================================
// UnauthorizedError Tests
// =============================================================================

describe("UnauthorizedError", () => {
  it("should create error with all properties", () => {
    const error = new UnauthorizedError("Test message", {
      code: "PERMISSION_DENIED",
      resource: "contentEntries",
      action: "update",
      role: "viewer",
      userId: "user123",
      requiredScope: "own",
    });

    expect(error.message).toBe("Test message");
    expect(error.name).toBe("UnauthorizedError");
    expect(error.code).toBe("PERMISSION_DENIED");
    expect(error.resource).toBe("contentEntries");
    expect(error.action).toBe("update");
    expect(error.role).toBe("viewer");
    expect(error.userId).toBe("user123");
    expect(error.requiredScope).toBe("own");
  });

  it("should create error with minimal properties", () => {
    const error = new UnauthorizedError("Minimal error", {
      code: "NO_ROLE",
    });

    expect(error.message).toBe("Minimal error");
    expect(error.code).toBe("NO_ROLE");
    expect(error.resource).toBeUndefined();
    expect(error.action).toBeUndefined();
    expect(error.role).toBeUndefined();
  });

  it("should serialize to JSON correctly", () => {
    const error = new UnauthorizedError("Test", {
      code: "OWNERSHIP_REQUIRED",
      resource: "mediaAssets",
      action: "delete",
      role: "author",
      userId: "user456",
      requiredScope: "own",
    });

    const json = error.toJSON();

    expect(json).toEqual({
      name: "UnauthorizedError",
      message: "Test",
      code: "OWNERSHIP_REQUIRED",
      resource: "mediaAssets",
      action: "delete",
      role: "author",
      userId: "user456",
      requiredScope: "own",
    });
  });

  it("should be an instance of Error", () => {
    const error = new UnauthorizedError("Test", { code: "NO_ROLE" });
    expect(error instanceof Error).toBe(true);
    expect(error instanceof UnauthorizedError).toBe(true);
  });
});

// =============================================================================
// checkPermission Tests
// =============================================================================

describe("checkPermission", () => {
  describe("no role assigned", () => {
    it("should deny access when role is null", () => {
      const result = checkPermission({
        role: null,
        resource: "contentEntries",
        action: "read",
      });

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.code).toBe("NO_ROLE");
        expect(result.reason).toContain("No role");
      }
    });

    it("should deny access when role is undefined", () => {
      const result = checkPermission({
        role: undefined as unknown as string | null,
        resource: "contentEntries",
        action: "read",
      });

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.code).toBe("NO_ROLE");
      }
    });
  });

  describe("unknown role", () => {
    it("should deny access for non-existent role", () => {
      const result = checkPermission({
        role: "nonexistent-role",
        resource: "contentEntries",
        action: "read",
      });

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.code).toBe("UNKNOWN_ROLE");
        expect(result.reason).toContain("Unknown role");
      }
    });
  });

  describe("admin role", () => {
    it("should allow CRUD actions on content types", () => {
      const actions = ["create", "read", "update", "delete"] as const;

      for (const action of actions) {
        const result = checkPermission({
          role: "admin",
          resource: "contentTypes",
          action,
        });

        expect(result.allowed).toBe(true);
        if (result.allowed) {
          expect(result.grantedScope).toBe("all");
        }
      }
    });

    it("should allow all actions on content entries", () => {
      const actions = [
        "create",
        "read",
        "update",
        "delete",
        "publish",
        "unpublish",
        "restore",
      ] as const;

      for (const action of actions) {
        const result = checkPermission({
          role: "admin",
          resource: "contentEntries",
          action,
        });

        expect(result.allowed).toBe(true);
        if (result.allowed) {
          expect(result.grantedScope).toBe("all");
        }
      }
    });

    it("should allow CRUD on media assets and folders", () => {
      const resources = ["mediaAssets", "mediaFolders"] as const;
      const actions = ["create", "read", "update", "delete"] as const;

      for (const resource of resources) {
        for (const action of actions) {
          const result = checkPermission({
            role: "admin",
            resource,
            action,
          });

          expect(result.allowed).toBe(true);
        }
      }
    });

    it("should allow manage and read on settings", () => {
      const manageResult = checkPermission({
        role: "admin",
        resource: "settings",
        action: "manage",
      });

      const readResult = checkPermission({
        role: "admin",
        resource: "settings",
        action: "read",
      });

      expect(manageResult.allowed).toBe(true);
      expect(readResult.allowed).toBe(true);
    });

    it("should grant 'all' scope for any resource", () => {
      const result = checkPermission({
        role: "admin",
        resource: "contentEntries",
        action: "delete",
        resourceOwnerId: "other-user",
      });

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.grantedScope).toBe("all");
        expect(result.ownershipVerified).toBe(false);
      }
    });
  });

  describe("editor role", () => {
    it("should allow CRUD on content entries", () => {
      const actions = ["create", "read", "update", "delete"] as const;

      for (const action of actions) {
        const result = checkPermission({
          role: "editor",
          resource: "contentEntries",
          action,
        });

        expect(result.allowed).toBe(true);
      }
    });

    it("should allow publish/unpublish on content entries", () => {
      const publishResult = checkPermission({
        role: "editor",
        resource: "contentEntries",
        action: "publish",
      });

      const unpublishResult = checkPermission({
        role: "editor",
        resource: "contentEntries",
        action: "unpublish",
      });

      expect(publishResult.allowed).toBe(true);
      expect(unpublishResult.allowed).toBe(true);
    });

    it("should allow read on content types", () => {
      const result = checkPermission({
        role: "editor",
        resource: "contentTypes",
        action: "read",
      });

      expect(result.allowed).toBe(true);
    });

    it("should deny create/update/delete on content types", () => {
      const actions = ["create", "update", "delete"] as const;

      for (const action of actions) {
        const result = checkPermission({
          role: "editor",
          resource: "contentTypes",
          action,
        });

        expect(result.allowed).toBe(false);
      }
    });

    it("should deny manage on settings", () => {
      const result = checkPermission({
        role: "editor",
        resource: "settings",
        action: "manage",
      });

      expect(result.allowed).toBe(false);
    });
  });

  describe("author role", () => {
    it("should allow create on content entries without owner check", () => {
      const result = checkPermission({
        role: "author",
        resource: "contentEntries",
        action: "create",
      });

      expect(result.allowed).toBe(true);
    });

    it("should allow update on own content entries", () => {
      const result = checkPermission({
        userId: "user123",
        role: "author",
        resource: "contentEntries",
        action: "update",
        resourceOwnerId: "user123",
      });

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.grantedScope).toBe("own");
        expect(result.ownershipVerified).toBe(true);
      }
    });

    it("should deny update on other users' content entries", () => {
      const result = checkPermission({
        userId: "user123",
        role: "author",
        resource: "contentEntries",
        action: "update",
        resourceOwnerId: "other-user",
      });

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.code).toBe("OWNERSHIP_REQUIRED");
      }
    });

    it("should allow operation with 'own' scope when ownership cannot be verified", () => {
      // When no resourceOwnerId is provided, we can't verify ownership
      // but the permission still exists - caller is responsible for ensuring ownership
      const result = checkPermission({
        userId: "user123",
        role: "author",
        resource: "contentEntries",
        action: "update",
        // No resourceOwnerId provided
      });

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.grantedScope).toBe("own");
        expect(result.ownershipVerified).toBe(false);
      }
    });

    it("should allow read on all media assets", () => {
      // Author has read: "all" on media assets (for embedding)
      const result = checkPermission({
        userId: "user123",
        role: "author",
        resource: "mediaAssets",
        action: "read",
        resourceOwnerId: "other-user",
      });

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.grantedScope).toBe("all");
      }
    });

    it("should allow delete on own media assets only", () => {
      const ownResult = checkPermission({
        userId: "user123",
        role: "author",
        resource: "mediaAssets",
        action: "delete",
        resourceOwnerId: "user123",
      });

      const otherResult = checkPermission({
        userId: "user123",
        role: "author",
        resource: "mediaAssets",
        action: "delete",
        resourceOwnerId: "other-user",
      });

      expect(ownResult.allowed).toBe(true);
      expect(otherResult.allowed).toBe(false);
    });
  });

  describe("viewer role", () => {
    it("should allow read on content entries", () => {
      const result = checkPermission({
        role: "viewer",
        resource: "contentEntries",
        action: "read",
      });

      expect(result.allowed).toBe(true);
    });

    it("should deny write operations on content entries", () => {
      const actions = ["create", "update", "delete", "publish", "unpublish"] as const;

      for (const action of actions) {
        const result = checkPermission({
          role: "viewer",
          resource: "contentEntries",
          action,
        });

        expect(result.allowed).toBe(false);
        if (!result.allowed) {
          expect(result.code).toBe("PERMISSION_DENIED");
        }
      }
    });

    it("should allow read on media assets", () => {
      const result = checkPermission({
        role: "viewer",
        resource: "mediaAssets",
        action: "read",
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe("custom roles", () => {
    const customRoles: Record<string, RoleDefinition> = {
      "content-moderator": {
        name: "content-moderator",
        displayName: "Content Moderator",
        description: "Can publish and unpublish any content",
        isSystem: false,
        permissions: [
          { resource: "contentEntries", action: "read" },
          { resource: "contentEntries", action: "publish" },
          { resource: "contentEntries", action: "unpublish" },
        ],
      },
      "media-manager": {
        name: "media-manager",
        displayName: "Media Manager",
        description: "Full control over media assets",
        isSystem: false,
        permissions: [
          { resource: "mediaAssets", action: "create" },
          { resource: "mediaAssets", action: "read" },
          { resource: "mediaAssets", action: "update" },
          { resource: "mediaAssets", action: "delete" },
        ],
      },
    };

    it("should recognize custom roles", () => {
      const result = checkPermission({
        role: "content-moderator",
        resource: "contentEntries",
        action: "publish",
        customRoles,
      });

      expect(result.allowed).toBe(true);
    });

    it("should deny permissions not in custom role", () => {
      const result = checkPermission({
        role: "content-moderator",
        resource: "contentEntries",
        action: "create",
        customRoles,
      });

      expect(result.allowed).toBe(false);
    });

    it("should allow custom role with full resource permissions", () => {
      const actions = ["create", "read", "update", "delete"] as const;

      for (const action of actions) {
        const result = checkPermission({
          role: "media-manager",
          resource: "mediaAssets",
          action,
          customRoles,
        });

        expect(result.allowed).toBe(true);
      }
    });
  });
});

// =============================================================================
// requirePermission Tests
// =============================================================================

describe("requirePermission", () => {
  it("should return granted details when permission is allowed", () => {
    const result = requirePermission({
      role: "admin",
      resource: "contentEntries",
      action: "create",
    });

    expect(result.allowed).toBe(true);
    expect(result.grantedScope).toBe("all");
  });

  it("should throw UnauthorizedError when permission is denied", () => {
    expect(() =>
      requirePermission({
        role: "viewer",
        resource: "contentEntries",
        action: "create",
      })
    ).toThrow(UnauthorizedError);
  });

  it("should include detailed info in thrown error", () => {
    try {
      requirePermission({
        userId: "user123",
        role: "viewer",
        resource: "contentEntries",
        action: "update",
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedError);
      const authError = error as UnauthorizedError;
      expect(authError.code).toBe("PERMISSION_DENIED");
      expect(authError.resource).toBe("contentEntries");
      expect(authError.action).toBe("update");
      expect(authError.role).toBe("viewer");
      expect(authError.userId).toBe("user123");
      expect(authError.message).toContain("viewer");
      expect(authError.message).toContain("update");
    }
  });

  it("should throw with OWNERSHIP_REQUIRED when ownership fails", () => {
    try {
      requirePermission({
        userId: "user123",
        role: "author",
        resource: "contentEntries",
        action: "delete",
        resourceOwnerId: "other-user",
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedError);
      const authError = error as UnauthorizedError;
      expect(authError.code).toBe("OWNERSHIP_REQUIRED");
      expect(authError.message).toContain("own");
    }
  });

  it("should throw with NO_ROLE when no role assigned", () => {
    try {
      requirePermission({
        role: null,
        resource: "contentEntries",
        action: "read",
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedError);
      const authError = error as UnauthorizedError;
      expect(authError.code).toBe("NO_ROLE");
    }
  });
});

// =============================================================================
// Ownership Validation Tests
// =============================================================================

describe("isResourceOwner", () => {
  it("should return true when userId matches resourceOwnerId", () => {
    expect(isResourceOwner("user123", "user123")).toBe(true);
  });

  it("should return false when userId differs from resourceOwnerId", () => {
    expect(isResourceOwner("user123", "user456")).toBe(false);
  });

  it("should return false when userId is undefined", () => {
    expect(isResourceOwner(undefined, "user123")).toBe(false);
  });

  it("should return false when resourceOwnerId is undefined", () => {
    expect(isResourceOwner("user123", undefined)).toBe(false);
  });

  it("should return false when both are undefined", () => {
    expect(isResourceOwner(undefined, undefined)).toBe(false);
  });
});

describe("requireResourceOwnership", () => {
  it("should not throw when user owns resource", () => {
    expect(() =>
      requireResourceOwnership("user123", "user123", {
        resource: "contentEntries",
        action: "update",
        role: "author",
      })
    ).not.toThrow();
  });

  it("should throw when user does not own resource", () => {
    expect(() =>
      requireResourceOwnership("user123", "user456", {
        resource: "contentEntries",
        action: "update",
        role: "author",
      })
    ).toThrow(UnauthorizedError);
  });

  it("should include resource and action in error", () => {
    try {
      requireResourceOwnership("user123", "user456", {
        resource: "mediaAssets",
        action: "delete",
        role: "author",
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedError);
      const authError = error as UnauthorizedError;
      expect(authError.code).toBe("OWNERSHIP_REQUIRED");
      expect(authError.resource).toBe("mediaAssets");
      expect(authError.action).toBe("delete");
      expect(authError.requiredScope).toBe("own");
    }
  });
});

// =============================================================================
// Authorization Context Tests
// =============================================================================

describe("createAuthContext", () => {
  it("should create valid context for valid role", () => {
    const context = createAuthContext("user123", "editor");

    expect(context.userId).toBe("user123");
    expect(context.role).toBe("editor");
    expect(context.customRoles).toBeUndefined();
  });

  it("should include custom roles in context", () => {
    const customRoles: Record<string, RoleDefinition> = {
      "custom-role": {
        name: "custom-role",
        displayName: "Custom",
        description: "Custom role",
        isSystem: false,
        permissions: [],
      },
    };

    const context = createAuthContext("user123", "custom-role", customRoles);

    expect(context.customRoles).toBe(customRoles);
  });

  it("should throw for null role", () => {
    expect(() => createAuthContext("user123", null)).toThrow(UnauthorizedError);
  });

  it("should throw for unknown role", () => {
    expect(() => createAuthContext("user123", "nonexistent")).toThrow(
      UnauthorizedError
    );
  });

  it("should accept custom role when provided in customRoles", () => {
    const customRoles: Record<string, RoleDefinition> = {
      "my-custom-role": {
        name: "my-custom-role",
        displayName: "My Custom Role",
        description: "A custom role",
        isSystem: false,
        permissions: [{ resource: "contentEntries", action: "read" }],
      },
    };

    const context = createAuthContext("user123", "my-custom-role", customRoles);
    expect(context.role).toBe("my-custom-role");
  });
});

describe("canPerform", () => {
  const editorContext: AuthorizationContext = {
    userId: "user123",
    role: "editor",
  };

  const authorContext: AuthorizationContext = {
    userId: "user456",
    role: "author",
  };

  it("should check permission using context", () => {
    const result = canPerform(editorContext, "contentEntries", "update");

    expect(result.allowed).toBe(true);
  });

  it("should check ownership when provided", () => {
    const ownResult = canPerform(
      authorContext,
      "contentEntries",
      "update",
      "user456"
    );
    const otherResult = canPerform(
      authorContext,
      "contentEntries",
      "update",
      "user123"
    );

    expect(ownResult.allowed).toBe(true);
    expect(otherResult.allowed).toBe(false);
  });
});

describe("mustPerform", () => {
  const adminContext: AuthorizationContext = {
    userId: "admin-user",
    role: "admin",
  };

  const viewerContext: AuthorizationContext = {
    userId: "viewer-user",
    role: "viewer",
  };

  it("should return granted details when allowed", () => {
    const result = mustPerform(adminContext, "contentTypes", "create");

    expect(result.allowed).toBe(true);
    expect(result.grantedScope).toBe("all");
  });

  it("should throw when denied", () => {
    expect(() =>
      mustPerform(viewerContext, "contentTypes", "create")
    ).toThrow(UnauthorizedError);
  });
});

// =============================================================================
// Edge Cases and Error Messages
// =============================================================================

describe("error message generation", () => {
  it("should generate readable message for NO_ROLE", () => {
    try {
      requirePermission({
        role: null,
        resource: "contentEntries",
        action: "read",
      });
    } catch (error) {
      const authError = error as UnauthorizedError;
      expect(authError.message).toContain("No role assigned");
      expect(authError.message).toContain("view");
      expect(authError.message).toContain("content entries");
    }
  });

  it("should generate readable message for UNKNOWN_ROLE", () => {
    try {
      requirePermission({
        role: "mystery-role",
        resource: "mediaAssets",
        action: "delete",
      });
    } catch (error) {
      const authError = error as UnauthorizedError;
      expect(authError.message).toContain("Unknown role");
      expect(authError.message).toContain("mystery-role");
    }
  });

  it("should generate readable message for PERMISSION_DENIED", () => {
    try {
      requirePermission({
        role: "viewer",
        resource: "settings",
        action: "manage",
      });
    } catch (error) {
      const authError = error as UnauthorizedError;
      expect(authError.message).toContain("viewer");
      expect(authError.message).toContain("manage");
      expect(authError.message).toContain("settings");
    }
  });

  it("should generate readable message for OWNERSHIP_REQUIRED", () => {
    try {
      requirePermission({
        userId: "user1",
        role: "author",
        resource: "contentEntries",
        action: "delete",
        resourceOwnerId: "user2",
      });
    } catch (error) {
      const authError = error as UnauthorizedError;
      expect(authError.message).toContain("own");
      expect(authError.message).toContain("author");
    }
  });
});

describe("edge cases", () => {
  it("should handle empty string userId", () => {
    const result = checkPermission({
      userId: "",
      role: "author",
      resource: "contentEntries",
      action: "update",
      resourceOwnerId: "",
    });

    // Empty strings are still equal, so ownership is verified
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.ownershipVerified).toBe(true);
    }
  });

  it("should handle very long role names", () => {
    const longRoleName = "a".repeat(1000);
    const result = checkPermission({
      role: longRoleName,
      resource: "contentEntries",
      action: "read",
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("UNKNOWN_ROLE");
    }
  });
});
