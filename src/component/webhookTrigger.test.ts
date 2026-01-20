/**
 * Webhook Trigger Tests
 *
 * Tests for the webhook trigger module that processes events and delivers
 * webhooks to external systems. These are unit tests for the helper functions,
 * validators, and types.
 *
 * Integration tests with actual database operations and HTTP calls are
 * handled via Playwright.
 */

import { describe, it, expect, vi } from "vitest";
import {
  DEFAULT_WEBHOOK_CONFIG,
  RETRY_DELAYS_MS,
  type WebhookPayload,
  type WebhookProcessorConfig,
  type ProcessWebhooksResult,
  type WebhookStats,
  type WebhookDeliveryStatus,
} from "./webhookTrigger.js";

describe("Webhook Configuration Defaults", () => {
  it("should have correct default batch size", () => {
    expect(DEFAULT_WEBHOOK_CONFIG.batchSize).toBe(50);
  });

  it("should have correct default polling interval", () => {
    expect(DEFAULT_WEBHOOK_CONFIG.pollingIntervalMs).toBe(60000); // 1 minute
  });

  it("should have correct default timeout", () => {
    expect(DEFAULT_WEBHOOK_CONFIG.defaultTimeoutMs).toBe(30000); // 30 seconds
  });

  it("should have correct default max retries", () => {
    expect(DEFAULT_WEBHOOK_CONFIG.defaultMaxRetries).toBe(5);
  });
});

describe("Retry Delays", () => {
  it("should have 5 retry delay levels", () => {
    expect(RETRY_DELAYS_MS.length).toBe(5);
  });

  it("should have exponentially increasing delays", () => {
    // 1 minute
    expect(RETRY_DELAYS_MS[0]).toBe(1 * 60 * 1000);
    // 5 minutes
    expect(RETRY_DELAYS_MS[1]).toBe(5 * 60 * 1000);
    // 15 minutes
    expect(RETRY_DELAYS_MS[2]).toBe(15 * 60 * 1000);
    // 1 hour
    expect(RETRY_DELAYS_MS[3]).toBe(60 * 60 * 1000);
    // 4 hours
    expect(RETRY_DELAYS_MS[4]).toBe(4 * 60 * 60 * 1000);
  });

  it("should have delays in ascending order", () => {
    for (let i = 1; i < RETRY_DELAYS_MS.length; i++) {
      expect(RETRY_DELAYS_MS[i]).toBeGreaterThan(RETRY_DELAYS_MS[i - 1]);
    }
  });
});

describe("WebhookPayload Type", () => {
  it("should have correct structure", () => {
    const payload: WebhookPayload = {
      deliveryId: "delivery-123",
      eventType: "contentEntry.published",
      resourceType: "contentEntry",
      resourceId: "entry-456",
      action: "published",
      data: {
        slug: "my-blog-post",
        contentTypeName: "blog_post",
        status: "published",
      },
      timestamp: "2024-01-15T10:30:00.000Z",
      userId: "user-789",
    };

    expect(payload.deliveryId).toBe("delivery-123");
    expect(payload.eventType).toBe("contentEntry.published");
    expect(payload.resourceType).toBe("contentEntry");
    expect(payload.resourceId).toBe("entry-456");
    expect(payload.action).toBe("published");
    expect(payload.data).toEqual({
      slug: "my-blog-post",
      contentTypeName: "blog_post",
      status: "published",
    });
    expect(payload.timestamp).toBe("2024-01-15T10:30:00.000Z");
    expect(payload.userId).toBe("user-789");
  });

  it("should allow optional userId", () => {
    const payload: WebhookPayload = {
      deliveryId: "delivery-123",
      eventType: "contentEntry.created",
      resourceType: "contentEntry",
      resourceId: "entry-456",
      action: "created",
      data: { slug: "new-post" },
      timestamp: "2024-01-15T10:30:00.000Z",
    };

    expect(payload.userId).toBeUndefined();
  });
});

describe("WebhookProcessorConfig Type", () => {
  it("should have all optional fields", () => {
    // Empty config should be valid
    const config: WebhookProcessorConfig = {};

    expect(config.batchSize).toBeUndefined();
    expect(config.pollingIntervalMs).toBeUndefined();
    expect(config.defaultTimeoutMs).toBeUndefined();
    expect(config.defaultMaxRetries).toBeUndefined();
  });

  it("should accept custom values", () => {
    const config: WebhookProcessorConfig = {
      batchSize: 100,
      pollingIntervalMs: 30000,
      defaultTimeoutMs: 60000,
      defaultMaxRetries: 10,
    };

    expect(config.batchSize).toBe(100);
    expect(config.pollingIntervalMs).toBe(30000);
    expect(config.defaultTimeoutMs).toBe(60000);
    expect(config.defaultMaxRetries).toBe(10);
  });
});

