/**
 * Public Content Queries
 *
 * These queries fetch published content for the public-facing website.
 * They don't require authentication - only published content is returned.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";
import { cms } from "./cms";
import type { RoadmapItemData, ChangelogEntryData } from "./schemas";

export const getRoadmapItems = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("planned"),
        v.literal("in_progress"),
        v.literal("completed")
      )
    ),
    category: v.optional(
      v.union(
        v.literal("core"),
        v.literal("integrations"),
        v.literal("performance"),
        v.literal("ux")
      )
    ),
  },
  returns: v.array(
    v.object({
      _id: v.string(),
      title: v.string(),
      description: v.string(),
      status: v.union(
        v.literal("planned"),
        v.literal("in_progress"),
        v.literal("completed")
      ),
      category: v.union(
        v.literal("core"),
        v.literal("integrations"),
        v.literal("performance"),
        v.literal("ux")
      ),
      priority: v.union(
        v.literal("high"),
        v.literal("medium"),
        v.literal("low")
      ),
      targetQuarter: v.optional(v.string()),
      votes: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cmsCtx = ctx as any;

    const contentType = await cms.contentTypes.getByName(cmsCtx, "roadmap_item");
    if (!contentType) return [];

    const result = await cms.contentEntries.list(cmsCtx, {
      contentTypeId: contentType._id,
      status: "published",
      paginationOpts: { numItems: 100, cursor: null },
    });

    let items = result.page.map((entry) => {
      const data = entry.data as RoadmapItemData;
      return {
        _id: entry._id,
        title: data.title,
        description: data.description,
        status: data.status,
        category: data.category,
        priority: data.priority,
        targetQuarter: data.targetQuarter,
        votes: data.votes,
      };
    });

    if (args.status) {
      items = items.filter((item) => item.status === args.status);
    }

    if (args.category) {
      items = items.filter((item) => item.category === args.category);
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return items;
  },
});

export const getRoadmapByStatus = query({
  args: {},
  returns: v.object({
    planned: v.array(
      v.object({
        _id: v.string(),
        title: v.string(),
        description: v.string(),
        category: v.union(
          v.literal("core"),
          v.literal("integrations"),
          v.literal("performance"),
          v.literal("ux")
        ),
        priority: v.union(
          v.literal("high"),
          v.literal("medium"),
          v.literal("low")
        ),
        targetQuarter: v.optional(v.string()),
        votes: v.optional(v.number()),
      })
    ),
    in_progress: v.array(
      v.object({
        _id: v.string(),
        title: v.string(),
        description: v.string(),
        category: v.union(
          v.literal("core"),
          v.literal("integrations"),
          v.literal("performance"),
          v.literal("ux")
        ),
        priority: v.union(
          v.literal("high"),
          v.literal("medium"),
          v.literal("low")
        ),
        targetQuarter: v.optional(v.string()),
        votes: v.optional(v.number()),
      })
    ),
    completed: v.array(
      v.object({
        _id: v.string(),
        title: v.string(),
        description: v.string(),
        category: v.union(
          v.literal("core"),
          v.literal("integrations"),
          v.literal("performance"),
          v.literal("ux")
        ),
        priority: v.union(
          v.literal("high"),
          v.literal("medium"),
          v.literal("low")
        ),
        targetQuarter: v.optional(v.string()),
        votes: v.optional(v.number()),
      })
    ),
  }),
  handler: async (ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cmsCtx = ctx as any;

    const contentType = await cms.contentTypes.getByName(cmsCtx, "roadmap_item");
    if (!contentType) {
      return { planned: [], in_progress: [], completed: [] };
    }

    const result = await cms.contentEntries.list(cmsCtx, {
      contentTypeId: contentType._id,
      status: "published",
      paginationOpts: { numItems: 100, cursor: null },
    });

    const grouped = {
      planned: [] as Array<{
        _id: string;
        title: string;
        description: string;
        category: "core" | "integrations" | "performance" | "ux";
        priority: "high" | "medium" | "low";
        targetQuarter?: string;
        votes?: number;
      }>,
      in_progress: [] as Array<{
        _id: string;
        title: string;
        description: string;
        category: "core" | "integrations" | "performance" | "ux";
        priority: "high" | "medium" | "low";
        targetQuarter?: string;
        votes?: number;
      }>,
      completed: [] as Array<{
        _id: string;
        title: string;
        description: string;
        category: "core" | "integrations" | "performance" | "ux";
        priority: "high" | "medium" | "low";
        targetQuarter?: string;
        votes?: number;
      }>,
    };

    for (const entry of result.page) {
      const data = entry.data as RoadmapItemData;
      const item = {
        _id: entry._id,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        targetQuarter: data.targetQuarter,
        votes: data.votes,
      };

      if (data.status === "planned") grouped.planned.push(item);
      else if (data.status === "in_progress") grouped.in_progress.push(item);
      else if (data.status === "completed") grouped.completed.push(item);
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sortByPriority = (
      a: { priority: "high" | "medium" | "low" },
      b: { priority: "high" | "medium" | "low" }
    ) => priorityOrder[a.priority] - priorityOrder[b.priority];

    grouped.planned.sort(sortByPriority);
    grouped.in_progress.sort(sortByPriority);
    grouped.completed.sort(sortByPriority);

    return grouped;
  },
});

export const getChangelogEntries = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.string(),
      title: v.string(),
      description: v.string(),
      version: v.string(),
      releaseDate: v.number(),
      type: v.array(
        v.union(
          v.literal("feature"),
          v.literal("improvement"),
          v.literal("fix"),
          v.literal("breaking")
        )
      ),
      image: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cmsCtx = ctx as any;

    const contentType = await cms.contentTypes.getByName(
      cmsCtx,
      "changelog_entry"
    );
    if (!contentType) return [];

    const result = await cms.contentEntries.list(cmsCtx, {
      contentTypeId: contentType._id,
      status: "published",
      paginationOpts: { numItems: args.limit ?? 20, cursor: null },
    });

    const entries = result.page.map((entry) => {
      const data = entry.data as ChangelogEntryData;
      return {
        _id: entry._id,
        title: data.title,
        description: data.description,
        version: data.version,
        releaseDate: data.releaseDate,
        type: data.type,
        image: data.image,
      };
    });

    entries.sort((a, b) => b.releaseDate - a.releaseDate);

    return entries;
  },
});
