/**
 * Admin API Type Definitions
 *
 * Re-exports all derived types from the Admin API validators.
 * These types are derived from validators using Infer<> and should be used
 * by consuming applications for type safety.
 *
 * Note: The Admin API uses string-based IDs rather than branded Id<> types
 * for cross-boundary compatibility between the parent app and component.
 */

import type { defineAdminAPI } from "./admin/index.js";

/**
 * The contract type for the Admin API.
 * This is the return type of defineAdminAPI().
 */
export type AdminApi = ReturnType<typeof defineAdminAPI>;

// Re-export all derived types from validators
export type {
	AdminContentType,
	AdminContentTypeWithCount,
	AdminContentEntry,
	AdminContentVersion,
	AdminMediaItem,
	AdminMediaAsset,
	AdminMediaFolder,
	AdminMediaVariant,
	AdminMediaVariantWithUrl,
	AdminTaxonomy,
	AdminTaxonomyTerm,
	AdminTrashConfig,
	AdminTrashItem,
	AdminTrashStats,
	AdminLockStatus,
	AdminLockAcquisitionResult,
	AdminBulkOperationResult,
	AdminDashboardStats,
	AdminDeleteContentTypeResult,
	AdminDeleteContentEntryResult,
	AdminDeleteMediaAssetResult,
	AdminMoveMediaAssetsResult,
	AdminEmptyTrashResult,
	AdminCompareVersionsResult,
	AdminGenerateVariantsResult,
	AdminResponsiveSrcsetResult,
} from "./admin/validators.js";

// Legacy type aliases for backwards compatibility
export type {
	AdminContentType as ContentTypeDoc,
	AdminContentEntry as ContentEntryDoc,
	AdminMediaItem as MediaItemDoc,
	AdminMediaFolder as MediaFolderDoc,
	AdminMoveMediaAssetsResult as MoveMediaAssetsResult,
} from "./admin/validators.js";

/**
 * Paginated result type.
 */
export type AdminPaginatedResult<T> = {
	page: T[];
	continueCursor: string | null;
	isDone: boolean;
};
