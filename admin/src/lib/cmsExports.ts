// Re-export CMS utilities that admin components need.
// Uses relative source paths so the admin embed works both from source (link:)
// and when pre-built. These specific modules are browser-safe (no convex/server).
export { getRole, getRolePermissions } from '../../../src/component/roles';
export type { RoleName } from '../../../src/component/roles';
export type { BaseAdminAPI } from '../../../src/client/admin/index';
export type { FieldType, ContentType } from '../../../src/client/types';
export { useMediaUploadQueue } from '../../../src/react/index';
export type { UploadQueueFile, UploadQueueFileStatus } from '../../../src/react/index';
