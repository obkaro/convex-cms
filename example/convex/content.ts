/**
 * Public content queries for the frontend
 *
 * These queries use the typed helpers from cms.ts for type-safe data access.
 * The content helpers provide full TypeScript inference for all fields.
 */

import { query } from "./_generated/server";
import { content } from "./cms";

type RoadmapStatus = "planned" | "in_progress" | "completed";

export const getRoadmapByStatus = query({
	args: {},
	handler: async (ctx) => {
		// Using typed helper - result.page[].data is fully typed
		const result = await content.roadmap.list(ctx, { status: "published" });

		const grouped: Record<RoadmapStatus, typeof result.page> = {
			planned: [],
			in_progress: [],
			completed: [],
		};

		for (const entry of result.page) {
			// entry.data is typed: { title: string; status: "planned" | "in_progress" | "completed"; ... }
			const status = entry.data.status;
			if (status in grouped) {
				grouped[status].push(entry);
			}
		}

		// Transform to frontend format with data flattened
		return {
			planned: grouped.planned.map((e) => ({ _id: e._id, ...e.data })),
			in_progress: grouped.in_progress.map((e) => ({ _id: e._id, ...e.data })),
			completed: grouped.completed.map((e) => ({ _id: e._id, ...e.data })),
		};
	},
});

export const getChangelog = query({
	args: {},
	handler: async (ctx) => {
		// Using typed helper - result.page[].data is fully typed
		const result = await content.changelog.list(ctx, { status: "published" });

		// Return entries with data flattened for easier frontend consumption
		return result.page.map((entry) => ({
			_id: entry._id,
			...entry.data,
		}));
	},
});