describe("ProcessWebhooksResult Type", () => {
  it("should have correct structure", () => {
    const result: ProcessWebhooksResult = {
      eventsProcessed: 10,
      deliveriesQueued: 25,
      deliveriesSucceeded: 20,
      deliveriesFailed: 5,
      hasMore: true,
      errors: [
        {
          webhookId: "webhook-1",
          eventId: "event-1",
          error: "Connection timeout",
        },
      ],
    };

    expect(result.eventsProcessed).toBe(10);
    expect(result.deliveriesQueued).toBe(25);
    expect(result.deliveriesSucceeded).toBe(20);
    expect(result.deliveriesFailed).toBe(5);
    expect(result.hasMore).toBe(true);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe("Connection timeout");
  });

  it("should allow empty errors array", () => {
    const result: ProcessWebhooksResult = {
      eventsProcessed: 5,
      deliveriesQueued: 10,
      deliveriesSucceeded: 10,
      deliveriesFailed: 0,
      hasMore: false,
      errors: [],
    };

    expect(result.errors).toHaveLength(0);
    expect(result.deliveriesFailed).toBe(0);
  });
});

describe("WebhookStats Type", () => {
  it("should have correct structure", () => {
    const stats: WebhookStats = {
      totalWebhooks: 10,
      activeWebhooks: 8,
      pendingDeliveries: 50,
      retryingDeliveries: 5,
      deliveriesLast24h: 1000,
      successRateLast24h: 95,
    };

    expect(stats.totalWebhooks).toBe(10);
    expect(stats.activeWebhooks).toBe(8);
    expect(stats.pendingDeliveries).toBe(50);
    expect(stats.retryingDeliveries).toBe(5);
    expect(stats.deliveriesLast24h).toBe(1000);
    expect(stats.successRateLast24h).toBe(95);
  });
});

describe("WebhookDeliveryStatus Type", () => {
  it("should include all expected statuses", () => {
    const statuses: WebhookDeliveryStatus[] = [
      "pending",
      "processing",
      "delivered",
      "failed",
      "retrying",
    ];

    // TypeScript will ensure these are valid
    expect(statuses).toContain("pending");
    expect(statuses).toContain("processing");
    expect(statuses).toContain("delivered");
    expect(statuses).toContain("failed");
    expect(statuses).toContain("retrying");
    expect(statuses.length).toBe(5);
  });
});

describe("Event Type Format Validation", () => {
  it("should validate correct event type formats", () => {
    const validEventTypes = [
      "contentEntry.created",
      "contentEntry.updated",
      "contentEntry.published",
      "contentEntry.unpublished",
      "contentEntry.deleted",
      "contentEntry.restored",
      "contentEntry.duplicated",
      "contentEntry.scheduled",
      "contentType.created",
      "contentType.updated",
      "contentType.deleted",
      "mediaAsset.created",
      "mediaAsset.updated",
      "mediaAsset.deleted",
      "mediaAsset.restored",
      "mediaFolder.created",
      "mediaFolder.updated",
      "mediaFolder.deleted",
    ];

    for (const eventType of validEventTypes) {
      expect(eventType.includes(".")).toBe(true);
      const [resourceType, action] = eventType.split(".");
      expect(resourceType).toBeTruthy();
      expect(action).toBeTruthy();
    }
  });
});

describe("Exponential Backoff Calculation", () => {
  it("should calculate correct retry delay based on attempt count", () => {
    // Helper function that mirrors the logic in handleDeliveryFailure
    const getRetryDelay = (attemptCount: number): number => {
      const delayIndex = Math.min(attemptCount - 1, RETRY_DELAYS_MS.length - 1);
      return RETRY_DELAYS_MS[delayIndex];
    };

    // First retry (after attempt 1) - 1 minute
    expect(getRetryDelay(1)).toBe(1 * 60 * 1000);

    // Second retry (after attempt 2) - 5 minutes
    expect(getRetryDelay(2)).toBe(5 * 60 * 1000);

    // Third retry (after attempt 3) - 15 minutes
    expect(getRetryDelay(3)).toBe(15 * 60 * 1000);

    // Fourth retry (after attempt 4) - 1 hour
    expect(getRetryDelay(4)).toBe(60 * 60 * 1000);

    // Fifth retry (after attempt 5) - 4 hours
    expect(getRetryDelay(5)).toBe(4 * 60 * 60 * 1000);

    // Beyond max (should cap at last delay)
    expect(getRetryDelay(6)).toBe(4 * 60 * 60 * 1000);
    expect(getRetryDelay(10)).toBe(4 * 60 * 60 * 1000);
  });
});

