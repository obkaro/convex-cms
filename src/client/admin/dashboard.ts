/**
 * Dashboard Operations
 *
 * Provides dashboard statistics by aggregating data from multiple component queries.
 */

import { queryGeneric } from "convex/server";
import type { ComponentApi } from "../../component/_generated/component.js";
import type { AuthContext, AdminOperation } from "./types.js";
import { adminDashboardStatsDoc } from "./validators.js";

export function createDashboardOperations(
  component: ComponentApi,
  checkAuth: (ctx: AuthContext, operation: AdminOperation) => Promise<string | null>
) {
  return {
    getDashboardStats: queryGeneric({
      args: {},
      returns: adminDashboardStatsDoc,
      handler: async (ctx) => {
        await checkAuth(ctx, { type: "getDashboardStats" });

        const contentTypesResult = await ctx.runQuery(
          component.contentTypes.list,
          { isActive: true }
        );
        const contentTypesCount = contentTypesResult.page.length;

        const entriesCountResult = await ctx.runQuery(
          component.contentEntries.count,
          {}
        );
        const entriesCount = entriesCountResult.count;

        const publishedCountResult = await ctx.runQuery(
          component.contentEntries.count,
          { status: "published" }
        );
        const publishedCount = publishedCountResult.count;

        const mediaCountResult = await ctx.runQuery(
          component.mediaAssets.count,
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
    }),
  };
}
