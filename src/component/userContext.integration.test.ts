/**
 * User Context Handler Integration Tests
 *
 * These tests verify the user context handler integrates correctly
 * with the authorization and RBAC systems.
 */

import { describe, it, expect, vi } from "vitest";
import {
  createUserContext,
  createUserContextSync,
  createAnonymousContext,
  createSystemContext,
  buildAuthorizationContext,
  extractUserId,
  validateUserContext,
  type UserContext,
} from "./userContext.js";

import { checkPermission, type PermissionCheckOptions } from "./authorization.js";
import type { GetUserRoleHook, CmsOperation } from "../client/types.js";

// Mock getUserRole hook that simulates a real implementation
const mockGetUserRole: GetUserRoleHook = vi.fn(async ({ userId }) => {
  // Simulate database lookup delay
  await new Promise((resolve) => setTimeout(resolve, 1));

  const roles: Record<string, string> = {
    admin_user_001: "admin",
    editor_user_002: "editor",
    author_user_003: "author",
    viewer_user_004: "viewer",
    unknown_user_005: "nonexistent_role", // User with invalid role
  };

  return roles[userId] ?? null;
});

describe("User Context Integration", () => {
  describe("User context creation with role resolution", () => {
    it("should create context and integrate with permission checking", async () => {
      const context = await createUserContext({
        input: { userId: "editor_user_002" },
        getUserRole: mockGetUserRole,
      });

      // Verify context
      expect(context.userId).toBe("editor_user_002");
      expect(context.role).toBe("editor");
      expect(context.isAuthenticated).toBe(true);
      expect(context.hasRole).toBe(true);

      // Use context with permission checking
      const permissionResult = checkPermission({
        userId: context.userId,
        role: context.role,
        resource: "contentEntries",
        action: "update",
      });

      expect(permissionResult.allowed).toBe(true);
    });

    it("should correctly handle admin permissions", async () => {
      const context = await createUserContext({
        input: { userId: "admin_user_001" },
        getUserRole: mockGetUserRole,
      });

      expect(context.role).toBe("admin");

      // Admin should have all permissions
      const canDelete = checkPermission({
        userId: context.userId,
        role: context.role,
        resource: "contentTypes",
        action: "delete",
      });

      expect(canDelete.allowed).toBe(true);
    });

    it("should correctly handle author ownership restrictions", async () => {
      const context = await createUserContext({
        input: { userId: "author_user_003" },
        getUserRole: mockGetUserRole,
      });

      expect(context.role).toBe("author");

      // Author can update own content
      const canUpdateOwn = checkPermission({
        userId: context.userId,
        role: context.role,
        resource: "contentEntries",
        action: "update",
        resourceOwnerId: "author_user_003", // Same as user
      });

      expect(canUpdateOwn.allowed).toBe(true);
      if (canUpdateOwn.allowed) {
        expect(canUpdateOwn.ownershipVerified).toBe(true);
      }

      // Author cannot update others' content
      const canUpdateOthers = checkPermission({
        userId: context.userId,
        role: context.role,
        resource: "contentEntries",
        action: "update",
        resourceOwnerId: "other_user",
      });

      expect(canUpdateOthers.allowed).toBe(false);
    });

    it("should handle viewer read-only permissions", async () => {
      const context = await createUserContext({
        input: { userId: "viewer_user_004" },
        getUserRole: mockGetUserRole,
      });

      expect(context.role).toBe("viewer");

      // Viewer can read
      const canRead = checkPermission({
        userId: context.userId,
        role: context.role,
        resource: "contentEntries",
        action: "read",
      });

      expect(canRead.allowed).toBe(true);

      // Viewer cannot create
      const canCreate = checkPermission({
        userId: context.userId,
        role: context.role,
        resource: "contentEntries",
        action: "create",
      });

      expect(canCreate.allowed).toBe(false);
    });
  });

  describe("Anonymous user flow", () => {
    it("should handle anonymous users correctly", () => {
      const context = createAnonymousContext();

      expect(context.isAuthenticated).toBe(false);
      expect(context.hasRole).toBe(false);

      // Anonymous users should have no permissions
      const canRead = checkPermission({
        userId: context.userId,
        role: context.role,
        resource: "contentEntries",
        action: "read",
      });

      expect(canRead.allowed).toBe(false);
    });
  });

  describe("System context flow", () => {
    it("should create system context with admin privileges", () => {
      const context = createSystemContext("scheduled-publisher");

      expect(context.userId).toBe("_system:scheduled-publisher");
      expect(context.role).toBe("admin");
      expect(context.isAuthenticated).toBe(true);

      // System context should have full permissions
      const canPublish = checkPermission({
        userId: context.userId,
        role: context.role,
        resource: "contentEntries",
        action: "publish",
      });

      expect(canPublish.allowed).toBe(true);
    });
  });

  describe("Authorization context building", () => {
    it("should build authorization context for content entry operations", async () => {
      const userContext = await createUserContext({
        input: {
          userId: "editor_user_002",
          email: "editor@example.com",
          metadata: { department: "content" },
        },
        getUserRole: mockGetUserRole,
      });

      const authContext = buildAuthorizationContext(
        userContext,
        "contentEntries.publish",
        {
          resourceId: "entry_123",
          resourceOwnerId: "author_user_003",
          contentTypeId: "blog_type",
          contentTypeName: "blog_post",
          operationData: { changeDescription: "Publishing for review" },
        }
      );

      expect(authContext.operation).toBe("contentEntries.publish");
      expect(authContext.userId).toBe("editor_user_002");
      expect(authContext.role).toBe("editor");
      expect(authContext.resourceId).toBe("entry_123");
      expect(authContext.resourceOwnerId).toBe("author_user_003");
      expect(authContext.contentTypeId).toBe("blog_type");
      expect(authContext.contentTypeName).toBe("blog_post");
      expect(authContext.operationData?.changeDescription).toBe("Publishing for review");
      expect(authContext.operationData?._userMetadata).toEqual({ department: "content" });
    });
  });

  describe("User ID extraction from various formats", () => {
    it("should extract from Convex identity format", () => {
      const identity = { subject: "user_123", email: "user@example.com" };
      expect(extractUserId(identity)).toBe("user_123");
    });

    it("should extract from JWT format", () => {
      const jwtPayload = { sub: "user_456", name: "John Doe" };
      expect(extractUserId(jwtPayload)).toBe("user_456");
    });

    it("should extract from custom user object", () => {
      const customUser = { userId: "user_789", roles: ["admin"] };
      expect(extractUserId(customUser)).toBe("user_789");
    });
  });

  describe("Context validation for operations", () => {
    it("should validate context for admin-only operations", async () => {
      const adminContext = await createUserContext({
        input: { userId: "admin_user_001" },
        getUserRole: mockGetUserRole,
      });

      const editorContext = await createUserContext({
        input: { userId: "editor_user_002" },
        getUserRole: mockGetUserRole,
      });

      // Validate for admin-only operation
      const adminValidation = validateUserContext(adminContext, {
        requireAuthentication: true,
        requireRole: true,
        allowedRoles: ["admin"],
      });

      const editorValidation = validateUserContext(editorContext, {
        requireAuthentication: true,
        requireRole: true,
        allowedRoles: ["admin"],
      });

      expect(adminValidation.valid).toBe(true);
      expect(editorValidation.valid).toBe(false);
    });

    it("should validate context for content management operations", async () => {
      const authorContext = await createUserContext({
        input: { userId: "author_user_003" },
        getUserRole: mockGetUserRole,
      });

      const viewerContext = await createUserContext({
        input: { userId: "viewer_user_004" },
        getUserRole: mockGetUserRole,
      });

      // Authors should be able to create content
      const authorValidation = validateUserContext(authorContext, {
        requireAuthentication: true,
        requireRole: true,
        allowedRoles: ["admin", "editor", "author"],
      });

      // Viewers should not be able to create content
      const viewerValidation = validateUserContext(viewerContext, {
        requireAuthentication: true,
        requireRole: true,
        allowedRoles: ["admin", "editor", "author"],
      });

      expect(authorValidation.valid).toBe(true);
      expect(viewerValidation.valid).toBe(false);
    });
  });

  describe("End-to-end user context workflow", () => {
    it("should handle complete workflow from identity to permission check", async () => {
      // Step 1: Extract user ID from auth identity
      const identity = { subject: "editor_user_002" };
      const userId = extractUserId(identity);
      expect(userId).toBe("editor_user_002");

      // Step 2: Create user context
      const context = await createUserContext({
        input: { userId: userId! },
        getUserRole: mockGetUserRole,
      });
      expect(context.isAuthenticated).toBe(true);
      expect(context.role).toBe("editor");

      // Step 3: Validate context for operation
      const validation = validateUserContext(context, {
        requireAuthentication: true,
        requireRole: true,
      });
      expect(validation.valid).toBe(true);

      // Step 4: Build authorization context
      const authContext = buildAuthorizationContext(
        context,
        "contentEntries.update",
        {
          resourceId: "entry_456",
          resourceOwnerId: "author_user_003",
        }
      );

      // Step 5: Check permission
      const permission = checkPermission({
        userId: authContext.userId,
        role: authContext.role ?? null,
        resource: "contentEntries",
        action: "update",
        resourceOwnerId: authContext.resourceOwnerId,
      });

      // Editor can update any content (scope: "all")
      expect(permission.allowed).toBe(true);
    });
  });
});