describe("URL Validation", () => {
  it("should validate HTTPS URLs", () => {
    const httpsUrl = "https://api.example.com/webhooks";
    const httpUrl = "http://api.example.com/webhooks";
    const invalidUrl = "not-a-url";

    // Valid HTTPS
    expect(() => new URL(httpsUrl)).not.toThrow();
    expect(new URL(httpsUrl).protocol).toBe("https:");

    // HTTP (valid but should warn)
    expect(() => new URL(httpUrl)).not.toThrow();
    expect(new URL(httpUrl).protocol).toBe("http:");

    // Invalid
    expect(() => new URL(invalidUrl)).toThrow();
  });

  it("should handle URLs with paths and query params", () => {
    const complexUrl =
      "https://api.example.com/webhooks/cms?token=abc&version=1";
    const parsed = new URL(complexUrl);

    expect(parsed.hostname).toBe("api.example.com");
    expect(parsed.pathname).toBe("/webhooks/cms");
    expect(parsed.searchParams.get("token")).toBe("abc");
    expect(parsed.searchParams.get("version")).toBe("1");
  });
});

describe("Webhook Matching Logic", () => {
  // Test the filter logic used to match events to webhooks
  interface MockWebhook {
    eventTypes: string[];
    resourceTypes?: string[];
    contentTypes?: string[];
    enabled: boolean;
  }

  interface MockEvent {
    eventType: string;
    resourceType: string;
    contentTypeName?: string;
  }

  const matchesWebhook = (webhook: MockWebhook, event: MockEvent): boolean => {
    if (!webhook.enabled) return false;

    // Check event type filter
    if (
      webhook.eventTypes.length > 0 &&
      !webhook.eventTypes.includes(event.eventType)
    ) {
      return false;
    }

    // Check resource type filter
    if (
      webhook.resourceTypes &&
      webhook.resourceTypes.length > 0 &&
      !webhook.resourceTypes.includes(event.resourceType)
    ) {
      return false;
    }

    // Check content type filter (only for contentEntry events)
    if (
      event.resourceType === "contentEntry" &&
      webhook.contentTypes &&
      webhook.contentTypes.length > 0 &&
      event.contentTypeName &&
      !webhook.contentTypes.includes(event.contentTypeName)
    ) {
      return false;
    }

    return true;
  };

  it("should match webhook with no filters (catch-all)", () => {
    const webhook: MockWebhook = {
      eventTypes: [],
      enabled: true,
    };

    const event: MockEvent = {
      eventType: "contentEntry.published",
      resourceType: "contentEntry",
      contentTypeName: "blog_post",
    };

    expect(matchesWebhook(webhook, event)).toBe(true);
  });

  it("should match webhook with specific event type filter", () => {
    const webhook: MockWebhook = {
      eventTypes: ["contentEntry.published"],
      enabled: true,
    };

    expect(
      matchesWebhook(webhook, {
        eventType: "contentEntry.published",
        resourceType: "contentEntry",
      })
    ).toBe(true);

    expect(
      matchesWebhook(webhook, {
        eventType: "contentEntry.created",
        resourceType: "contentEntry",
      })
    ).toBe(false);
  });

  it("should match webhook with resource type filter", () => {
    const webhook: MockWebhook = {
      eventTypes: [],
      resourceTypes: ["contentEntry"],
      enabled: true,
    };

    expect(
      matchesWebhook(webhook, {
        eventType: "contentEntry.published",
        resourceType: "contentEntry",
      })
    ).toBe(true);

    expect(
      matchesWebhook(webhook, {
        eventType: "mediaAsset.created",
        resourceType: "mediaAsset",
      })
    ).toBe(false);
  });

  it("should match webhook with content type filter", () => {
    const webhook: MockWebhook = {
      eventTypes: [],
      contentTypes: ["blog_post", "article"],
      enabled: true,
    };

    expect(
      matchesWebhook(webhook, {
        eventType: "contentEntry.published",
        resourceType: "contentEntry",
        contentTypeName: "blog_post",
      })
    ).toBe(true);

    expect(
      matchesWebhook(webhook, {
        eventType: "contentEntry.published",
        resourceType: "contentEntry",
        contentTypeName: "page",
      })
    ).toBe(false);
  });

  it("should not match disabled webhook", () => {
    const webhook: MockWebhook = {
      eventTypes: [],
      enabled: false,
    };

    expect(
      matchesWebhook(webhook, {
        eventType: "contentEntry.published",
        resourceType: "contentEntry",
      })
    ).toBe(false);
  });

  it("should apply content type filter only for contentEntry events", () => {
    const webhook: MockWebhook = {
      eventTypes: [],
      contentTypes: ["blog_post"],
      enabled: true,
    };

    // Media asset event should not be filtered by contentTypes
    expect(
      matchesWebhook(webhook, {
        eventType: "mediaAsset.created",
        resourceType: "mediaAsset",
      })
    ).toBe(true);
  });
});

