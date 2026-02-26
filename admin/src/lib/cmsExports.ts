// Re-export CMS utilities that admin components need.
// Uses published sub-path exports (not relative source paths) so this works both
// in the monorepo (via workspace:* link) and in user projects (via npm install).
//
// IMPORTANT: Do NOT import from the main 'convex-cms' barrel export here.
// It re-exports convex/server code (via admin functions) which contaminates
// the browser bundle. Use specific sub-paths that are browser-safe:
// - convex-cms/roles: only depends on convex/values
// - convex-cms/types: type-only re-exports from component modules
// - convex-cms/react: React hooks (browser-safe)
export { getRole, getRolePermissions } from 'convex-cms/roles';
export type { RoleName } from 'convex-cms/roles';
export type { BaseAdminAPI } from 'convex-cms';
export type { FieldType, ContentType } from 'convex-cms/types';
export { useMediaUploadQueue } from 'convex-cms/react';
export type { UploadQueueFile, UploadQueueFileStatus } from 'convex-cms/react';
