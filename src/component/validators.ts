/**
 * Shared validators for the CMS component.
 *
 * These validators can be imported and used in function definitions
 * to ensure type-safe arguments and return values.
 *
 * Provides:
 * - Field type validators for content type definitions
 * - Argument validators for CRUD operations
 * - Document validators for return types (derived from schema)
 *
 * Document validators are derived from the schema using convex-helpers `doc()`
 * function, ensuring they stay in sync with schema definitions automatically.
 */

import { v, type Validator, type Infer } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { doc } from "convex-helpers/validators";
import schema, {
	fieldTypeValidator,
	fieldDefinitionValidator,
	contentStatusValidator,
	mediaTypeValidator,
	variantTypeValidator,
	variantStatusValidator,
	mediaItemValidator,
	mediaAssetItemValidator,
	mediaFolderItemValidator,
	fieldTypes,
	contentStatuses,
	mediaTypes,
	variantTypes,
	variantStatuses,
	variantFormats,
} from "./schema.js";

// Re-export schema validators for convenience
export {
	fieldTypeValidator,
	fieldDefinitionValidator,
	contentStatusValidator,
	mediaTypeValidator,
	variantTypeValidator,
	variantStatusValidator,
};

// Re-export schema constants for convenience
export {
	fieldTypes,
	contentStatuses,
	mediaTypes,
	variantTypes,
	variantStatuses,
	variantFormats,
};

// =============================================================================
// Content Type Validators
// =============================================================================

/**
 * Args for creating a content type - only user-provided fields.
 * Fields like isActive, deletedAt are set by the mutation.
 */
export const createContentTypeArgs = v.object({
	name: v.string(),
	displayName: v.string(),
	createdBy: v.string(),
	description: v.optional(v.string()),
	fields: v.array(fieldDefinitionValidator),
	icon: v.optional(v.string()),
	singleton: v.optional(v.boolean()),
	slugField: v.optional(v.string()),
	titleField: v.optional(v.string()),
	sortOrder: v.optional(v.number()),
	// isActive defaults to true in the mutation
	// deletedAt is not set on creation
});

/**
 * Args for updating a content type - all fields optional except id.
 */
export const updateContentTypeArgs = v.object({
	id: v.id("contentTypes"),
	displayName: v.optional(v.string()),
	description: v.optional(v.string()),
	fields: v.optional(v.array(fieldDefinitionValidator)),
	icon: v.optional(v.string()),
	singleton: v.optional(v.boolean()),
	slugField: v.optional(v.string()),
	titleField: v.optional(v.string()),
	sortOrder: v.optional(v.number()),
	isActive: v.optional(v.boolean()),
	updatedBy: v.optional(v.string()),
	// name cannot be updated (used as identifier)
});

export const deleteContentTypeArgs = v.object({
	id: v.id("contentTypes"),
	cascade: v.optional(v.boolean()),
	hardDelete: v.optional(v.boolean()),
	deletedBy: v.optional(v.string()),
});

// =============================================================================
// Content Entry Validators
// =============================================================================

/**
 * Args for creating a content entry - only user-provided fields.
 * Fields like version, deletedAt, searchText are set by the mutation.
 */
export const createContentEntryArgs = v.object({
	contentTypeName: v.string(),
	slug: v.optional(v.string()), // Optional - auto-generated if not provided
	data: v.any(),
	locale: v.optional(v.string()),
	primaryEntryId: v.optional(v.id("contentEntries")),
	status: v.optional(contentStatusValidator), // Defaults to "draft"
	scheduledPublishAt: v.optional(v.number()),
	createdBy: v.optional(v.string()),
	// version is set to 1 by the mutation
	// deletedAt, searchText are not set on creation
});

export const updateContentEntryArgs = v.object({
	id: v.id("contentEntries"),
	slug: v.optional(v.string()),
	data: v.optional(v.any()),
	status: v.optional(contentStatusValidator),
	scheduledPublishAt: v.optional(v.number()),
	updatedBy: v.optional(v.string()),
	regenerateSlug: v.optional(v.boolean()),
});

