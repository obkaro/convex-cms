/**
 * Tests for RBAC default roles configuration.
 *
 * Tests permission checking behavior and role utilities.
 */

import { describe, it, expect } from "vitest";
import {
  hasPermission,
  getRolePermissions,
  getRole,
  isBuiltInRole,
  getResourcePermissions,
  canAccessResource,
  type Resource,
  type Action,
} from "../../src/component/roles.js";

// =============================================================================
// Role Permission Behavior Tests
// =============================================================================

describe("Role Permissions", () => {
  describe("admin role", () => {
    it("should have full permissions on all resources", () => {
      const testResources: Resource[] = [
        "contentTypes",
        "contentEntries",
        "mediaItems",
      ];
      const testActions: Action[] = ["create", "read", "update", "delete"];

      for (const resource of testResources) {
        for (const action of testActions) {
          expect(
            hasPermission("admin", { resource, action }),
            `admin should have ${action} permission on ${resource}`
          ).toBe(true);
        }
      }
    });

    it("should have settings manage permission", () => {
      expect(hasPermission("admin", { resource: "settings", action: "manage" })).toBe(true);
    });

    it("should have publish permissions", () => {
      expect(hasPermission("admin", { resource: "contentEntries", action: "publish" })).toBe(true);
      expect(hasPermission("admin", { resource: "contentEntries", action: "unpublish" })).toBe(true);
    });
  });

  describe("editor role", () => {
    it("should have read-only access to content types", () => {
      expect(hasPermission("editor", { resource: "contentTypes", action: "read" })).toBe(true);
      expect(hasPermission("editor", { resource: "contentTypes", action: "create" })).toBe(false);
      expect(hasPermission("editor", { resource: "contentTypes", action: "update" })).toBe(false);
      expect(hasPermission("editor", { resource: "contentTypes", action: "delete" })).toBe(false);
    });

    it("should have full CRUD on content entries", () => {
      expect(hasPermission("editor", { resource: "contentEntries", action: "create" })).toBe(true);
      expect(hasPermission("editor", { resource: "contentEntries", action: "read" })).toBe(true);
      expect(hasPermission("editor", { resource: "contentEntries", action: "update" })).toBe(true);
      expect(hasPermission("editor", { resource: "contentEntries", action: "delete" })).toBe(true);
    });

    it("should NOT have settings access", () => {
      expect(hasPermission("editor", { resource: "settings", action: "manage" })).toBe(false);
    });
  });

  describe("author role", () => {
    it("should be able to create content entries", () => {
      expect(hasPermission("author", { resource: "contentEntries", action: "create" })).toBe(true);
    });

    it("should have own-scoped permissions on content entries", () => {
      // Author has "own" scope for update/delete
      expect(hasPermission("author", { resource: "contentEntries", action: "update", scope: "own" })).toBe(true);
      expect(hasPermission("author", { resource: "contentEntries", action: "delete", scope: "own" })).toBe(true);

      // Should NOT have "all" scope for update/delete
      expect(hasPermission("author", { resource: "contentEntries", action: "update", scope: "all" })).toBe(false);
    });

    it("should be able to read all media (for embedding)", () => {
      // Author should have read access to all media for embedding in content
      expect(hasPermission("author", { resource: "mediaItems", action: "read" })).toBe(true);
    });

    it("should NOT have settings access", () => {
      expect(hasPermission("author", { resource: "settings", action: "manage" })).toBe(false);
    });
  });

  describe("viewer role", () => {
    it("should have read-only access", () => {
      expect(hasPermission("viewer", { resource: "contentTypes", action: "read" })).toBe(true);
      expect(hasPermission("viewer", { resource: "contentEntries", action: "read" })).toBe(true);
      expect(hasPermission("viewer", { resource: "mediaItems", action: "read" })).toBe(true);
    });

    it("should NOT have any write permissions", () => {
      const writeActions: Action[] = ["create", "update", "delete", "publish", "unpublish"];
      for (const action of writeActions) {
        expect(hasPermission("viewer", { resource: "contentEntries", action })).toBe(false);
      }
    });

    it("should NOT have settings access", () => {
      expect(hasPermission("viewer", { resource: "settings", action: "manage" })).toBe(false);
      expect(hasPermission("viewer", { resource: "settings", action: "read" })).toBe(false);
    });
  });
});

// =============================================================================
// hasPermission Utility Tests
// =============================================================================

