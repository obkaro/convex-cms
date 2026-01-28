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
} from "../../src/component/eventEmitter.js";
import { eventActions } from "../../src/component/validators.js";

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