export const publishEntryArgs = v.object({
	id: v.id("contentEntries"),
	changeDescription: v.optional(v.string()),
	updatedBy: v.optional(v.string()),
});

export const scheduleEntryArgs = v.object({
	id: v.id("contentEntries"),
	publishAt: v.number(),
	updatedBy: v.optional(v.string()),
});

export const unpublishEntryArgs = v.object({
	id: v.id("contentEntries"),
	updatedBy: v.optional(v.string()),
});

export const deleteContentEntryArgs = v.object({
	id: v.id("contentEntries"),
	deletedBy: v.optional(v.string()),
	hardDelete: v.optional(v.boolean()),
});

export const duplicateContentEntryArgs = v.object({
	sourceEntryId: v.id("contentEntries"),
	slug: v.optional(v.string()),
	copyMediaReferences: v.optional(v.boolean()),
	locale: v.optional(v.string()),
	createdBy: v.optional(v.string()),
});

// =============================================================================
// Version Validators
// =============================================================================

export const getVersionHistoryArgs = v.object({
	entryId: v.id("contentEntries"),
	paginationOpts: paginationOptsValidator,
});

export const getVersionArgs = v.object({
	entryId: v.id("contentEntries"),
	versionId: v.optional(v.id("contentVersions")),
	versionNumber: v.optional(v.number()),
});

export const rollbackVersionArgs = v.object({
	entryId: v.id("contentEntries"),
	versionNumber: v.number(),
	updatedBy: v.optional(v.string()),
});

export const createVersionSnapshotArgs = v.object({
	entryId: v.id("contentEntries"),
	changeDescription: v.optional(v.string()),
	createdBy: v.optional(v.string()),
	wasPublished: v.optional(v.boolean()),
});

export const compareVersionsArgs = v.object({
	entryId: v.id("contentEntries"),
	fromVersionNumber: v.number(),
	toVersionNumber: v.number(),
});

export const versionFieldDiff = v.object({
	field: v.string(),
	fromValue: v.optional(v.any()),
	toValue: v.optional(v.any()),
	changeType: v.union(
		v.literal("added"),
		v.literal("removed"),
		v.literal("modified"),
	),
});

export const compareVersionsResult = v.object({
	hasChanges: v.boolean(),
	fromVersion: v.object({
		versionNumber: v.number(),
		status: contentStatusValidator,
		slug: v.string(),
		wasPublished: v.boolean(),
		createdAt: v.number(),
	}),
	toVersion: v.object({
		versionNumber: v.number(),
		status: contentStatusValidator,
		slug: v.string(),
		wasPublished: v.boolean(),
		createdAt: v.number(),
	}),
	changedFields: v.array(v.string()),
	fieldDiffs: v.array(versionFieldDiff),
	slugChanged: v.boolean(),
	statusChanged: v.boolean(),
	changeSummary: v.string(),
});

// =============================================================================
// Media Asset Validators
// =============================================================================

/**
 * Args for creating a media asset.
 * Required: storageId, mimeType, name
 * Optional: metadata fields like title, description, altText
 */
export const createMediaAssetArgs = v.object({
	storageId: v.id("_storage"),
	mimeType: v.string(),
	name: v.string(),
	title: v.optional(v.string()),
	description: v.optional(v.string()),
	parentId: v.optional(v.id("mediaItems")),
	tags: v.optional(v.array(v.string())),
	size: v.optional(v.number()),
	metadata: v.optional(v.record(v.string(), v.any())),
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	duration: v.optional(v.number()),
	altText: v.optional(v.string()),
	createdBy: v.optional(v.string()),
});

/**
 * Args for updating a media asset - all fields optional except id.
 * Cannot change: storageId, mimeType (immutable properties)
 */
export const updateMediaAssetArgs = v.object({
	id: v.id("mediaItems"),
	name: v.optional(v.string()),
	title: v.optional(v.string()),
	description: v.optional(v.string()),
	parentId: v.optional(v.id("mediaItems")),
	tags: v.optional(v.array(v.string())),
	metadata: v.optional(v.record(v.string(), v.any())),
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	duration: v.optional(v.number()),
	altText: v.optional(v.string()),
	updatedBy: v.optional(v.string()),
});

