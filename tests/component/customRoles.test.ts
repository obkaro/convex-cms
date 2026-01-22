/**
 * Tests for custom roles functionality.
 *
 * These tests verify that:
 * - Custom roles can be created with specific permissions
 * - Roles can be extended with additional/removed permissions
 * - Content-type-specific permissions work correctly
 * - Custom roles integrate properly with the existing RBAC system
 */

import { describe, it, expect } from "vitest";
import {
  // Custom role factory functions
  createCustomRole,
  extendRole,
  mergeRolesWithDefaults,
  buildCustomRolesRecord,

  // Content-type-aware permission checking
  hasContentTypePermission,
  getPermittedContentTypes,
  getExcludedContentTypes,

  // Permission factory helpers
  fullCrudForContentType,
  publishPermissionsForContentType,
  readOnlyForContentType,

  // Validation utilities
  validateCustomRoleConfig,
  validateExtendRoleConfig,

  // Existing utilities
  hasPermission,
  getRole,
  isBuiltInRole,
  DEFAULT_ROLES,

  // Types
  type Resource,
  type Action,
  type CustomRoleConfig,
  type ExtendRoleConfig,
  type ContentTypePermission,
} from "../../src/component/roles.js";

// =============================================================================
// createCustomRole Tests
// =============================================================================

describe("createCustomRole", () => {
  it("should create a custom role with basic permissions", () => {
    const config: CustomRoleConfig = {
      name: "blog-author",
      displayName: "Blog Author",
      description: "Can create and manage blog posts",
      permissions: [
        { resource: "contentTypes", action: "read" },
        { resource: "contentEntries", action: "create" },
        { resource: "contentEntries", action: "read", scope: "own" },
      ],
    };

    const role = createCustomRole(config);

    expect(role.name).toBe("blog-author");
    expect(role.displayName).toBe("Blog Author");
    expect(role.description).toBe("Can create and manage blog posts");
    expect(role.isSystem).toBe(false);
    expect(role.permissions).toHaveLength(3);
  });

  it("should create a system role when isSystem is true", () => {
    const config: CustomRoleConfig = {
      name: "super-admin",
      displayName: "Super Administrator",
      description: "A custom system role",
      permissions: [],
      isSystem: true,
    };

    const role = createCustomRole(config);

    expect(role.isSystem).toBe(true);
  });

  it("should throw error for empty role name", () => {
    const config: CustomRoleConfig = {
      name: "",
      displayName: "Test",
      description: "Test",
      permissions: [],
    };

    expect(() => createCustomRole(config)).toThrow("Custom role name is required");
  });

  it("should throw error when using built-in role name", () => {
    const config: CustomRoleConfig = {
      name: "admin", // Built-in name
      displayName: "Custom Admin",
      description: "Custom admin role",
      permissions: [],
    };

    expect(() => createCustomRole(config)).toThrow(
      "Cannot create custom role with built-in role name 'admin'"
    );
  });

  it("should support content-type-specific permissions", () => {
    const config: CustomRoleConfig = {
      name: "blog-author",
      displayName: "Blog Author",
      description: "Can only create blog posts",
      permissions: [
        {
          resource: "contentEntries",
          action: "create",
          contentTypes: ["blog_post", "blog_category"],
        },
      ],
    };

    const role = createCustomRole(config);
    const perm = role.permissions[0] as ContentTypePermission;

    expect(perm.contentTypes).toEqual(["blog_post", "blog_category"]);
  });

  it("should support exclude content types", () => {
    const config: CustomRoleConfig = {
      name: "general-editor",
      displayName: "General Editor",
      description: "Can edit everything except legal content",
      permissions: [
        {
          resource: "contentEntries",
          action: "update",
          excludeContentTypes: ["legal_document"],
        },
      ],
    };

    const role = createCustomRole(config);
    const perm = role.permissions[0] as ContentTypePermission;

    expect(perm.excludeContentTypes).toEqual(["legal_document"]);
  });
});

// =============================================================================
// extendRole Tests
// =============================================================================

