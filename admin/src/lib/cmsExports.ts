// Re-export CMS utilities that admin components need.
// Import through package entrypoints so the embed resolves Convex/React
// from the consuming app instead of walking back into this repo's source tree.
export { getRole, getRolePermissions } from "convex-cms/roles";
export type { RoleName } from "convex-cms/roles";
export type { BaseAdminAPI } from "convex-cms";
export type { FieldType, ContentType } from "convex-cms/types";
export { useMediaUploadQueue } from "convex-cms/react";
export type { UploadQueueFile, UploadQueueFileStatus } from "convex-cms/react";