export const deleteMediaAssetArgs = v.object({
	id: v.id("mediaItems"),
	deletedBy: v.optional(v.string()),
	hardDelete: v.optional(v.boolean()),
	forceDelete: v.optional(v.boolean()),
});

export const restoreMediaAssetArgs = v.object({
	id: v.id("mediaItems"),
	restoredBy: v.optional(v.string()),
});

// =============================================================================
// Media Folder Validators
// =============================================================================

/**
 * Args for creating a media folder.
 * Required: name
 * Optional: title, description, parentId, etc.
 */
export const createMediaFolderArgs = v.object({
	name: v.string(),
	title: v.optional(v.string()),
	description: v.optional(v.string()),
	parentId: v.optional(v.id("mediaItems")),
	tags: v.optional(v.array(v.string())),
	metadata: v.optional(v.record(v.string(), v.any())),
	sortOrder: v.optional(v.number()),
	createdBy: v.optional(v.string()),
});

/**
 * Args for updating a media folder - all fields optional except id.
 */
export const updateMediaFolderArgs = v.object({
	id: v.id("mediaItems"),
	name: v.optional(v.string()),
	title: v.optional(v.string()),
	description: v.optional(v.string()),
	parentId: v.optional(v.id("mediaItems")),
	tags: v.optional(v.array(v.string())),
	metadata: v.optional(v.record(v.string(), v.any())),
	sortOrder: v.optional(v.number()),
	updatedBy: v.optional(v.string()),
});

export const moveFolderArgs = v.object({
	id: v.id("mediaItems"),
	newParentId: v.optional(v.id("mediaItems")),
	updatedBy: v.optional(v.string()),
});

export const deleteMediaFolderArgs = v.object({
	id: v.id("mediaItems"),
	deletedBy: v.optional(v.string()),
	hardDelete: v.optional(v.boolean()),
	recursive: v.optional(v.boolean()),
});

export const restoreMediaFolderArgs = v.object({
	id: v.id("mediaItems"),
	restoredBy: v.optional(v.string()),
	recursive: v.optional(v.boolean()),
});

export const moveMediaAssetsArgs = v.object({
	assetIds: v.array(v.id("mediaItems")),
	targetFolderId: v.optional(v.id("mediaItems")),
	movedBy: v.optional(v.string()),
});

export const moveMediaAssetItemResult = v.object({
	id: v.id("mediaItems"),
	success: v.boolean(),
	error: v.optional(v.string()),
	previousFolderId: v.optional(v.id("mediaItems")),
});

export const moveMediaAssetsResult = v.object({
	total: v.number(),
	succeeded: v.number(),
	failed: v.number(),
	targetFolderId: v.optional(v.id("mediaItems")),
	targetFolderPath: v.optional(v.string()),
	results: v.array(moveMediaAssetItemResult),
});

// =============================================================================
// Media Variant Validators
// =============================================================================

export const createMediaVariantArgs = v.object({
	assetId: v.id("mediaItems"),
	storageId: v.id("_storage"),
	variantType: variantTypeValidator,
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	format: v.string(),
	mimeType: v.string(),
	size: v.number(),
	quality: v.optional(v.number()),
	preset: v.optional(v.string()),
	autoGenerated: v.optional(v.boolean()),
	createdBy: v.optional(v.string()),
});

export const requestVariantGenerationArgs = v.object({
	assetId: v.id("mediaItems"),
	variantType: variantTypeValidator,
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	format: v.string(),
	quality: v.optional(v.number()),
	preset: v.optional(v.string()),
	requestedBy: v.optional(v.string()),
});

export const updateVariantStatusArgs = v.object({
	id: v.id("mediaVariants"),
	status: variantStatusValidator,
	storageId: v.optional(v.id("_storage")),
	size: v.optional(v.number()),
	mimeType: v.optional(v.string()),
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	errorMessage: v.optional(v.string()),
});

export const deleteMediaVariantArgs = v.object({
	id: v.id("mediaVariants"),
	hardDelete: v.optional(v.boolean()),
	deletedBy: v.optional(v.string()),
});

