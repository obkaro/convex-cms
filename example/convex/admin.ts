/**
 * Admin API for CMS Admin UI
 *
 * This file exports Convex functions that the admin UI calls.
 * It uses `defineAdminAPI` from @convex-cms/core to create
 * typed wrappers around the CMS component functions.
 *
 * Usage:
 * 1. Run your Convex dev server: `npx convex dev`
 * 2. Launch the admin UI: `npx convex-cms admin`
 * 3. The admin UI calls these functions via `api.admin.*`
 *
 * @example API paths:
 * - api.admin.contentTypes.list
 * - api.admin.entries.create
 * - api.admin.media.listAssets
 * - api.admin.stats.getDashboardStats
 */

import { defineAdminAPI } from "@convex-cms/core";
import { components } from "./_generated/api";

/**
 * Export all admin API functions.
 *
 * The admin UI expects these functions to be available. You can optionally
 * add an auth callback to validate access before each operation.
 *
 * @example With authentication:
 * ```typescript
 * export const admin = defineAdminAPI(components.convexCms, {
 *   auth: async (ctx, operation) => {
 *     const identity = await ctx.auth.getUserIdentity();
 *     if (!identity) throw new Error("Not authenticated");
 *
 *     // Optionally check operation type for fine-grained access
 *     if (operation.type.startsWith("contentTypes.delete")) {
 *       // Verify admin role for destructive operations
 *       const user = await ctx.db.query("users")
 *         .withIndex("by_email", q => q.eq("email", identity.email))
 *         .first();
 *       if (user?.cmsRole !== "admin") {
 *         throw new Error("Admin role required for this operation");
 *       }
 *     }
 *
 *     return identity.subject;
 *   },
 * });
 * ```
 */
export const {
  contentTypes,
  entries,
  media,
  stats,
} = defineAdminAPI(components.convexCms, {
  // No auth callback - add one in production if needed
});