describe("hasPermission", () => {
  it("should return false for unknown roles", () => {
    expect(hasPermission("unknown-role", { resource: "contentEntries", action: "read" })).toBe(false);
  });

  it("should support custom roles", () => {
    const customRoles = {
      "custom-admin": {
        name: "custom-admin",
        displayName: "Custom Admin",
        description: "A custom admin role",
        isSystem: false,
        permissions: [
          { resource: "contentEntries" as Resource, action: "read" as Action },
        ],
      },
    };

    expect(hasPermission("custom-admin", { resource: "contentEntries", action: "read" }, customRoles)).toBe(true);
    expect(hasPermission("custom-admin", { resource: "contentEntries", action: "create" }, customRoles)).toBe(false);
  });

  it("should correctly handle scope matching", () => {
    // Admin has "all" scope, should cover both "all" and "own" requests
    expect(hasPermission("admin", { resource: "contentEntries", action: "update", scope: "all" })).toBe(true);
    expect(hasPermission("admin", { resource: "contentEntries", action: "update", scope: "own" })).toBe(true);

    // Author has "own" scope for update, should only cover "own" requests
    expect(hasPermission("author", { resource: "contentEntries", action: "update", scope: "own" })).toBe(true);
    expect(hasPermission("author", { resource: "contentEntries", action: "update", scope: "all" })).toBe(false);
  });
});

describe("getRolePermissions", () => {
  it("should return all permissions for a role", () => {
    const adminPerms = getRolePermissions("admin");
    expect(adminPerms.length).toBeGreaterThan(0);
    expect(adminPerms.some((p) => p.resource === "contentTypes")).toBe(true);
    expect(adminPerms.some((p) => p.resource === "contentEntries")).toBe(true);
  });

  it("should return empty array for unknown roles", () => {
    expect(getRolePermissions("unknown-role")).toEqual([]);
  });
});

describe("getRole", () => {
  it("should return role definition for valid role", () => {
    const admin = getRole("admin");
    expect(admin).toBeDefined();
    expect(admin?.name).toBe("admin");
    expect(admin?.displayName).toBe("Administrator");
  });

  it("should return undefined for unknown role", () => {
    expect(getRole("unknown-role")).toBeUndefined();
  });

  it("should find custom roles when provided", () => {
    const customRoles = {
      "custom-role": {
        name: "custom-role",
        displayName: "Custom",
        description: "A custom role",
        isSystem: false,
        permissions: [],
      },
    };

    expect(getRole("custom-role", customRoles)).toBeDefined();
    expect(getRole("custom-role", customRoles)?.name).toBe("custom-role");
  });
});

describe("isBuiltInRole", () => {
  it("should return true for built-in roles", () => {
    expect(isBuiltInRole("admin")).toBe(true);
    expect(isBuiltInRole("editor")).toBe(true);
    expect(isBuiltInRole("author")).toBe(true);
    expect(isBuiltInRole("viewer")).toBe(true);
  });

  it("should return false for custom role names", () => {
    expect(isBuiltInRole("custom-role")).toBe(false);
    expect(isBuiltInRole("super-admin")).toBe(false);
  });
});

describe("getResourcePermissions", () => {
  it("should filter permissions by resource", () => {
    const contentPerms = getResourcePermissions("admin", "contentEntries");
    expect(contentPerms.every((p) => p.resource === "contentEntries")).toBe(true);
    expect(contentPerms.length).toBeGreaterThan(0);
  });

  it("should return empty array if no permissions for resource", () => {
    const settingsPerms = getResourcePermissions("viewer", "settings");
    expect(settingsPerms).toEqual([]);
  });
});

describe("canAccessResource", () => {
  it("should return true if role h permission on resource", () => {
    expect(canAccessResource("admin", "contentEntries")).toBe(true);
    expect(canAccessResource("editor", "contentEntries")).toBe(true);
    expect(canAccessResource("author", "contentEntries")).toBe(true);
    expect(canAccessResource("viewer", "contentEntries")).toBe(true);
  });

  it("should return false if role has no permissions on resource", () => {
    expect(canAccessResource("viewer", "settings")).toBe(false);
    expect(canAccessResource("editor", "settings")).toBe(false);
    expect(canAccessResource("author", "settings")).toBe(false);
  });

  it("should return true for admin on all resources", () => {
    const allResources: Resource[] = [
      "contentTypes",
      "contentEntries",
      "mediaItems",
      "settings",
    ];
    for (const resource of allResources) {
      expect(canAccessResource("admin", resource)).toBe(true);
    }
  });
});

// =============================================================================
// Role Hierarchy Tests
// =============================================================================

describe("Role Hierarchy", () => {
  it("should have admin as the most powerful role", () => {
    const adminPerms = getRolePermissions("admin").length;
    const editorPerms = getRolePermissions("editor").length;
    const authorPerms = getRolePermissions("author").length;
    const viewerPerms = getRolePermissions("viewer").length;

    expect(adminPerms).toBeGreaterThan(editorPerms);
    expect(editorPerms).toBeGreaterThan(authorPerms);
    expect(authorPerms).toBeGreaterThan(viewerPerms);
  });

  it("should have viewer as the least powerful role", () => {
    // Viewer should only have read permissions
    const viewerPerms = getRolePermissions("viewer");
    expect(viewerPerms.every((p) => p.action === "read")).toBe(true);
  });
});