export const deleteAssetVariantsArgs = v.object({
	assetId: v.id("mediaItems"),
	hardDelete: v.optional(v.boolean()),
	deletedBy: v.optional(v.string()),
});

export const getMediaVariantArgs = v.object({
	id: v.id("mediaVariants"),
	includeDeleted: v.optional(v.boolean()),
});

export const listMediaVariantsArgs = v.object({
	assetId: v.id("mediaItems"),
	variantType: v.optional(variantTypeValidator),
	format: v.optional(v.string()),
	preset: v.optional(v.string()),
	status: v.optional(variantStatusValidator),
	includeDeleted: v.optional(v.boolean()),
});

export const getBestVariantArgs = v.object({
	assetId: v.id("mediaItems"),
	targetWidth: v.optional(v.number()),
	targetHeight: v.optional(v.number()),
	preferredFormat: v.optional(v.string()),
	fallbackToOriginal: v.optional(v.boolean()),
});

export const mediaVariantDoc = doc(schema, "mediaVariants");

export const mediaVariantWithUrlDoc = v.object({
	...mediaVariantDoc.fields,
	url: v.union(v.string(), v.null()),
});

export const variantPresetValidator = v.object({
	name: v.string(),
	variantType: variantTypeValidator,
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	format: v.string(),
	quality: v.optional(v.number()),
	description: v.optional(v.string()),
});

export const generateVariantsResult = v.object({
	total: v.number(),
	succeeded: v.number(),
	failed: v.number(),
	results: v.array(
		v.object({
			preset: v.string(),
			success: v.boolean(),
			variantId: v.optional(v.id("mediaVariants")),
			error: v.optional(v.string()),
		}),
	),
});

export const srcsetEntryValidator = v.object({
	url: v.string(),
	descriptor: v.string(),
	width: v.number(),
	format: v.string(),
});

export const responsiveSrcsetResult = v.object({
	src: v.union(v.string(), v.null()),
	srcset: v.string(),
	entries: v.array(srcsetEntryValidator),
	sizes: v.optional(v.string()),
});

// =============================================================================
// Query/Pagination Validators
// =============================================================================

export const paginationResultValidator = <T extends Validator<unknown, "required", string>>(itemValidator: T) =>
	v.object({
		page: v.array(itemValidator),
		continueCursor: v.union(v.string(), v.null()),
		isDone: v.boolean(),
	});

export const contentQueryArgs = v.object({
	contentTypeName: v.optional(v.string()),
	status: v.optional(contentStatusValidator),
	statusIn: v.optional(v.array(contentStatusValidator)),
	locale: v.optional(v.string()),
	search: v.optional(v.string()),
	includeDeleted: v.optional(v.boolean()),
	cursor: v.optional(v.string()),
	limit: v.optional(v.number()),
});

export const mediaQueryArgs = v.object({
	folderId: v.optional(v.id("mediaItems")),
	type: v.optional(mediaTypeValidator),
	mimeType: v.optional(v.string()),
	search: v.optional(v.string()),
	tags: v.optional(v.array(v.string())),
	includeDeleted: v.optional(v.boolean()),
	cursor: v.optional(v.string()),
	limit: v.optional(v.number()),
});

export const mediaSortDirectionValidator = v.union(
	v.literal("asc"),
	v.literal("desc"),
);

export const mediaSortFieldValidator = v.union(
	v.literal("_creationTime"),
	v.literal("filename"),
	v.literal("size"),
	v.literal("type"),
	v.literal("mimeType"),
);

export const listMediaAssetsArgs = v.object({
	folderId: v.optional(v.id("mediaItems")),
	includeRootLevel: v.optional(v.boolean()),
	type: v.optional(mediaTypeValidator),
	mimeType: v.optional(v.string()),
	mimeTypePrefix: v.optional(v.string()),
	search: v.optional(v.string()),
	tags: v.optional(v.array(v.string())),
	includeDeleted: v.optional(v.boolean()),
	deletedOnly: v.optional(v.boolean()),
	sortField: v.optional(mediaSortFieldValidator),
	sortDirection: v.optional(mediaSortDirectionValidator),
	paginationOpts: paginationOptsValidator,
});

// =============================================================================
// Document Validators (for return types)
// =============================================================================

