/**
 * Admin API for CMS Admin UI
 *
 * This file exports Convex functions that the admin UI calls.
 * It uses the flat export pattern from `defineAdminAPI`.
 *
 * Usage:
 * 1. Run your Convex dev server: `npx convex dev`
 * 2. Launch the admin UI: `npx convex-cms admin`
 * 3. Or embed in your app: `<CmsAdmin convexUrl={...} />`
 *
 * All functions are accessed via api.admin.* (e.g., api.admin.listEntries)
 */

import { defineAdminAPI } from "convex-cms";
import { components } from "./_generated/api";

export const {
  // Content Types
  listContentTypes,
  getContentType,
  createContentType,
  updateContentType,
  deleteContentType,

  // Entries
  listEntries,
  getEntry,
  createEntry,
  updateEntry,
  publishEntry,
  unpublishEntry,
  deleteEntry,
  duplicateEntry,
  scheduleEntry,
  cancelScheduledEntry,
  getScheduledEntries,

  // Media Assets
  listMediaAssets,
  getMediaAsset,
  createMediaAsset,
  updateMediaAsset,
  deleteMediaAsset,
  restoreMediaAsset,
  moveMediaAssets,

  // Media Folders
  listMediaFolders,
  getMediaFolder,
  getMediaFolderTree,
  createMediaFolder,
  updateMediaFolder,
  moveMediaFolder,
  deleteMediaFolder,
  restoreMediaFolder,

  // Upload
  generateUploadUrl,

  // Stats
  getDashboardStats,
} = defineAdminAPI(components.convexCms, {
  // No auth callback for demo - add one in production
  // auth: async (ctx, operation) => {
  //   const identity = await ctx.auth.getUserIdentity();
  //   if (!identity) throw new Error("Not authenticated");
  //   return identity.subject;
  // },
});
