/**
 * Tests for the Test Helpers Module
 *
 * Verifies that all factories, assertions, and utilities work correctly.
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { GenericId } from "convex/values";
import {
	// Factories
	fieldFactory,
	contentTypeFactory,
	contentEntryFactory,
	mediaAssetFactory,
	mediaFolderFactory,
	// Assertions
	assertContentType,
	assertContentEntry,
	assertMediaAsset,
	assertStatus,
	assertPublished,
	assertDeleted,
	assertNotDeleted,
	assertField,
	// Helpers
	uniqueSlug,
	uniqueName,
	pastTimestamp,
	futureTimestamp,
	// Types
	fieldTypes,
	contentStatuses,
	mediaTypes,
	// Registration
	register,
	schema,
	modules,
} from "../../src/test.js";

// =============================================================================
// Field Factory Tests
// =============================================================================

describe("fieldFactory", () => {
	describe("text", () => {
		it("creates a basic text field", () => {
			const field = fieldFactory.text("title", "Title");

			expect(field.name).toBe("title");
			expect(field.label).toBe("Title");
			expect(field.type).toBe("text");
			expect(field.required).toBe(false);
		});

		it("creates a required text field with options", () => {
			const field = fieldFactory.text("title", "Title", {
				required: true,
				searchable: true,
				maxLength: 200,
			});

			expect(field.required).toBe(true);
			expect(field.searchable).toBe(true);
			expect(field.options?.maxLength).toBe(200);
		});
	});

	describe("richText", () => {
		it("creates a rich text field", () => {
			const field = fieldFactory.richText("content", "Content", {
				required: true,
				localized: true,
			});

			expect(field.type).toBe("richText");
			expect(field.required).toBe(true);
			expect(field.localized).toBe(true);
		});
	});

	describe("number", () => {
		it("creates a number field with constraints", () => {
			const field = fieldFactory.number("price", "Price", {
				required: true,
				min: 0,
				precision: 2,
			});

			expect(field.type).toBe("number");
			expect(field.options?.min).toBe(0);
			expect(field.options?.precision).toBe(2);
		});
	});

	describe("boolean", () => {
		it("creates a boolean field with default", () => {
			const field = fieldFactory.boolean("published", "Published", {
				defaultValue: false,
			});

			expect(field.type).toBe("boolean");
			expect(field.defaultValue).toBe(false);
		});
	});

	describe("date and datetime", () => {
		it("creates date field", () => {
			const field = fieldFactory.date("birthDate", "Birth Date");
			expect(field.type).toBe("date");
		});

		it("creates datetime field", () => {
			const field = fieldFactory.datetime("createdAt", "Created At");
			expect(field.type).toBe("datetime");
		});
	});

	describe("reference", () => {
		it("creates a reference field with allowed types", () => {
			const field = fieldFactory.reference("author", "Author", {
				allowedContentTypes: ["author", "user"],
				multiple: false,
			});

			expect(field.type).toBe("reference");
			expect(field.options?.allowedContentTypes).toEqual(["author", "user"]);
			expect(field.options?.multiple).toBe(false);
		});
	});

	describe("media", () => {
		it("creates a media field with mime type filter", () => {
			const field = fieldFactory.media("image", "Image", {
				allowedMimeTypes: ["image/*"],
				maxFileSize: 5 * 1024 * 1024,
			});

			expect(field.type).toBe("media");
			expect(field.options?.allowedMimeTypes).toEqual(["image/*"]);
			expect(field.options?.maxFileSize).toBe(5 * 1024 * 1024);
		});
	});

	describe("json", () => {
		it("creates a json field", () => {
			const field = fieldFactory.json("metadata", "Metadata", {
				defaultValue: {},
			});

			expect(field.type).toBe("json");
			expect(field.defaultValue).toEqual({});
		});
	});

	describe("select", () => {
		it("creates a select field with options", () => {
			const field = fieldFactory.select(
				"status",
				"Status",
				[
					{ value: "active", label: "Active" },
					{ value: "inactive", label: "Inactive" },
				],
				{ defaultValue: "active" },
			);

			expect(field.type).toBe("select");
			expect(field.options?.options).toHaveLength(2);
			expect(field.defaultValue).toBe("active");
		});
	});

	describe("multiSelect", () => {
		it("creates a multi-select field", () => {
			const field = fieldFactory.multiSelect(
				"tags",
				"Tags",
				[
					{ value: "tech", label: "Tech" },
					{ value: "news", label: "News" },
				],
				{ defaultValue: ["tech"] },
			);

			expect(field.type).toBe("multiSelect");
			expect(field.defaultValue).toEqual(["tech"]);
		});
	});
});

// =============================================================================
// Content Type Factory Tests
// =============================================================================

describe("contentTypeFactory", () => {
	describe("minimal", () => {
		it("creates a minimal content type", () => {
			const type = contentTypeFactory.minimal("test_type");

			expect(type.name).toBe("test_type");
			expect(type.displayName).toBe("Test Type");
			expect(type.fields).toEqual([]);
			expect(type.isActive).toBe(true);
		});

		it("converts snake_case to Title Case", () => {
			const type = contentTypeFactory.minimal("blog_post_category");
			expect(type.displayName).toBe("Blog Post Category");
		});
	});

	describe("blogPost", () => {
		it("creates a blog post content type with expected fields", () => {
			const type = contentTypeFactory.blogPost();

			expect(type.name).toBe("blog_post");
			expect(type.displayName).toBe("Blog Post");
			expect(type.fields.length).toBeGreaterThan(5);

			// Check for essential fields
			const fieldNames = type.fields.map((f) => f.name);
			expect(fieldNames).toContain("title");
			expect(fieldNames).toContain("content");
			expect(fieldNames).toContain("excerpt");
			expect(fieldNames).toContain("author");
		});

		it("allows overrides", () => {
			const type = contentTypeFactory.blogPost({
				name: "article",
				displayName: "Article",
			});

			expect(type.name).toBe("article");
			expect(type.displayName).toBe("Article");
			// Fields should still be inherited
			expect(type.fields.length).toBeGreaterThan(0);
		});
	});

	describe("product", () => {
		it("creates a product content type", () => {
			const type = contentTypeFactory.product();

			expect(type.name).toBe("product");
			const fieldNames = type.fields.map((f) => f.name);
			expect(fieldNames).toContain("name");
			expect(fieldNames).toContain("sku");
			expect(fieldNames).toContain("price");
			expect(fieldNames).toContain("stock");
		});
	});

	describe("author", () => {
		it("creates an author content type", () => {
			const type = contentTypeFactory.author();

			expect(type.name).toBe("author");
			const fieldNames = type.fields.map((f) => f.name);
			expect(fieldNames).toContain("name");
			expect(fieldNames).toContain("email");
			expect(fieldNames).toContain("bio");
		});
	});

	describe("category", () => {
		it("creates a category content type", () => {
			const type = contentTypeFactory.category();

			expect(type.name).toBe("category");
			const fieldNames = type.fields.map((f) => f.name);
			expect(fieldNames).toContain("name");
			expect(fieldNames).toContain("parent");
		});
	});

	describe("page", () => {
		it("creates a page content type", () => {
			const type = contentTypeFactory.page();

			expect(type.name).toBe("page");
			const fieldNames = type.fields.map((f) => f.name);
			expect(fieldNames).toContain("title");
			expect(fieldNames).toContain("content");
			expect(fieldNames).toContain("metaTitle");
		});
	});

	describe("siteSettings", () => {
		it("creates a singleton site settings content type", () => {
			const type = contentTypeFactory.siteSettings();

			expect(type.name).toBe("site_settings");
			expect(type.singleton).toBe(true);
			const fieldNames = type.fields.map((f) => f.name);
			expect(fieldNames).toContain("siteName");
			expect(fieldNames).toContain("logo");
		});
	});

	describe("allFieldTypes", () => {
		it("creates a content type with all supported field types", () => {
			const type = contentTypeFactory.allFieldTypes();

			const fieldTypeSet = new Set(type.fields.map((f) => f.type));

			// Should include all basic types
			expect(fieldTypeSet.has("text")).toBe(true);
			expect(fieldTypeSet.has("richText")).toBe(true);
			expect(fieldTypeSet.has("number")).toBe(true);
			expect(fieldTypeSet.has("boolean")).toBe(true);
			expect(fieldTypeSet.has("date")).toBe(true);
			expect(fieldTypeSet.has("datetime")).toBe(true);
			expect(fieldTypeSet.has("reference")).toBe(true);
			expect(fieldTypeSet.has("media")).toBe(true);
			expect(fieldTypeSet.has("json")).toBe(true);
			expect(fieldTypeSet.has("select")).toBe(true);
			expect(fieldTypeSet.has("multiSelect")).toBe(true);
		});
	});

	describe("custom", () => {
		it("creates a custom content type", () => {
			const type = contentTypeFactory.custom(
				"custom_type",
				"Custom Type",
				[fieldFactory.text("field1", "Field 1")],
				{ description: "A custom type" },
			);

			expect(type.name).toBe("custom_type");
			expect(type.displayName).toBe("Custom Type");
			expect(type.fields).toHaveLength(1);
			expect(type.description).toBe("A custom type");
		});
	});
});

// =============================================================================
// Content Entry Factory Tests
// =============================================================================

describe("contentEntryFactory", () => {
	beforeEach(() => {
		contentEntryFactory.resetCounter();
	});

	const fakeContentTypeId = "content_type_123" as GenericId<"contentTypes">;

	describe("minimal", () => {
		it("creates a minimal entry", () => {
			const entry = contentEntryFactory.minimal(fakeContentTypeId);

			expect(entry.contentTypeId).toBe(fakeContentTypeId);
			expect(entry.slug).toBe("test-entry-1");
			expect(entry.status).toBe("draft");
			expect(entry.version).toBe(1);
		});

		it("increments counter for unique slugs", () => {
			const entry1 = contentEntryFactory.minimal(fakeContentTypeId);
			const entry2 = contentEntryFactory.minimal(fakeContentTypeId);

			expect(entry1.slug).toBe("test-entry-1");
			expect(entry2.slug).toBe("test-entry-2");
		});
	});

	describe("draft", () => {
		it("creates a draft entry with data", () => {
			const entry = contentEntryFactory.draft(fakeContentTypeId, {
				title: "My Draft",
			});

			expect(entry.status).toBe("draft");
			expect(entry.data.title).toBe("My Draft");
		});
	});

	describe("published", () => {
		it("creates a published entry with timestamps", () => {
			const entry = contentEntryFactory.published(fakeContentTypeId, {
				title: "Published Post",
			});

			expect(entry.status).toBe("published");
			expect(entry.firstPublishedAt).toBeDefined();
			expect(entry.lastPublishedAt).toBeDefined();
			expect(entry.firstPublishedAt).toBe(entry.lastPublishedAt);
		});
	});

	describe("archived", () => {
		it("creates an archived entry", () => {
			const entry = contentEntryFactory.archived(fakeContentTypeId, {
				title: "Old Post",
			});

			expect(entry.status).toBe("archived");
		});
	});

	describe("scheduled", () => {
		it("creates a scheduled entry", () => {
			const futureTime = Date.now() + 86400000; // 1 day
			const entry = contentEntryFactory.scheduled(
				fakeContentTypeId,
				{ title: "Future Post" },
				futureTime,
			);

			expect(entry.status).toBe("scheduled");
			expect(entry.scheduledPublishAt).toBe(futureTime);
		});
	});

	describe("deleted", () => {
		it("creates a soft-deleted entry", () => {
			const entry = contentEntryFactory.deleted(fakeContentTypeId, {
				title: "Deleted",
			});

			expect(entry.deletedAt).toBeDefined();
			expect(entry.status).toBe("draft");
		});
	});

	describe("localized", () => {
		it("creates a localized variant", () => {
			const primaryId = "entry_123" as GenericId<"contentEntries">;
			const entry = contentEntryFactory.localized(
				fakeContentTypeId,
				primaryId,
				"de-DE",
				{ title: "Deutscher Titel" },
			);

			expect(entry.locale).toBe("de-DE");
			expect(entry.primaryEntryId).toBe(primaryId);
		});
	});

	describe("blogPost", () => {
		it("creates a blog post entry with typical data", () => {
			const entry = contentEntryFactory.blogPost(fakeContentTypeId);

			expect(entry.data.title).toContain("Test Blog Post");
			expect(entry.data.content).toContain("<p>");
			expect(entry.data.tags).toEqual(["tech", "tutorial"]);
			expect(entry.searchText).toBeDefined();
		});
	});

	describe("product", () => {
		it("creates a product entry with typical data", () => {
			const entry = contentEntryFactory.product(fakeContentTypeId);

			expect(entry.data.name).toContain("Test Product");
			expect(entry.data.sku).toMatch(/^SKU-\d+$/);
			expect(typeof entry.data.price).toBe("number");
			expect(typeof entry.data.stock).toBe("number");
		});
	});

	describe("batch", () => {
		it("creates multiple entries", () => {
			const entries = contentEntryFactory.batch(fakeContentTypeId, 5);

			expect(entries).toHaveLength(5);
			entries.forEach((entry) => {
				expect(entry.contentTypeId).toBe(fakeContentTypeId);
			});
		});

		it("allows customization via factory function", () => {
			const entries = contentEntryFactory.batch(
				fakeContentTypeId,
				3,
				(typeId, index) => ({
					data: { title: `Entry ${index}` },
				}),
			);

			expect(entries[0].data.title).toBe("Entry 0");
			expect(entries[1].data.title).toBe("Entry 1");
			expect(entries[2].data.title).toBe("Entry 2");
		});
	});
});

// =============================================================================
// Media Asset Factory Tests
// =============================================================================

describe("mediaAssetFactory", () => {
	beforeEach(() => {
		mediaAssetFactory.resetCounter();
	});

	const fakeStorageId = "storage_123" as GenericId<"_storage">;

	describe("minimal", () => {
		it("creates a minimal asset", () => {
			const asset = mediaAssetFactory.minimal(fakeStorageId);

			expect(asset.storageId).toBe(fakeStorageId);
			expect(asset.type).toBe("other");
			expect(asset.size).toBe(1024);
		});
	});

	describe("image", () => {
		it("creates an image asset with dimensions", () => {
			const asset = mediaAssetFactory.image(fakeStorageId);

			expect(asset.type).toBe("image");
			expect(asset.mimeType).toBe("image/jpeg");
			expect(asset.width).toBe(1920);
			expect(asset.height).toBe(1080);
			expect(asset.altText).toBeDefined();
		});
	});

	describe("png", () => {
		it("creates a PNG image asset", () => {
			const asset = mediaAssetFactory.png(fakeStorageId);

			expect(asset.mimeType).toBe("image/png");
			expect(asset.filename).toContain(".png");
		});
	});

	describe("video", () => {
		it("creates a video asset with duration", () => {
			const asset = mediaAssetFactory.video(fakeStorageId);

			expect(asset.type).toBe("video");
			expect(asset.mimeType).toBe("video/mp4");
			expect(asset.duration).toBe(120);
			expect(asset.width).toBeDefined();
			expect(asset.height).toBeDefined();
		});
	});

	describe("audio", () => {
		it("creates an audio asset", () => {
			const asset = mediaAssetFactory.audio(fakeStorageId);

			expect(asset.type).toBe("audio");
			expect(asset.mimeType).toBe("audio/mpeg");
			expect(asset.duration).toBe(180);
		});
	});

	describe("document", () => {
		it("creates a PDF document asset", () => {
			const asset = mediaAssetFactory.document(fakeStorageId);

			expect(asset.type).toBe("document");
			expect(asset.mimeType).toBe("application/pdf");
		});
	});

	describe("deleted", () => {
		it("creates a soft-deleted asset", () => {
			const asset = mediaAssetFactory.deleted(fakeStorageId);

			expect(asset.deletedAt).toBeDefined();
		});
	});

	describe("batch", () => {
		it("creates multiple assets", () => {
			const storageIds = ["s1", "s2", "s3"] as GenericId<"_storage">[];
			const assets = mediaAssetFactory.batch(storageIds);

			expect(assets).toHaveLength(3);
			expect(assets[0].storageId).toBe("s1");
			expect(assets[1].storageId).toBe("s2");
			expect(assets[2].storageId).toBe("s3");
		});
	});
});

// =============================================================================
// Media Folder Factory Tests
// =============================================================================

describe("mediaFolderFactory", () => {
	beforeEach(() => {
		mediaFolderFactory.resetCounter();
	});

	describe("root", () => {
		it("creates a root folder", () => {
			const folder = mediaFolderFactory.root("images");

			expect(folder.name).toBe("images");
			expect(folder.path).toBe("/images");
			expect(folder.parentId).toBeUndefined();
		});
	});

	describe("child", () => {
		it("creates a child folder with correct path", () => {
			const folder = mediaFolderFactory.child(
				"2026",
				"parent_123" as GenericId<"mediaFolders">,
				"/images",
			);

			expect(folder.name).toBe("2026");
			expect(folder.path).toBe("/images/2026");
			expect(folder.parentId).toBe("parent_123");
		});
	});

	describe("common", () => {
		it("creates common folder structure", () => {
			const folders = mediaFolderFactory.common();

			expect(folders.images.name).toBe("images");
			expect(folders.videos.name).toBe("videos");
			expect(folders.documents.name).toBe("documents");
		});
	});
});

// =============================================================================
// Assertion Tests
// =============================================================================

describe("Assertions", () => {
	describe("assertContentType", () => {
		it("passes for valid content type", () => {
			const type = {
				_id: "id123",
				_creationTime: Date.now(),
				...contentTypeFactory.blogPost(),
			};

			expect(() => assertContentType(type)).not.toThrow();
		});

		it("throws for invalid content type", () => {
			expect(() => assertContentType(null)).toThrow();
			expect(() => assertContentType({ name: "test" })).toThrow();
		});
	});

	describe("assertContentEntry", () => {
		it("passes for valid entry", () => {
			const entry = {
				_id: "id123",
				_creationTime: Date.now(),
				...contentEntryFactory.minimal("type_123" as GenericId<"contentTypes">),
			};

			expect(() => assertContentEntry(entry)).not.toThrow();
		});

		it("throws for invalid entry", () => {
			expect(() => assertContentEntry(null)).toThrow();
			expect(() => assertContentEntry({ slug: "test" })).toThrow();
		});
	});

	describe("assertMediaAsset", () => {
		it("passes for valid asset", () => {
			const asset = {
				_id: "id123",
				_creationTime: Date.now(),
				...mediaAssetFactory.image("storage_123" as GenericId<"_storage">),
			};

			expect(() => assertMediaAsset(asset)).not.toThrow();
		});

		it("throws for invalid asset", () => {
			expect(() => assertMediaAsset(null)).toThrow();
			expect(() => assertMediaAsset({ filename: "test" })).toThrow();
		});
	});

	describe("assertStatus", () => {
		it("passes for matching status", () => {
			expect(() => assertStatus({ status: "draft" }, "draft")).not.toThrow();
		});

		it("throws for mismatched status", () => {
			expect(() => assertStatus({ status: "draft" }, "published")).toThrow();
		});
	});

	describe("assertPublished", () => {
		it("passes for published entry with timestamp", () => {
			const entry = {
				status: "published",
				lastPublishedAt: Date.now(),
			};

			expect(() => assertPublished(entry)).not.toThrow();
		});

		it("throws for unpublished entry", () => {
			expect(() =>
				assertPublished({ status: "draft", lastPublishedAt: undefined }),
			).toThrow();
		});
	});

	describe("assertDeleted", () => {
		it("passes for deleted document", () => {
			expect(() => assertDeleted({ deletedAt: Date.now() })).not.toThrow();
		});

		it("throws for non-deleted document", () => {
			expect(() => assertDeleted({})).toThrow();
		});
	});

	describe("assertNotDeleted", () => {
		it("passes for non-deleted document", () => {
			expect(() => assertNotDeleted({})).not.toThrow();
		});

		it("throws for deleted document", () => {
			expect(() => assertNotDeleted({ deletedAt: Date.now() })).toThrow();
		});
	});

	describe("assertField", () => {
		it("passes when field matches expectations", () => {
			const fields = contentTypeFactory.blogPost().fields;

			expect(() =>
				assertField(fields, "title", { type: "text", required: true }),
			).not.toThrow();
		});

		it("throws when field not found", () => {
			const fields = contentTypeFactory.blogPost().fields;

			expect(() =>
				assertField(fields, "nonexistent", { type: "text" }),
			).toThrow("not found");
		});

		it("throws when field doesn't match expectations", () => {
			const fields = contentTypeFactory.blogPost().fields;

			expect(() => assertField(fields, "title", { required: false })).toThrow();
		});
	});
});

// =============================================================================
// Helper Tests
// =============================================================================

describe("Helpers", () => {
	describe("uniqueSlug", () => {
		it("generates unique slugs", () => {
			const slug1 = uniqueSlug();
			const slug2 = uniqueSlug();

			expect(slug1).not.toBe(slug2);
			expect(slug1).toMatch(/^test-\d+-[a-z0-9]+$/);
		});

		it("uses custom prefix", () => {
			const slug = uniqueSlug("post");
			expect(slug).toMatch(/^post-/);
		});
	});

	describe("uniqueName", () => {
		it("generates unique names", () => {
			const name1 = uniqueName();
			const name2 = uniqueName();

			expect(name1).not.toBe(name2);
			expect(name1).toMatch(/^test_\d+_[a-z0-9]+$/);
		});
	});

	describe("pastTimestamp", () => {
		it("creates a timestamp in the past", () => {
			const timestamp = pastTimestamp(7);
			const now = Date.now();
			const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

			expect(timestamp).toBeLessThan(now);
			expect(now - timestamp).toBeCloseTo(sevenDaysMs, -4);
		});
	});

	describe("futureTimestamp", () => {
		it("creates a timestamp in the future", () => {
			const timestamp = futureTimestamp(7);
			const now = Date.now();
			const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

			expect(timestamp).toBeGreaterThan(now);
			expect(timestamp - now).toBeCloseTo(sevenDaysMs, -4);
		});
	});
});

// =============================================================================
// Constants Tests
// =============================================================================

describe("Constants", () => {
	describe("fieldTypes", () => {
		it("includes all supported field types", () => {
			expect(fieldTypes).toContain("text");
			expect(fieldTypes).toContain("richText");
			expect(fieldTypes).toContain("number");
			expect(fieldTypes).toContain("boolean");
			expect(fieldTypes).toContain("date");
			expect(fieldTypes).toContain("datetime");
			expect(fieldTypes).toContain("reference");
			expect(fieldTypes).toContain("media");
			expect(fieldTypes).toContain("json");
			expect(fieldTypes).toContain("select");
			expect(fieldTypes).toContain("multiSelect");
		});
	});

	describe("contentStatuses", () => {
		it("includes all status values", () => {
			expect(contentStatuses).toContain("draft");
			expect(contentStatuses).toContain("published");
			expect(contentStatuses).toContain("archived");
			expect(contentStatuses).toContain("scheduled");
		});
	});

	describe("mediaTypes", () => {
		it("includes all media types", () => {
			expect(mediaTypes).toContain("image");
			expect(mediaTypes).toContain("video");
			expect(mediaTypes).toContain("audio");
			expect(mediaTypes).toContain("document");
			expect(mediaTypes).toContain("other");
		});
	});
});

// =============================================================================
// Module Export Tests
// =============================================================================

describe("Module Exports", () => {
	it("exports register function", () => {
		expect(typeof register).toBe("function");
	});

	it("exports schema", () => {
		expect(schema).toBeDefined();
		expect(schema.tables).toBeDefined();
	});

	it("exports modules", () => {
		expect(modules).toBeDefined();
		expect(typeof modules).toBe("object");
	});
});
