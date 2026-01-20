/**
 * Dashboard statistics queries.
 *
 * These queries aggregate counts for the admin dashboard display.
 */

import { query } from "./_generated/server";
import { components } from "./_generated/api";

/**
 * Get dashboard statistics including counts for content types, entries, media assets, and published content.
 */
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    // Fetch content types count
    const contentTypesResult = await ctx.runQuery(
      components.convexCms.contentTypes.list,
      { isActive: true }
    );
    const contentTypesCount = contentTypesResult.page.length;

    // Fetch all content entries count
    const entriesResult = await ctx.runQuery(
      components.convexCms.contentEntries.list,
      { paginationOpts: { numItems: 1000, cursor: null } }
    );
    const entriesCount = entriesResult.page.length;

    // Count published entries
    const publishedCount = entriesResult.page.filter(
      (entry) => entry.status === "published"
    ).length;

    // Fetch media assets count
    const mediaResult = await ctx.runQuery(components.convexCms.mediaAssets.list, {
      paginationOpts: { numItems: 1000, cursor: null },
    });
    const mediaAssetsCount = mediaResult.page.length;

    return {
      contentTypes: contentTypesCount,
      contentEntries: entriesCount,
      mediaAssets: mediaAssetsCount,
      published: publishedCount,
    };
  },
});