describe("extendRole", () => {
  it("should extend a built-in role with additional permissions", () => {
    const config: ExtendRoleConfig = {
      name: "senior-author",
      displayName: "Senior Author",
      description: "Author with publishing rights",
      extends: "author",
      addPermissions: [
        { resource: "contentEntries", action: "publish", scope: "own" },
        { resource: "contentEntries", action: "unpublish", scope: "own" },
      ],
    };

    const role = extendRole(config);

    expect(role.name).toBe("senior-author");
    expect(role.extendsRole).toBe("author");

    // Should have author's permissions plus new ones
    const authorPerms = DEFAULT_ROLES.author.permissions.length;
    expect(role.permissions.length).toBe(authorPerms + 2);

    // Should have publish permission
    const hasPublish = role.permissions.some(
      (p) => p.action === "publish" && p.resource === "contentEntries"
    );
    expect(hasPublish).toBe(true);
  });

  it("should extend a role and remove permissions", () => {
    const config: ExtendRoleConfig = {
      name: "restricted-editor",
      displayName: "Restricted Editor",
      description: "Editor without delete permissions",
      extends: "editor",
      removePermissions: [
        { resource: "contentEntries", action: "delete" },
        { resource: "mediaAssets", action: "delete" },
      ],
    };

    const role = extendRole(config);

    // Should not have delete permissions
    const hasContentDelete = role.permissions.some(
      (p) => p.action === "delete" && p.resource === "contentEntries"
    );
    const hasMediaDelete = role.permissions.some(
      (p) => p.action === "delete" && p.resource === "mediaAssets"
    );

    expect(hasContentDelete).toBe(false);
    expect(hasMediaDelete).toBe(false);
  });

  it("should restrict content type permissions", () => {
    const config: ExtendRoleConfig = {
      name: "blog-editor",
      displayName: "Blog Editor",
      description: "Can only edit blog content",
      extends: "editor",
      restrictToContentTypes: ["blog_post", "blog_category"],
    };

    const role = extendRole(config);

    // All contentEntries permissions should have contentTypes restriction
    const contentPerms = role.permissions.filter(
      (p) => p.resource === "contentEntries"
    ) as ContentTypePermission[];

    expect(contentPerms.length).toBeGreaterThan(0);
    contentPerms.forEach((p) => {
      expect(p.contentTypes).toEqual(["blog_post", "blog_category"]);
    });
  });

  it("should throw error for unknown base role", () => {
    const config: ExtendRoleConfig = {
      name: "extended-unknown",
      displayName: "Test",
      description: "Test",
      extends: "unknown-role",
    };

    expect(() => extendRole(config)).toThrow(
      "Cannot extend unknown role 'unknown-role'"
    );
  });

  it("should throw error for self-reference", () => {
    const config: ExtendRoleConfig = {
      name: "same-name",
      displayName: "Test",
      description: "Test",
      extends: "same-name",
    };

    expect(() => extendRole(config)).toThrow(
      "Extended role name must be different from the base role name"
    );
  });

  it("should extend custom roles when provided", () => {
    // First create a custom role
    const baseRole = createCustomRole({
      name: "base-role",
      displayName: "Base Role",
      description: "A base custom role",
      permissions: [
        { resource: "contentEntries", action: "read" },
      ],
    });

    const customRoles = buildCustomRolesRecord([baseRole]);

    // Extend the custom role
    const extendedRole = extendRole(
      {
        name: "extended-role",
        displayName: "Extended Role",
        description: "Extends the base custom role",
        extends: "base-role",
        addPermissions: [
          { resource: "contentEntries", action: "create" },
        ],
      },
      customRoles
    );

    expect(extendedRole.extendsRole).toBe("base-role");
    expect(extendedRole.permissions.length).toBe(2);
  });
});

// =============================================================================
// hasContentTypePermission Tests
// =============================================================================

