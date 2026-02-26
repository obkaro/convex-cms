// Re-export CMS utilities that admin components need
// Import roles directly from component module (only depends on convex/values, browser-safe)
export { getRole, getRolePermissions } from '../../../src/component/roles';
export type { RoleName, BaseAdminAPI } from '../../../src/client/index';
export { useMediaUploadQueue } from '../../../src/react/index';
export type { UploadQueueFile, UploadQueueFileStatus } from '../../../src/react/index';
