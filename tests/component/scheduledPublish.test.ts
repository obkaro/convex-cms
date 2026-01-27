/**
 * Tests for Scheduled Publishing Functions
 *
 * These tests verify the scheduled publish workflow including:
 * - Scheduling an entry for future publication
 * - Cancelling a scheduled publication
 * - The internal scheduled publish execution
 * - Edge cases and error handling
 */

import { convexTest } from "convex-test";
import { describe, test, expect, vi, beforeEach } from "vitest";
import schema from "../../src/component/schema.js";
import { api, internal } from "../../src/component/_generated/api.js";

// Import all component modules for testing
const modules = import.meta.glob("../../src/component/**/*.ts");

// Mock the current time for predictable testing
const NOW = 1700000000000; // A fixed timestamp for testing

describe("Scheduled Publish", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	// Helper to create a content type (returns the content type name)
	async function createContentType(t: ReturnType<typeof convexTest>) {
		const typeName = "blog_post";
		await t.run(async (ctx) => {
			await ctx.db.insert("contentTypes", {
				name: typeName,
				displayName: "Blog Post",
				createdBy: "test-user",
				fields: [
					{
						name: "title",
						label: "Title",
						type: "text",
						required: true,
						options: {},
					},
					{
						name: "content",
						label: "Content",
						type: "richText",
						required: false,
						options: {},
					},
				],
				isActive: true,
			});
		});
		return typeName;
	}

	// Helper to create a draft entry
	async function createDraftEntry(
		t: ReturnType<typeof convexTest>,
		contentTypeName: string,
		data: Record<string, unknown> = {
			title: "Test Post",
			content: "Test content",
		},
	) {
		return await t.run(async (ctx) => {
			return await ctx.db.insert("contentEntries", {
				contentTypeName: contentTypeName,
				slug: "test-post",
				status: "draft",
				data,
				version: 1,
			});
		});
	}

	describe("scheduleEntry", () => {
		test("schedules a draft entry for future publication", async () => {
			const t = convexTest(schema, modules);

			const contentTypeName = await createContentType(t);
			const entryId = await createDraftEntry(t, contentTypeName);

			// Schedule for 1 hour from now
			const publishAt = NOW + 60 * 60 * 1000;

			const result = await t.mutation(api.scheduledPublish.scheduleEntry, {
				id: entryId,
				publishAt,
			});

			expect(result.status).toBe("scheduled");
			expect(result.scheduledPublishAt).toBe(publishAt);
			expect(result.version).toBe(2);
		});

		test("rejects scheduling for a time less than 1 minute in the future", async () => {
			const t = convexTest(schema, modules);

			const contentTypeName = await createContentType(t);
			const entryId = await createDraftEntry(t, contentTypeName);

			// Try to schedule for 30 seconds from now
			const publishAt = NOW + 30 * 1000;

			await expect(
				t.mutation(api.scheduledPublish.scheduleEntry, {
					id: entryId,
					publishAt,
				}),
			).rejects.toThrow("at least 1 minute in the future");
		});

		test("rejects scheduling an already published entry", async () => {
			const t = convexTest(schema, modules);

			const contentTypeName = await createContentType(t);
			const entryId = await t.run(async (ctx) => {
				return await ctx.db.insert("contentEntries", {
					contentTypeName: contentTypeName,
					slug: "published-post",
					status: "published",
					data: { title: "Published Post" },
					version: 1,
					firstPublishedAt: NOW - 1000,
					lastPublishedAt: NOW - 1000,
				});
			});

			const publishAt = NOW + 60 * 60 * 1000;

			await expect(
				t.mutation(api.scheduledPublish.scheduleEntry, {
					id: entryId,
					publishAt,
				}),
			).rejects.toThrow("already published");
		});

		test("rejects scheduling a deleted entry", async () => {
			const t = convexTest(schema, modules);

			const contentTypeName = await createContentType(t);
			const entryId = await t.run(async (ctx) => {
				return await ctx.db.insert("contentEntries", {
					contentTypeName: contentTypeName,
					slug: "deleted-post",
					status: "draft",
					data: { title: "Deleted Post" },
					version: 1,
					deletedAt: NOW - 1000,
				});
			});

			const publishAt = NOW + 60 * 60 * 1000;

			await expect(
				t.mutation(api.scheduledPublish.scheduleEntry, {
					id: entryId,
					publishAt,
				}),
			).rejects.toThrow("has been deleted");
		});

		test("rejects scheduling an archived entry", async () => {
			const t = convexTest(schema, modules);

			const contentTypeName = await createContentType(t);
			const entryId = await t.run(async (ctx) => {
				return await ctx.db.insert("contentEntries", {
					contentTypeName: contentTypeName,
					slug: "archived-post",
					status: "archived",
					data: { title: "Archived Post" },
					version: 1,
				});
			});

			const publishAt = NOW + 60 * 60 * 1000;

			await expect(
				t.mutation(api.scheduledPublish.scheduleEntry, {
					id: entryId,
					publishAt,
				}),
			).rejects.toThrow("Cannot schedule archived content");
		});
	});

	describe("cancelScheduledPublish", () => {
		test("cancels a scheduled entry and reverts to draft", async () => {
			const t = convexTest(schema, modules);

			const contentTypeName = await createContentType(t);
			const publishAt = NOW + 60 * 60 * 1000;

			const entryId = await t.run(async (ctx) => {
				return await ctx.db.insert("contentEntries", {
					contentTypeName: contentTypeName,
					slug: "scheduled-post",
					status: "scheduled",
					data: { title: "Scheduled Post" },
					version: 2,
					scheduledPublishAt: publishAt,
				});
			});

			const result = await t.mutation(
				api.scheduledPublish.cancelScheduledPublish,
				{
					id: entryId,
				},
			);

			expect(result.status).toBe("draft");
			expect(result.scheduledPublishAt).toBeUndefined();
			expect(result.version).toBe(3);
		});

		test("rejects cancelling a non-scheduled entry", async () => {
			const t = convexTest(schema, modules);

			const contentTypeName = await createContentType(t);
			const entryId = await createDraftEntry(t, contentTypeName);

			await expect(
				t.mutation(api.scheduledPublish.cancelScheduledPublish, {
					id: entryId,
				}),
			).rejects.toThrow("not scheduled");
		});
	});

	describe("executeScheduledPublish (internal)", () => {
		test("publishes an entry when conditions are met", async () => {
			const t = convexTest(schema, modules);

			const contentTypeName = await createContentType(t);
			const publishAt = NOW;

			const entryId = await t.run(async (ctx) => {
				return await ctx.db.insert("contentEntries", {
					contentTypeName: contentTypeName,
					slug: "ready-to-publish",
					status: "scheduled",
					data: { title: "Ready to Publish" },
					version: 2,
					scheduledPublishAt: publishAt,
				});
			});

			// Execute the scheduled publish
			await t.mutation(internal.scheduledPublish.executeScheduledPublish, {
				entryId,
				expectedPublishAt: publishAt,
			});

			// Verify the entry was published
			const entry = await t.run(async (ctx) => {
				return await ctx.db.get(entryId);
			});

			expect(entry?.status).toBe("published");
			expect(entry?.scheduledPublishAt).toBeUndefined();
			expect(entry?.version).toBe(3);
			expect(entry?.firstPublishedAt).toBeDefined();
			expect(entry?.lastPublishedAt).toBeDefined();
		});

		test("creates a version snapshot when publishing", async () => {
			const t = convexTest(schema, modules);

			const contentTypeName = await createContentType(t);
			const publishAt = NOW;

			const entryId = await t.run(async (ctx) => {
				return await ctx.db.insert("contentEntries", {
					contentTypeName: contentTypeName,
					slug: "snapshot-test",
					status: "scheduled",
					data: { title: "Snapshot Test" },
					version: 2,
					scheduledPublishAt: publishAt,
				});
			});

			await t.mutation(internal.scheduledPublish.executeScheduledPublish, {
				entryId,
				expectedPublishAt: publishAt,
			});

			// Verify version snapshot was created
			const versions = await t.run(async (ctx) => {
				return await ctx.db
					.query("contentVersions")
					.withIndex("by_entry", (q) => q.eq("entryId", entryId))
					.collect();
			});

			expect(versions.length).toBe(1);
			expect(versions[0].wasPublished).toBe(true);
			expect(versions[0].changeDescription).toBe("Scheduled publication");
		});

		test("skips publish if entry was deleted", async () => {
			const t = convexTest(schema, modules);

			const contentTypeName = await createContentType(t);
			const publishAt = NOW;

			const entryId = await t.run(async (ctx) => {
				return await ctx.db.insert("contentEntries", {
					contentTypeName: contentTypeName,
					slug: "deleted-before-publish",
					status: "scheduled",
					data: { title: "Will be deleted" },
					version: 2,
					scheduledPublishAt: publishAt,
					deletedAt: NOW - 1000,
				});
			});

			// Should not throw, just skip
			await t.mutation(internal.scheduledPublish.executeScheduledPublish, {
				entryId,
				expectedPublishAt: publishAt,
			});

			// Entry should remain unchanged
			const entry = await t.run(async (ctx) => {
				return await ctx.db.get(entryId);
			});

			expect(entry?.status).toBe("scheduled");
		});

		test("skips publish if entry status changed", async () => {
			const t = convexTest(schema, modules);

			const contentTypeName = await createContentType(t);
			const publishAt = NOW;

			const entryId = await t.run(async (ctx) => {
				return await ctx.db.insert("contentEntries", {
					contentTypeName: contentTypeName,
					slug: "status-changed",
					status: "draft", // Changed from scheduled to draft
					data: { title: "Status changed" },
					version: 3,
					scheduledPublishAt: undefined,
				});
			});

			// Should not throw, just skip
			await t.mutation(internal.scheduledPublish.executeScheduledPublish, {
				entryId,
				expectedPublishAt: publishAt,
			});

			// Entry should remain a draft
			const entry = await t.run(async (ctx) => {
				return await ctx.db.get(entryId);
			});

			expect(entry?.status).toBe("draft");
		});

		test("skips publish if entry was rescheduled", async () => {
			const t = convexTest(schema, modules);

			const contentTypeName = await createContentType(t);
			const originalPublishAt = NOW;
			const newPublishAt = NOW + 60 * 60 * 1000; // Rescheduled to 1 hour later

			const entryId = await t.run(async (ctx) => {
				return await ctx.db.insert("contentEntries", {
					contentTypeName: contentTypeName,
					slug: "rescheduled",
					status: "scheduled",
					data: { title: "Rescheduled" },
					version: 3,
					scheduledPublishAt: newPublishAt, // Different from expected
				});
			});

			// Should not throw, just skip (timestamp mismatch)
			await t.mutation(internal.scheduledPublish.executeScheduledPublish, {
				entryId,
				expectedPublishAt: originalPublishAt,
			});

			// Entry should remain scheduled with new time
			const entry = await t.run(async (ctx) => {
				return await ctx.db.get(entryId);
			});

			expect(entry?.status).toBe("scheduled");
			expect(entry?.scheduledPublishAt).toBe(newPublishAt);
		});
	});

	describe("getScheduledEntries", () => {
		test("returns entries scheduled within the time range", async () => {
			const t = convexTest(schema, modules);

			const contentTypeName = await createContentType(t);

			// Create entries with different scheduled times
			const hour1 = NOW + 60 * 60 * 1000;
			const hour2 = NOW + 2 * 60 * 60 * 1000;
			const nextDay = NOW + 24 * 60 * 60 * 1000;

			await t.run(async (ctx) => {
				await ctx.db.insert("contentEntries", {
					contentTypeName: contentTypeName,
					slug: "scheduled-1",
					status: "scheduled",
					data: { title: "Post 1" },
					version: 1,
					scheduledPublishAt: hour1,
				});

				await ctx.db.insert("contentEntries", {
					contentTypeName: contentTypeName,
					slug: "scheduled-2",
					status: "scheduled",
					data: { title: "Post 2" },
					version: 1,
					scheduledPublishAt: hour2,
				});

				await ctx.db.insert("contentEntries", {
					contentTypeName: contentTypeName,
					slug: "scheduled-3",
					status: "scheduled",
					data: { title: "Post 3" },
					version: 1,
					scheduledPublishAt: nextDay,
				});

				// Draft entry (should not be included)
				await ctx.db.insert("contentEntries", {
					contentTypeName: contentTypeName,
					slug: "draft",
					status: "draft",
					data: { title: "Draft" },
					version: 1,
				});
			});

			// Query for entries scheduled in the next 3 hours
			const result = await t.query(api.scheduledPublish.getScheduledEntries, {
				from: NOW,
				to: NOW + 3 * 60 * 60 * 1000,
			});

			expect(result.length).toBe(2);
			expect(result[0].slug).toBe("scheduled-1");
			expect(result[1].slug).toBe("scheduled-2");
		});

		test("filters by content type", async () => {
			const t = convexTest(schema, modules);

			const blogTypeName = await createContentType(t);
			const pageTypeName = "page";
			await t.run(async (ctx) => {
				await ctx.db.insert("contentTypes", {
					name: pageTypeName,
					displayName: "Page",
					createdBy: "test-user",
					fields: [
						{
							name: "title",
							label: "Title",
							type: "text",
							required: true,
							options: {},
						},
					],
					isActive: true,
				});
			});

			const publishAt = NOW + 60 * 60 * 1000;

			await t.run(async (ctx) => {
				await ctx.db.insert("contentEntries", {
					contentTypeName: blogTypeName,
					slug: "blog-post",
					status: "scheduled",
					data: { title: "Blog Post" },
					version: 1,
					scheduledPublishAt: publishAt,
				});

				await ctx.db.insert("contentEntries", {
					contentTypeName: pageTypeName,
					slug: "page",
					status: "scheduled",
					data: { title: "Page" },
					version: 1,
					scheduledPublishAt: publishAt,
				});
			});

			const result = await t.query(api.scheduledPublish.getScheduledEntries, {
				contentTypeName: blogTypeName,
			});

			expect(result.length).toBe(1);
			expect(result[0].slug).toBe("blog-post");
		});

		test("returns entries sorted by scheduled time", async () => {
			const t = convexTest(schema, modules);

			const contentTypeName = await createContentType(t);

			await t.run(async (ctx) => {
				// Insert in non-chronological order
				await ctx.db.insert("contentEntries", {
					contentTypeName: contentTypeName,
					slug: "later",
					status: "scheduled",
					data: { title: "Later" },
					version: 1,
					scheduledPublishAt: NOW + 2 * 60 * 60 * 1000,
				});

				await ctx.db.insert("contentEntries", {
					contentTypeName: contentTypeName,
					slug: "earlier",
					status: "scheduled",
					data: { title: "Earlier" },
					version: 1,
					scheduledPublishAt: NOW + 60 * 60 * 1000,
				});
			});

			const result = await t.query(
				api.scheduledPublish.getScheduledEntries,
				{},
			);

			expect(result.length).toBe(2);
			expect(result[0].slug).toBe("earlier");
			expect(result[1].slug).toBe("later");
		});
	});
});
