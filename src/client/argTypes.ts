/**
 * Derived argument types using `Infer<>` and `StringifyIds<>` for API boundary serialization.
 */

import type { Infer } from "convex/values";
import type {
	StringifyIds,
	ContentType,
	MediaVariantWithUrl,
} from "../component/documentTypes.js";
import * as validators from "../component/validators.js";

// =============================================================================
// Content Type Arguments
// =============================================================================

export type CreateContentTypeArgs = StringifyIds<Infer<typeof validators.createContentTypeArgs>>;

type UpdateContentTypeArgsBase = StringifyIds<Infer<typeof validators.updateContentTypeArgs>>;

/** Extends base validator type with wrapper-specific `force` field for breaking changes */
export interface UpdateContentTypeArgs extends UpdateContentTypeArgsBase {
	force?: boolean;
}

export type DeleteContentTypeArgs = StringifyIds<Infer<typeof validators.deleteContentTypeArgs>>;

// =============================================================================
// Content Entry Arguments
// =============================================================================

export type CreateContentEntryArgs = StringifyIds<Infer<typeof validators.createContentEntryArgs>>;
export type UpdateContentEntryArgs = StringifyIds<Infer<typeof validators.updateContentEntryArgs>>;
export type DeleteContentEntryArgs = StringifyIds<Infer<typeof validators.deleteContentEntryArgs>>;
export type PublishEntryArgs = StringifyIds<Infer<typeof validators.publishEntryArgs>>;
export type ScheduleEntryArgs = StringifyIds<Infer<typeof validators.scheduleEntryArgs>>;
export type UnpublishEntryArgs = StringifyIds<Infer<typeof validators.unpublishEntryArgs>>;
export type DuplicateEntryArgs = StringifyIds<Infer<typeof validators.duplicateContentEntryArgs>>;

// =============================================================================
// Version Arguments
// =============================================================================

export type GetVersionHistoryArgs = StringifyIds<Infer<typeof validators.getVersionHistoryArgs>>;
export type GetVersionArgs = StringifyIds<Infer<typeof validators.getVersionArgs>>;
export type RollbackVersionArgs = StringifyIds<Infer<typeof validators.rollbackVersionArgs>>;
export type CompareVersionsArgs = StringifyIds<Infer<typeof validators.compareVersionsArgs>>;

// =============================================================================
// Media Asset Arguments
// =============================================================================

export type CreateMediaAssetArgs = StringifyIds<Infer<typeof validators.createMediaAssetArgs>>;
export type UpdateMediaAssetArgs = StringifyIds<Infer<typeof validators.updateMediaAssetArgs>>;
export type DeleteMediaAssetArgs = StringifyIds<Infer<typeof validators.deleteMediaAssetArgs>>;
export type RestoreMediaAssetArgs = StringifyIds<Infer<typeof validators.restoreMediaAssetArgs>>;

// =============================================================================
// Media Folder Arguments
// =============================================================================

export type CreateMediaFolderArgs = StringifyIds<Infer<typeof validators.createMediaFolderArgs>>;
export type UpdateMediaFolderArgs = StringifyIds<Infer<typeof validators.updateMediaFolderArgs>>;
export type MoveFolderArgs = StringifyIds<Infer<typeof validators.moveFolderArgs>>;
export type DeleteMediaFolderArgs = StringifyIds<Infer<typeof validators.deleteMediaFolderArgs>>;
export type RestoreMediaFolderArgs = StringifyIds<Infer<typeof validators.restoreMediaFolderArgs>>;
export type MoveMediaAssetsArgs = StringifyIds<Infer<typeof validators.moveMediaAssetsArgs>>;

// =============================================================================
// Media Variant Arguments
// =============================================================================

export type CreateMediaVariantArgs = StringifyIds<Infer<typeof validators.createMediaVariantArgs>>;
export type RequestVariantGenerationArgs = StringifyIds<Infer<typeof validators.requestVariantGenerationArgs>>;
export type UpdateVariantStatusArgs = StringifyIds<Infer<typeof validators.updateVariantStatusArgs>>;
export type DeleteMediaVariantArgs = StringifyIds<Infer<typeof validators.deleteMediaVariantArgs>>;
export type DeleteAssetVariantsArgs = StringifyIds<Infer<typeof validators.deleteAssetVariantsArgs>>;
export type GetMediaVariantArgs = StringifyIds<Infer<typeof validators.getMediaVariantArgs>>;
export type ListMediaVariantsArgs = StringifyIds<Infer<typeof validators.listMediaVariantsArgs>>;
export type GetBestVariantArgs = StringifyIds<Infer<typeof validators.getBestVariantArgs>>;

// =============================================================================
// Bulk Operation Arguments
// =============================================================================

export type BulkPublishArgs = StringifyIds<Infer<typeof validators.bulkPublishArgs>>;
export type BulkUnpublishArgs = StringifyIds<Infer<typeof validators.bulkUnpublishArgs>>;
export type BulkDeleteArgs = StringifyIds<Infer<typeof validators.bulkDeleteArgs>>;
export type BulkUpdateArgs = StringifyIds<Infer<typeof validators.bulkUpdateArgs>>;

// =============================================================================
// Trash Operation Arguments
// =============================================================================

export type UpdateTrashConfigArgs = StringifyIds<Infer<typeof validators.updateTrashConfigArgs>>;
export type ListTrashArgs = StringifyIds<Infer<typeof validators.listTrashArgs>>;
export type EmptyTrashArgs = StringifyIds<Infer<typeof validators.emptyTrashArgs>>;