export const contentTypeDoc = doc(schema, "contentTypes");
export const contentEntryDoc = doc(schema, "contentEntries");
export const contentVersionDoc = doc(schema, "contentVersions");
export const mediaItemDoc = doc(schema, "mediaItems");

// Re-export schema validators for media items
export {
	mediaAssetItemValidator,
	mediaFolderItemValidator,
	mediaItemValidator,
} from "./schema.js";

export const taxonomyDoc = doc(schema, "taxonomies");
export const taxonomyTermDoc = doc(schema, "taxonomyTerms");
export const contentEntryTagDoc = doc(schema, "contentEntryTags");
export const webhookConfigDoc = doc(schema, "webhookConfigs");
export const webhookDeliveryDoc = doc(schema, "webhookDeliveries");
export const cmsSettingsDoc = doc(schema, "cmsSettings");

// =============================================================================
// Settings Validators
// =============================================================================

export const featureFlagsValidator = v.object({
	versioning: v.boolean(),
	scheduling: v.boolean(),
	localization: v.boolean(),
	mediaManagement: v.boolean(),
});

export const updateCmsSettingsArgs = v.object({
	defaultLocale: v.optional(v.string()),
	availableLocales: v.optional(v.array(v.string())),
	updatedBy: v.optional(v.string()),
});

export const mediaAssetReference = v.object({
	entryId: v.id("contentEntries"),
	slug: v.string(),
	contentTypeName: v.string(),
	fields: v.array(v.string()),
});

// =============================================================================
// Bulk Operation Validators
// =============================================================================

/**
 * Maximum number of entries that can be processed in a single bulk operation.
 * Respects Convex transaction limits (16,000 documents written max).
 */
export const BULK_OPERATION_BATCH_SIZE = 100;

export const bulkPublishArgs = v.object({
	ids: v.array(v.id("contentEntries")),
	changeDescription: v.optional(v.string()),
	updatedBy: v.optional(v.string()),
});

export const bulkUnpublishArgs = v.object({
	ids: v.array(v.id("contentEntries")),
	updatedBy: v.optional(v.string()),
});

export const bulkDeleteArgs = v.object({
	ids: v.array(v.id("contentEntries")),
	deletedBy: v.optional(v.string()),
	hardDelete: v.optional(v.boolean()),
});

export const bulkUpdateArgs = v.object({
	ids: v.array(v.id("contentEntries")),
	data: v.optional(v.any()),
	status: v.optional(contentStatusValidator),
	updatedBy: v.optional(v.string()),
});

export const bulkOperationItemResult = v.object({
	id: v.id("contentEntries"),
	success: v.boolean(),
	error: v.optional(v.string()),
});

export const bulkOperationResult = v.object({
	total: v.number(),
	succeeded: v.number(),
	failed: v.number(),
	results: v.array(bulkOperationItemResult),
});

// =============================================================================
// Trash Operation Validators
// =============================================================================

/** Default retention period in days for soft-deleted items. */
export const DEFAULT_TRASH_RETENTION_DAYS = 30;

export const trashConfigDoc = doc(schema, "trashConfig");

export const updateTrashConfigArgs = v.object({
	retentionDays: v.optional(v.number()),
	autoCleanupEnabled: v.optional(v.boolean()),
	updatedBy: v.optional(v.string()),
});

export const listTrashArgs = v.object({
	contentTypeName: v.optional(v.string()),
	search: v.optional(v.string()),
	paginationOpts: paginationOptsValidator,
});

export const emptyTrashArgs = v.object({
	olderThanDays: v.optional(v.number()),
	contentTypeName: v.optional(v.string()),
	deletedBy: v.optional(v.string()),
});

export const emptyTrashResult = v.object({
	deletedCount: v.number(),
	deletedVersionsCount: v.number(),
	errors: v.array(
		v.object({
			id: v.id("contentEntries"),
			error: v.string(),
		}),
	),
});

export const trashItemDoc = v.object({
	...contentEntryDoc.fields,
	deletedDaysAgo: v.number(),
	expiresAt: v.optional(v.number()),
	contentTypeName: v.optional(v.string()),
});

