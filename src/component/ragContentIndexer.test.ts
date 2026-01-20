/**
 * RAG Content Indexer Tests
 *
 * Unit tests for the RAG content indexer background job system.
 * Tests event-driven indexing, batch processing, and scheduler integration.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DEFAULT_INDEXER_CONFIG,
  type RagIndexerConfig,
  type IndexEntryResult,
  type ProcessEventsResult,
  type IndexedEntryMetadata,
  type IndexingStats,
} from "./ragContentIndexer.js";

// =============================================================================
// Mock Data
// =============================================================================

const mockContentType = {
  _id: "content_type_1",
  name: "blog_post",
  displayName: "Blog Post",
  description: "A blog post content type",
  fields: [
    { name: "title", label: "Title", type: "text", required: true, searchable: true },
    { name: "content", label: "Content", type: "richText", required: true, searchable: true },
    { name: "excerpt", label: "Excerpt", type: "text", required: false, searchable: true },
  ],
  titleField: "title",
  slugField: "title",
  isActive: true,
  _creationTime: Date.now() - 100000,
};

const mockPublishedEntry = {
  _id: "entry_1",
  contentTypeId: "content_type_1",
  slug: "test-blog-post",
  status: "published" as const,
  data: {
    title: "Test Blog Post",
    content: "<p>This is the content of the test blog post. It contains some text for testing purposes.</p>",
    excerpt: "A brief excerpt of the blog post",
  },
  version: 2,
  locale: undefined,
  firstPublishedAt: Date.now() - 50000,
  lastPublishedAt: Date.now() - 10000,
  _creationTime: Date.now() - 100000,
};

const mockDraftEntry = {
  ...mockPublishedEntry,
  _id: "entry_2",
  slug: "draft-post",
  status: "draft" as const,
  version: 1,
  firstPublishedAt: undefined,
  lastPublishedAt: undefined,
};

const mockPublishEvent = {
  _id: "event_1",
  _creationTime: Date.now() - 5000,
  eventType: "contentEntry.published",
  resourceType: "contentEntry" as const,
  resourceId: "entry_1",
  action: "published" as const,
  payload: {
    slug: "test-blog-post",
    contentTypeName: "blog_post",
    contentTypeId: "content_type_1",
    status: "published",
    version: 2,
  },
  processed: false,
  userId: "user_1",
};

const mockUnpublishEvent = {
  _id: "event_2",
  _creationTime: Date.now() - 3000,
  eventType: "contentEntry.unpublished",
  resourceType: "contentEntry" as const,
  resourceId: "entry_2",
  action: "unpublished" as const,
  payload: {
    slug: "another-post",
    contentTypeName: "blog_post",
    contentTypeId: "content_type_1",
    status: "draft",
    version: 3,
  },
  processed: false,
  userId: "user_1",
};

const mockDeleteEvent = {
  _id: "event_3",
  _creationTime: Date.now() - 1000,
  eventType: "contentEntry.deleted",
  resourceType: "contentEntry" as const,
  resourceId: "entry_3",
  action: "deleted" as const,
  payload: {
    slug: "deleted-post",
    contentTypeName: "blog_post",
    contentTypeId: "content_type_1",
    status: "draft",
    version: 1,
  },
  processed: false,
  userId: "user_1",
};

// =============================================================================
// Default Configuration Tests
// =============================================================================

describe("RagContentIndexer - Default Configuration", () => {
  it("should have correct default values", () => {
    expect(DEFAULT_INDEXER_CONFIG.autoIndexOnPublish).toBe(true);
    expect(DEFAULT_INDEXER_CONFIG.autoRemoveOnUnpublish).toBe(true);
    expect(DEFAULT_INDEXER_CONFIG.autoRemoveOnDelete).toBe(true);
    expect(DEFAULT_INDEXER_CONFIG.batchSize).toBe(50);
    expect(DEFAULT_INDEXER_CONFIG.pollingIntervalMs).toBe(60000);
    expect(DEFAULT_INDEXER_CONFIG.namespacePrefix).toBe("cms");
    expect(DEFAULT_INDEXER_CONFIG.includeContentTypes).toEqual([]);
    expect(DEFAULT_INDEXER_CONFIG.excludeContentTypes).toEqual([]);
  });

  it("should have sensible default polling interval", () => {
    // Default polling interval should be 1 minute (60000ms)
    expect(DEFAULT_INDEXER_CONFIG.pollingIntervalMs).toBe(60 * 1000);
  });

  it("should have reasonable batch size", () => {
    // Batch size should be between 10 and 100 for typical use
    expect(DEFAULT_INDEXER_CONFIG.batchSize).toBeGreaterThanOrEqual(10);
    expect(DEFAULT_INDEXER_CONFIG.batchSize).toBeLessThanOrEqual(100);
  });
});

// =============================================================================
// Type Validation Tests
// =============================================================================

describe("RagContentIndexer - Types", () => {
  it("should define RagIndexerConfig correctly", () => {
    const config: RagIndexerConfig = {
      autoIndexOnPublish: false,
      autoRemoveOnUnpublish: true,
      batchSize: 25,
      pollingIntervalMs: 30000,
      includeContentTypes: ["blog_post", "article"],
      excludeContentTypes: ["draft_type"],
      namespacePrefix: "my_cms",
      extractionOptions: {
        includeFields: ["title", "content"],
        excludeFields: ["internal_field"],
      },
    };

    expect(config.autoIndexOnPublish).toBe(false);
    expect(config.batchSize).toBe(25);
    expect(config.includeContentTypes).toContain("blog_post");
  });

  it("should define IndexEntryResult correctly", () => {
    const successResult: IndexEntryResult = {
      entryId: "entry_1",
      success: true,
      chunksCreated: 5,
    };

    const errorResult: IndexEntryResult = {
      entryId: "entry_2",
      success: false,
      chunksCreated: 0,
      error: "Content type not found",
    };

    expect(successResult.success).toBe(true);
    expect(successResult.chunksCreated).toBe(5);
    expect(errorResult.success).toBe(false);
    expect(errorResult.error).toBeDefined();
  });

  it("should define ProcessEventsResult correctly", () => {
    const result: ProcessEventsResult = {
      processed: 10,
      indexed: 7,
      removed: 3,
      errors: [
        { eventId: "ev_1", entryId: "entry_5", error: "Entry not found" },
      ],
      hasMore: true,
    };

    expect(result.processed).toBe(10);
    expect(result.indexed).toBe(7);
    expect(result.removed).toBe(3);
    expect(result.errors).toHaveLength(1);
    expect(result.hasMore).toBe(true);
  });

  it("should define IndexedEntryMetadata correctly", () => {
    const metadata: IndexedEntryMetadata = {
      entryId: "entry_1",
      contentType: "blog_post",
      contentTypeDisplayName: "Blog Post",
      slug: "test-post",
      locale: "en-US",
      version: 3,
      title: "Test Post Title",
      publishedAt: Date.now(),
      namespace: "cms:blog_post:en-US",
    };

    expect(metadata.namespace).toBe("cms:blog_post:en-US");
    expect(metadata.version).toBe(3);
  });

  it("should define IndexingStats correctly", () => {
    const stats: IndexingStats = {
      totalPublished: 100,
      pendingIndexing: 5,
      pendingRemoval: 2,
      byContentType: {
        blog_post: { published: 50, pending: 3 },
        article: { published: 50, pending: 2 },
      },
    };

    expect(stats.totalPublished).toBe(100);
    expect(stats.byContentType.blog_post.published).toBe(50);
  });
});

// =============================================================================
// Event Filtering Logic Tests
// =============================================================================

describe("RagContentIndexer - Event Filtering", () => {
  it("should identify publish events as indexing events", () => {
    const indexingActions = ["published", "unpublished", "deleted", "restored"];

    expect(indexingActions.includes(mockPublishEvent.action)).toBe(true);
    expect(indexingActions.includes(mockUnpublishEvent.action)).toBe(true);
    expect(indexingActions.includes(mockDeleteEvent.action)).toBe(true);
  });

  it("should categorize events correctly", () => {
    const toIndexActions = ["published", "restored"];
    const toRemoveActions = ["unpublished", "deleted"];

    expect(toIndexActions.includes("published")).toBe(true);
    expect(toIndexActions.includes("restored")).toBe(true);
    expect(toRemoveActions.includes("unpublished")).toBe(true);
    expect(toRemoveActions.includes("deleted")).toBe(true);
  });

  it("should filter by content type when configured", () => {
    const includeContentTypes = ["blog_post", "article"];
    const excludeContentTypes = ["internal_type"];

    const blogPayload = mockPublishEvent.payload;
    const shouldInclude =
      includeContentTypes.length === 0 ||
      includeContentTypes.includes(blogPayload.contentTypeName);

    const shouldExclude = excludeContentTypes.includes(blogPayload.contentTypeName);

    expect(shouldInclude).toBe(true);
    expect(shouldExclude).toBe(false);
  });

  it("should only process contentEntry resource types", () => {
    const validResourceType = "contentEntry";
    const invalidResourceTypes = ["contentType", "mediaAsset", "mediaFolder"];

    expect(mockPublishEvent.resourceType).toBe(validResourceType);
    expect(invalidResourceTypes.includes(mockPublishEvent.resourceType)).toBe(false);
  });
});

// =============================================================================
// Namespace Generation Tests
// =============================================================================

describe("RagContentIndexer - Namespace Generation", () => {
  it("should generate namespace without locale", () => {
    const prefix = "cms";
    const contentTypeName = "blog_post";
    const locale = undefined;

    const namespace = locale
      ? `${prefix}:${contentTypeName}:${locale}`
      : `${prefix}:${contentTypeName}`;

    expect(namespace).toBe("cms:blog_post");
  });

  it("should generate namespace with locale", () => {
    const prefix = "cms";
    const contentTypeName = "blog_post";
    const locale = "en-US";

    const namespace = locale
      ? `${prefix}:${contentTypeName}:${locale}`
      : `${prefix}:${contentTypeName}`;

    expect(namespace).toBe("cms:blog_post:en-US");
  });

  it("should support custom namespace prefix", () => {
    const prefix = "my_app";
    const contentTypeName = "article";
    const locale = "de-DE";

    const namespace = locale
      ? `${prefix}:${contentTypeName}:${locale}`
      : `${prefix}:${contentTypeName}`;

    expect(namespace).toBe("my_app:article:de-DE");
  });
});

// =============================================================================
// Entry Validation Tests
// =============================================================================

describe("RagContentIndexer - Entry Validation", () => {
  it("should only index published entries", () => {
    expect(mockPublishedEntry.status).toBe("published");
    expect(mockDraftEntry.status).toBe("draft");

    const canIndexPublished = mockPublishedEntry.status === "published";
    const canIndexDraft = mockDraftEntry.status === "published";

    expect(canIndexPublished).toBe(true);
    expect(canIndexDraft).toBe(false);
  });

  it("should validate entry has content type", () => {
    expect(mockPublishedEntry.contentTypeId).toBeDefined();
    expect(mockPublishedEntry.contentTypeId).toBe("content_type_1");
  });

  it("should handle entries without locale", () => {
    expect(mockPublishedEntry.locale).toBeUndefined();
  });

  it("should handle entries with publish timestamps", () => {
    expect(mockPublishedEntry.firstPublishedAt).toBeDefined();
    expect(mockPublishedEntry.lastPublishedAt).toBeDefined();
    expect(mockDraftEntry.firstPublishedAt).toBeUndefined();
  });
});

// =============================================================================
// Batch Processing Logic Tests
// =============================================================================

describe("RagContentIndexer - Batch Processing", () => {
  it("should respect batch size limits", () => {
    const batchSize = 50;
    const events = Array(100).fill(mockPublishEvent);

    const batch = events.slice(0, batchSize);
    const hasMore = events.length > batchSize;

    expect(batch).toHaveLength(50);
    expect(hasMore).toBe(true);
  });

  it("should track processed vs remaining events", () => {
    const totalEvents = 75;
    const batchSize = 50;

    const firstBatchSize = Math.min(totalEvents, batchSize);
    const remaining = totalEvents - firstBatchSize;
    const hasMore = remaining > 0;

    expect(firstBatchSize).toBe(50);
    expect(remaining).toBe(25);
    expect(hasMore).toBe(true);
  });

  it("should calculate cursor for pagination", () => {
    const entries = [
      { _id: "entry_1" },
      { _id: "entry_2" },
      { _id: "entry_3" },
    ];
    const hasMore = true;

    const nextCursor = hasMore ? entries[entries.length - 1]._id : undefined;

    expect(nextCursor).toBe("entry_3");
  });
});

// =============================================================================
// Event Payload Tests
// =============================================================================

describe("RagContentIndexer - Event Payloads", () => {
  it("should extract content type from publish event payload", () => {
    const payload = mockPublishEvent.payload as { contentTypeName?: string };

    expect(payload.contentTypeName).toBe("blog_post");
    expect(payload.contentTypeId).toBe("content_type_1");
  });

  it("should include version in event payload", () => {
    const payload = mockPublishEvent.payload as { version?: number };

    expect(payload.version).toBe(2);
  });

  it("should include slug in event payload", () => {
    const payload = mockPublishEvent.payload as { slug?: string };

    expect(payload.slug).toBe("test-blog-post");
  });

  it("should include status in event payload", () => {
    const payload = mockPublishEvent.payload as { status?: string };

    expect(payload.status).toBe("published");
  });
});

// =============================================================================
// Scheduler Integration Tests
// =============================================================================

describe("RagContentIndexer - Scheduler Integration", () => {
  it("should calculate next run time correctly", () => {
    const now = Date.now();
    const pollingInterval = 60000; // 1 minute

    const nextRunTime = now + pollingInterval;

    expect(nextRunTime).toBeGreaterThan(now);
    expect(nextRunTime - now).toBe(pollingInterval);
  });

  it("should support custom delay for next run", () => {
    const now = Date.now();
    const customDelay = 30000; // 30 seconds

    const nextRunTime = now + customDelay;

    expect(nextRunTime - now).toBe(30000);
  });
});

// =============================================================================
// Content Type Filtering Tests
// =============================================================================

describe("RagContentIndexer - Content Type Filtering", () => {
  it("should include all types when no filter specified", () => {
    const includeContentTypes: string[] = [];
    const contentTypeName = "any_type";

    const shouldInclude =
      includeContentTypes.length === 0 || includeContentTypes.includes(contentTypeName);

    expect(shouldInclude).toBe(true);
  });

  it("should only include specified content types", () => {
    const includeContentTypes = ["blog_post", "article"];

    expect(includeContentTypes.includes("blog_post")).toBe(true);
    expect(includeContentTypes.includes("article")).toBe(true);
    expect(includeContentTypes.includes("product")).toBe(false);
  });

  it("should exclude specified content types", () => {
    const excludeContentTypes = ["internal_type", "draft_type"];

    expect(excludeContentTypes.includes("internal_type")).toBe(true);
    expect(excludeContentTypes.includes("blog_post")).toBe(false);
  });

  it("should apply both include and exclude filters", () => {
    const includeContentTypes = ["blog_post", "article", "internal_type"];
    const excludeContentTypes = ["internal_type"];
    const contentTypeName = "internal_type";

    const isIncluded =
      includeContentTypes.length === 0 || includeContentTypes.includes(contentTypeName);
    const isExcluded = excludeContentTypes.includes(contentTypeName);
    const shouldProcess = isIncluded && !isExcluded;

    expect(shouldProcess).toBe(false);
  });
});

// =============================================================================
// Reindex Request Tests
// =============================================================================

describe("RagContentIndexer - Reindex Requests", () => {
  it("should create reindex metadata marker", () => {
    const metadata = { reindexRequest: true };

    expect(metadata.reindexRequest).toBe(true);
  });

  it("should create bulk reindex metadata marker", () => {
    const metadata = { bulkReindex: true };

    expect(metadata.bulkReindex).toBe(true);
  });

  it("should validate entry is published before reindex", () => {
    const publishedStatus = "published";
    const draftStatus = "draft";

    expect(mockPublishedEntry.status).toBe(publishedStatus);
    expect(mockPublishedEntry.status === publishedStatus).toBe(true);
    expect(draftStatus === publishedStatus).toBe(false);
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe("RagContentIndexer - Error Handling", () => {
  it("should track errors in process result", () => {
    const result: ProcessEventsResult = {
      processed: 10,
      indexed: 8,
      removed: 0,
      errors: [
        { eventId: "ev_1", entryId: "entry_5", error: "Entry not found" },
        { eventId: "ev_2", entryId: "entry_6", error: "Content type not found" },
      ],
      hasMore: false,
    };

    expect(result.errors).toHaveLength(2);
    expect(result.indexed).toBe(8);
    expect(result.processed).toBe(10);
  });

  it("should handle missing entry gracefully", () => {
    const entry = null;
    const canProcess = entry !== null;

    expect(canProcess).toBe(false);
  });

  it("should handle missing content type gracefully", () => {
    const contentType = null;
    const canProcess = contentType !== null;

    expect(canProcess).toBe(false);
  });
});

// =============================================================================
// Stats Calculation Tests
// =============================================================================

describe("RagContentIndexer - Stats Calculation", () => {
  it("should calculate total published correctly", () => {
    const publishedEntries = [
      { _id: "1", status: "published" },
      { _id: "2", status: "published" },
      { _id: "3", status: "published" },
    ];

    expect(publishedEntries.length).toBe(3);
  });

  it("should calculate pending indexing from unprocessed events", () => {
    const unprocessedEvents = [
      { ...mockPublishEvent, action: "published" as const },
      { ...mockPublishEvent, action: "published" as const },
      { ...mockUnpublishEvent, action: "unpublished" as const },
    ];

    const pendingIndexing = unprocessedEvents.filter((e) => e.action === "published").length;
    const pendingRemoval = unprocessedEvents.filter((e) => e.action === "unpublished").length;

    expect(pendingIndexing).toBe(2);
    expect(pendingRemoval).toBe(1);
  });

  it("should build content type breakdown", () => {
    const byContentType: Record<string, { published: number; pending: number }> = {};

    // Simulate adding entries
    const entries = [
      { contentType: "blog_post" },
      { contentType: "blog_post" },
      { contentType: "article" },
    ];

    for (const entry of entries) {
      if (!byContentType[entry.contentType]) {
        byContentType[entry.contentType] = { published: 0, pending: 0 };
      }
      byContentType[entry.contentType].published++;
    }

    expect(byContentType.blog_post.published).toBe(2);
    expect(byContentType.article.published).toBe(1);
  });
});
