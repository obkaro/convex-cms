/**
 * Seed Data - Sample Content for Tempo
 *
 * Run this mutation to populate the CMS with sample roadmap items
 * and changelog entries for the Tempo demo.
 *
 * Usage:
 *   npx convex run seed:seedAll
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { roadmapItem, changelogEntry } from "./cms";

type RoadmapItemData = {
	title: string;
	description: string;
	status: "planned" | "in_progress" | "completed";
	category: "core" | "integrations" | "performance" | "ux";
	priority: "high" | "medium" | "low";
	targetQuarter?: string;
	votes?: number;
	releaseDate?: number;
};

type ChangelogEntryData = {
	title: string;
	description: string;
	version: string;
	releaseDate: number;
	type: ("feature" | "improvement" | "fix" | "breaking")[];
	image?: string;
};

const roadmapItems: RoadmapItemData[] = [
	{
		title: "Real-time Presence Indicators",
		description:
			"See who's online and what documents they're viewing. Presence indicators will show teammate avatars with activity status across all workspaces.",
		status: "in_progress",
		category: "core",
		priority: "high",
		targetQuarter: "Q1 2026",
		votes: 342,
	},
	{
		title: "Slack Integration",
		description:
			"Connect Tempo with Slack for seamless notifications. Get updates on document changes, mentions, and task assignments directly in your Slack channels.",
		status: "in_progress",
		category: "integrations",
		priority: "high",
		targetQuarter: "Q1 2026",
		votes: 528,
	},
	{
		title: "Advanced Search with AI",
		description:
			"Semantic search powered by AI to find content by meaning, not just keywords. Ask questions in natural language and get relevant results instantly.",
		status: "planned",
		category: "core",
		priority: "high",
		targetQuarter: "Q2 2026",
		votes: 891,
	},
	{
		title: "Video Recording Integration",
		description:
			"Record and embed video messages directly in Tempo. Perfect for async standups, feedback sessions, and walkthroughs.",
		status: "planned",
		category: "ux",
		priority: "medium",
		targetQuarter: "Q2 2026",
		votes: 456,
	},
	{
		title: "Mobile App (iOS & Android)",
		description:
			"Native mobile apps for Tempo. Check updates, respond to comments, and manage tasks on the go with push notifications.",
		status: "planned",
		category: "core",
		priority: "high",
		targetQuarter: "Q3 2026",
		votes: 1247,
	},
	{
		title: "GitHub Integration",
		description:
			"Link pull requests, issues, and commits to Tempo documents. Automatic status updates when PRs are merged.",
		status: "planned",
		category: "integrations",
		priority: "medium",
		targetQuarter: "Q2 2026",
		votes: 673,
	},
	{
		title: "Document Templates",
		description:
			"Create and share templates for common document types like meeting notes, project briefs, and sprint retrospectives.",
		status: "completed",
		category: "ux",
		priority: "medium",
		votes: 234,
	},
	{
		title: "Performance Dashboard",
		description:
			"Monitor page load times and optimize document rendering. New metrics dashboard for workspace admins.",
		status: "completed",
		category: "performance",
		priority: "low",
		votes: 89,
	},
	{
		title: "Dark Mode",
		description:
			"Full dark mode support across the entire application. Automatic switching based on system preferences.",
		status: "completed",
		category: "ux",
		priority: "medium",
		votes: 1892,
	},
	{
		title: "Linear Integration",
		description:
			"Sync Tempo tasks with Linear issues. Two-way sync keeps both tools updated automatically.",
		status: "in_progress",
		category: "integrations",
		priority: "medium",
		targetQuarter: "Q1 2026",
		votes: 312,
	},
	{
		title: "Custom Workflows",
		description:
			"Define custom approval workflows for documents. Route content through reviewers before publishing.",
		status: "planned",
		category: "core",
		priority: "low",
		targetQuarter: "Q3 2026",
		votes: 167,
	},
	{
		title: "Offline Mode",
		description:
			"Work on documents without internet connection. Changes sync automatically when you're back online.",
		status: "planned",
		category: "performance",
		priority: "medium",
		targetQuarter: "Q4 2026",
		votes: 589,
	},
];

const changelogEntries: ChangelogEntryData[] = [
	{
		title: "Document Templates Launch",
		description:
			"We're excited to announce Document Templates! Create templates from any document and share them with your team. Templates include pre-filled content, formatting, and placeholders for easy customization.\n\nHighlights:\n- Create templates from existing documents\n- Team template library\n- Variables and placeholders\n- One-click document creation",
		version: "2.4.0",
		releaseDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
		type: ["feature"],
	},
	{
		title: "Performance Improvements",
		description:
			"Major performance update! Document load times are now 40% faster, and we've optimized real-time collaboration for large documents with many collaborators.\n\nChanges:\n- Faster document rendering\n- Improved WebSocket connection handling\n- Reduced memory usage for large documents\n- Better handling of concurrent edits",
		version: "2.3.2",
		releaseDate: Date.now() - 14 * 24 * 60 * 60 * 1000,
		type: ["improvement", "fix"],
	},
	{
		title: "Dark Mode & Accessibility",
		description:
			"Dark mode is finally here! Toggle between light and dark themes, or let Tempo follow your system preferences. We've also improved accessibility across the board.\n\nNew features:\n- Dark mode toggle in settings\n- System preference sync\n- Improved keyboard navigation\n- Better screen reader support\n- High contrast mode option",
		version: "2.3.0",
		releaseDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
		type: ["feature", "improvement"],
	},
	{
		title: "API V2 Release",
		description:
			"Introducing Tempo API V2 with improved authentication, rate limiting, and new endpoints. V1 endpoints will be deprecated in 6 months.\n\nBreaking changes:\n- New authentication flow using OAuth 2.0\n- Rate limits now per-endpoint\n- Response format changes for list endpoints\n- Webhook payload structure updated",
		version: "2.2.0",
		releaseDate: Date.now() - 45 * 24 * 60 * 60 * 1000,
		type: ["feature", "breaking"],
	},
	{
		title: "Bug Fixes & Stability",
		description:
			"This release focuses on stability and fixing reported issues.\n\nFixes:\n- Fixed document sync issues on slow connections\n- Resolved comment notification delays\n- Fixed search indexing for special characters\n- Corrected timezone handling in activity feed",
		version: "2.1.3",
		releaseDate: Date.now() - 60 * 24 * 60 * 60 * 1000,
		type: ["fix"],
	},
	{
		title: "Collaborative Comments",
		description:
			"Real-time collaborative comments are here! See when teammates are typing, receive instant notifications, and resolve comment threads together.\n\nNew features:\n- Typing indicators in comments\n- Thread resolution\n- @mentions with notifications\n- Comment reactions",
		version: "2.1.0",
		releaseDate: Date.now() - 90 * 24 * 60 * 60 * 1000,
		type: ["feature"],
	},
];

export const seedAll = mutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		// Use the admin API via generated api references
		// Admin functions are exported from convex/admin.ts and accessed via api.admin.*

		const existingRoadmap = await ctx.runQuery(api.admin.listEntries, {
			contentTypeName: roadmapItem.slug,
			paginationOpts: { numItems: 1, cursor: null },
		});

		if (existingRoadmap.page.length > 0) {
			console.log("Roadmap items already exist, skipping seed...");
		} else {
			console.log("Seeding roadmap items...");
			for (const item of roadmapItems) {
				const entry = await ctx.runMutation(api.admin.createEntry, {
					contentTypeName: roadmapItem.slug,
					data: item,
				});
				await ctx.runMutation(api.admin.publishEntry, { id: entry._id });
			}
			console.log(`Created ${roadmapItems.length} roadmap items`);
		}

		const existingChangelog = await ctx.runQuery(api.admin.listEntries, {
			contentTypeName: changelogEntry.slug,
			paginationOpts: { numItems: 1, cursor: null },
		});

		if (existingChangelog.page.length > 0) {
			console.log("Changelog entries already exist, skipping seed...");
		} else {
			console.log("Seeding changelog entries...");
			for (const item of changelogEntries) {
				const created = await ctx.runMutation(api.admin.createEntry, {
					contentTypeName: changelogEntry.slug,
					data: item,
				});
				await ctx.runMutation(api.admin.publishEntry, { id: created._id });
			}
			console.log(`Created ${changelogEntries.length} changelog entries`);
		}

		console.log("Seed completed!");
		return null;
	},
});