// =============================================================================
// Content Lock Validators
// =============================================================================

/** Default lock duration in milliseconds (30 minutes). */
export const DEFAULT_LOCK_DURATION_MS = 30 * 60 * 1000;

/** Maximum lock duration in milliseconds (4 hours). */
export const MAX_LOCK_DURATION_MS = 4 * 60 * 60 * 1000;

export const acquireLockArgs = v.object({
	id: v.id("contentEntries"),
	userId: v.string(),
	lockDuration: v.optional(v.number()),
});

export const releaseLockArgs = v.object({
	id: v.id("contentEntries"),
	userId: v.string(),
});

export const forceReleaseLockArgs = v.object({
	id: v.id("contentEntries"),
	releasedBy: v.string(),
});

export const renewLockArgs = v.object({
	id: v.id("contentEntries"),
	userId: v.string(),
	lockDuration: v.optional(v.number()),
});

export const checkLockArgs = v.object({
	id: v.id("contentEntries"),
});

export const listLockedEntriesArgs = v.object({
	contentTypeName: v.optional(v.string()),
	lockedBy: v.optional(v.string()),
	paginationOpts: paginationOptsValidator,
});

export const lockStatusDoc = v.object({
	isLocked: v.boolean(),
	lockedBy: v.optional(v.string()),
	lockExpiresAt: v.optional(v.number()),
	timeRemaining: v.optional(v.number()),
	isExpired: v.optional(v.boolean()),
});

export const lockAcquisitionResult = v.object({
	success: v.boolean(),
	entry: v.optional(contentEntryDoc),
	error: v.optional(v.string()),
	currentLockHolder: v.optional(v.string()),
	currentLockExpiresAt: v.optional(v.number()),
});

// =============================================================================
// CMS Event Validators
// =============================================================================

export const eventResourceTypes = [
	"contentEntry",
	"contentType",
	"mediaAsset",
	"mediaFolder",
	"custom",
] as const;

export type EventResourceType = typeof eventResourceTypes[number];

export const eventActions = [
	"created",
	"updated",
	"succeeded",
	"failed",
	"published",
	"unpublished",
	"deleted",
	"restored",
	"duplicated",
	"scheduled",
] as const;

export type EventAction = typeof eventActions[number];

export const eventResourceTypeValidator = v.union(
	v.literal("contentEntry"),
	v.literal("contentType"),
	v.literal("mediaAsset"),
	v.literal("mediaFolder"),
	v.literal("custom"),
);

export const eventActionValidator = v.union(
	v.literal("created"),
	v.literal("updated"),
	v.literal("succeeded"),
	v.literal("failed"),
	v.literal("published"),
	v.literal("unpublished"),
	v.literal("deleted"),
	v.literal("restored"),
	v.literal("duplicated"),
	v.literal("scheduled"),
);

export const cmsEventDoc = doc(schema, "cmsEvents");

export const listEventsArgs = v.object({
	resourceType: v.optional(eventResourceTypeValidator),
	action: v.optional(eventActionValidator),
	processed: v.optional(v.boolean()),
	limit: v.optional(v.number()),
	cursor: v.optional(v.string()),
});

export const getResourceEventsArgs = v.object({
	resourceType: eventResourceTypeValidator,
	resourceId: v.string(),
	limit: v.optional(v.number()),
});

export const markEventsProcessedArgs = v.object({
	eventIds: v.array(v.id("cmsEvents")),
});

export const cleanupEventsArgs = v.object({
	retentionDays: v.optional(v.number()),
});

// =============================================================================
// Mutation Authorization Context
// =============================================================================

/**
 * Validator for mutation-level authorization context.
 * Enables defense-in-depth: client wrapper performs auth checks AND mutations
 * can validate auth when context is provided.
 */
export const mutationAuthContext = v.object({
	userId: v.string(),
	role: v.union(v.string(), v.null()),
	resourceOwnerId: v.optional(v.string()),
});

export type MutationAuthContext = {
	userId: string;
	role: string | null;
	resourceOwnerId?: string;
};

// Export the schema for reference
export { schema };

