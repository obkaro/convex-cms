/**
 * Code-First Content Type Definitions
 *
 * This file demonstrates the developer-first approach to content modeling.
 * Types are defined in code using Convex validators, providing:
 * - Full TypeScript inference
 * - Version control for schema changes
 * - Compile-time type checking
 *
 * Use `toFieldDefinitions()` to convert to database format for admin UI sync.
 */

import { v } from "convex/values";
import { defineContentType, createContentSchema } from "@convex-cms/core";

export const roadmapItem = defineContentType({
  name: "roadmap_item",
  validator: v.object({
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
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    targetQuarter: v.optional(v.string()),
    votes: v.optional(v.number()),
  }),
  meta: {
    displayName: "Roadmap Item",
    titleField: "title",
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
    },
  },
});

export const changelogEntry = defineContentType({
  name: "changelog_entry",
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
        v.literal("breaking")
      )
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

export const contentSchema = createContentSchema({
  roadmapItem,
  changelogEntry,
});

export type RoadmapItemData = {
  title: string;
  description: string;
  status: "planned" | "in_progress" | "completed";
  category: "core" | "integrations" | "performance" | "ux";
  priority: "high" | "medium" | "low";
  targetQuarter?: string;
  votes?: number;
};

export type ChangelogEntryData = {
  title: string;
  description: string;
  version: string;
  releaseDate: number;
  type: ("feature" | "improvement" | "fix" | "breaking")[];
  image?: string;
};
