/**
 * Media API - Re-exports for Admin UI
 *
 * The admin UI expects functions at api.media.*
 */

import { media } from "./admin";

export const {
  // Assets
  listAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
  restoreAsset,
  moveAssets,

  // Folders
  listFolders,
  getFolder,
  getFolderTree,
  createFolder,
  updateFolder,
  moveFolder,
  deleteFolder,
  restoreFolder,

  // Upload
  generateUploadUrl,
} = media;