// =============================================================================
// Inferred Types (derived from validators using Infer<>)
// =============================================================================
// These types are automatically derived from validators and should be used
// instead of manually declaring interfaces. This ensures types stay in sync.

// Core types from schema validators
export type FieldType = Infer<typeof fieldTypeValidator>;
export type FieldDefinition = Infer<typeof fieldDefinitionValidator>;
export type ContentStatus = Infer<typeof contentStatusValidator>;
export type MediaType = Infer<typeof mediaTypeValidator>;
export type VariantType = Infer<typeof variantTypeValidator>;
export type VariantStatus = Infer<typeof variantStatusValidator>;

// Document types (full documents with _id and _creationTime)
export type ContentTypeDoc = Infer<typeof contentTypeDoc>;
export type ContentEntryDoc = Infer<typeof contentEntryDoc>;
export type ContentVersionDoc = Infer<typeof contentVersionDoc>;
export type MediaItemDoc = Infer<typeof mediaItemDoc>;
export type MediaVariantDoc = Infer<typeof mediaVariantDoc>;
export type TaxonomyDoc = Infer<typeof taxonomyDoc>;
export type TaxonomyTermDoc = Infer<typeof taxonomyTermDoc>;
export type ContentEntryTagDoc = Infer<typeof contentEntryTagDoc>;
export type WebhookConfigDoc = Infer<typeof webhookConfigDoc>;
export type WebhookDeliveryDoc = Infer<typeof webhookDeliveryDoc>;
export type CmsEventDoc = Infer<typeof cmsEventDoc>;
export type TrashConfigDoc = Infer<typeof trashConfigDoc>;

// Media item types
export type MediaAssetItem = Infer<typeof mediaAssetItemValidator>;
export type MediaFolderItem = Infer<typeof mediaFolderItemValidator>;
export type MediaItem = Infer<typeof mediaItemValidator>;

// Content Type mutation args
export type CreateContentTypeArgs = Infer<typeof createContentTypeArgs>;
export type UpdateContentTypeArgs = Infer<typeof updateContentTypeArgs>;
export type DeleteContentTypeArgs = Infer<typeof deleteContentTypeArgs>;

// Content Entry mutation args
export type CreateContentEntryArgs = Infer<typeof createContentEntryArgs>;
export type UpdateContentEntryArgs = Infer<typeof updateContentEntryArgs>;
export type DeleteContentEntryArgs = Infer<typeof deleteContentEntryArgs>;
export type PublishEntryArgs = Infer<typeof publishEntryArgs>;
export type UnpublishEntryArgs = Infer<typeof unpublishEntryArgs>;
export type ScheduleEntryArgs = Infer<typeof scheduleEntryArgs>;
export type DuplicateContentEntryArgs = Infer<typeof duplicateContentEntryArgs>;

// Version args
export type GetVersionHistoryArgs = Infer<typeof getVersionHistoryArgs>;
export type GetVersionArgs = Infer<typeof getVersionArgs>;
export type RollbackVersionArgs = Infer<typeof rollbackVersionArgs>;
export type CreateVersionSnapshotArgs = Infer<typeof createVersionSnapshotArgs>;
export type CompareVersionsArgs = Infer<typeof compareVersionsArgs>;
export type VersionFieldDiff = Infer<typeof versionFieldDiff>;
export type CompareVersionsResult = Infer<typeof compareVersionsResult>;

// Media Asset mutation args
export type CreateMediaAssetArgs = Infer<typeof createMediaAssetArgs>;
export type UpdateMediaAssetArgs = Infer<typeof updateMediaAssetArgs>;
export type DeleteMediaAssetArgs = Infer<typeof deleteMediaAssetArgs>;
export type RestoreMediaAssetArgs = Infer<typeof restoreMediaAssetArgs>;

// Media Folder mutation args
export type CreateMediaFolderArgs = Infer<typeof createMediaFolderArgs>;
export type UpdateMediaFolderArgs = Infer<typeof updateMediaFolderArgs>;
export type DeleteMediaFolderArgs = Infer<typeof deleteMediaFolderArgs>;
export type RestoreMediaFolderArgs = Infer<typeof restoreMediaFolderArgs>;
export type MoveFolderArgs = Infer<typeof moveFolderArgs>;
export type MoveMediaAssetsArgs = Infer<typeof moveMediaAssetsArgs>;
export type MoveMediaAssetItemResult = Infer<typeof moveMediaAssetItemResult>;
export type MoveMediaAssetsResult = Infer<typeof moveMediaAssetsResult>;

