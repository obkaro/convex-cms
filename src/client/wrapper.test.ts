/**
 * Client Wrapper Tests
 *
 * Verifies that the CMS client wrapper class works correctly.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCmsClient,
  ContentTypesApi,
  ContentEntriesApi,
  VersionsApi,
  MediaAssetsApi,
  MediaFoldersApi,
  type TypedComponentApi,
  type ConvexContext,
} from "./index";

// Mock component API
// Mock component API - matches the new generated ComponentApi structure
// Uses `as TypedComponentApi` cast since we're providing partial mocks for testing
const createMockComponentApi = (): TypedComponentApi => ({
  // Content type queries
  contentTypes: {
    get: { _type: "query" } as any,
    list: { _type: "query" } as any,
  },
  // Content type mutations
  contentTypeMutations: {
    createContentType: { _type: "mutation" } as any,
    updateContentType: { _type: "mutation" } as any,
    deleteContentType: { _type: "mutation" } as any,
  },
  // Content entry queries
  contentEntries: {
    get: { _type: "query" } as any,
    getBySlug: { _type: "query" } as any,
    list: { _type: "query" } as any,
    getVersionHistory: { _type: "query" } as any,
    getVersion: { _type: "query" } as any,
    compareVersions: { _type: "query" } as any,
  },
  // Content entry mutations
  contentEntryMutations: {
    createEntry: { _type: "mutation" } as any,
    updateEntry: { _type: "mutation" } as any,
    deleteEntry: { _type: "mutation" } as any,
    publishEntry: { _type: "mutation" } as any,
    unpublishEntry: { _type: "mutation" } as any,
    restoreEntry: { _type: "mutation" } as any,
    duplicateEntry: { _type: "mutation" } as any,
  },
  // Scheduled publish mutations
  scheduledPublish: {
    scheduleEntry: { _type: "mutation" } as any,
  },
  // Version mutations
  versionMutations: {
    rollbackVersion: { _type: "mutation" } as any,
  },
  // Media asset queries
  mediaAssets: {
    get: { _type: "query" } as any,
    list: { _type: "query" } as any,
  },
  // Media asset mutations
  mediaAssetMutations: {
    createMediaAsset: { _type: "mutation" } as any,
    updateMediaAsset: { _type: "mutation" } as any,
    deleteMediaAsset: { _type: "mutation" } as any,
    restoreMediaAsset: { _type: "mutation" } as any,
    findMediaAssetReferences: { _type: "query" } as any,
  },
  // Media upload mutations
  mediaUploadMutations: {
    generateUploadUrl: { _type: "mutation" } as any,
  },
  // Media folder mutations
  mediaFolderMutations: {
    createMediaFolder: { _type: "mutation" } as any,
    updateMediaFolder: { _type: "mutation" } as any,
    deleteMediaFolder: { _type: "mutation" } as any,
    getMediaFolder: { _type: "query" } as any,
    listMediaFolders: { _type: "query" } as any,
    moveMediaFolder: { _type: "mutation" } as any,
    restoreMediaFolder: { _type: "mutation" } as any,
    getMediaFolderByPath: { _type: "query" } as any,
    getFolderTree: { _type: "query" } as any,
  },
  // Media variants
  mediaVariants: {
    get: { _type: "query" } as any,
    list: { _type: "query" } as any,
    getBestVariant: { _type: "query" } as any,
    getResponsiveSrcset: { _type: "query" } as any,
    getAssetWithVariants: { _type: "query" } as any,
    getPresets: { _type: "query" } as any,
  },
  mediaVariantMutations: {
    createMediaVariant: { _type: "mutation" } as any,
    requestVariantGeneration: { _type: "mutation" } as any,
    generateFromPresets: { _type: "mutation" } as any,
    deleteMediaVariant: { _type: "mutation" } as any,
    deleteAssetVariants: { _type: "mutation" } as any,
    restoreMediaVariant: { _type: "mutation" } as any,
  },
  // Bulk operations
  bulkOperations: {
    bulkPublish: { _type: "mutation" } as any,
    bulkUnpublish: { _type: "mutation" } as any,
    bulkDelete: { _type: "mutation" } as any,
    bulkUpdate: { _type: "mutation" } as any,
    bulkRestore: { _type: "mutation" } as any,
  },
} as TypedComponentApi);

// Mock Convex context
const createMockContext = (): ConvexContext => ({
  runMutation: vi.fn().mockResolvedValue({ _id: "test-id", _creationTime: Date.now() }),
  runQuery: vi.fn().mockResolvedValue({ _id: "test-id", _creationTime: Date.now() }),
});

describe("CMS Client Wrapper", () => {
  let mockApi: TypedComponentApi;
  let mockCtx: ConvexContext;

  beforeEach(() => {
    mockApi = createMockComponentApi();
    mockCtx = createMockContext();
  });

  describe("createCmsClient", () => {
    it("creates a client with default configuration", () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      expect(cms).toBeDefined();
      expect(cms.config).toBeDefined();
      expect(cms.config.defaultLocale).toBe("en");
      expect(cms.config.features.versioning).toBe(true);
    });

    it("creates a client with custom configuration", () => {
      const cms = createCmsClient(mockApi, {
        defaultLocale: "es-ES",
        supportedLocales: ["en-US", "es-ES", "fr-FR"],
        features: {
          versioning: false,
          localization: true,
        },
      });

      expect(cms.config.defaultLocale).toBe("es-ES");
      expect(cms.config.supportedLocales).toEqual(["en-US", "es-ES", "fr-FR"]);
      expect(cms.config.features.versioning).toBe(false);
      expect(cms.config.features.localization).toBe(true);
    });

    it("exposes all API groups", () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      expect(cms.contentTypes).toBeInstanceOf(ContentTypesApi);
      expect(cms.contentEntries).toBeInstanceOf(ContentEntriesApi);
      expect(cms.versions).toBeInstanceOf(VersionsApi);
      expect(cms.mediaAssets).toBeInstanceOf(MediaAssetsApi);
      expect(cms.mediaFolders).toBeInstanceOf(MediaFoldersApi);
    });

    it("provides isFeatureEnabled helper", () => {
      const cms = createCmsClient(mockApi, {
        features: {
          versioning: true,
          localization: false,
        },
      });

      expect(cms.isFeatureEnabled("versioning")).toBe(true);
      expect(cms.isFeatureEnabled("localization")).toBe(false);
    });

    it("provides isLocaleSupported helper", () => {
      const cms = createCmsClient(mockApi, {
        supportedLocales: ["en-US", "es-ES"],
      });

      expect(cms.isLocaleSupported("en-US")).toBe(true);
      expect(cms.isLocaleSupported("es-ES")).toBe(true);
      expect(cms.isLocaleSupported("fr-FR")).toBe(false);
    });
  });

  describe("ContentTypesApi", () => {
    it("calls create mutation", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await cms.contentTypes.create(mockCtx, {
        name: "blog_post",
        displayName: "Blog Post",
        fields: [{ name: "title", label: "Title", type: "text", required: true }],
      });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("calls update mutation", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await cms.contentTypes.update(mockCtx, {
        id: "type-id",
        displayName: "Updated Blog Post",
      });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("calls update mutation with force flag for breaking changes", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await cms.contentTypes.update(mockCtx, {
        id: "type-id",
        fields: [{ name: "new_field", label: "New Field", type: "text", required: true }],
        force: true,
      });

      expect(mockCtx.runMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ force: true })
      );
    });

    it("calls delete mutation", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await cms.contentTypes.delete(mockCtx, { id: "type-id" });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("calls delete mutation with cascade option", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await cms.contentTypes.delete(mockCtx, {
        id: "type-id",
        cascade: true,
        deletedBy: "user-123",
      });

      expect(mockCtx.runMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ cascade: true })
      );
    });

    it("calls delete mutation with hardDelete option", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await cms.contentTypes.delete(mockCtx, {
        id: "type-id",
        cascade: true,
        hardDelete: true,
      });

      expect(mockCtx.runMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ cascade: true, hardDelete: true })
      );
    });

    it("calls get query", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await cms.contentTypes.get(mockCtx, { name: "blog_post" });

      expect(mockCtx.runQuery).toHaveBeenCalled();
    });

    it("calls get query with includeDeleted option", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await cms.contentTypes.get(mockCtx, { name: "blog_post", includeDeleted: true });

      expect(mockCtx.runQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ includeDeleted: true })
      );
    });

    it("calls list query", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await cms.contentTypes.list(mockCtx);

      expect(mockCtx.runQuery).toHaveBeenCalled();
    });

    it("calls list query with filtering options", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await cms.contentTypes.list(mockCtx, {
        isActive: true,
        sortBy: "name",
        sortDirection: "asc",
      });

      expect(mockCtx.runQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isActive: true,
          sortBy: "name",
          sortDirection: "asc",
        })
      );
    });

    describe("convenience methods", () => {
      it("getByName calls get with name parameter", async () => {
        const cms = createCmsClient(mockApi, { permissiveMode: true });

        await cms.contentTypes.getByName(mockCtx, "blog_post");

        expect(mockCtx.runQuery).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ name: "blog_post" })
        );
      });

      it("getById calls get with id parameter", async () => {
        const cms = createCmsClient(mockApi, { permissiveMode: true });

        await cms.contentTypes.getById(mockCtx, "type-id-123");

        expect(mockCtx.runQuery).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ id: "type-id-123" })
        );
      });

      it("exists returns true when content type is found", async () => {
        const mockCtxWithResult = {
          ...mockCtx,
          runQuery: vi.fn().mockResolvedValue({ _id: "type-id", name: "blog_post" }),
        };

        const cms = createCmsClient(mockApi, { permissiveMode: true });
        const exists = await cms.contentTypes.exists(mockCtxWithResult, "blog_post");

        expect(exists).toBe(true);
      });

      it("exists returns false when content type is not found", async () => {
        const mockCtxWithNull = {
          ...mockCtx,
          runQuery: vi.fn().mockResolvedValue(null),
        };

        const cms = createCmsClient(mockApi, { permissiveMode: true });
        const exists = await cms.contentTypes.exists(mockCtxWithNull, "nonexistent");

        expect(exists).toBe(false);
      });

      it("listActive calls list with isActive: true", async () => {
        const cms = createCmsClient(mockApi, { permissiveMode: true });

        await cms.contentTypes.listActive(mockCtx);

        expect(mockCtx.runQuery).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ isActive: true, includeDeleted: false })
        );
      });

      it("getAll returns page array from list result", async () => {
        const mockTypes = [
          { _id: "type-1", name: "blog_post" },
          { _id: "type-2", name: "page" },
        ];
        const mockCtxWithList = {
          ...mockCtx,
          runQuery: vi.fn().mockResolvedValue({ page: mockTypes, continueCursor: null, isDone: true }),
        };

        const cms = createCmsClient(mockApi, { permissiveMode: true });
        const all = await cms.contentTypes.getAll(mockCtxWithList);

        expect(all).toEqual(mockTypes);
      });

      it("count returns the number of content types", async () => {
        const mockTypes = [
          { _id: "type-1", name: "blog_post" },
          { _id: "type-2", name: "page" },
          { _id: "type-3", name: "product" },
        ];
        const mockCtxWithList = {
          ...mockCtx,
          runQuery: vi.fn().mockResolvedValue({ page: mockTypes, continueCursor: null, isDone: true }),
        };

        const cms = createCmsClient(mockApi, { permissiveMode: true });
        const count = await cms.contentTypes.count(mockCtxWithList);

        expect(count).toBe(3);
      });

      it("deactivate calls update with isActive: false", async () => {
        const cms = createCmsClient(mockApi, { permissiveMode: true });

        await cms.contentTypes.deactivate(mockCtx, "type-id", "user-123");

        expect(mockCtx.runMutation).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ id: "type-id", isActive: false, updatedBy: "user-123" })
        );
      });

      it("reactivate calls update with isActive: true", async () => {
        const cms = createCmsClient(mockApi, { permissiveMode: true });

        await cms.contentTypes.reactivate(mockCtx, "type-id", "user-123");

        expect(mockCtx.runMutation).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ id: "type-id", isActive: true, updatedBy: "user-123" })
        );
      });
    });
  });

  describe("ContentEntriesApi", () => {
    it("calls create mutation with default locale", async () => {
      const cms = createCmsClient(mockApi, { defaultLocale: "en-US", permissiveMode: true });

      await cms.contentEntries.create(mockCtx, {
        contentTypeId: "type-id",
        data: { title: "Test Post" },
      });

      expect(mockCtx.runMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ locale: "en-US" })
      );
    });

    it("calls publish mutation", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await cms.contentEntries.publish(mockCtx, {
        id: "entry-id",
        changeDescription: "Initial publish",
      });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("calls schedule mutation", async () => {
      const cms = createCmsClient(mockApi, {
        features: { scheduling: true },
        permissiveMode: true,
      });

      await cms.contentEntries.schedule(mockCtx, {
        id: "entry-id",
        publishAt: Date.now() + 86400000,
      });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("throws error when scheduling disabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { scheduling: false },
      });

      await expect(
        cms.contentEntries.schedule(mockCtx, {
          id: "entry-id",
          publishAt: Date.now() + 86400000,
        })
      ).rejects.toThrow("Scheduling feature is not enabled");
    });

    it("calls getBySlug query", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await cms.contentEntries.getBySlug(mockCtx, {
        contentTypeName: "blog_post",
        slug: "my-first-post",
      });

      expect(mockCtx.runQuery).toHaveBeenCalled();
    });

    it("calls restore mutation when soft delete enabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { softDelete: true },
        permissiveMode: true,
      });

      await cms.contentEntries.restore(mockCtx, {
        id: "entry-id",
        restoredBy: "user-123",
      });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("throws error when soft delete disabled for restore", async () => {
      const cms = createCmsClient(mockApi, {
        features: { softDelete: false },
      });

      await expect(
        cms.contentEntries.restore(mockCtx, {
          id: "entry-id",
          restoredBy: "user-123",
        })
      ).rejects.toThrow("Soft delete feature is not enabled");
    });

    it("calls update mutation", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await cms.contentEntries.update(mockCtx, {
        id: "entry-id",
        data: { title: "Updated Title" },
      });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("calls delete mutation", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await cms.contentEntries.delete(mockCtx, {
        id: "entry-id",
        deletedBy: "user-123",
      });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("calls get query", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await cms.contentEntries.get(mockCtx, { id: "entry-id" });

      expect(mockCtx.runQuery).toHaveBeenCalled();
    });

    it("calls list query", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await cms.contentEntries.list(mockCtx, {
        contentTypeName: "blog_post",
        status: "published",
        paginationOpts: { numItems: 10, cursor: null },
      });

      expect(mockCtx.runQuery).toHaveBeenCalled();
    });

    it("calls unpublish mutation", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await cms.contentEntries.unpublish(mockCtx, {
        id: "entry-id",
        updatedBy: "user-123",
      });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });
  });

  describe("VersionsApi", () => {
    it("calls list query when versioning enabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { versioning: true },
      });

      await cms.versions.list(mockCtx, { entryId: "entry-id" });

      expect(mockCtx.runQuery).toHaveBeenCalled();
    });

    it("throws error when versioning disabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { versioning: false },
      });

      await expect(
        cms.versions.list(mockCtx, { entryId: "entry-id" })
      ).rejects.toThrow("Versioning feature is not enabled");
    });

    it("calls rollback mutation", async () => {
      const cms = createCmsClient(mockApi, {
        features: { versioning: true },
        permissiveMode: true,
      });

      await cms.versions.rollback(mockCtx, {
        entryId: "entry-id",
        versionNumber: 3,
      });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });
  });

  describe("MediaAssetsApi", () => {
    it("calls create mutation when media enabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: true },
        permissiveMode: true,
      });

      await cms.mediaAssets.create(mockCtx, {
        storageId: "storage-id",
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        size: 1024,
        type: "image",
      });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("throws error when media disabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: false },
      });

      await expect(
        cms.mediaAssets.create(mockCtx, {
          storageId: "storage-id",
          filename: "photo.jpg",
          mimeType: "image/jpeg",
          size: 1024,
          type: "image",
        })
      ).rejects.toThrow("Media management feature is not enabled");
    });

    it("validates file size", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: true },
        maxMediaFileSize: 1000,
        permissiveMode: true,
      });

      await expect(
        cms.mediaAssets.create(mockCtx, {
          storageId: "storage-id",
          filename: "big-file.jpg",
          mimeType: "image/jpeg",
          size: 2000,
          type: "image",
        })
      ).rejects.toThrow(/exceeds maximum allowed size/);
    });
  });

  describe("MediaFoldersApi", () => {
    it("calls create mutation", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: true },
        permissiveMode: true,
      });

      await cms.mediaFolders.create(mockCtx, { name: "Images" });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("calls move mutation", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: true },
        permissiveMode: true,
      });

      await cms.mediaFolders.move(mockCtx, {
        id: "folder-id",
        newParentId: "new-parent-id",
      });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("throws error when media disabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: false },
      });

      await expect(
        cms.mediaFolders.create(mockCtx, { name: "Images" })
      ).rejects.toThrow("Media management feature is not enabled");
    });
  });
});

describe("API Types", () => {
  it("exports TypedComponentApi type", () => {
    // TypeScript compilation ensures this type exists
    const api: TypedComponentApi = createMockComponentApi();
    expect(api).toBeDefined();
  });

  it("exports ConvexContext type", () => {
    // TypeScript compilation ensures this type exists
    const ctx: ConvexContext = createMockContext();
    expect(ctx).toBeDefined();
  });
});

describe("getUserRole Hook", () => {
  let mockApi: TypedComponentApi;

  beforeEach(() => {
    mockApi = createMockComponentApi();
  });

  describe("hasUserRoleHook", () => {
    it("returns false when no hook is configured", () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });
      expect(cms.hasUserRoleHook()).toBe(false);
    });

    it("returns true when hook is configured", () => {
      const cms = createCmsClient(mockApi, {
        getUserRole: (ctx, { userId }) => "admin",
      });
      expect(cms.hasUserRoleHook()).toBe(true);
    });
  });

  describe("getUserRole", () => {
    let mockCtx: ConvexContext;

    beforeEach(() => {
      mockCtx = createMockContext();
    });

    it("throws error when no hook is configured", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await expect(cms.getUserRole(mockCtx, "user-123")).rejects.toThrow(
        "No getUserRole hook configured"
      );
    });

    it("calls the hook with ctx and userId", async () => {
      const mockHook = vi.fn().mockResolvedValue("editor");

      const cms = createCmsClient(mockApi, {
        getUserRole: mockHook,
      });

      const role = await cms.getUserRole(mockCtx, "user-123");

      expect(mockHook).toHaveBeenCalledWith(mockCtx, { userId: "user-123" });
      expect(role).toBe("editor");
    });

    it("supports synchronous hooks", async () => {
      const cms = createCmsClient(mockApi, {
        getUserRole: (ctx, { userId }) => {
          if (userId === "admin-user") return "admin";
          return "viewer";
        },
      });

      expect(await cms.getUserRole(mockCtx, "admin-user")).toBe("admin");
      expect(await cms.getUserRole(mockCtx, "other-user")).toBe("viewer");
    });

    it("supports async hooks", async () => {
      const cms = createCmsClient(mockApi, {
        getUserRole: async (ctx, { userId }) => {
          // Simulate async database lookup
          await new Promise((resolve) => setTimeout(resolve, 10));
          return userId.startsWith("admin") ? "admin" : "author";
        },
      });

      expect(await cms.getUserRole(mockCtx, "admin-123")).toBe("admin");
      expect(await cms.getUserRole(mockCtx, "user-456")).toBe("author");
    });

    it("can return null for users without CMS roles", async () => {
      const cms = createCmsClient(mockApi, {
        getUserRole: (ctx, { userId }) => {
          if (userId === "cms-user") return "author";
          return null;
        },
      });

      expect(await cms.getUserRole(mockCtx, "cms-user")).toBe("author");
      expect(await cms.getUserRole(mockCtx, "non-cms-user")).toBeNull();
    });
  });

  describe("hasPermissionForUser", () => {
    let mockCtx: ConvexContext;

    beforeEach(() => {
      mockCtx = createMockContext();
    });

    it("throws error when no hook is configured", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await expect(
        cms.hasPermissionForUser(mockCtx, "user-123", {
          resource: "contentEntries",
          action: "create",
        })
      ).rejects.toThrow("No getUserRole hook configured");
    });

    it("returns allowed: false when user has no role", async () => {
      const cms = createCmsClient(mockApi, {
        getUserRole: (ctx, { userId }) => null,
      });

      const result = await cms.hasPermissionForUser(mockCtx, "user-123", {
        resource: "contentEntries",
        action: "create",
      });

      expect(result.allowed).toBe(false);
      expect(result.role).toBeNull();
      expect(result.permission).toEqual({
        resource: "contentEntries",
        action: "create",
      });
    });

    it("checks permissions for admin role", async () => {
      const cms = createCmsClient(mockApi, {
        getUserRole: (ctx, { userId }) => "admin",
      });

      // Admin should be able to do everything
      const createResult = await cms.hasPermissionForUser(mockCtx, "admin-user", {
        resource: "contentEntries",
        action: "create",
      });
      expect(createResult.allowed).toBe(true);
      expect(createResult.role).toBe("admin");

      const manageSettingsResult = await cms.hasPermissionForUser(mockCtx, "admin-user", {
        resource: "settings",
        action: "manage",
      });
      expect(manageSettingsResult.allowed).toBe(true);
    });

    it("checks permissions for editor role", async () => {
      const cms = createCmsClient(mockApi, {
        getUserRole: (ctx, { userId }) => "editor",
      });

      // Editor can create content
      const createResult = await cms.hasPermissionForUser(mockCtx, "editor-user", {
        resource: "contentEntries",
        action: "create",
      });
      expect(createResult.allowed).toBe(true);

      // Editor cannot manage settings
      const manageSettingsResult = await cms.hasPermissionForUser(mockCtx, "editor-user", {
        resource: "settings",
        action: "manage",
      });
      expect(manageSettingsResult.allowed).toBe(false);
    });

    it("checks permissions for author role", async () => {
      const cms = createCmsClient(mockApi, {
        getUserRole: (ctx, { userId }) => "author",
      });

      // Author can create content
      const createResult = await cms.hasPermissionForUser(mockCtx, "author-user", {
        resource: "contentEntries",
        action: "create",
      });
      expect(createResult.allowed).toBe(true);

      // Author can update own content
      const updateOwnResult = await cms.hasPermissionForUser(mockCtx, "author-user", {
        resource: "contentEntries",
        action: "update",
        scope: "own",
      });
      expect(updateOwnResult.allowed).toBe(true);

      // Author cannot update all content
      const updateAllResult = await cms.hasPermissionForUser(mockCtx, "author-user", {
        resource: "contentEntries",
        action: "update",
        scope: "all",
      });
      expect(updateAllResult.allowed).toBe(false);
    });

    it("checks permissions for viewer role", async () => {
      const cms = createCmsClient(mockApi, {
        getUserRole: (ctx, { userId }) => "viewer",
      });

      // Viewer can read content
      const readResult = await cms.hasPermissionForUser(mockCtx, "viewer-user", {
        resource: "contentEntries",
        action: "read",
      });
      expect(readResult.allowed).toBe(true);

      // Viewer cannot create content
      const createResult = await cms.hasPermissionForUser(mockCtx, "viewer-user", {
        resource: "contentEntries",
        action: "create",
      });
      expect(createResult.allowed).toBe(false);
    });

    it("returns full result with role and permission info", async () => {
      const cms = createCmsClient(mockApi, {
        getUserRole: (ctx, { userId }) => "editor",
      });

      const result = await cms.hasPermissionForUser(mockCtx, "user-123", {
        resource: "contentEntries",
        action: "publish",
      });

      expect(result).toEqual({
        allowed: true,
        role: "editor",
        permission: {
          resource: "contentEntries",
          action: "publish",
        },
      });
    });

    it("supports custom roles", async () => {
      const customRoles = {
        moderator: {
          name: "moderator",
          displayName: "Content Moderator",
          description: "Can review and publish content",
          isSystem: false,
          permissions: [
            { resource: "contentEntries" as const, action: "read" as const },
            { resource: "contentEntries" as const, action: "publish" as const },
            { resource: "contentEntries" as const, action: "unpublish" as const },
          ],
        },
      };

      const cms = createCmsClient(mockApi, {
        getUserRole: (ctx, { userId }) => "moderator",
      });

      // Check permission with custom role
      const publishResult = await cms.hasPermissionForUser(
        mockCtx,
        "mod-user",
        { resource: "contentEntries", action: "publish" },
        { customRoles }
      );
      expect(publishResult.allowed).toBe(true);
      expect(publishResult.role).toBe("moderator");

      // Moderator cannot create content
      const createResult = await cms.hasPermissionForUser(
        mockCtx,
        "mod-user",
        { resource: "contentEntries", action: "create" },
        { customRoles }
      );
      expect(createResult.allowed).toBe(false);
    });
  });
});

describe("MediaAssetsApi - Extended Operations", () => {
  let mockApi: TypedComponentApi;
  let mockCtx: ConvexContext;

  beforeEach(() => {
    mockApi = createMockComponentApi();
    mockCtx = createMockContext();
  });

  describe("generateUploadUrl", () => {
    it("calls generateUploadUrl mutation when media enabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: true },
      });

      const mockResult = {
        uploadUrl: "https://upload.convex.dev/...",
        expiresAt: Date.now() + 3600000,
        maxFileSize: 50 * 1024 * 1024,
      };
      mockCtx.runMutation = vi.fn().mockResolvedValue(mockResult);

      const result = await cms.mediaAssets.generateUploadUrl(mockCtx, {
        maxFileSize: 10 * 1024 * 1024,
        allowedMimeTypes: ["image/jpeg", "image/png"],
      });

      expect(mockCtx.runMutation).toHaveBeenCalled();
      expect(result.uploadUrl).toBe(mockResult.uploadUrl);
    });

    it("calls generateUploadUrl with empty args", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: true },
      });

      await cms.mediaAssets.generateUploadUrl(mockCtx);

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("throws error when media disabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: false },
      });

      await expect(
        cms.mediaAssets.generateUploadUrl(mockCtx)
      ).rejects.toThrow("Media management feature is not enabled");
    });
  });

  describe("restore", () => {
    it("calls restoreMediaAsset mutation when media enabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: true },
      });

      await cms.mediaAssets.restore(mockCtx, { id: "asset-id" });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("throws error when media disabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: false },
      });

      await expect(
        cms.mediaAssets.restore(mockCtx, { id: "asset-id" })
      ).rejects.toThrow("Media management feature is not enabled");
    });
  });

  describe("findReferences", () => {
    it("calls findMediaAssetReferences query when media enabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: true },
      });

      const mockReferences = [
        {
          entryId: "entry-1",
          entryTitle: "Blog Post",
          contentTypeId: "blog-type",
          contentTypeName: "blog_post",
          fieldName: "featuredImage",
        },
      ];
      mockCtx.runQuery = vi.fn().mockResolvedValue(mockReferences);

      const result = await cms.mediaAssets.findReferences(mockCtx, { id: "asset-id" });

      expect(mockCtx.runQuery).toHaveBeenCalled();
      expect(result).toEqual(mockReferences);
    });

    it("throws error when media disabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: false },
      });

      await expect(
        cms.mediaAssets.findReferences(mockCtx, { id: "asset-id" })
      ).rejects.toThrow("Media management feature is not enabled");
    });
  });
});

describe("MediaFoldersApi - Extended Operations", () => {
  let mockApi: TypedComponentApi;
  let mockCtx: ConvexContext;

  beforeEach(() => {
    mockApi = createMockComponentApi();
    mockCtx = createMockContext();
  });

  describe("restore", () => {
    it("calls restoreMediaFolder mutation when media enabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: true },
      });

      await cms.mediaFolders.restore(mockCtx, {
        id: "folder-id",
        recursive: true,
      });

      expect(mockCtx.runMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: "folder-id", recursive: true })
      );
    });

    it("throws error when media disabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: false },
      });

      await expect(
        cms.mediaFolders.restore(mockCtx, { id: "folder-id" })
      ).rejects.toThrow("Media management feature is not enabled");
    });
  });

  describe("getByPath", () => {
    it("calls getMediaFolderByPath query when media enabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: true },
      });

      const mockFolder = {
        _id: "folder-id",
        _creationTime: Date.now(),
        name: "Blog",
        path: "/Images/Blog",
      };
      mockCtx.runQuery = vi.fn().mockResolvedValue(mockFolder);

      const result = await cms.mediaFolders.getByPath(mockCtx, {
        path: "/Images/Blog",
      });

      expect(mockCtx.runQuery).toHaveBeenCalled();
      expect(result).toEqual(mockFolder);
    });

    it("returns null when folder not found", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: true },
      });

      mockCtx.runQuery = vi.fn().mockResolvedValue(null);

      const result = await cms.mediaFolders.getByPath(mockCtx, {
        path: "/NonExistent",
      });

      expect(result).toBeNull();
    });

    it("throws error when media disabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: false },
      });

      await expect(
        cms.mediaFolders.getByPath(mockCtx, { path: "/Images" })
      ).rejects.toThrow("Media management feature is not enabled");
    });
  });

  describe("getTree", () => {
    it("calls getFolderTree query when media enabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: true },
      });

      const mockFolders = [
        { _id: "folder-1", name: "Images", path: "/Images" },
        { _id: "folder-2", name: "Blog", path: "/Images/Blog" },
        { _id: "folder-3", name: "Documents", path: "/Documents" },
      ];
      mockCtx.runQuery = vi.fn().mockResolvedValue(mockFolders);

      const result = await cms.mediaFolders.getTree(mockCtx);

      expect(mockCtx.runQuery).toHaveBeenCalled();
      expect(result).toEqual(mockFolders);
    });

    it("calls getTree with includeDeleted option", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: true },
      });

      await cms.mediaFolders.getTree(mockCtx, { includeDeleted: true });

      expect(mockCtx.runQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ includeDeleted: true })
      );
    });

    it("throws error when media disabled", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: false },
      });

      await expect(
        cms.mediaFolders.getTree(mockCtx)
      ).rejects.toThrow("Media management feature is not enabled");
    });
  });
});

// =============================================================================
// Required Hooks Validation Tests
// =============================================================================

import { MissingHookError, validateRequiredHooks } from "./types";

describe("Required Hooks Validation", () => {
  // Create a local mock API for these tests
  let testMockApi: TypedComponentApi;

  beforeEach(() => {
    testMockApi = createMockComponentApi();
  });

  describe("requireHooks configuration", () => {
    it("creates client successfully when no requireHooks specified", () => {
      // Should not throw - no validation required
      const cms = createCmsClient(testMockApi);
      expect(cms).toBeDefined();
    });

    it("creates client successfully when requireHooks is empty array", () => {
      const cms = createCmsClient(testMockApi, {
        requireHooks: [],
      });
      expect(cms).toBeDefined();
    });

    it("throws MissingHookError when getUserRole hook is required but not provided", () => {
      expect(() =>
        createCmsClient(testMockApi, {
          requireHooks: ["getUserRole"],
          // getUserRole is missing!
        })
      ).toThrow(MissingHookError);
    });

    it("creates client when getUserRole hook is required and provided", () => {
      const cms = createCmsClient(testMockApi, {
        requireHooks: ["getUserRole"],
        getUserRole: async (ctx, { userId }) => "admin",
      });
      expect(cms).toBeDefined();
    });

    it("throws MissingHookError when authorizationHooks is required but not provided", () => {
      expect(() =>
        createCmsClient(testMockApi, {
          requireHooks: ["authorizationHooks"],
          // authorizationHooks is missing!
        })
      ).toThrow(MissingHookError);
    });

    it("throws MissingHookError when authorizationHooks is provided but empty", () => {
      expect(() =>
        createCmsClient(testMockApi, {
          requireHooks: ["authorizationHooks"],
          authorizationHooks: {}, // Empty object - no hooks configured
        })
      ).toThrow(MissingHookError);
    });

    it("creates client when authorizationHooks has beforeRbac", () => {
      const cms = createCmsClient(testMockApi, {
        requireHooks: ["authorizationHooks"],
        authorizationHooks: {
          beforeRbac: async () => ({ allowed: true }),
        },
      });
      expect(cms).toBeDefined();
    });

    it("creates client when authorizationHooks has afterRbac", () => {
      const cms = createCmsClient(testMockApi, {
        requireHooks: ["authorizationHooks"],
        authorizationHooks: {
          afterRbac: async () => ({ allowed: true }),
        },
      });
      expect(cms).toBeDefined();
    });

    it("creates client when authorizationHooks has authorize", () => {
      const cms = createCmsClient(testMockApi, {
        requireHooks: ["authorizationHooks"],
        authorizationHooks: {
          authorize: async () => ({ allowed: true }),
        },
      });
      expect(cms).toBeDefined();
    });

    it("creates client when authorizationHooks has onDeny", () => {
      const cms = createCmsClient(testMockApi, {
        requireHooks: ["authorizationHooks"],
        authorizationHooks: {
          onDeny: async () => ({ allowed: false }),
        },
      });
      expect(cms).toBeDefined();
    });

    it("creates client when authorizationHooks has operationHooks", () => {
      const cms = createCmsClient(testMockApi, {
        requireHooks: ["authorizationHooks"],
        authorizationHooks: {
          operationHooks: {
            "contentEntries.create": async () => ({ allowed: true }),
          },
        },
      });
      expect(cms).toBeDefined();
    });

    it("throws MissingHookError when rateLimitHooks is required but not provided", () => {
      expect(() =>
        createCmsClient(testMockApi, {
          requireHooks: ["rateLimitHooks"],
          // rateLimitHooks is missing!
        })
      ).toThrow(MissingHookError);
    });

    it("throws MissingHookError when rateLimitHooks is provided but check is missing", () => {
      expect(() =>
        createCmsClient(testMockApi, {
          requireHooks: ["rateLimitHooks"],
          rateLimitHooks: {
            // check is missing - only check is required
            consume: async () => ({ allowed: true, consumed: true }),
          },
        })
      ).toThrow(MissingHookError);
    });

    it("creates client when rateLimitHooks has check", () => {
      const cms = createCmsClient(testMockApi, {
        requireHooks: ["rateLimitHooks"],
        rateLimitHooks: {
          check: async () => ({ allowed: true }),
        },
      });
      expect(cms).toBeDefined();
    });

    it("validates multiple required hooks at once", () => {
      expect(() =>
        createCmsClient(testMockApi, {
          requireHooks: ["getUserRole", "authorizationHooks"],
          // Both are missing!
        })
      ).toThrow(MissingHookError);
    });

    it("creates client when all required hooks are provided", () => {
      const cms = createCmsClient(testMockApi, {
        requireHooks: ["getUserRole", "authorizationHooks", "rateLimitHooks"],
        getUserRole: async (ctx, { userId }) => "editor",
        authorizationHooks: {
          beforeRbac: async () => ({ allowed: true }),
        },
        rateLimitHooks: {
          check: async () => ({ allowed: true }),
        },
      });
      expect(cms).toBeDefined();
    });
  });

  describe("MissingHookError", () => {
    it("has correct properties for getUserRole", () => {
      try {
        createCmsClient(testMockApi, {
          requireHooks: ["getUserRole"],
        });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(MissingHookError);
        const hookError = error as MissingHookError;
        expect(hookError.hookName).toBe("getUserRole");
        expect(hookError.suggestion).toContain("getUserRole function");
        expect(hookError.affectedMethods).toContain("getUserRole()");
        expect(hookError.affectedMethods).toContain("hasPermissionForUser()");
        expect(hookError.message).toContain("Missing required hook: getUserRole");
      }
    });

    it("has correct properties for authorizationHooks", () => {
      try {
        createCmsClient(testMockApi, {
          requireHooks: ["authorizationHooks"],
        });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(MissingHookError);
        const hookError = error as MissingHookError;
        expect(hookError.hookName).toBe("authorizationHooks");
        expect(hookError.suggestion).toContain("authorizationHooks");
        expect(hookError.affectedMethods).toContain("authorize()");
        expect(hookError.affectedMethods).toContain("requireAuthorization()");
      }
    });

    it("has correct properties for rateLimitHooks", () => {
      try {
        createCmsClient(testMockApi, {
          requireHooks: ["rateLimitHooks"],
        });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(MissingHookError);
        const hookError = error as MissingHookError;
        expect(hookError.hookName).toBe("rateLimitHooks");
        expect(hookError.suggestion).toContain("rateLimitHooks.check");
        expect(hookError.affectedMethods).toContain("Rate-limited CMS operations");
      }
    });

    it("can be caught with instanceof check", () => {
      try {
        createCmsClient(testMockApi, {
          requireHooks: ["getUserRole"],
        });
      } catch (error) {
        expect(error instanceof MissingHookError).toBe(true);
        expect(error instanceof Error).toBe(true);
      }
    });
  });

  describe("validateRequiredHooks function", () => {
    it("does not throw when no requireHooks specified", () => {
      expect(() => validateRequiredHooks({})).not.toThrow();
      expect(() => validateRequiredHooks(undefined)).not.toThrow();
    });

    it("does not throw when empty requireHooks array", () => {
      expect(() => validateRequiredHooks({ requireHooks: [] })).not.toThrow();
    });

    it("throws for missing getUserRole", () => {
      expect(() =>
        validateRequiredHooks({ requireHooks: ["getUserRole"] })
      ).toThrow(MissingHookError);
    });

    it("does not throw when getUserRole provided", () => {
      expect(() =>
        validateRequiredHooks({
          requireHooks: ["getUserRole"],
          getUserRole: async (ctx, { userId }) => "admin",
        })
      ).not.toThrow();
    });
  });

  describe("backward compatibility", () => {
    it("existing code without requireHooks continues to work", async () => {
      // Old pattern: no validation, errors at runtime
      const cms = createCmsClient(testMockApi);
      const mockCtx = createMockContext();

      // Client is created without hooks
      expect(cms).toBeDefined();
      expect(cms.hasUserRoleHook()).toBe(false);

      // Method throws at runtime (unchanged behavior)
      await expect(cms.getUserRole(mockCtx, "user-123")).rejects.toThrow(
        "No getUserRole hook configured"
      );
    });

    it("existing code with hooks continues to work", () => {
      const cms = createCmsClient(testMockApi, {
        getUserRole: async (ctx, { userId }) => "admin",
      });

      expect(cms).toBeDefined();
      expect(cms.hasUserRoleHook()).toBe(true);
    });
  });
});

// =============================================================================
// Authorization Enforcement Tests
// =============================================================================

describe("Authorization Enforcement", () => {
  let mockApi: TypedComponentApi;
  let mockCtx: ConvexContext;

  beforeEach(() => {
    mockApi = createMockComponentApi();
    mockCtx = createMockContext();
  });

  describe("without getUserRole configured (fail-closed by default)", () => {
    it("throws AuthorizationNotConfiguredError on content entry create", async () => {
      // NOTE: No permissiveMode - this tests the secure default behavior
      const cms = createCmsClient(mockApi);

      await expect(
        cms.contentEntries.create(mockCtx, {
          contentTypeId: "type-id",
          data: { title: "Test" },
          createdBy: "user-123",
        })
      ).rejects.toThrow("Authorization not configured");
    });

    it("throws AuthorizationNotConfiguredError on content entry update", async () => {
      // NOTE: No permissiveMode - this tests the secure default behavior
      const cms = createCmsClient(mockApi);

      await expect(
        cms.contentEntries.update(mockCtx, {
          id: "entry-id",
          data: { title: "Updated" },
          updatedBy: "user-123",
        })
      ).rejects.toThrow("Authorization not configured");
    });

    it("throws AuthorizationNotConfiguredError on content entry delete", async () => {
      // NOTE: No permissiveMode - this tests the secure default behavior
      const cms = createCmsClient(mockApi);

      await expect(
        cms.contentEntries.delete(mockCtx, {
          id: "entry-id",
          deletedBy: "user-123",
        })
      ).rejects.toThrow("Authorization not configured");
    });

    it("throws AuthorizationNotConfiguredError on content type create", async () => {
      // NOTE: No permissiveMode - this tests the secure default behavior
      const cms = createCmsClient(mockApi);

      await expect(
        cms.contentTypes.create(mockCtx, {
          name: "test_type",
          displayName: "Test Type",
          fields: [],
          createdBy: "user-123",
        })
      ).rejects.toThrow("Authorization not configured");
    });
  });

  describe("with permissiveMode enabled (fail-open for development)", () => {
    it("allows content entry create without getUserRole configured", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      // Should not throw - permissive mode allows operations
      await expect(
        cms.contentEntries.create(mockCtx, {
          contentTypeId: "type-id",
          data: { title: "Test" },
          createdBy: "user-123",
        })
      ).resolves.toBeDefined();
    });

    it("allows anonymous operations in permissive mode", async () => {
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      // Should not throw even without userId
      await expect(
        cms.contentEntries.create(mockCtx, {
          contentTypeId: "type-id",
          data: { title: "Test" },
          // createdBy intentionally omitted
        })
      ).resolves.toBeDefined();
    });

    it("logs warning in permissive mode", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const cms = createCmsClient(mockApi, { permissiveMode: true });

      await cms.contentEntries.create(mockCtx, {
        contentTypeId: "type-id",
        data: { title: "Test" },
        createdBy: "user-123",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("permissiveMode")
      );
      consoleSpy.mockRestore();
    });
  });

  describe("with getUserRole configured (proper authorization)", () => {
    it("allows operations when user has proper role", async () => {
      const cms = createCmsClient(mockApi, {
        getUserRole: async (ctx, { userId }) => "admin",
      });

      // Should not throw - admin role has all permissions
      await expect(
        cms.contentEntries.create(mockCtx, {
          contentTypeId: "type-id",
          data: { title: "Test" },
          createdBy: "user-123",
        })
      ).resolves.toBeDefined();
    });

    it("throws UnauthorizedError when user has no role", async () => {
      const cms = createCmsClient(mockApi, {
        getUserRole: async (ctx, { userId }) => null,
      });

      await expect(
        cms.contentEntries.create(mockCtx, {
          contentTypeId: "type-id",
          data: { title: "Test" },
          createdBy: "user-123",
        })
      ).rejects.toThrow();
    });
  });

  describe("anonymous operations without permissiveMode", () => {
    it("throws when no userId provided and permissiveMode is false", async () => {
      const cms = createCmsClient(mockApi, {
        getUserRole: async (ctx, { userId }) => "admin",
      });

      // Even with getUserRole configured, no userId should fail
      await expect(
        cms.contentEntries.create(mockCtx, {
          contentTypeId: "type-id",
          data: { title: "Test" },
          // createdBy intentionally omitted
        })
      ).rejects.toThrow("anonymous operations require permissiveMode");
    });
  });
});
