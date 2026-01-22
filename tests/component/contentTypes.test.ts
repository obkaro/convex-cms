/**
 * Content Type Query Tests
 *
 * Verifies that the content type query functions work correctly.
 * Tests the `get` and `list` query functions.
 */

import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../src/component/schema.js";
import { api } from "../../src/component/_generated/api.js";

// Import all component modules for testing
const modules = import.meta.glob("../../src/component/**/*.ts");

describe("Content Types Queries", () => {
	describe("get", () => {
		it("returns null when neither id nor name is provided", async () => {
			const t = convexTest(schema, modules);

			const result = await t.query(api.contentTypes.get, {});

			expect(result).toBeNull();
		});

		it("returns a content type by ID", async () => {
			const t = convexTest(schema, modules);

			// First, create a content type directly in the database
			const contentTypeId = await t.run(async (ctx) => {
				return await ctx.db.insert("contentTypes", {
					name: "blog_post",
					displayName: "Blog Post",
					description: "A blog post content type",
					fields: [
						{
							name: "title",
							label: "Title",
							type: "text",
							required: true,
						},
					],
					isActive: true,
					singleton: false,
				});
			});

			// Query by ID
			const result = await t.query(api.contentTypes.get, { id: contentTypeId });

			expect(result).not.toBeNull();
			expect(result?.name).toBe("blog_post");
			expect(result?.displayName).toBe("Blog Post");
			expect(result?.fields).toHaveLength(1);
		});

		it("returns a content type by name", async () => {
			const t = convexTest(schema, modules);

			// Create a content type
			await t.run(async (ctx) => {
				return await ctx.db.insert("contentTypes", {
					name: "product",
					displayName: "Product",
					fields: [
						{
							name: "name",
							label: "Product Name",
							type: "text",
							required: true,
						},
					],
					isActive: true,
				});
			});

			// Query by name
			const result = await t.query(api.contentTypes.get, { name: "product" });

			expect(result).not.toBeNull();
			expect(result?.name).toBe("product");
			expect(result?.displayName).toBe("Product");
		});

		it("returns null for non-existent ID", async () => {
			const t = convexTest(schema, modules);

			// Create a content type to get a valid-looking ID format
			const existingId = await t.run(async (ctx) => {
				return await ctx.db.insert("contentTypes", {
					name: "existing_type",
					displayName: "Existing Type",
					fields: [],
					isActive: true,
				});
			});

			// Delete it so we have a non-existent but valid format ID
			await t.run(async (ctx) => {
				await ctx.db.delete(existingId);
			});

			const result = await t.query(api.contentTypes.get, { id: existingId });

			expect(result).toBeNull();
		});

		it("returns null for non-existent name", async () => {
			const t = convexTest(schema, modules);

			const result = await t.query(api.contentTypes.get, {
				name: "non_existent_type",
			});

			expect(result).toBeNull();
		});

		it("excludes soft-deleted content types by default", async () => {
			const t = convexTest(schema, modules);

			// Create a soft-deleted content type
			const contentTypeId = await t.run(async (ctx) => {
				return await ctx.db.insert("contentTypes", {
					name: "deleted_type",
					displayName: "Deleted Type",
					fields: [],
					isActive: true,
					deletedAt: Date.now(),
				});
			});

			// Query by ID should return null
			const resultById = await t.query(api.contentTypes.get, {
				id: contentTypeId,
			});
			expect(resultById).toBeNull();

			// Query by name should return null
			const resultByName = await t.query(api.contentTypes.get, {
				name: "deleted_type",
			});
			expect(resultByName).toBeNull();
		});

		it("includes soft-deleted content types when includeDeleted is true", async () => {
			const t = convexTest(schema, modules);

			// Create a soft-deleted content type
			const contentTypeId = await t.run(async (ctx) => {
				return await ctx.db.insert("contentTypes", {
					name: "recoverable_type",
					displayName: "Recoverable Type",
					fields: [],
					isActive: true,
					deletedAt: Date.now(),
				});
			});

			// Query with includeDeleted should return the type
			const result = await t.query(api.contentTypes.get, {
				id: contentTypeId,
				includeDeleted: true,
			});

			expect(result).not.toBeNull();
			expect(result?.name).toBe("recoverable_type");
			expect(result?.deletedAt).toBeDefined();
		});

		it("returns full field configurations", async () => {
			const t = convexTest(schema, modules);

			// Create a content type with detailed field configuration
			await t.run(async (ctx) => {
				return await ctx.db.insert("contentTypes", {
					name: "article",
					displayName: "Article",
					description: "An article with rich content",
					fields: [
						{
							name: "title",
							label: "Title",
							type: "text",
							required: true,
							searchable: true,
							description: "The article title",
							options: {
								maxLength: 200,
							},
						},
						{
							name: "content",
							label: "Content",
							type: "richText",
							required: true,
							localized: true,
						},
						{
							name: "author",
							label: "Author",
							type: "reference",
							required: false,
							options: {
								allowedContentTypes: ["author"],
							},
						},
					],
					isActive: true,
					singleton: false,
					slugField: "title",
					titleField: "title",
					sortOrder: 1,
				});
			});

			// Query and verify all field configurations are returned
			const result = await t.query(api.contentTypes.get, { name: "article" });

			expect(result).not.toBeNull();
			expect(result?.fields).toHaveLength(3);

			// Verify first field (title)
			const titleField = result?.fields.find(
				(f: { name: string }) => f.name === "title",
			);
			expect(titleField?.type).toBe("text");
			expect(titleField?.required).toBe(true);
			expect(titleField?.searchable).toBe(true);
			expect(titleField?.options?.maxLength).toBe(200);

			// Verify second field (content)
			const contentField = result?.fields.find(
				(f: { name: string }) => f.name === "content",
			);
			expect(contentField?.type).toBe("richText");
			expect(contentField?.localized).toBe(true);

			// Verify third field (author)
			const authorField = result?.fields.find(
				(f: { name: string }) => f.name === "author",
			);
			expect(authorField?.type).toBe("reference");
			expect(authorField?.options?.allowedContentTypes).toEqual(["author"]);

			// Verify metadata fields
			expect(result?.slugField).toBe("title");
			expect(result?.titleField).toBe("title");
			expect(result?.sortOrder).toBe(1);
		});
	});

	describe("list", () => {
		it("returns empty page when no content types exist", async () => {
			const t = convexTest(schema, modules);

			const result = await t.query(api.contentTypes.list, {});

			expect(result.page).toEqual([]);
			expect(result.isDone).toBe(true);
			expect(result.continueCursor).toBeNull();
		});

		it("returns all content types by default (no isActive filter)", async () => {
			const t = convexTest(schema, modules);

			// Create active and inactive content types
			await t.run(async (ctx) => {
				await ctx.db.insert("contentTypes", {
					name: "active_type",
					displayName: "Active Type",
					fields: [],
					isActive: true,
				});
				await ctx.db.insert("contentTypes", {
					name: "inactive_type",
					displayName: "Inactive Type",
					fields: [],
					isActive: false,
				});
			});

			const result = await t.query(api.contentTypes.list, {});

			// Both active and inactive are returned when no filter is applied
			expect(result.page).toHaveLength(2);
		});

		it("filters by isActive when specified", async () => {
			const t = convexTest(schema, modules);

			await t.run(async (ctx) => {
				await ctx.db.insert("contentTypes", {
					name: "active_type",
					displayName: "Active Type",
					fields: [],
					isActive: true,
				});
				await ctx.db.insert("contentTypes", {
					name: "inactive_type",
					displayName: "Inactive Type",
					fields: [],
					isActive: false,
				});
			});

			// Filter for active only
			const activeResult = await t.query(api.contentTypes.list, {
				isActive: true,
			});
			expect(activeResult.page).toHaveLength(1);
			expect(activeResult.page[0].name).toBe("active_type");

			// Filter for inactive only
			const inactiveResult = await t.query(api.contentTypes.list, {
				isActive: false,
			});
			expect(inactiveResult.page).toHaveLength(1);
			expect(inactiveResult.page[0].name).toBe("inactive_type");
		});

		it("excludes soft-deleted content types by default", async () => {
			const t = convexTest(schema, modules);

			await t.run(async (ctx) => {
				await ctx.db.insert("contentTypes", {
					name: "normal_type",
					displayName: "Normal Type",
					fields: [],
					isActive: true,
				});
				await ctx.db.insert("contentTypes", {
					name: "deleted_type",
					displayName: "Deleted Type",
					fields: [],
					isActive: true,
					deletedAt: Date.now(),
				});
			});

			const result = await t.query(api.contentTypes.list, {});

			expect(result.page).toHaveLength(1);
			expect(result.page[0].name).toBe("normal_type");
		});

		it("includes soft-deleted content types when includeDeleted is true", async () => {
			const t = convexTest(schema, modules);

			await t.run(async (ctx) => {
				await ctx.db.insert("contentTypes", {
					name: "normal_type",
					displayName: "Normal Type",
					fields: [],
					isActive: true,
				});
				await ctx.db.insert("contentTypes", {
					name: "deleted_type",
					displayName: "Deleted Type",
					fields: [],
					isActive: true,
					deletedAt: Date.now(),
				});
			});

			const result = await t.query(api.contentTypes.list, {
				includeDeleted: true,
			});

			expect(result.page).toHaveLength(2);
		});

		it("sorts by name alphabetically by default (ascending)", async () => {
			const t = convexTest(schema, modules);

			await t.run(async (ctx) => {
				await ctx.db.insert("contentTypes", {
					name: "zebra",
					displayName: "Zebra",
					fields: [],
					isActive: true,
				});
				await ctx.db.insert("contentTypes", {
					name: "apple",
					displayName: "Apple",
					fields: [],
					isActive: true,
				});
				await ctx.db.insert("contentTypes", {
					name: "banana",
					displayName: "Banana",
					fields: [],
					isActive: true,
				});
			});

			const result = await t.query(api.contentTypes.list, {});

			expect(result.page).toHaveLength(3);
			expect(result.page[0].name).toBe("apple");
			expect(result.page[1].name).toBe("banana");
			expect(result.page[2].name).toBe("zebra");
		});

		it("sorts by name in descending order when specified", async () => {
			const t = convexTest(schema, modules);

			await t.run(async (ctx) => {
				await ctx.db.insert("contentTypes", {
					name: "zebra",
					displayName: "Zebra",
					fields: [],
					isActive: true,
				});
				await ctx.db.insert("contentTypes", {
					name: "apple",
					displayName: "Apple",
					fields: [],
					isActive: true,
				});
			});

			const result = await t.query(api.contentTypes.list, {
				sortBy: "name",
				sortDirection: "desc",
			});

			expect(result.page).toHaveLength(2);
			expect(result.page[0].name).toBe("zebra");
			expect(result.page[1].name).toBe("apple");
		});

		it("sorts by createdAt when specified", async () => {
			const t = convexTest(schema, modules);

			// Create types with slight delays to ensure different creation times
			await t.run(async (ctx) => {
				await ctx.db.insert("contentTypes", {
					name: "first",
					displayName: "First",
					fields: [],
					isActive: true,
				});
			});

			await t.run(async (ctx) => {
				await ctx.db.insert("contentTypes", {
					name: "second",
					displayName: "Second",
					fields: [],
					isActive: true,
				});
			});

			// Default for createdAt is descending (newest first)
			const result = await t.query(api.contentTypes.list, {
				sortBy: "createdAt",
			});

			expect(result.page).toHaveLength(2);
			expect(result.page[0].name).toBe("second");
			expect(result.page[1].name).toBe("first");
		});

		it("supports pagination with numItems and cursor", async () => {
			const t = convexTest(schema, modules);

			// Create several content types
			await t.run(async (ctx) => {
				await ctx.db.insert("contentTypes", {
					name: "alpha",
					displayName: "Alpha",
					fields: [],
					isActive: true,
				});
				await ctx.db.insert("contentTypes", {
					name: "beta",
					displayName: "Beta",
					fields: [],
					isActive: true,
				});
				await ctx.db.insert("contentTypes", {
					name: "gamma",
					displayName: "Gamma",
					fields: [],
					isActive: true,
				});
				await ctx.db.insert("contentTypes", {
					name: "delta",
					displayName: "Delta",
					fields: [],
					isActive: true,
				});
			});

			// Get first page (2 items)
			const page1 = await t.query(api.contentTypes.list, {
				paginationOpts: { numItems: 2, cursor: null },
			});

			expect(page1.page).toHaveLength(2);
			expect(page1.isDone).toBe(false);
			expect(page1.continueCursor).not.toBeNull();
			expect(page1.page[0].name).toBe("alpha");
			expect(page1.page[1].name).toBe("beta");

			// Get second page using cursor
			const page2 = await t.query(api.contentTypes.list, {
				paginationOpts: { numItems: 2, cursor: page1.continueCursor! },
			});

			expect(page2.page).toHaveLength(2);
			expect(page2.isDone).toBe(true);
			expect(page2.page[0].name).toBe("delta");
			expect(page2.page[1].name).toBe("gamma");
		});
	});
});