// Media Variant args
export type CreateMediaVariantArgs = Infer<typeof createMediaVariantArgs>;
export type RequestVariantGenerationArgs = Infer<typeof requestVariantGenerationArgs>;
export type UpdateVariantStatusArgs = Infer<typeof updateVariantStatusArgs>;
export type DeleteMediaVariantArgs = Infer<typeof deleteMediaVariantArgs>;
export type DeleteAssetVariantsArgs = Infer<typeof deleteAssetVariantsArgs>;
export type GetMediaVariantArgs = Infer<typeof getMediaVariantArgs>;
export type ListMediaVariantsArgs = Infer<typeof listMediaVariantsArgs>;
export type GetBestVariantArgs = Infer<typeof getBestVariantArgs>;
export type MediaVariantWithUrl = Infer<typeof mediaVariantWithUrlDoc>;
export type VariantPreset = Infer<typeof variantPresetValidator>;
export type GenerateVariantsResult = Infer<typeof generateVariantsResult>;
export type SrcsetEntry = Infer<typeof srcsetEntryValidator>;
export type ResponsiveSrcsetResult = Infer<typeof responsiveSrcsetResult>;

// Query args
export type ContentQueryArgs = Infer<typeof contentQueryArgs>;
export type MediaQueryArgs = Infer<typeof mediaQueryArgs>;
export type ListMediaAssetsArgs = Infer<typeof listMediaAssetsArgs>;
export type MediaSortDirection = Infer<typeof mediaSortDirectionValidator>;
export type MediaSortField = Infer<typeof mediaSortFieldValidator>;

// Bulk operation args
export type BulkPublishArgs = Infer<typeof bulkPublishArgs>;
export type BulkUnpublishArgs = Infer<typeof bulkUnpublishArgs>;
export type BulkDeleteArgs = Infer<typeof bulkDeleteArgs>;
export type BulkUpdateArgs = Infer<typeof bulkUpdateArgs>;
export type BulkOperationItemResult = Infer<typeof bulkOperationItemResult>;
export type BulkOperationResult = Infer<typeof bulkOperationResult>;

// Trash operation args
export type UpdateTrashConfigArgs = Infer<typeof updateTrashConfigArgs>;
export type ListTrashArgs = Infer<typeof listTrashArgs>;
export type EmptyTrashArgs = Infer<typeof emptyTrashArgs>;
export type EmptyTrashResult = Infer<typeof emptyTrashResult>;
export type TrashItem = Infer<typeof trashItemDoc>;

// Lock operation args
export type AcquireLockArgs = Infer<typeof acquireLockArgs>;
export type ReleaseLockArgs = Infer<typeof releaseLockArgs>;
export type ForceReleaseLockArgs = Infer<typeof forceReleaseLockArgs>;
export type RenewLockArgs = Infer<typeof renewLockArgs>;
export type CheckLockArgs = Infer<typeof checkLockArgs>;
export type ListLockedEntriesArgs = Infer<typeof listLockedEntriesArgs>;
export type LockStatus = Infer<typeof lockStatusDoc>;
export type LockAcquisitionResult = Infer<typeof lockAcquisitionResult>;

// Event args
export type ListEventsArgs = Infer<typeof listEventsArgs>;
export type GetResourceEventsArgs = Infer<typeof getResourceEventsArgs>;
export type MarkEventsProcessedArgs = Infer<typeof markEventsProcessedArgs>;
export type CleanupEventsArgs = Infer<typeof cleanupEventsArgs>;

// Media asset reference
export type MediaAssetReference = Infer<typeof mediaAssetReference>;

// Settings
export type CmsSettingsDoc = Infer<typeof cmsSettingsDoc>;
export type FeatureFlags = Infer<typeof featureFlagsValidator>;
export type UpdateCmsSettingsArgs = Infer<typeof updateCmsSettingsArgs>;

