/**
 * CMS Client Configuration
 *
 * Uses the unified config pattern - all CMS settings are defined
 * once in cms.config.ts and shared with the admin API.
 *
 * @example
 * ```typescript
 * import { cms } from "./cms";
 *
 * // Use in a mutation
 * export const createPost = mutation({
 *   args: { title: v.string(), createdBy: v.string() },
 *   handler: async (ctx, args) => {
 *     return await cms.contentEntries.create(ctx, {
 *       contentTypeId,
 *       data: { title: args.title },
 *       createdBy: args.createdBy,
 *     });
 *   },
 * });
 * ```
 */

import { createCmsClient } from "convex-cms";
import { components } from "./_generated/api";
import cmsConfig from "./cms.config";

export const cms = createCmsClient(components.convexCms, cmsConfig);