describe("hasContentTypePermission", () => {
  const blogAuthor = createCustomRole({
    name: "blog-author",
    displayName: "Blog Author",
    description: "Can only create blog posts",
    permissions: [
      { resource: "contentTypes", action: "read" },
      { resource: "contentEntries", action: "create", contentTypes: ["blog_post"] },
      { resource: "contentEntries", action: "read", scope: "own", contentTypes: ["blog_post"] },
      { resource: "contentEntries", action: "update", scope: "own", contentTypes: ["blog_post"] },
      { resource: "mediaAssets", action: "read" },
    ],
  });

  const customRoles = buildCustomRolesRecord([blogAuthor]);

  it("should allow permission for whitelisted content type", () => {
    const allowed = hasContentTypePermission(
      "blog-author",
      { resource: "contentEntries", action: "create" },
      { customRoles, contentTypeName: "blog_post" }
    );

    expect(allowed).toBe(true);
  });

  it("should deny permission for non-whitelisted content type", () => {
    const allowed = hasContentTypePermission(
      "blog-author",
      { resource: "contentEntries", action: "create" },
      { customRoles, contentTypeName: "product" }
    );

    expect(allowed).toBe(false);
  });

  it("should allow permission when no content type specified", () => {
    // When checking without content type, should allow if permission exists
    const allowed = hasContentTypePermission(
      "blog-author",
      { resource: "contentEntries", action: "create" },
      { customRoles }
    );

    expect(allowed).toBe(true);
  });

  it("should respect scope with content type restrictions", () => {
    // Blog author can update own blog posts
    const canUpdateOwn = hasContentTypePermission(
      "blog-author",
      { resource: "contentEntries", action: "update", scope: "own" },
      { customRoles, contentTypeName: "blog_post" }
    );

    expect(canUpdateOwn).toBe(true);

    // Blog author cannot update all blog posts
    const canUpdateAll = hasContentTypePermission(
      "blog-author",
      { resource: "contentEntries", action: "update", scope: "all" },
      { customRoles, contentTypeName: "blog_post" }
    );

    expect(canUpdateAll).toBe(false);
  });

  it("should work with exclude content types", () => {
    const generalEditor = createCustomRole({
      name: "general-editor",
      displayName: "General Editor",
      description: "Can edit all except legal",
      permissions: [
        { resource: "contentEntries", action: "update", excludeContentTypes: ["legal_document"] },
      ],
    });

    const roles = buildCustomRolesRecord([generalEditor]);

    // Can update blog posts
    expect(
      hasContentTypePermission(
        "general-editor",
        { resource: "contentEntries", action: "update" },
        { customRoles: roles, contentTypeName: "blog_post" }
      )
    ).toBe(true);

    // Cannot update legal documents
    expect(
      hasContentTypePermission(
        "general-editor",
        { resource: "contentEntries", action: "update" },
        { customRoles: roles, contentTypeName: "legal_document" }
      )
    ).toBe(false);
  });

  it("should work with built-in roles (no restrictions)", () => {
    // Admin can create any content type
    expect(
      hasContentTypePermission(
        "admin",
        { resource: "contentEntries", action: "create" },
        { contentTypeName: "blog_post" }
      )
    ).toBe(true);

    expect(
      hasContentTypePermission(
        "admin",
        { resource: "contentEntries", action: "create" },
        { contentTypeName: "product" }
      )
    ).toBe(true);
  });
});

// =============================================================================
// getPermittedContentTypes Tests
// =============================================================================

describe("getPermittedContentTypes", () => {
  const blogAuthor = createCustomRole({
    name: "blog-author",
    displayName: "Blog Author",
    description: "Blog permissions only",
    permissions: [
      { resource: "contentEntries", action: "create", contentTypes: ["blog_post", "blog_category"] },
      { resource: "contentEntries", action: "read", contentTypes: ["blog_post"] },
    ],
  });

  const customRoles = buildCustomRolesRecord([blogAuthor]);

  it("should return permitted content types for custom role", () => {
    const types = getPermittedContentTypes("blog-author", "create", { customRoles });

    expect(types).toEqual(expect.arrayContaining(["blog_post", "blog_category"]));
    expect(types).toHaveLength(2);
  });

  it("should return [*] for unrestricted roles", () => {
    const types = getPermittedContentTypes("admin", "create");

    expect(types).toEqual(["*"]);
  });

  it("should return empty array for roles without permission", () => {
    const types = getPermittedContentTypes("blog-author", "publish", { customRoles });

    expect(types).toEqual([]);
  });

  it("should return empty array for unknown role", () => {
    const types = getPermittedContentTypes("unknown-role", "create");

    expect(types).toEqual([]);
  });
});

// =============================================================================
// getExcludedContentTypes Tests
// =============================================================================

