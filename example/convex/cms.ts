/**
 * CMS Setup
 *
 * This file defines content types and creates typed helpers for type-safe access.
 *
 * Architecture:
 * - defineContentType() creates schema definitions for the admin API
 * - createTypedHelpers() creates type-safe CRUD helpers for programmatic access
 * - Both work together: definitions go to admin API, helpers provide typed access
 *
 * @example Type-safe queries in Convex functions
 * ```typescript
 * import { content } from "./cms";
 *
 * // Fully typed - data fields have correct types
 * const items = await content.roadmap.list(ctx, { status: "published" });
 * items.page[0].data.title;  // string
 * items.page[0].data.status; // "planned" | "in_progress" | "completed"
 * ```
 */

import { defineContentType, createTypedHelpers } from "convex-cms";
import { components } from "./_generated/api";
import { v } from "convex/values";

// =============================================================================
// CONTENT TYPE DEFINITIONS
// =============================================================================
// These are automatically registered in the in-memory registry and available
// in the admin API. Code-defined types show as "Native Fields" and cannot be
// edited/deleted through the admin UI.

export const roadmapItem = defineContentType({
	name: "Roadmap Item",
	validator: v.object({
		title: v.string(),
		description: v.string(),
		status: v.union(
			v.literal("planned"),
			v.literal("in_progress"),
			v.literal("completed"),
		),
		category: v.union(
			v.literal("core"),
			v.literal("integrations"),
			v.literal("performance"),
			v.literal("ux"),
		),
		priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
		targetQuarter: v.optional(v.string()),
		votes: v.optional(v.number()),
		releaseDate: v.optional(v.number()),
	}),
	meta: {
		titleField: "title",
		displayName: "Roadmap Item",
		fields: {
			title: {
				label: "Feature Name",
				maxLength: 200,
				searchable: true,
			},
			description: {
				label: "Description",
				renderAs: "richText",
			},
			status: {
				label: "Status",
				renderAs: "select",
				options: [
					{ value: "planned", label: "Planned" },
					{ value: "in_progress", label: "In Progress" },
					{ value: "completed", label: "Completed" },
				],
			},
			category: {
				label: "Category",
				renderAs: "select",
				options: [
					{ value: "core", label: "Core Platform" },
					{ value: "integrations", label: "Integrations" },
					{ value: "performance", label: "Performance" },
					{ value: "ux", label: "User Experience" },
				],
			},
			priority: {
				label: "Priority",
				renderAs: "select",
				options: [
					{ value: "high", label: "High" },
					{ value: "medium", label: "Medium" },
					{ value: "low", label: "Low" },
				],
			},
			targetQuarter: {
				label: "Target Quarter",
				description: "e.g., Q2 2026",
			},
			votes: {
				label: "Votes",
				min: 0,
			},
			releaseDate: {
				label: "Release Date",
				renderAs: "date",
				options: [
					{
						label: "today",
						value: "tomorrow",
					},
				],
			},
		},
	},
});

export const changelogEntry = defineContentType({
	name: "Changelog Entry",
	validator: v.object({
		title: v.string(),
		description: v.string(),
		version: v.string(),
		releaseDate: v.number(),
		type: v.array(
			v.union(
				v.literal("feature"),
				v.literal("improvement"),
				v.literal("fix"),
				v.literal("breaking"),
			),
		),
		image: v.optional(v.string()),
	}),
	meta: {
		displayName: "Changelog Entry",
		titleField: "title",
		fields: {
			title: {
				label: "Release Title",
				searchable: true,
				maxLength: 200,
			},
			description: {
				label: "What Changed",
				renderAs: "richText",
			},
			version: {
				label: "Version",
				pattern: "^\\d+\\.\\d+\\.\\d+$",
				description: "Semantic version (e.g., 1.2.3)",
			},
			releaseDate: {
				label: "Release Date",
				renderAs: "date",
			},
			type: {
				label: "Change Type",
				renderAs: "multiSelect",
				options: [
					{ value: "feature", label: "New Feature" },
					{ value: "improvement", label: "Improvement" },
					{ value: "fix", label: "Bug Fix" },
					{ value: "breaking", label: "Breaking Change" },
				],
			},
			image: {
				label: "Screenshot",
				renderAs: "media",
				allowedMimeTypes: ["image/*"],
			},
		},
	},
});

// =============================================================================
// TYPED HELPERS
// =============================================================================
// Create type-safe CRUD helpers for programmatic access.
// Use these in Convex functions for fully typed data access.

export const content = createTypedHelpers(components.cms, {
	roadmap: roadmapItem,
	changelog: changelogEntry,
});
