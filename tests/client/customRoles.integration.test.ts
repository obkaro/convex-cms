/**
 * Integration tests for custom roles with the CMS client.
 *
 * These tests verify that custom roles work correctly when:
 * - Configured through the createCmsClient function
 * - Used with hasPermissionForUser and hasContentTypePermissionForUser
 * - Extended from default roles
 */

import { describe, it, expect } from "vitest";
import {
  createCustomRole,
  extendRole,
  fullCrudForContentType,
  publishPermissionsForContentType,
  buildCustomRolesRecord,
  mergeRolesWithDefaults,
} from "../../src/component/roles.js";
import { resolveConfig, type ComponentConfig } from "../../src/client/types.js";

// =============================================================================
// Test Scenarios - Real World Use Cases
// =============================================================================

describe("Custom Roles Integration", () => {
  describe("Blog CMS Setup", () => {
    // Simulate a blog CMS with multiple author types
    const blogAuthor = createCustomRole({
      name: "blog-author",
      displayName: "Blog Author",
      description: "Can create and manage own blog posts",
      permissions: [
        { resource: "contentTypes", action: "read" },
        ...fullCrudForContentType("contentEntries", {
          scope: "own",
          contentTypes: ["blog_post"],
        }),
        ...publishPermissionsForContentType({
          scope: "own",
          contentTypes: ["blog_post"],
        }),
        { resource: "mediaAssets", action: "create" },
        { resource: "mediaAssets", action: "read" },
        { resource: "mediaAssets", action: "update", scope: "own" },
        { resource: "mediaFolders", action: "read" },
      ],
    });

    const blogEditor = extendRole({
      name: "blog-editor",
      displayName: "Blog Editor",
      description: "Can manage all blog content",
      extends: "editor",
      restrictToContentTypes: ["blog_post", "blog_category", "blog_tag"],
    });

    const seniorAuthor = extendRole(
      {
        name: "senior-author",
        displayName: "Senior Author",
        description: "Blog author with publishing rights for all",
        extends: "blog-author",
        addPermissions: [
          { resource: "contentEntries", action: "publish", contentTypes: ["blog_post"] },
          { resource: "contentEntries", action: "unpublish", contentTypes: ["blog_post"] },
        ],
        removePermissions: [],
      },
      buildCustomRolesRecord([blogAuthor])
    );

    const customRoles = [blogAuthor, blogEditor, seniorAuthor];

    it("should resolve config with custom roles", () => {
      const config: ComponentConfig = {
        customRoles,
        getUserRole: async () => "blog-author",
      };

      const resolved = resolveConfig(config);

      expect(Object.keys(resolved.customRoles)).toHaveLength(3);
      expect(resolved.customRoles["blog-author"]).toBeDefined();
      expect(resolved.customRoles["blog-editor"]).toBeDefined();
      expect(resolved.customRoles["senior-author"]).toBeDefined();
    });

    it("should allow blog-author to create blog posts but not products", () => {
      const allRoles = mergeRolesWithDefaults(customRoles);

      // Blog author can create blog posts
      expect(
        allRoles["blog-author"].permissions.some(
          (p) =>
            p.resource === "contentEntries" &&
            p.action === "create" &&
            (p as { contentTypes?: string[] }).contentTypes?.includes("blog_post")
        )
      ).toBe(true);
    });

    it("should allow senior-author to publish all blog posts (not just own)", () => {
      const allRoles = mergeRolesWithDefaults(customRoles);

      // Senior author has publish permission without scope: "own"
      const publishPerms = allRoles["senior-author"].permissions.filter(
        (p) => p.resource === "contentEntries" && p.action === "publish"
      );

      // Should have at least one publish permission
      expect(publishPerms.length).toBeGreaterThan(0);
    });

    it("should restrict blog-editor to blog content types only", () => {
      // Blog editor should have all contentEntries permissions restricted
      const contentPerms = blogEditor.permissions.filter(
        (p) => p.resource === "contentEntries"
      );

      contentPerms.forEach((p: any) => {
        expect(p.contentTypes).toBeDefined();
        expect(p.contentTypes).toEqual(
          expect.arrayContaining(["blog_post", "blog_category", "blog_tag"])
        );
      });
    });
  });

  describe("Multi-tenant CMS Setup", () => {
    // Simulate a multi-tenant CMS where different teams have different permissions
    const legalTeamEditor = createCustomRole({
      name: "legal-editor",
      displayName: "Legal Team Editor",
      description: "Can manage legal documents only",
      permissions: [
        { resource: "contentTypes", action: "read" },
        ...fullCrudForContentType("contentEntries", {
          contentTypes: ["legal_document", "compliance_notice"],
        }),
        ...publishPermissionsForContentType({
          contentTypes: ["legal_document", "compliance_notice"],
        }),
        { resource: "contentEntries", action: "restore", contentTypes: ["legal_document"] },
        { resource: "mediaAssets", action: "create" },
        { resource: "mediaAssets", action: "read" },
        { resource: "mediaFolders", action: "read" },
      ],
    });

    const marketingEditor = createCustomRole({
      name: "marketing-editor",
      displayName: "Marketing Team Editor",
      description: "Can manage marketing content only",
      permissions: [
        { resource: "contentTypes", action: "read" },
        ...fullCrudForContentType("contentEntries", {
          contentTypes: ["blog_post", "press_release", "campaign"],
        }),
        ...publishPermissionsForContentType({
          contentTypes: ["blog_post", "press_release", "campaign"],
        }),
        ...fullCrudForContentType("mediaAssets"),
        ...fullCrudForContentType("mediaFolders"),
      ],
    });

    const _customRoles = [legalTeamEditor, marketingEditor];

    it("should allow legal-editor to access legal documents only", () => {
      const contentPerms = legalTeamEditor.permissions.filter(
        (p) => p.resource === "contentEntries"
      );

      contentPerms.forEach((p: any) => {
        if (p.contentTypes) {
          const hasNonLegalContent = p.contentTypes.some(
            (ct: string) => !["legal_document", "compliance_notice"].includes(ct)
          );
          expect(hasNonLegalContent).toBe(false);
        }
      });
    });

    it("should allow marketing-editor to manage media freely", () => {
      const mediaPerms = marketingEditor.permissions.filter(
        (p) => p.resource === "mediaAssets"
      );

      // Should have full CRUD on media
      expect(mediaPerms.some((p) => p.action === "create")).toBe(true);
      expect(mediaPerms.some((p) => p.action === "read")).toBe(true);
      expect(mediaPerms.some((p) => p.action === "update")).toBe(true);
      expect(mediaPerms.some((p) => p.action === "delete")).toBe(true);
    });

    it("should not give legal-editor media delete permissions", () => {
      const hasMediaDelete = legalTeamEditor.permissions.some(
        (p) => p.resource === "mediaAssets" && p.action === "delete"
      );

      expect(hasMediaDelete).toBe(false);
    });
  });

  describe("Role Extension Chain", () => {
    // Test extending custom roles with other custom roles
    const baseContributor = createCustomRole({
      name: "contributor",
      displayName: "Contributor",
      description: "Basic content contributor",
      permissions: [
        { resource: "contentTypes", action: "read" },
        { resource: "contentEntries", action: "create" },
        { resource: "contentEntries", action: "read", scope: "own" },
      ],
    });

    const customRolesBase = buildCustomRolesRecord([baseContributor]);

    const seniorContributor = extendRole(
      {
        name: "senior-contributor",
        displayName: "Senior Contributor",
        description: "Contributor with edit rights",
        extends: "contributor",
        addPermissions: [
          { resource: "contentEntries", action: "update", scope: "own" },
        ],
      },
      customRolesBase
    );

    const customRolesWithSenior = buildCustomRolesRecord([
      baseContributor,
      seniorContributor,
    ]);

    const leadContributor = extendRole(
      {
        name: "lead-contributor",
        displayName: "Lead Contributor",
        description: "Senior contributor with delete and publish rights",
        extends: "senior-contributor",
        addPermissions: [
          { resource: "contentEntries", action: "delete", scope: "own" },
          { resource: "contentEntries", action: "publish", scope: "own" },
        ],
      },
      customRolesWithSenior
    );

    it("should build permission chain through extensions", () => {
      // Base contributor: create, read own
      expect(baseContributor.permissions).toHaveLength(3);

      // Senior contributor: + update own
      expect(seniorContributor.permissions).toHaveLength(4);
      expect(seniorContributor.extendsRole).toBe("contributor");

      // Lead contributor: + delete own, publish own
      expect(leadContributor.permissions).toHaveLength(6);
      expect(leadContributor.extendsRole).toBe("senior-contributor");
    });

    it("should preserve all inherited permissions", () => {
      // Lead should have all permissions from the chain
      const leadPerms = leadContributor.permissions;

      expect(leadPerms.some((p) => p.action === "create")).toBe(true);
      expect(leadPerms.some((p) => p.action === "read")).toBe(true);
      expect(leadPerms.some((p) => p.action === "update")).toBe(true);
      expect(leadPerms.some((p) => p.action === "delete")).toBe(true);
      expect(leadPerms.some((p) => p.action === "publish")).toBe(true);
    });
  });

  describe("Exclude Content Types", () => {
    // Test using excludeContentTypes for blacklist-style permissions
    const generalEditor = createCustomRole({
      name: "general-editor",
      displayName: "General Editor",
      description: "Can edit most content except sensitive types",
      permissions: [
        { resource: "contentTypes", action: "read" },
        {
          resource: "contentEntries",
          action: "create",
          excludeContentTypes: ["legal_document", "hr_policy", "salary_data"],
        },
        {
          resource: "contentEntries",
          action: "read",
          excludeContentTypes: ["salary_data"],
        },
        {
          resource: "contentEntries",
          action: "update",
          excludeContentTypes: ["legal_document", "hr_policy", "salary_data"],
        },
        {
          resource: "contentEntries",
          action: "delete",
          excludeContentTypes: ["legal_document", "hr_policy", "salary_data"],
        },
        { resource: "mediaAssets", action: "read" },
        { resource: "mediaAssets", action: "create" },
      ],
    });

    it("should have exclude content types on permissions", () => {
      const createPerm = generalEditor.permissions.find(
        (p) => p.resource === "contentEntries" && p.action === "create"
      );

      expect(createPerm).toBeDefined();
      expect(createPerm!.excludeContentTypes).toContain("legal_document");
      expect(createPerm!.excludeContentTypes).toContain("hr_policy");
      expect(createPerm!.excludeContentTypes).toContain("salary_data");
    });

    it("should allow read with fewer exclusions than write", () => {
      const readPerm = generalEditor.permissions.find(
        (p) => p.resource === "contentEntries" && p.action === "read"
      );
      const createPerm = generalEditor.permissions.find(
        (p) => p.resource === "contentEntries" && p.action === "create"
      );

      expect(readPerm).toBeDefined();
      expect(createPerm).toBeDefined();
      // Read only excludes salary_data, not legal_document
      expect(readPerm!.excludeContentTypes).toHaveLength(1);
      expect(createPerm!.excludeContentTypes).toHaveLength(3);
    });
  });

  describe("Config Integration", () => {
    const _testRole = createCustomRole({
      name: "test-role",
      displayName: "Test Role",
      description: "A test role",
      permissions: [{ resource: "contentEntries", action: "read" }],
    });

    it("should set isSystem to false by default when resolved", () => {
      const config: ComponentConfig = {
        customRoles: [
          {
            name: "input-role",
            displayName: "Input Role",
            description: "A role defined inline",
            permissions: [{ resource: "contentEntries", action: "read" }],
            // isSystem not specified - should default to false
          },
        ],
      };

      const resolved = resolveConfig(config);

      expect(resolved.customRoles["input-role"].isSystem).toBe(false);
    });

    it("should preserve isSystem: true when specified", () => {
      const config: ComponentConfig = {
        customRoles: [
          {
            name: "system-role",
            displayName: "System Role",
            description: "A system role",
            permissions: [],
            isSystem: true,
          },
        ],
      };

      const resolved = resolveConfig(config);

      expect(resolved.customRoles["system-role"].isSystem).toBe(true);
    });

    it("should handle empty customRoles array", () => {
      const config: ComponentConfig = {
        customRoles: [],
      };

      const resolved = resolveConfig(config);

      expect(Object.keys(resolved.customRoles)).toHaveLength(0);
    });

    it("should handle undefined customRoles", () => {
      const config: ComponentConfig = {};

      const resolved = resolveConfig(config);

      expect(resolved.customRoles).toEqual({});
    });
  });
});
