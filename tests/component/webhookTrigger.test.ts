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

import { describe, it, expect } from "vitest";
import {
  RETRY_DELAYS_MS,
  type WebhookPayload,
} from "../../src/component/webhookTrigger.js";

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
      timestamp: "2026-01-15T10:30:00.000Z",
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
      timestamp: "2026-01-15T10:30:00.000Z",
    };

    const json = JSON.stringify(payload);
    const parsed = JSON.parse(json);

    expect(parsed.data.title).toBe('Title with "quotes" and \\backslashes');
    expect(parsed.data.content).toBe("Content with\nnewlines\tand\ttabs");
    expect(parsed.data.unicode).toBe("Unicode: 你好世界 🎉");
  });
});

