/**
 * Dashboard statistics queries.
 *
 * These queries aggregate counts for the admin dashboard display.
 */

import { query } from "./_generated/server";
import { components } from "./_generated/api";

/**
 * Get dashboard statistics including counts for content types, entries, media assets, and published content.
 * Uses dedicated count queries for accurate results with any data volume.
 */
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    // Fetch content types (pagination is fine here - typically small number)
    const contentTypesResult = await ctx.runQuery(
      components.convexCms.contentTypes.list,
      { isActive: true }
    );
    const contentTypesCount = contentTypesResult.page.length;

    // Use dedicated count query for accurate entry counts (no 1000 item limit)
    const entriesCountResult = await ctx.runQuery(
      components.convexCms.contentEntries.count,
      {}
    );
    const entriesCount = entriesCountResult.count;

    // Count published entries using the count query with status filter
    const publishedCountResult = await ctx.runQuery(
      components.convexCms.contentEntries.count,
      { status: "published" }
    );
    const publishedCount = publishedCountResult.count;

    // Use dedicated count query for accurate media asset counts (no pagination limit)
    const mediaCountResult = await ctx.runQuery(
      components.convexCms.mediaAssets.count,
      {}
    );
    const mediaAssetsCount = mediaCountResult.count;

    return {
      contentTypes: contentTypesCount,
      contentEntries: entriesCount,
      mediaAssets: mediaAssetsCount,
      published: publishedCount,
    };
  },
});