describe("getExcludedContentTypes", () => {
  const restrictedEditor = createCustomRole({
    name: "restricted-editor",
    displayName: "Restricted Editor",
    description: "Cannot edit legal or hr content",
    permissions: [
      { resource: "contentEntries", action: "update", excludeContentTypes: ["legal_document", "hr_policy"] },
    ],
  });

  const customRoles = buildCustomRolesRecord([restrictedEditor]);

  it("should return excluded content types", () => {
    const excluded = getExcludedContentTypes("restricted-editor", "update", { customRoles });

    expect(excluded).toEqual(expect.arrayContaining(["legal_document", "hr_policy"]));
  });

  it("should return empty array for roles without exclusions", () => {
    const excluded = getExcludedContentTypes("admin", "update");

    expect(excluded).toEqual([]);
  });
});

// =============================================================================
// Permission Factory Helpers Tests
// =============================================================================

describe("Permission Factory Helpers", () => {
  describe("fullCrudForContentType", () => {
    it("should create CRUD permissions for content type", () => {
      const perms = fullCrudForContentType("contentEntries", {
        contentTypes: ["blog_post"],
        scope: "own",
      });

      expect(perms).toHaveLength(4);
      expect(perms.map((p) => p.action)).toEqual(["create", "read", "update", "delete"]);
      perms.forEach((p) => {
        expect(p.contentTypes).toEqual(["blog_post"]);
        expect(p.scope).toBe("own");
      });
    });

    it("should use default scope when not specified", () => {
      const perms = fullCrudForContentType("contentEntries");

      perms.forEach((p) => {
        expect(p.scope).toBe("all");
      });
    });
  });

  describe("publishPermissionsForContentType", () => {
    it("should create publish/unpublish permissions", () => {
      const perms = publishPermissionsForContentType({
        contentTypes: ["blog_post"],
        scope: "own",
      });

      expect(perms).toHaveLength(2);
      expect(perms.map((p) => p.action)).toEqual(["publish", "unpublish"]);
      perms.forEach((p) => {
        expect(p.contentTypes).toEqual(["blog_post"]);
        expect(p.scope).toBe("own");
      });
    });
  });

  describe("readOnlyForContentType", () => {
    it("should create read-only permission", () => {
      const perms = readOnlyForContentType("contentEntries", {
        excludeContentTypes: ["private_content"],
      });

      expect(perms).toHaveLength(1);
      expect(perms[0].action).toBe("read");
      expect(perms[0].excludeContentTypes).toEqual(["private_content"]);
    });
  });
});

// =============================================================================
// mergeRolesWithDefaults Tests
// =============================================================================

describe("mergeRolesWithDefaults", () => {
  it("should merge custom roles with defaults", () => {
    const customRole = createCustomRole({
      name: "custom-role",
      displayName: "Custom Role",
      description: "A custom role",
      permissions: [],
    });

    const merged = mergeRolesWithDefaults([customRole]);

    // Should have all default roles
    expect(merged.admin).toBeDefined();
    expect(merged.editor).toBeDefined();
    expect(merged.author).toBeDefined();
    expect(merged.viewer).toBeDefined();

    // Should have custom role
    expect(merged["custom-role"]).toBeDefined();
  });

  it("should not override built-in roles", () => {
    // Try to add a role with the same name as a built-in role
    const fakeAdmin = {
      name: "admin",
      displayName: "Fake Admin",
      description: "This should not override",
      permissions: [],
      isSystem: false,
    };

    const merged = mergeRolesWithDefaults([fakeAdmin]);

    // Should still be the original admin role
    expect(merged.admin.displayName).toBe("Administrator");
  });
});

// =============================================================================
// Validation Utilities Tests
// =============================================================================

