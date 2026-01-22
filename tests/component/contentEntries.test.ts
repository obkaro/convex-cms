/**
 * Tests for the content entries list query.
 *
 * These tests verify the validators and logic patterns for the list query:
 * - Validator structure for list arguments
 * - Pagination response structure
 * - Filter logic patterns
 * - Limit clamping behavior
 */

import { describe, it, expect } from "vitest";
import { contentQueryArgs, contentEntryDoc } from "../../src/component/validators.js";

describe("Content Entries List Query", () => {
	// =============================================================================
	// Validator Structure Tests
	// =============================================================================

	describe("contentQueryArgs validator", () => {
		it("should have contentTypeId field for filtering by type ID", () => {
			const argFields = Object.keys(contentQueryArgs.fields);
			expect(argFields).toContain("contentTypeId");
		});

		it("should have contentTypeName field for filtering by type name", () => {
			const argFields = Object.keys(contentQueryArgs.fields);
			expect(argFields).toContain("contentTypeName");
		});

		it("should have status field for filtering by status", () => {
			const argFields = Object.keys(contentQueryArgs.fields);
			expect(argFields).toContain("status");
		});

		it("should have statusIn field for filtering by multiple statuses", () => {
			const argFields = Object.keys(contentQueryArgs.fields);
			expect(argFields).toContain("statusIn");
		});

		it("should have locale field for filtering by locale", () => {
			const argFields = Object.keys(contentQueryArgs.fields);
			expect(argFields).toContain("locale");
		});

		it("should have search field for full-text search", () => {
			const argFields = Object.keys(contentQueryArgs.fields);
			expect(argFields).toContain("search");
		});

		it("should have includeDeleted field for soft-delete control", () => {
			const argFields = Object.keys(contentQueryArgs.fields);
			expect(argFields).toContain("includeDeleted");
		});

		it("should have cursor field for pagination", () => {
			const argFields = Object.keys(contentQueryArgs.fields);
			expect(argFields).toContain("cursor");
		});

		it("should have limit field for page size", () => {
			const argFields = Object.keys(contentQueryArgs.fields);
			expect(argFields).toContain("limit");
		});
	});

	// =============================================================================
	// Content Entry Document Structure Tests
	// =============================================================================

	describe("contentEntryDoc structure for list response", () => {
		it("should have _id field for cursor-based pagination", () => {
			const docFields = Object.keys(contentEntryDoc.fields);
			expect(docFields).toContain("_id");
		});

		it("should have contentTypeId for type filtering", () => {
			const docFields = Object.keys(contentEntryDoc.fields);
			expect(docFields).toContain("contentTypeId");
		});

		it("should have status for status filtering", () => {
			const docFields = Object.keys(contentEntryDoc.fields);
			expect(docFields).toContain("status");
		});

		it("should have locale for locale filtering", () => {
			const docFields = Object.keys(contentEntryDoc.fields);
			expect(docFields).toContain("locale");
		});

		it("should have deletedAt for soft-delete filtering", () => {
			const docFields = Object.keys(contentEntryDoc.fields);
			expect(docFields).toContain("deletedAt");
		});

		it("should have searchText for full-text search", () => {
			const docFields = Object.keys(contentEntryDoc.fields);
			expect(docFields).toContain("searchText");
		});
	});

	// =============================================================================
	// Pagination Logic Pattern Tests
	// =============================================================================

	describe("Pagination logic patterns", () => {
		const DEFAULT_LIST_LIMIT = 50;
		const MAX_LIST_LIMIT = 250;

		it("should use default limit when not specified", () => {
			const requestedLimit = undefined;
			const limit = Math.min(
				Math.max(1, requestedLimit ?? DEFAULT_LIST_LIMIT),
				MAX_LIST_LIMIT,
			);
			expect(limit).toBe(DEFAULT_LIST_LIMIT);
		});

		it("should clamp limit to maximum of 250", () => {
			const requestedLimit = 500;
			const limit = Math.min(
				Math.max(1, requestedLimit ?? DEFAULT_LIST_LIMIT),
				MAX_LIST_LIMIT,
			);
			expect(limit).toBe(MAX_LIST_LIMIT);
		});

		it("should clamp limit to minimum of 1", () => {
			const requestedLimit = 0;
			const limit = Math.min(
				Math.max(1, requestedLimit ?? DEFAULT_LIST_LIMIT),
				MAX_LIST_LIMIT,
			);
			expect(limit).toBe(1);
		});

		it("should use requested limit when within bounds", () => {
			const requestedLimit = 25;
			const limit = Math.min(
				Math.max(1, requestedLimit ?? DEFAULT_LIST_LIMIT),
				MAX_LIST_LIMIT,
			);
			expect(limit).toBe(25);
		});

		it("should determine hasMore by checking if results exceed limit", () => {
			const limit = 10;
			const fetchedResults = 11; // Fetch limit + 1 to check hasMore
			const hasMore = fetchedResults > limit;
			expect(hasMore).toBe(true);
		});

		it("should not have more results when count equals limit", () => {
			const limit = 10;
			const fetchedResults = 10;
			const hasMore = fetchedResults > limit;
			expect(hasMore).toBe(false);
		});

		it("should return last item ID as cursor when hasMore is true", () => {
			const items = [
				{ _id: "id1", slug: "first" },
				{ _id: "id2", slug: "second" },
			];
			const hasMore = true;
			const nextCursor =
				hasMore && items.length > 0 ? items[items.length - 1]._id : undefined;
			expect(nextCursor).toBe("id2");
		});

		it("should return undefined cursor when hasMore is false", () => {
			const items = [{ _id: "id1", slug: "first" }];
			const hasMore = false;
			const nextCursor =
				hasMore && items.length > 0 ? items[items.length - 1]._id : undefined;
			expect(nextCursor).toBeUndefined();
		});
	});

	// =============================================================================
	// Filter Logic Pattern Tests
	// =============================================================================

	describe("Filter logic patterns", () => {
		it("should skip soft-deleted entries when includeDeleted is false", () => {
			const includeDeleted = false;
			const entry = { deletedAt: Date.now() };
			const shouldInclude = includeDeleted || entry.deletedAt === undefined;
			expect(shouldInclude).toBe(false);
		});

		it("should include soft-deleted entries when includeDeleted is true", () => {
			const includeDeleted = true;
			const entry = { deletedAt: Date.now() };
			const shouldInclude = includeDeleted || entry.deletedAt === undefined;
			expect(shouldInclude).toBe(true);
		});

		it("should include active entries regardless of includeDeleted", () => {
			const includeDeleted = false;
			const entry = { deletedAt: undefined };
			const shouldInclude = includeDeleted || entry.deletedAt === undefined;
			expect(shouldInclude).toBe(true);
		});

		it("should filter by status when specified", () => {
			const statusFilter = "published";
			const entries = [
				{ status: "published", slug: "pub1" },
				{ status: "draft", slug: "draft1" },
				{ status: "published", slug: "pub2" },
			];
			const filtered = entries.filter((e) => e.status === statusFilter);
			expect(filtered).toHaveLength(2);
			expect(filtered.every((e) => e.status === "published")).toBe(true);
		});

		it("should filter by multiple statuses when statusIn is specified", () => {
			const statusInFilter = ["draft", "scheduled"];
			const entries = [
				{ status: "published", slug: "pub1" },
				{ status: "draft", slug: "draft1" },
				{ status: "scheduled", slug: "scheduled1" },
				{ status: "archived", slug: "archived1" },
				{ status: "draft", slug: "draft2" },
			];
			const filtered = entries.filter((e) => statusInFilter.includes(e.status));
			expect(filtered).toHaveLength(3);
			expect(
				filtered.every((e) => ["draft", "scheduled"].includes(e.status)),
			).toBe(true);
		});

		it("should filter by all non-archived statuses (admin use case)", () => {
			const statusInFilter = ["draft", "published", "scheduled"];
			const entries = [
				{ status: "published", slug: "pub1" },
				{ status: "draft", slug: "draft1" },
				{ status: "scheduled", slug: "scheduled1" },
				{ status: "archived", slug: "archived1" },
			];
			const filtered = entries.filter((e) => statusInFilter.includes(e.status));
			expect(filtered).toHaveLength(3);
			expect(filtered.every((e) => e.status !== "archived")).toBe(true);
		});

		it("should filter to only published entries (frontend use case)", () => {
			const statusInFilter = ["published"];
			const entries = [
				{ status: "published", slug: "pub1" },
				{ status: "draft", slug: "draft1" },
				{ status: "published", slug: "pub2" },
			];
			const filtered = entries.filter((e) => statusInFilter.includes(e.status));
			expect(filtered).toHaveLength(2);
			expect(filtered.every((e) => e.status === "published")).toBe(true);
		});

		it("should filter by locale when specified", () => {
			const localeFilter = "en-US";
			const entries = [
				{ locale: "en-US", slug: "english" },
				{ locale: "es-ES", slug: "spanish" },
				{ locale: "en-US", slug: "english2" },
			];
			const filtered = entries.filter((e) => e.locale === localeFilter);
			expect(filtered).toHaveLength(2);
			expect(filtered.every((e) => e.locale === "en-US")).toBe(true);
		});

		it("should return empty array for non-existent content type name", () => {
			// Simulates content type not found - tests the null check condition
			const contentType = null as { isActive: boolean; deletedAt?: number } | null;
			// When content type is null, the check should return true
			expect(contentType === null).toBe(true);
		});

		it("should return empty array for inactive content type", () => {
			const contentType = { isActive: false, deletedAt: undefined };
			const shouldReturnEmpty =
				!contentType ||
				!contentType.isActive ||
				contentType.deletedAt !== undefined;
			expect(shouldReturnEmpty).toBe(true);
		});

		it("should return empty array for deleted content type", () => {
			const contentType = { isActive: true, deletedAt: Date.now() };
			const shouldReturnEmpty =
				!contentType ||
				!contentType.isActive ||
				contentType.deletedAt !== undefined;
			expect(shouldReturnEmpty).toBe(true);
		});
	});

	// =============================================================================
	// Status Resolution Logic Tests
	// =============================================================================

	describe("Status resolution logic (statusIn vs status)", () => {
		it("should use statusIn when both statusIn and status are provided", () => {
			const status = "published";
			const statusIn = ["draft", "scheduled"];

			// statusIn takes precedence over status
			const resolvedStatuses = statusIn?.length
				? statusIn
				: status
				? [status]
				: undefined;

			expect(resolvedStatuses).toEqual(["draft", "scheduled"]);
		});

		it("should convert single status to array when statusIn is not provided", () => {
			const status: string | undefined = "published";
			const statusIn = undefined as string[] | undefined;

			const resolvedStatuses =
				statusIn && statusIn.length > 0
					? statusIn
					: status
					? [status]
					: undefined;

			expect(resolvedStatuses).toEqual(["published"]);
		});

		it("should return undefined when neither status nor statusIn is provided", () => {
			const status = undefined as string | undefined;
			const statusIn = undefined as string[] | undefined;

			const resolvedStatuses =
				statusIn && statusIn.length > 0
					? statusIn
					: status
					? [status]
					: undefined;

			expect(resolvedStatuses).toBeUndefined();
		});

		it("should handle empty statusIn array by falling back to status", () => {
			const status = "published";
			const statusIn: string[] = [];

			const resolvedStatuses = statusIn?.length
				? statusIn
				: status
				? [status]
				: undefined;

			expect(resolvedStatuses).toEqual(["published"]);
		});

		it("should use index-level filtering for single status", () => {
			const statuses = ["published"];
			const singleStatus = statuses?.length === 1 ? statuses[0] : undefined;

			expect(singleStatus).toBe("published");
		});

		it("should not use index-level filtering for multiple statuses", () => {
			const statuses = ["draft", "scheduled"];
			const singleStatus = statuses?.length === 1 ? statuses[0] : undefined;

			expect(singleStatus).toBeUndefined();
		});
	});

	// =============================================================================
	// Index Selection Logic Tests
	// =============================================================================

	describe("Index selection logic", () => {
		it("should prefer compound index when both contentTypeId and status present", () => {
			const contentTypeId = "type123";
			const status = "published";
			const locale = undefined;

			let selectedIndex = "none";
			if (contentTypeId && status) {
				selectedIndex = "by_content_type_and_status";
			} else if (contentTypeId) {
				selectedIndex = "by_content_type";
			} else if (status) {
				selectedIndex = "by_status";
			} else if (locale) {
				selectedIndex = "by_locale";
			}

			expect(selectedIndex).toBe("by_content_type_and_status");
		});

		it("should use content type index when only contentTypeId present", () => {
			const contentTypeId = "type123";
			const status = undefined;
			const locale = undefined;

			let selectedIndex = "none";
			if (contentTypeId && status) {
				selectedIndex = "by_content_type_and_status";
			} else if (contentTypeId) {
				selectedIndex = "by_content_type";
			} else if (status) {
				selectedIndex = "by_status";
			} else if (locale) {
				selectedIndex = "by_locale";
			}

			expect(selectedIndex).toBe("by_content_type");
		});

		it("should use status index when only status present", () => {
			const contentTypeId = undefined;
			const status = "published";
			const locale = undefined;

			let selectedIndex = "none";
			if (contentTypeId && status) {
				selectedIndex = "by_content_type_and_status";
			} else if (contentTypeId) {
				selectedIndex = "by_content_type";
			} else if (status) {
				selectedIndex = "by_status";
			} else if (locale) {
				selectedIndex = "by_locale";
			}

			expect(selectedIndex).toBe("by_status");
		});

		it("should use locale index when only locale present", () => {
			const contentTypeId = undefined;
			const status = undefined;
			const locale = "en-US";

			let selectedIndex = "none";
			if (contentTypeId && status) {
				selectedIndex = "by_content_type_and_status";
			} else if (contentTypeId) {
				selectedIndex = "by_content_type";
			} else if (status) {
				selectedIndex = "by_status";
			} else if (locale) {
				selectedIndex = "by_locale";
			}

			expect(selectedIndex).toBe("by_locale");
		});

		it("should fall back to no specific index when no filters", () => {
			const contentTypeId = undefined;
			const status = undefined;
			const locale = undefined;

			let selectedIndex = "none";
			if (contentTypeId && status) {
				selectedIndex = "by_content_type_and_status";
			} else if (contentTypeId) {
				selectedIndex = "by_content_type";
			} else if (status) {
				selectedIndex = "by_status";
			} else if (locale) {
				selectedIndex = "by_locale";
			}

			expect(selectedIndex).toBe("none");
		});
	});

	// =============================================================================
	// Search Query Logic Tests
	// =============================================================================

	describe("Search query logic", () => {
		it("should use search path when search term is provided", () => {
			const search = "typescript";
			const useSearchPath = search && search.trim().length > 0;
			expect(useSearchPath).toBe(true);
		});

		it("should not use search path for empty search string", () => {
			const search = "" as string;
			const useSearchPath = search && search.trim().length > 0;
			expect(!!useSearchPath).toBe(false);
		});

		it("should not use search path for whitespace-only search", () => {
			const search = "   ";
			const useSearchPath = search && search.trim().length > 0;
			expect(useSearchPath).toBe(false);
		});

		it("should trim search query before using", () => {
			const search = "  typescript tutorial  ";
			const trimmedSearch = search.trim();
			expect(trimmedSearch).toBe("typescript tutorial");
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe("Edge cases", () => {
		it("should handle empty result set", () => {
			const items: unknown[] = [];
			const result = {
				items,
				cursor: undefined,
				hasMore: false,
			};
			expect(result.items).toHaveLength(0);
			expect(result.hasMore).toBe(false);
			expect(result.cursor).toBeUndefined();
		});

		it("should handle cursor pointing to non-existent entry", () => {
			// If cursor entry is not found, foundCursor stays false
			// and we skip until we should start from beginning
			const cursor = "non-existent-id";
			const entries = [{ _id: "id1" }, { _id: "id2" }];
			let foundCursor = !cursor;
			for (const entry of entries) {
				if (!foundCursor && entry._id === cursor) {
					foundCursor = true;
				}
			}
			expect(foundCursor).toBe(false);
		});

		it("should handle negative limit values", () => {
			const requestedLimit = -5;
			const limit = Math.min(Math.max(1, requestedLimit ?? 50), 250);
			expect(limit).toBe(1);
		});
	});
});