// =============================================================================
// Content Lock Arguments
// =============================================================================

export type AcquireLockArgs = StringifyIds<Infer<typeof validators.acquireLockArgs>>;
export type ReleaseLockArgs = StringifyIds<Infer<typeof validators.releaseLockArgs>>;
export type ForceReleaseLockArgs = StringifyIds<Infer<typeof validators.forceReleaseLockArgs>>;
export type RenewLockArgs = StringifyIds<Infer<typeof validators.renewLockArgs>>;
export type CheckLockArgs = StringifyIds<Infer<typeof validators.checkLockArgs>>;
export type ListLockedEntriesArgs = StringifyIds<Infer<typeof validators.listLockedEntriesArgs>>;

// =============================================================================
// Query Arguments
// =============================================================================

export type ContentQueryArgs = StringifyIds<Infer<typeof validators.contentQueryArgs>>;
export type MediaQueryArgs = StringifyIds<Infer<typeof validators.mediaQueryArgs>>;
export type ListMediaAssetsArgsFromValidator = StringifyIds<Infer<typeof validators.listMediaAssetsArgs>>;

// =============================================================================
// Wrapper-Specific Argument Types (no direct validator equivalents)
// =============================================================================

import type {
	ContentQueryOptions,
	MediaQueryOptions,
	VariantType,
	PaginationOpts,
} from "./types.js";

export interface GetContentTypeArgs {
	id?: string;
	name?: string;
	includeDeleted?: boolean;
}

export interface ListContentTypesArgs {
	isActive?: boolean;
	includeDeleted?: boolean;
	sortBy?: "name" | "createdAt";
	sortDirection?: "asc" | "desc";
	paginationOpts?: PaginationOpts;
}

export interface GetContentEntryArgs {
	id: string;
}

export interface GetContentEntryBySlugArgs {
	contentTypeId?: string;
	contentTypeName?: string;
	slug: string;
	locale?: string;
}

export type ListContentEntriesArgs = ContentQueryOptions;

export interface RestoreEntryArgs {
	id: string;
	restoredBy?: string;
}

export interface BulkRestoreArgs {
	ids: string[];
	restoredBy?: string;
}

export interface GetMediaAssetArgs {
	id: string;
}

export type ListMediaAssetsArgs = MediaQueryOptions;

export interface GetMediaFolderArgs {
	id: string;
}

export interface ListMediaFoldersArgs {
	parentId?: string;
	includeDeleted?: boolean;
}

export interface GenerateUploadUrlArgs {
	maxFileSize?: number;
	allowedMimeTypes?: string[];
	requestedBy?: string;
}

export interface FindMediaAssetReferencesArgs {
	id: string;
	limit?: number;
}

export interface GetMediaFolderByPathArgs {
	path: string;
	includeDeleted?: boolean;
}

export interface GetFolderTreeArgs {
	includeDeleted?: boolean;
}

export interface GenerateFromPresetsArgs {
	assetId: string;
	presets: string[];
	requestedBy?: string;
}

// =============================================================================
// Result Types
// =============================================================================

export interface BreakingChange {
	type:
		| "FIELD_REMOVED"
		| "FIELD_TYPE_CHANGED"
		| "FIELD_MADE_REQUIRED"
		| "SELECT_OPTIONS_REMOVED"
		| "REFERENCE_TYPES_RESTRICTED"
		| "VALIDATION_TIGHTENED";
	fieldName: string;
	message: string;
	affectedEntriesCount: number;
}

export interface UpdateContentTypeResult extends ContentType {
	breakingChanges?: BreakingChange[];
}

export interface DeleteContentTypeResult {
	success: boolean;
	deletedId: string;
	deletedEntriesCount: number;
	deletedVersionsCount: number;
	wasHardDelete: boolean;
}

export interface BulkOperationItemResult {
	id: string;
	success: boolean;
	error?: string;
}

export interface BulkOperationResult {
	total: number;
	succeeded: number;
	failed: number;
	results: BulkOperationItemResult[];
}

export interface GenerateUploadUrlResult {
	uploadUrl: string;
	expiresAt: number;
	maxFileSize: number;
	allowedMimeTypes?: string[];
}

export interface MediaAssetReference {
	entryId: string;
	slug: string;
	contentTypeName: string;
	fields: string[];
}

export interface GenerateVariantsResult {
	total: number;
	succeeded: number;
	failed: number;
	results: {
		preset: string;
		success: boolean;
		variantId?: string;
		error?: string;
	}[];
}

export interface SrcsetEntry {
	url: string;
	descriptor: string;
	width: number;
	format: string;
}

export interface ResponsiveSrcsetResult {
	src: string | null;
	srcset: string;
	entries: SrcsetEntry[];
	sizes?: string;
}

export interface VariantPreset {
	name: string;
	variantType: VariantType;
	width?: number;
	height?: number;
	format: string;
	quality?: number;
	description?: string;
}

export interface AssetWithVariants {
	original: {
		_id: string;
		_creationTime: number;
		name: string;
		mimeType: string;
		size: number;
		width?: number;
		height?: number;
		url: string | null;
	};
	variants: MediaVariantWithUrl[];
	variantsByType: {
		thumbnail?: MediaVariantWithUrl;
		responsive: MediaVariantWithUrl[];
		format: MediaVariantWithUrl[];
	};
}
