/**
 * Setup Functions - Sync Code-Defined Types to Database
 *
 * Run these mutations to create content types in the CMS database
 * based on the code-first definitions in schemas.ts.
 *
 * Usage:
 *   npx convex run setup:syncContentTypes
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { toFieldDefinitions } from "@convex-cms/core";
import { roadmapItem, changelogEntry } from "./schemas";
import { cms } from "./cms";

export const syncContentTypes = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const roadmapFields = toFieldDefinitions(roadmapItem);
    const existingRoadmap = await cms.contentTypes.getByName(
      ctx,
      roadmapItem.name
    );

    if (!existingRoadmap) {
      await cms.contentTypes.create(ctx, {
        name: roadmapItem.name,
        displayName: roadmapItem.meta.displayName,
        fields: roadmapFields,
      });
      console.log(`Created content type: ${roadmapItem.name}`);
    } else {
      await cms.contentTypes.update(ctx, {
        id: existingRoadmap._id,
        fields: roadmapFields,
        displayName: roadmapItem.meta.displayName,
      });
      console.log(`Updated content type: ${roadmapItem.name}`);
    }

    const changelogFields = toFieldDefinitions(changelogEntry);
    const existingChangelog = await cms.contentTypes.getByName(
      ctx,
      changelogEntry.name
    );

    if (!existingChangelog) {
      await cms.contentTypes.create(ctx, {
        name: changelogEntry.name,
        displayName: changelogEntry.meta.displayName,
        fields: changelogFields,
      });
      console.log(`Created content type: ${changelogEntry.name}`);
    } else {
      await cms.contentTypes.update(ctx, {
        id: existingChangelog._id,
        fields: changelogFields,
        displayName: changelogEntry.meta.displayName,
      });
      console.log(`Updated content type: ${changelogEntry.name}`);
    }

    console.log("Content types synced successfully!");
    return null;
  },
});
