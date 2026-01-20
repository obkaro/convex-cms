/**
 * Event Emitter Tests
 *
 * Tests for the event emitter module that records events on content changes.
 * These are unit tests for the helper functions and type builders.
 * Integration tests with actual database operations are handled via Playwright.
 */

import { describe, it, expect } from "vitest";
import {
  contentEntryEventType,
  contentTypeEventType,
  mediaAssetEventType,
  mediaFolderEventType,
  type ContentEntryEventPayload,
  type ContentTypeEventPayload,
  type MediaAssetEventPayload,
} from "./eventEmitter.js";
import {
  eventResourceTypes,
  eventActions,
} from "./validators.js";

describe("Event Type Builders", () => {
  it("should build content entry event types", () => {
    expect(contentEntryEventType("created")).toBe("contentEntry.created");
    expect(contentEntryEventType("updated")).toBe("contentEntry.updated");
    expect(contentEntryEventType("published")).toBe("contentEntry.published");
    expect(contentEntryEventType("unpublished")).toBe("contentEntry.unpublished");
    expect(contentEntryEventType("deleted")).toBe("contentEntry.deleted");
    expect(contentEntryEventType("restored")).toBe("contentEntry.restored");
    expect(contentEntryEventType("duplicated")).toBe("contentEntry.duplicated");
    expect(contentEntryEventType("scheduled")).toBe("contentEntry.scheduled");
  });

  it("should build content type event types", () => {
    expect(contentTypeEventType("created")).toBe("contentType.created");
    expect(contentTypeEventType("updated")).toBe("contentType.updated");
    expect(contentTypeEventType("deleted")).toBe("contentType.deleted");
  });

  it("should build media asset event types", () => {
    expect(mediaAssetEventType("created")).toBe("mediaAsset.created");
    expect(mediaAssetEventType("updated")).toBe("mediaAsset.updated");
    expect(mediaAssetEventType("deleted")).toBe("mediaAsset.deleted");
    expect(mediaAssetEventType("restored")).toBe("mediaAsset.restored");
  });

  it("should build media folder event types", () => {
    expect(mediaFolderEventType("created")).toBe("mediaFolder.created");
    expect(mediaFolderEventType("updated")).toBe("mediaFolder.updated");
    expect(mediaFolderEventType("deleted")).toBe("mediaFolder.deleted");
  });
});

describe("Event Resource Types", () => {
  it("should have all expected resource types", () => {
    expect(eventResourceTypes).toContain("contentEntry");
    expect(eventResourceTypes).toContain("contentType");
    expect(eventResourceTypes).toContain("mediaAsset");
    expect(eventResourceTypes).toContain("mediaFolder");
    expect(eventResourceTypes.length).toBe(4);
  });
});

describe("Event Actions", () => {
  it("should have all expected actions", () => {
    expect(eventActions).toContain("created");
    expect(eventActions).toContain("updated");
    expect(eventActions).toContain("published");
    expect(eventActions).toContain("unpublished");
    expect(eventActions).toContain("deleted");
    expect(eventActions).toContain("restored");
    expect(eventActions).toContain("duplicated");
    expect(eventActions).toContain("scheduled");
    expect(eventActions.length).toBe(8);
  });
});

describe("Event Payload Types", () => {
  it("should have correct ContentEntryEventPayload structure", () => {
    const payload: ContentEntryEventPayload = {
      slug: "test-slug",
      contentTypeName: "blog_post",
      contentTypeId: "content-type-id",
      status: "draft",
      version: 1,
      locale: "en-US",
      sourceEntryId: "source-id",
      scheduledPublishAt: Date.now(),
      changeDescription: "Initial version",
    };

    expect(payload.slug).toBe("test-slug");
    expect(payload.contentTypeName).toBe("blog_post");
    expect(payload.contentTypeId).toBe("content-type-id");
    expect(payload.status).toBe("draft");
    expect(payload.version).toBe(1);
    expect(payload.locale).toBe("en-US");
  });

  it("should allow partial ContentEntryEventPayload", () => {
    const minimalPayload: ContentEntryEventPayload = {
      slug: "minimal-slug",
      contentTypeName: "article",
    };

    expect(minimalPayload.slug).toBe("minimal-slug");
    expect(minimalPayload.contentTypeName).toBe("article");
    expect(minimalPayload.version).toBeUndefined();
  });

  it("should have correct ContentTypeEventPayload structure", () => {
    const payload: ContentTypeEventPayload = {
      name: "blog_post",
      displayName: "Blog Post",
      fieldCount: 5,
      isActive: true,
      changedFields: ["title", "description"],
    };

    expect(payload.name).toBe("blog_post");
    expect(payload.displayName).toBe("Blog Post");
    expect(payload.fieldCount).toBe(5);
    expect(payload.isActive).toBe(true);
    expect(payload.changedFields).toEqual(["title", "description"]);
  });

  it("should allow partial ContentTypeEventPayload", () => {
    const minimalPayload: ContentTypeEventPayload = {
      name: "page",
    };

    expect(minimalPayload.name).toBe("page");
    expect(minimalPayload.displayName).toBeUndefined();
  });

  it("should have correct MediaAssetEventPayload structure", () => {
    const payload: MediaAssetEventPayload = {
      filename: "image.jpg",
      mimeType: "image/jpeg",
      type: "image",
      size: 1024,
      folderId: "folder-id",
      folderPath: "/images/blog",
    };

    expect(payload.filename).toBe("image.jpg");
    expect(payload.mimeType).toBe("image/jpeg");
    expect(payload.type).toBe("image");
    expect(payload.size).toBe(1024);
    expect(payload.folderId).toBe("folder-id");
    expect(payload.folderPath).toBe("/images/blog");
  });

  it("should allow partial MediaAssetEventPayload", () => {
    const minimalPayload: MediaAssetEventPayload = {
      filename: "document.pdf",
    };

    expect(minimalPayload.filename).toBe("document.pdf");
    expect(minimalPayload.mimeType).toBeUndefined();
  });
});

describe("Event Type String Formats", () => {
  it("should follow resource.action naming convention", () => {
    const eventType = contentEntryEventType("created");
    const parts = eventType.split(".");

    expect(parts.length).toBe(2);
    expect(parts[0]).toBe("contentEntry");
    expect(parts[1]).toBe("created");
  });

  it("should produce unique event types for all combinations", () => {
    const allEventTypes = new Set<string>();

    // Content entry events
    for (const action of eventActions) {
      allEventTypes.add(contentEntryEventType(action));
    }

    // Content type events (only create, update, delete)
    allEventTypes.add(contentTypeEventType("created"));
    allEventTypes.add(contentTypeEventType("updated"));
    allEventTypes.add(contentTypeEventType("deleted"));

    // Media asset events
    allEventTypes.add(mediaAssetEventType("created"));
    allEventTypes.add(mediaAssetEventType("updated"));
    allEventTypes.add(mediaAssetEventType("deleted"));
    allEventTypes.add(mediaAssetEventType("restored"));

    // Media folder events
    allEventTypes.add(mediaFolderEventType("created"));
    allEventTypes.add(mediaFolderEventType("updated"));
    allEventTypes.add(mediaFolderEventType("deleted"));

    // All should be unique - count should equal number of items added
    // 8 content entry + 3 content type + 4 media asset + 3 media folder = 18
    expect(allEventTypes.size).toBe(18);
  });
});
