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
const createMockComponentApi = (): TypedComponentApi => ({
  contentTypes: {
    create: { _type: "mutation" } as any,
    update: { _type: "mutation" } as any,
    delete: { _type: "mutation" } as any,
    get: { _type: "query" } as any,
    list: { _type: "query" } as any,
  },
  contentEntries: {
    create: { _type: "mutation" } as any,
    update: { _type: "mutation" } as any,
    delete: { _type: "mutation" } as any,
    get: { _type: "query" } as any,
    getBySlug: { _type: "query" } as any,
    list: { _type: "query" } as any,
    publish: { _type: "mutation" } as any,
    unpublish: { _type: "mutation" } as any,
    schedule: { _type: "mutation" } as any,
  },
  versions: {
    list: { _type: "query" } as any,
    get: { _type: "query" } as any,
    rollback: { _type: "mutation" } as any,
  },
  mediaAssets: {
    create: { _type: "mutation" } as any,
    update: { _type: "mutation" } as any,
    delete: { _type: "mutation" } as any,
    get: { _type: "query" } as any,
    list: { _type: "query" } as any,
  },
  mediaFolders: {
    create: { _type: "mutation" } as any,
    update: { _type: "mutation" } as any,
    delete: { _type: "mutation" } as any,
    get: { _type: "query" } as any,
    list: { _type: "query" } as any,
    move: { _type: "mutation" } as any,
  },
});

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
      const cms = createCmsClient(mockApi);

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
      const cms = createCmsClient(mockApi);

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
      const cms = createCmsClient(mockApi);

      await cms.contentTypes.create(mockCtx, {
        name: "blog_post",
        displayName: "Blog Post",
        fields: [{ name: "title", label: "Title", type: "text", required: true }],
      });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("calls update mutation", async () => {
      const cms = createCmsClient(mockApi);

      await cms.contentTypes.update(mockCtx, {
        id: "type-id",
        displayName: "Updated Blog Post",
      });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("calls delete mutation", async () => {
      const cms = createCmsClient(mockApi);

      await cms.contentTypes.delete(mockCtx, { id: "type-id" });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("calls get query", async () => {
      const cms = createCmsClient(mockApi);

      await cms.contentTypes.get(mockCtx, { name: "blog_post" });

      expect(mockCtx.runQuery).toHaveBeenCalled();
    });

    it("calls list query", async () => {
      const cms = createCmsClient(mockApi);

      await cms.contentTypes.list(mockCtx);

      expect(mockCtx.runQuery).toHaveBeenCalled();
    });
  });

  describe("ContentEntriesApi", () => {
    it("calls create mutation with default locale", async () => {
      const cms = createCmsClient(mockApi, { defaultLocale: "en-US" });

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
      const cms = createCmsClient(mockApi);

      await cms.contentEntries.publish(mockCtx, {
        id: "entry-id",
        changeDescription: "Initial publish",
      });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("calls schedule mutation", async () => {
      const cms = createCmsClient(mockApi, {
        features: { scheduling: true },
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
      const cms = createCmsClient(mockApi);

      await cms.contentEntries.getBySlug(mockCtx, {
        contentTypeName: "blog_post",
        slug: "my-first-post",
      });

      expect(mockCtx.runQuery).toHaveBeenCalled();
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
      });

      await cms.mediaFolders.create(mockCtx, { name: "Images" });

      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("calls move mutation", async () => {
      const cms = createCmsClient(mockApi, {
        features: { mediaManagement: true },
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