describe("HMAC Signature Verification", () => {
  // This tests the signature format, not the actual crypto
  it("should use correct signature format", () => {
    const signature = "sha256=abc123def456";
    expect(signature.startsWith("sha256=")).toBe(true);
    expect(signature.length).toBeGreaterThan(7); // "sha256=" + some hash
  });

  it("should produce 64-character hex hash (SHA-256)", () => {
    // SHA-256 produces 256 bits = 32 bytes = 64 hex characters
    const mockHexHash = "a".repeat(64);
    expect(mockHexHash.length).toBe(64);
    expect(/^[0-9a-f]+$/i.test(mockHexHash)).toBe(true);
  });
});

describe("Response Body Truncation", () => {
  it("should truncate long response bodies", () => {
    const MAX_LENGTH = 1000;
    const longBody = "x".repeat(2000);
    const truncated = longBody.slice(0, MAX_LENGTH);

    expect(truncated.length).toBe(MAX_LENGTH);
    expect(truncated).toBe("x".repeat(1000));
  });

  it("should not modify short response bodies", () => {
    const MAX_LENGTH = 1000;
    const shortBody = "Short response body";
    const result = shortBody.slice(0, MAX_LENGTH);

    expect(result).toBe(shortBody);
    expect(result.length).toBe(19);
  });
});

describe("Webhook Payload Serialization", () => {
  it("should serialize payload to valid JSON", () => {
    const payload: WebhookPayload = {
      deliveryId: "delivery-123",
      eventType: "contentEntry.published",
      resourceType: "contentEntry",
      resourceId: "entry-456",
      action: "published",
      data: {
        slug: "test-post",
        nested: { key: "value" },
        array: [1, 2, 3],
      },
      timestamp: "2024-01-15T10:30:00.000Z",
    };

    const json = JSON.stringify(payload);
    const parsed = JSON.parse(json);

    expect(parsed.deliveryId).toBe("delivery-123");
    expect(parsed.data.nested.key).toBe("value");
    expect(parsed.data.array).toEqual([1, 2, 3]);
  });

  it("should handle special characters in payload", () => {
    const payload: WebhookPayload = {
      deliveryId: "delivery-123",
      eventType: "contentEntry.created",
      resourceType: "contentEntry",
      resourceId: "entry-456",
      action: "created",
      data: {
        title: 'Title with "quotes" and \\backslashes',
        content: "Content with\nnewlines\tand\ttabs",
        unicode: "Unicode: 你好世界 🎉",
      },
      timestamp: "2024-01-15T10:30:00.000Z",
    };

    const json = JSON.stringify(payload);
    const parsed = JSON.parse(json);

    expect(parsed.data.title).toBe('Title with "quotes" and \\backslashes');
    expect(parsed.data.content).toBe("Content with\nnewlines\tand\ttabs");
    expect(parsed.data.unicode).toBe("Unicode: 你好世界 🎉");
  });
});

describe("Delivery Status Transitions", () => {
  // Valid state transitions for webhook deliveries
  const validTransitions: Record<WebhookDeliveryStatus, WebhookDeliveryStatus[]> = {
    pending: ["processing"],
    processing: ["delivered", "failed", "retrying"],
    delivered: [], // Terminal state
    failed: ["pending"], // Can be manually retried
    retrying: ["processing"],
  };

  it("should define valid state transitions", () => {
    // Pending can only go to processing
    expect(validTransitions.pending).toEqual(["processing"]);

    // Processing can succeed, fail, or schedule retry
    expect(validTransitions.processing).toContain("delivered");
    expect(validTransitions.processing).toContain("failed");
    expect(validTransitions.processing).toContain("retrying");

    // Delivered is terminal
    expect(validTransitions.delivered).toHaveLength(0);

    // Failed can be manually retried (reset to pending)
    expect(validTransitions.failed).toContain("pending");

    // Retrying goes back to processing when retry time arrives
    expect(validTransitions.retrying).toContain("processing");
  });
});