describe("validateCustomRoleConfig", () => {
  it("should validate a correct config", () => {
    const result = validateCustomRoleConfig({
      name: "valid-role",
      displayName: "Valid Role",
      description: "A valid custom role",
      permissions: [
        { resource: "contentEntries", action: "read" },
      ],
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should catch missing name", () => {
    const result = validateCustomRoleConfig({
      name: "",
      displayName: "Test",
      description: "Test",
      permissions: [],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Role name is required");
  });

  it("should catch built-in name conflict", () => {
    const result = validateCustomRoleConfig({
      name: "admin",
      displayName: "Test",
      description: "Test",
      permissions: [],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("conflicts with a built-in role"))).toBe(true);
  });

  it("should catch invalid resource", () => {
    const result = validateCustomRoleConfig({
      name: "test-role",
      displayName: "Test",
      description: "Test",
      permissions: [
        { resource: "invalidResource" as Resource, action: "read" },
      ],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Invalid resource"))).toBe(true);
  });

  it("should catch invalid action", () => {
    const result = validateCustomRoleConfig({
      name: "test-role",
      displayName: "Test",
      description: "Test",
      permissions: [
        { resource: "contentEntries", action: "invalidAction" as Action },
      ],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Invalid action"))).toBe(true);
  });

  it("should catch conflicting content type restrictions", () => {
    const result = validateCustomRoleConfig({
      name: "test-role",
      displayName: "Test",
      description: "Test",
      permissions: [
        {
          resource: "contentEntries",
          action: "create",
          contentTypes: ["blog_post"],
          excludeContentTypes: ["product"],
        },
      ],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Cannot specify both"))).toBe(true);
  });
});

describe("validateExtendRoleConfig", () => {
  it("should validate a correct extend config", () => {
    const result = validateExtendRoleConfig({
      name: "extended-role",
      displayName: "Extended Role",
      description: "Extends another role",
      extends: "editor",
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should catch missing extends", () => {
    const result = validateExtendRoleConfig({
      name: "test",
      displayName: "Test",
      description: "Test",
      extends: "",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Base role name (extends) is required");
  });

  it("should catch self-reference", () => {
    const result = validateExtendRoleConfig({
      name: "self",
      displayName: "Test",
      description: "Test",
      extends: "self",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Cannot extend a role with itself");
  });

  it("should catch unknown base role", () => {
    const result = validateExtendRoleConfig({
      name: "test",
      displayName: "Test",
      description: "Test",
      extends: "unknown-role",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("does not exist"))).toBe(true);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("Custom Roles Integration", () => {
  it("should work with existing hasPermission function", () => {
    const blogAuthor = createCustomRole({
      name: "blog-author",
      displayName: "Blog Author",
      description: "Blog author role",
      permissions: [
        { resource: "contentEntries", action: "create" },
        { resource: "contentEntries", action: "read", scope: "own" },
      ],
    });

    const customRoles = buildCustomRolesRecord([blogAuthor]);

    // Should work with hasPermission
    expect(
      hasPermission("blog-author", { resource: "contentEntries", action: "create" }, customRoles)
    ).toBe(true);

    expect(
      hasPermission("blog-author", { resource: "contentEntries", action: "delete" }, customRoles)
    ).toBe(false);
  });

  it("should work with getRole function", () => {
    const customRole = createCustomRole({
      name: "custom-role",
      displayName: "Custom Role",
      description: "A custom role",
      permissions: [],
    });

    const customRoles = buildCustomRolesRecord([customRole]);

    const role = getRole("custom-role", customRoles);
    expect(role).toBeDefined();
    expect(role?.displayName).toBe("Custom Role");
  });

  it("should correctly identify custom vs built-in roles", () => {
    expect(isBuiltInRole("admin")).toBe(true);
    expect(isBuiltInRole("custom-role")).toBe(false);
  });

  it("should support complex role hierarchies", () => {
    // Create a base custom role
    const contentCreator = createCustomRole({
      name: "content-creator",
      displayName: "Content Creator",
      description: "Basic content creation",
      permissions: [
        { resource: "contentTypes", action: "read" },
        { resource: "contentEntries", action: "create" },
        { resource: "contentEntries", action: "read", scope: "own" },
        { resource: "mediaAssets", action: "create" },
        { resource: "mediaAssets", action: "read" },
      ],
    });

    const customRoles = buildCustomRolesRecord([contentCreator]);

    // Extend the custom role
    const seniorCreator = extendRole(
      {
        name: "senior-creator",
        displayName: "Senior Content Creator",
        description: "Content creator with publish rights",
        extends: "content-creator",
        addPermissions: [
          { resource: "contentEntries", action: "publish", scope: "own" },
          { resource: "contentEntries", action: "update", scope: "own" },
        ],
      },
      customRoles
    );

    const allRoles = buildCustomRolesRecord([contentCreator, seniorCreator]);

    // Verify senior creator has additional permissions
    expect(
      hasPermission(
        "senior-creator",
        { resource: "contentEntries", action: "publish", scope: "own" },
        allRoles
      )
    ).toBe(true);

    // But content creator doesn't
    expect(
      hasPermission(
        "content-creator",
        { resource: "contentEntries", action: "publish" },
        allRoles
      )
    ).toBe(false);
  });
});
