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

import { Infer,
v, type Validator } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { doc } from "convex-helpers/validators";
import schema, {
	fieldTypeValidator,
	fieldDefinitionValidator,
	contentStatusValidator,
	mediaTypeValidator,
	variantTypeValidator,
	variantStatusValidator,
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

// =============================================================================
// Field Type Constants
// =============================================================================

export type FieldType = Infer<typeof fieldTypeValidator>;

export type ContentStatus = Infer<typeof contentStatusValidator>;

export type MediaType = Infer<typeof mediaTypeValidator>;

export type VariantType = Infer<typeof variantTypeValidator>;

export type VariantStatus = Infer<typeof variantStatusValidator>;

/**
 * Common output formats for media variants
 */
export const variantFormats = [
	"jpeg",
	"jpg",
	"png",
	"webp",
	"avif",
	"gif",
] as const;

export type VariantFormat = typeof variantFormats[number];

// =============================================================================
// Content Type Validators
// =============================================================================



/**
 * Validator for content type creation arguments.
 */
export const createContentTypeArgs = v.object({
	name: v.string(),
	displayName: v.string(),
	description: v.optional(v.string()),
	fields: v.array(fieldDefinitionValidator),
	icon: v.optional(v.string()),
	singleton: v.optional(v.boolean()),
	slugField: v.optional(v.string()),
	titleField: v.optional(v.string()),
	sortOrder: v.optional(v.number()),
	createdBy: v.optional(v.string()),
});

/**
 * Validator for content type update arguments.
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
});

/**
 * Validator for content type delete arguments.
 * Supports both soft delete (default) and hard delete modes.
 * Can optionally cascade delete all content entries of this type.
 */
export const deleteContentTypeArgs = v.object({
	/** The ID of the content type to delete */
	id: v.id("contentTypes"),
	/**
	 * If true, also delete all content entries of this type.
	 * If false (default), deletion will fail if entries exist.
	 */
	cascade: v.optional(v.boolean()),
	/** If true, permanently deletes the content type. Default is soft delete. */
	hardDelete: v.optional(v.boolean()),
	/** User ID performing the deletion (for audit trail) */
	deletedBy: v.optional(v.string()),
});

// =============================================================================
// Content Entry Validators
// =============================================================================

/**
 * Validator for content entry creation arguments.
 */
export const createContentEntryArgs = v.object({
	contentTypeId: v.id("contentTypes"),
	slug: v.optional(v.string()),
	data: v.any(),
	locale: v.optional(v.string()),
	primaryEntryId: v.optional(v.id("contentEntries")),
	status: v.optional(contentStatusValidator),
	createdBy: v.optional(v.string()),
});

/**
 * Validator for content entry update arguments.
 * Supports optional slug regeneration when content data changes.
 */
export const updateContentEntryArgs = v.object({
	id: v.id("contentEntries"),
	slug: v.optional(v.string()),
	data: v.optional(v.any()),
	status: v.optional(contentStatusValidator),
	scheduledPublishAt: v.optional(v.number()),
	updatedBy: v.optional(v.string()),
	/** If true, regenerates slug from the slugField when data is updated */
	regenerateSlug: v.optional(v.boolean()),
});

/**
 * Validator for publishing an entry.
 */
export const publishEntryArgs = v.object({
	id: v.id("contentEntries"),
	changeDescription: v.optional(v.string()),
	updatedBy: v.optional(v.string()),
});

/**
 * Validator for scheduling an entry.
 */
export const scheduleEntryArgs = v.object({
	id: v.id("contentEntries"),
	publishAt: v.number(),
	updatedBy: v.optional(v.string()),
});

/**
 * Validator for unpublishing an entry (reverting to draft).
 */
export const unpublishEntryArgs = v.object({
	id: v.id("contentEntries"),
	updatedBy: v.optional(v.string()),
});

/**
 * Validator for deleting a content entry.
 * Supports both soft delete (default) and hard delete options.
 */
export const deleteContentEntryArgs = v.object({
	/** The ID of the content entry to delete */
	id: v.id("contentEntries"),
	/** User ID performing the deletion (for audit trail) */
	deletedBy: v.optional(v.string()),
	/** If true, permanently deletes the entry and all versions. Default is soft delete. */
	hardDelete: v.optional(v.boolean()),
});

/**
 * Validator for duplicating a content entry.
 * Clones an existing entry with a new unique slug.
 */
export const duplicateContentEntryArgs = v.object({
	/** The ID of the content entry to duplicate */
	sourceEntryId: v.id("contentEntries"),
	/** Optional custom slug for the duplicated entry (auto-generated if not provided) */
	slug: v.optional(v.string()),
	/** Whether to copy media references from the source entry (default: true) */
	copyMediaReferences: v.optional(v.boolean()),
	/** Optional locale for the duplicated entry */
	locale: v.optional(v.string()),
	/** User ID performing the duplication (for audit trail) */
	createdBy: v.optional(v.string()),
});

// =============================================================================
// Version Validators
// =============================================================================

/**
 * Validator for getting version history.
 */
export const getVersionHistoryArgs = v.object({
	entryId: v.id("contentEntries"),
	cursor: v.optional(v.string()),
	limit: v.optional(v.number()),
});

/**
 * Validator for retrieving a specific version of a content entry.
 * Can lookup by either version ID (_id) or version number.
 * At least one of versionId or versionNumber must be provided.
 */
export const getVersionArgs = v.object({
	/** The ID of the content entry to retrieve a version for */
	entryId: v.id("contentEntries"),
	/** The ID of the version document (direct lookup) */
	versionId: v.optional(v.id("contentVersions")),
	/** The version number to retrieve (uses compound index) */
	versionNumber: v.optional(v.number()),
});

/**
 * Validator for rolling back to a version.
 */
export const rollbackVersionArgs = v.object({
	entryId: v.id("contentEntries"),
	versionNumber: v.number(),
	updatedBy: v.optional(v.string()),
});

/**
 * Validator for creating a version snapshot.
 * Used by internal functions to capture the complete state of a content entry.
 */
export const createVersionSnapshotArgs = v.object({
	/** The ID of the content entry to snapshot */
	entryId: v.id("contentEntries"),
	/** Optional description of what triggered this snapshot or what changes it contains */
	changeDescription: v.optional(v.string()),
	/** User ID who triggered the snapshot creation (for audit trail) */
	createdBy: v.optional(v.string()),
	/** Whether this snapshot is being created as part of a publish action */
	wasPublished: v.optional(v.boolean()),
});

/**
 * Validator for comparing two versions of a content entry.
 * Compares the data, slug, and status between two version snapshots.
 */
export const compareVersionsArgs = v.object({
	/** The ID of the content entry to compare versions for */
	entryId: v.id("contentEntries"),
	/** The version number of the "from" (older/base) version */
	fromVersionNumber: v.number(),
	/** The version number of the "to" (newer/target) version */
	toVersionNumber: v.number(),
});

/**
 * A single field difference between two versions.
 */
export const versionFieldDiff = v.object({
	/** The name of the field that changed */
	field: v.string(),
	/** The value in the "from" version (may be undefined if field was added) */
	fromValue: v.optional(v.any()),
	/** The value in the "to" version (may be undefined if field was removed) */
	toValue: v.optional(v.any()),
	/** The type of change: "added", "removed", or "modified" */
	changeType: v.union(
		v.literal("added"),
		v.literal("removed"),
		v.literal("modified"),
	),
});

/**
 * Result of comparing two versions of a content entry.
 * Provides field-level diff showing exactly what changed.
 */
export const compareVersionsResult = v.object({
	/** Whether any differences were found between the versions */
	hasChanges: v.boolean(),
	/** The "from" version metadata */
	fromVersion: v.object({
		versionNumber: v.number(),
		status: contentStatusValidator,
		slug: v.string(),
		wasPublished: v.boolean(),
		createdAt: v.number(),
	}),
	/** The "to" version metadata */
	toVersion: v.object({
		versionNumber: v.number(),
		status: contentStatusValidator,
		slug: v.string(),
		wasPublished: v.boolean(),
		createdAt: v.number(),
	}),
	/** List of field names that changed in the content data */
	changedFields: v.array(v.string()),
	/** Detailed diffs for each changed field in the content data */
	fieldDiffs: v.array(versionFieldDiff),
	/** Whether the slug changed between versions */
	slugChanged: v.boolean(),
	/** Whether the status changed between versions */
	statusChanged: v.boolean(),
	/** Summary of changes (e.g., "3 fields changed: title, body, tags") */
	changeSummary: v.string(),
});

// =============================================================================
// Media Asset Validators
// =============================================================================

/**
 * Validator for media asset creation arguments.
 */
export const createMediaAssetArgs = v.object({
	storageId: v.id("_storage"),
	filename: v.string(),
	mimeType: v.string(),
	size: v.number(),
	type: mediaTypeValidator,
	title: v.optional(v.string()),
	description: v.optional(v.string()),
	altText: v.optional(v.string()),
	folderId: v.optional(v.id("mediaFolders")),
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	duration: v.optional(v.number()),
	metadata: v.optional(v.any()),
	tags: v.optional(v.array(v.string())),
	createdBy: v.optional(v.string()),
});

/**
 * Validator for media asset update arguments.
 * Updates metadata fields without modifying the underlying storage file.
 */
export const updateMediaAssetArgs = v.object({
	/** The ID of the media asset to update */
	id: v.id("mediaAssets"),
	/** New display filename (does not modify stored file) */
	filename: v.optional(v.string()),
	/** New display title */
	title: v.optional(v.string()),
	/** New description/caption */
	description: v.optional(v.string()),
	/** New alt text for accessibility */
	altText: v.optional(v.string()),
	/** New folder assignment for organization */
	folderId: v.optional(v.id("mediaFolders")),
	/** New tags for categorization */
	tags: v.optional(v.array(v.string())),
	/** User ID performing the update (for audit trail) */
	updatedBy: v.optional(v.string()),
});

/**
 * Validator for media asset delete arguments.
 * Supports both soft delete (default) and hard delete options.
 *
 * Soft delete sets a deletedAt timestamp, allowing recovery via restore.
 * Hard delete permanently removes the asset and optionally the storage file.
 */
export const deleteMediaAssetArgs = v.object({
	/** The ID of the media asset to delete */
	id: v.id("mediaAssets"),
	/** User ID performing the deletion (for audit trail) */
	deletedBy: v.optional(v.string()),
	/**
	 * If true, permanently deletes the asset record and storage file.
	 * If false (default), soft-deletes by setting deletedAt timestamp.
	 */
	hardDelete: v.optional(v.boolean()),
	/**
	 * If true, allows deletion even if content entries reference this asset.
	 * If false (default), deletion fails if references exist.
	 * WARNING: Force deleting will leave broken references in content entries.
	 */
	forceDelete: v.optional(v.boolean()),
});

/**
 * Validator for media asset restore arguments.
 * Restores a soft-deleted media asset by removing the deletedAt timestamp.
 */
export const restoreMediaAssetArgs = v.object({
	/** The ID of the soft-deleted media asset to restore */
	id: v.id("mediaAssets"),
	/** User ID performing the restoration (for audit trail) */
	restoredBy: v.optional(v.string()),
});

// =============================================================================
// Media Folder Validators
// =============================================================================

/**
 * Validator for media folder creation arguments.
 */
export const createMediaFolderArgs = v.object({
	name: v.string(),
	parentId: v.optional(v.id("mediaFolders")),
	description: v.optional(v.string()),
	sortOrder: v.optional(v.number()),
	createdBy: v.optional(v.string()),
});

/**
 * Validator for media folder update arguments.
 */
export const updateMediaFolderArgs = v.object({
	id: v.id("mediaFolders"),
	name: v.optional(v.string()),
	description: v.optional(v.string()),
	sortOrder: v.optional(v.number()),
});

/**
 * Validator for moving a folder.
 */
export const moveFolderArgs = v.object({
	id: v.id("mediaFolders"),
	newParentId: v.optional(v.id("mediaFolders")),
});

/**
 * Validator for media folder delete arguments.
 * Supports both soft delete (default) and hard delete options.
 */
export const deleteMediaFolderArgs = v.object({
	/** The ID of the media folder to delete */
	id: v.id("mediaFolders"),
	/** User ID performing the deletion (for audit trail) */
	deletedBy: v.optional(v.string()),
	/** If true, permanently deletes the folder. Default is soft delete. */
	hardDelete: v.optional(v.boolean()),
	/** If true, deletes the folder and all its contents recursively. */
	recursive: v.optional(v.boolean()),
});

/**
 * Validator for media folder restore arguments.
 */
export const restoreMediaFolderArgs = v.object({
	/** The ID of the soft-deleted media folder to restore */
	id: v.id("mediaFolders"),
	/** User ID performing the restoration (for audit trail) */
	restoredBy: v.optional(v.string()),
	/** If true, restores the folder and all its contents recursively. */
	recursive: v.optional(v.boolean()),
});

/**
 * Validator for moving media assets between folders (bulk operation).
 * Supports moving multiple assets to a target folder in a single transaction.
 */
export const moveMediaAssetsArgs = v.object({
	/** Array of media asset IDs to move */
	assetIds: v.array(v.id("mediaAssets")),
	/**
	 * Target folder ID to move assets to.
	 * Set to undefined/null to move assets to root level (no folder).
	 */
	targetFolderId: v.optional(v.id("mediaFolders")),
	/** User ID performing the move (for audit trail) */
	movedBy: v.optional(v.string()),
});

/**
 * Result for a single asset in the bulk move operation.
 */
export const moveMediaAssetItemResult = v.object({
	/** The ID of the media asset */
	id: v.id("mediaAssets"),
	/** Whether the move succeeded for this asset */
	success: v.boolean(),
	/** Error message if the move failed */
	error: v.optional(v.string()),
	/** Previous folder ID (undefined if was at root level) */
	previousFolderId: v.optional(v.id("mediaFolders")),
});

/**
 * Result for bulk move media assets operation.
 * Returns summary of successes and failures.
 */
export const moveMediaAssetsResult = v.object({
	/** Total number of assets processed */
	total: v.number(),
	/** Number of successful moves */
	succeeded: v.number(),
	/** Number of failed moves */
	failed: v.number(),
	/** Target folder ID (undefined if moved to root) */
	targetFolderId: v.optional(v.id("mediaFolders")),
	/** Target folder path (for logging/UI display) */
	targetFolderPath: v.optional(v.string()),
	/** Detailed results for each asset */
	results: v.array(moveMediaAssetItemResult),
});

// =============================================================================
// Media Variant Validators
// =============================================================================

/**
 * Validator for creating a media variant.
 * Used when registering a variant after image processing.
 */
export const createMediaVariantArgs = v.object({
	/** The parent media asset ID */
	assetId: v.id("mediaAssets"),
	/** The storage ID for the variant file */
	storageId: v.id("_storage"),
	/** Type of variant (thumbnail, responsive, or format) */
	variantType: variantTypeValidator,
	/** Width in pixels (optional for format-only conversions) */
	width: v.optional(v.number()),
	/** Height in pixels (optional for format-only conversions) */
	height: v.optional(v.number()),
	/** Output format (e.g., "webp", "avif", "jpeg") */
	format: v.string(),
	/** MIME type of the variant file */
	mimeType: v.string(),
	/** File size in bytes */
	size: v.number(),
	/** Quality setting (0-100) */
	quality: v.optional(v.number()),
	/** Named preset if using a predefined configuration */
	preset: v.optional(v.string()),
	/** Whether this was auto-generated */
	autoGenerated: v.optional(v.boolean()),
	/** User ID who created this variant */
	createdBy: v.optional(v.string()),
});

/**
 * Validator for requesting variant generation (async).
 * Queues a variant for processing.
 */
export const requestVariantGenerationArgs = v.object({
	/** The parent media asset ID */
	assetId: v.id("mediaAssets"),
	/** Type of variant to generate */
	variantType: variantTypeValidator,
	/** Target width (optional, will maintain aspect ratio if only width is provided) */
	width: v.optional(v.number()),
	/** Target height (optional, will maintain aspect ratio if only height is provided) */
	height: v.optional(v.number()),
	/** Output format */
	format: v.string(),
	/** Quality setting (0-100) */
	quality: v.optional(v.number()),
	/** Named preset to use */
	preset: v.optional(v.string()),
	/** User ID requesting the variant */
	requestedBy: v.optional(v.string()),
});

/**
 * Validator for updating variant generation status.
 * Used by the processing system to update variant status.
 */
export const updateVariantStatusArgs = v.object({
	/** The variant ID to update */
	id: v.id("mediaVariants"),
	/** New status */
	status: variantStatusValidator,
	/** Storage ID once processing is complete */
	storageId: v.optional(v.id("_storage")),
	/** Final file size */
	size: v.optional(v.number()),
	/** Final MIME type */
	mimeType: v.optional(v.string()),
	/** Final dimensions */
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	/** Error message if failed */
	errorMessage: v.optional(v.string()),
});

/**
 * Validator for deleting a media variant.
 */
export const deleteMediaVariantArgs = v.object({
	/** The variant ID to delete */
	id: v.id("mediaVariants"),
	/** Whether to hard delete (remove storage file) or soft delete */
	hardDelete: v.optional(v.boolean()),
	/** User ID performing the deletion */
	deletedBy: v.optional(v.string()),
});

/**
 * Validator for deleting all variants of an asset.
 */
export const deleteAssetVariantsArgs = v.object({
	/** The parent asset ID */
	assetId: v.id("mediaAssets"),
	/** Whether to hard delete */
	hardDelete: v.optional(v.boolean()),
	/** User ID performing the deletion */
	deletedBy: v.optional(v.string()),
});

/**
 * Validator for getting a specific variant by ID.
 */
export const getMediaVariantArgs = v.object({
	/** The variant ID */
	id: v.id("mediaVariants"),
	/** Whether to include soft-deleted variants */
	includeDeleted: v.optional(v.boolean()),
});

/**
 * Validator for listing variants of an asset.
 */
export const listMediaVariantsArgs = v.object({
	/** The parent asset ID */
	assetId: v.id("mediaAssets"),
	/** Filter by variant type */
	variantType: v.optional(variantTypeValidator),
	/** Filter by format */
	format: v.optional(v.string()),
	/** Filter by preset */
	preset: v.optional(v.string()),
	/** Filter by status */
	status: v.optional(variantStatusValidator),
	/** Include soft-deleted variants */
	includeDeleted: v.optional(v.boolean()),
});

/**
 * Validator for getting the best matching variant for requested dimensions.
 */
export const getBestVariantArgs = v.object({
	/** The parent asset ID */
	assetId: v.id("mediaAssets"),
	/** Target width */
	targetWidth: v.optional(v.number()),
	/** Target height */
	targetHeight: v.optional(v.number()),
	/** Preferred format (e.g., "webp") */
	preferredFormat: v.optional(v.string()),
	/** Fallback to original if no variant matches */
	fallbackToOriginal: v.optional(v.boolean()),
});

/**
 * Document validator for media variant.
 * Derived from schema - includes _id and _creationTime automatically.
 */
export const mediaVariantDoc = doc(schema, "mediaVariants");

/**
 * Media variant with resolved URL.
 */
export const mediaVariantWithUrlDoc = v.object({
	...mediaVariantDoc.fields,
	/** The resolved public URL for accessing the variant file */
	url: v.union(v.string(), v.null()),
});

/**
 * Preset definition for common variant configurations.
 */
export const variantPresetValidator = v.object({
	/** Preset name */
	name: v.string(),
	/** Variant type this preset creates */
	variantType: variantTypeValidator,
	/** Target width */
	width: v.optional(v.number()),
	/** Target height */
	height: v.optional(v.number()),
	/** Output format */
	format: v.string(),
	/** Quality setting */
	quality: v.optional(v.number()),
	/** Description of the preset */
	description: v.optional(v.string()),
});

/**
 * Result for generating multiple variants from presets.
 */
export const generateVariantsResult = v.object({
	/** Total presets requested */
	total: v.number(),
	/** Successfully created/queued variants */
	succeeded: v.number(),
	/** Failed to create variants */
	failed: v.number(),
	/** Individual results */
	results: v.array(
		v.object({
			preset: v.string(),
			success: v.boolean(),
			variantId: v.optional(v.id("mediaVariants")),
			error: v.optional(v.string()),
		}),
	),
});

/**
 * Srcset entry for responsive images.
 */
export const srcsetEntryValidator = v.object({
	/** URL of the variant */
	url: v.string(),
	/** Width descriptor (e.g., "480w") */
	descriptor: v.string(),
	/** Actual width in pixels */
	width: v.number(),
	/** Format of the variant */
	format: v.string(),
});

/**
 * Result for getting responsive srcset data.
 */
export const responsiveSrcsetResult = v.object({
	/** Original image URL as fallback */
	src: v.union(v.string(), v.null()),
	/** Srcset string for HTML img/source tags */
	srcset: v.string(),
	/** Array of srcset entries for programmatic use */
	entries: v.array(srcsetEntryValidator),
	/** Sizes hint based on available variants */
	sizes: v.optional(v.string()),
});

// =============================================================================
// Query/Pagination Validators
// =============================================================================

/**
 * Validator for legacy pagination options (cursor + limit format).
 * @deprecated Use paginationOptsValidator from convex/server for new implementations.
 */
export const paginationArgs = v.object({
	cursor: v.optional(v.string()),
	limit: v.optional(v.number()),
});

/**
 * Validator for standard Convex pagination result.
 * This is the return type used by convex-helpers paginator.
 *
 * @example
 * ```typescript
 * // Define a query that returns paginated content entries
 * returns: paginationResultValidator(contentEntryDoc),
 * ```
 */
export const paginationResultValidator = <T extends Validator<unknown, "required", string>>(itemValidator: T) =>
	v.object({
		/** Array of items for the current page */
		page: v.array(itemValidator),
		/** Cursor to continue fetching (null if no more results) */
		continueCursor: v.union(v.string(), v.null()),
		/** Whether this is the last page (no more results available) */
		isDone: v.boolean(),
	});

/**
 * Validator for content query filters.
 */
export const contentQueryArgs = v.object({
	contentTypeId: v.optional(v.id("contentTypes")),
	contentTypeName: v.optional(v.string()),
	/** Filter by a single status (for backward compatibility) */
	status: v.optional(contentStatusValidator),
	/** Filter by multiple statuses (e.g., ["draft", "scheduled"] for admin views) */
	statusIn: v.optional(v.array(contentStatusValidator)),
	locale: v.optional(v.string()),
	search: v.optional(v.string()),
	includeDeleted: v.optional(v.boolean()),
	cursor: v.optional(v.string()),
	limit: v.optional(v.number()),
});

/**
 * Validator for media query filters.
 */
export const mediaQueryArgs = v.object({
	folderId: v.optional(v.id("mediaFolders")),
	type: v.optional(mediaTypeValidator),
	mimeType: v.optional(v.string()),
	search: v.optional(v.string()),
	tags: v.optional(v.array(v.string())),
	includeDeleted: v.optional(v.boolean()),
	cursor: v.optional(v.string()),
	limit: v.optional(v.number()),
});

/**
 * Sort direction for media assets list query.
 */
export const mediaSortDirectionValidator = v.union(
	v.literal("asc"),
	v.literal("desc"),
);

/**
 * Sort field options for media assets list query.
 * Supports sorting by system fields and metadata fields.
 */
export const mediaSortFieldValidator = v.union(
	v.literal("_creationTime"),
	v.literal("filename"),
	v.literal("size"),
	v.literal("type"),
	v.literal("mimeType"),
);

/**
 * Validator for listing media assets with filtering, sorting, and pagination.
 * Supports filtering by folder, MIME type, media type, and tags.
 */
export const listMediaAssetsArgs = v.object({
	/** Filter to a specific folder (null/undefined returns root-level assets) */
	folderId: v.optional(v.id("mediaFolders")),
	/** If true, includes assets without a folder (root level). If false with folderId, only folder assets. */
	includeRootLevel: v.optional(v.boolean()),
	/** Filter by media type (image, video, audio, document, other) */
	type: v.optional(mediaTypeValidator),
	/** Filter by exact MIME type (e.g., "image/jpeg") */
	mimeType: v.optional(v.string()),
	/** Filter by MIME type prefix (e.g., "image/" matches all images) */
	mimeTypePrefix: v.optional(v.string()),
	/** Full-text search on filename, title, description, and tags */
	search: v.optional(v.string()),
	/** Filter by tags (assets must have ALL specified tags) */
	tags: v.optional(v.array(v.string())),
	/** Whether to include soft-deleted assets (default: false) */
	includeDeleted: v.optional(v.boolean()),
	/** Field to sort by (default: "_creationTime") */
	sortField: v.optional(mediaSortFieldValidator),
	/** Sort direction (default: "desc") */
	sortDirection: v.optional(mediaSortDirectionValidator),
	/** Pagination options */
	paginationOpts: paginationOptsValidator,
});

// =============================================================================
// Document Validators (for return types)
// =============================================================================

/**
 * Document validators for return types.
 * Derived from schema using convex-helpers `doc()` - includes _id and _creationTime automatically.
 * This ensures validators stay in sync with schema definitions.
 */
export const contentTypeDoc = doc(schema, "contentTypes");
export const contentEntryDoc = doc(schema, "contentEntries");
export const contentVersionDoc = doc(schema, "contentVersions");
export const mediaAssetDoc = doc(schema, "mediaAssets");
export const mediaFolderDoc = doc(schema, "mediaFolders");

/**
 * Additional document validators for taxonomy and other tables.
 * Exported for use in other modules instead of local definitions.
 */
export const taxonomyDoc = doc(schema, "taxonomies");
export const taxonomyTermDoc = doc(schema, "taxonomyTerms");
export const contentEntryTagDoc = doc(schema, "contentEntryTags");
export const webhookConfigDoc = doc(schema, "webhookConfigs");
export const webhookDeliveryDoc = doc(schema, "webhookDeliveries");

/**
 * Result for media asset delete operation.
 * Returns the deleted asset along with deletion details.
 */
export const deleteMediaAssetResult = v.object({
	...mediaAssetDoc.fields,
	/** Whether the storage file was also deleted (only for hard delete) */
	storageFileDeleted: v.optional(v.boolean()),
});

/**
 * A content entry reference to a media asset.
 * Used to report which content entries would be affected by deletion.
 */
export const mediaAssetReference = v.object({
	/** The ID of the content entry referencing this asset */
	entryId: v.id("contentEntries"),
	/** The slug of the content entry */
	slug: v.string(),
	/** The name of the content type */
	contentTypeName: v.string(),
	/** The field names that reference this asset */
	fields: v.array(v.string()),
});

// =============================================================================
// Paginated Response Validators
// =============================================================================

/**
 * Legacy paginated response shape.
 * @deprecated Use paginationResultValidator for new implementations.
 */
export const paginatedResponseValidator = <T extends Validator<unknown, "required", string>>(itemValidator: T) =>
	v.object({
		items: v.array(itemValidator),
		cursor: v.optional(v.string()),
		hasMore: v.boolean(),
	});

// =============================================================================
// Bulk Operation Validators
// =============================================================================

/**
 * Maximum number of entries that can be processed in a single bulk operation.
 * This respects Convex transaction limits (16,000 documents written max).
 * We use a conservative limit to account for version snapshots created during publish.
 */
export const BULK_OPERATION_BATCH_SIZE = 100;

/**
 * Validator for bulk publish operation arguments.
 * Publishes multiple entries in a single transaction.
 */
export const bulkPublishArgs = v.object({
	/** Array of content entry IDs to publish */
	ids: v.array(v.id("contentEntries")),
	/** Optional description for version history (applied to all entries) */
	changeDescription: v.optional(v.string()),
	/** User ID performing the operation (for audit trail) */
	updatedBy: v.optional(v.string()),
});

/**
 * Validator for bulk unpublish operation arguments.
 * Reverts multiple published entries to draft status.
 */
export const bulkUnpublishArgs = v.object({
	/** Array of content entry IDs to unpublish */
	ids: v.array(v.id("contentEntries")),
	/** User ID performing the operation (for audit trail) */
	updatedBy: v.optional(v.string()),
});

/**
 * Validator for bulk delete operation arguments.
 * Deletes multiple entries (soft or hard delete).
 */
export const bulkDeleteArgs = v.object({
	/** Array of content entry IDs to delete */
	ids: v.array(v.id("contentEntries")),
	/** User ID performing the deletion (for audit trail) */
	deletedBy: v.optional(v.string()),
	/** If true, permanently deletes entries and all versions. Default is soft delete. */
	hardDelete: v.optional(v.boolean()),
});

/**
 * Validator for bulk update operation arguments.
 * Updates multiple entries with the same data changes.
 */
export const bulkUpdateArgs = v.object({
	/** Array of content entry IDs to update */
	ids: v.array(v.id("contentEntries")),
	/** Data to merge into each entry */
	data: v.optional(v.any()),
	/** New status to apply to all entries */
	status: v.optional(contentStatusValidator),
	/** User ID performing the update (for audit trail) */
	updatedBy: v.optional(v.string()),
});

/**
 * Result for a single entry in a bulk operation.
 */
export const bulkOperationItemResult = v.object({
	/** The ID of the content entry */
	id: v.id("contentEntries"),
	/** Whether the operation succeeded for this entry */
	success: v.boolean(),
	/** Error message if the operation failed */
	error: v.optional(v.string()),
});

/**
 * Result for bulk operations.
 * Returns summary of successes and failures.
 */
export const bulkOperationResult = v.object({
	/** Total number of entries processed */
	total: v.number(),
	/** Number of successful operations */
	succeeded: v.number(),
	/** Number of failed operations */
	failed: v.number(),
	/** Detailed results for each entry */
	results: v.array(bulkOperationItemResult),
});

// =============================================================================
// Trash Operation Validators
// =============================================================================

/**
 * Default retention period in days for soft-deleted items.
 * Items older than this will be permanently deleted during auto-cleanup.
 */
export const DEFAULT_TRASH_RETENTION_DAYS = 30;

/**
 * Validator for trash configuration.
 * Derived from schema - includes _id and _creationTime automatically.
 */
export const trashConfigDoc = doc(schema, "trashConfig");

/**
 * Validator for updating trash configuration.
 */
export const updateTrashConfigArgs = v.object({
	/** Retention period in days (0-365). Set to 0 to disable auto-cleanup. */
	retentionDays: v.optional(v.number()),
	/** Whether to enable automatic trash cleanup */
	autoCleanupEnabled: v.optional(v.boolean()),
	/** User performing the update */
	updatedBy: v.optional(v.string()),
});

/**
 * Validator for listing trash items.
 */
export const listTrashArgs = v.object({
	/** Filter by content type ID */
	contentTypeId: v.optional(v.id("contentTypes")),
	/** Filter by content type name */
	contentTypeName: v.optional(v.string()),
	/** Search within deleted items */
	search: v.optional(v.string()),
	/** Standard pagination options */
	paginationOpts: paginationOptsValidator,
});

/**
 * Validator for empty trash operation.
 */
export const emptyTrashArgs = v.object({
	/** If provided, only delete items older than this many days */
	olderThanDays: v.optional(v.number()),
	/** Filter by content type ID (only empty trash for this type) */
	contentTypeId: v.optional(v.id("contentTypes")),
	/** User performing the operation */
	deletedBy: v.optional(v.string()),
});

/**
 * Result for empty trash operation.
 */
export const emptyTrashResult = v.object({
	/** Total number of items permanently deleted */
	deletedCount: v.number(),
	/** Number of versions deleted */
	deletedVersionsCount: v.number(),
	/** Any errors encountered */
	errors: v.array(
		v.object({
			id: v.id("contentEntries"),
			error: v.string(),
		}),
	),
});

/**
 * Trash item with additional metadata about deletion.
 */
export const trashItemDoc = v.object({
	...contentEntryDoc.fields,
	/** How many days ago the item was deleted */
	deletedDaysAgo: v.number(),
	/** When the item will be permanently deleted (based on retention) */
	expiresAt: v.optional(v.number()),
	/** Content type display name for UI */
	contentTypeName: v.optional(v.string()),
});

// =============================================================================
// Content Lock Validators
// =============================================================================

/**
 * Default lock duration in milliseconds (30 minutes).
 * This is the default time a lock remains active before auto-expiring.
 */
export const DEFAULT_LOCK_DURATION_MS = 30 * 60 * 1000;

/**
 * Maximum lock duration in milliseconds (4 hours).
 * Prevents users from holding locks indefinitely.
 */
export const MAX_LOCK_DURATION_MS = 4 * 60 * 60 * 1000;

/**
 * Validator for acquiring a lock on a content entry.
 * Locks prevent other users from editing while you have an active session.
 */
export const acquireLockArgs = v.object({
	/** The ID of the content entry to lock */
	id: v.id("contentEntries"),
	/** User ID acquiring the lock (required for ownership tracking) */
	userId: v.string(),
	/**
	 * Lock duration in milliseconds.
	 * Defaults to 30 minutes. Maximum is 4 hours.
	 */
	lockDuration: v.optional(v.number()),
});

/**
 * Validator for releasing a lock on a content entry.
 * Only the lock owner can release their own lock.
 */
export const releaseLockArgs = v.object({
	/** The ID of the content entry to unlock */
	id: v.id("contentEntries"),
	/** User ID releasing the lock (must match lock owner) */
	userId: v.string(),
});

/**
 * Validator for force-releasing a lock (admin operation).
 * Allows admins to remove locks from entries locked by other users.
 */
export const forceReleaseLockArgs = v.object({
	/** The ID of the content entry to force unlock */
	id: v.id("contentEntries"),
	/** User ID performing the force release (for audit trail) */
	releasedBy: v.string(),
});

/**
 * Validator for renewing an existing lock.
 * Extends the lock expiration time for continued editing.
 */
export const renewLockArgs = v.object({
	/** The ID of the content entry whose lock to renew */
	id: v.id("contentEntries"),
	/** User ID renewing the lock (must match lock owner) */
	userId: v.string(),
	/**
	 * New lock duration in milliseconds.
	 * Defaults to 30 minutes from now. Maximum is 4 hours.
	 */
	lockDuration: v.optional(v.number()),
});

/**
 * Validator for checking lock status of a content entry.
 */
export const checkLockArgs = v.object({
	/** The ID of the content entry to check */
	id: v.id("contentEntries"),
});

/**
 * Validator for listing all locked content entries.
 */
export const listLockedEntriesArgs = v.object({
	/** Filter by content type ID */
	contentTypeId: v.optional(v.id("contentTypes")),
	/** Filter by locking user */
	lockedBy: v.optional(v.string()),
	/** Standard pagination options */
	paginationOpts: paginationOptsValidator,
});

/**
 * Lock status response document.
 * Contains information about the current lock state of an entry.
 */
export const lockStatusDoc = v.object({
	/** Whether the entry is currently locked */
	isLocked: v.boolean(),
	/** User ID who holds the lock (if locked) */
	lockedBy: v.optional(v.string()),
	/** When the lock expires (timestamp in ms) */
	lockExpiresAt: v.optional(v.number()),
	/** Time remaining on the lock in milliseconds (if locked) */
	timeRemaining: v.optional(v.number()),
	/** Whether the lock has expired but not yet been cleared */
	isExpired: v.optional(v.boolean()),
});

/**
 * Lock acquisition result document.
 * Returns the locked entry along with lock details.
 */
export const lockAcquisitionResult = v.object({
	/** Whether the lock was successfully acquired */
	success: v.boolean(),
	/** The locked content entry (if successful) */
	entry: v.optional(contentEntryDoc),
	/** Error message if lock acquisition failed */
	error: v.optional(v.string()),
	/** Current lock holder if entry was already locked */
	currentLockHolder: v.optional(v.string()),
	/** When the current lock expires (if already locked) */
	currentLockExpiresAt: v.optional(v.number()),
});

// =============================================================================
// CMS Event Validators
// =============================================================================

/**
 * Event resource types in the CMS.
 */
export const eventResourceTypes = [
	"contentEntry",
	"contentType",
	"mediaAsset",
	"mediaFolder",
] as const;

export type EventResourceType = typeof eventResourceTypes[number];

/**
 * Event actions that can be performed on resources.
 */
export const eventActions = [
	"created",
	"updated",
	"published",
	"unpublished",
	"deleted",
	"restored",
	"duplicated",
	"scheduled",
] as const;

export type EventAction = typeof eventActions[number];

/**
 * Validator for event resource type.
 */
export const eventResourceTypeValidator = v.union(
	v.literal("contentEntry"),
	v.literal("contentType"),
	v.literal("mediaAsset"),
	v.literal("mediaFolder"),
);

/**
 * Validator for event action type.
 */
export const eventActionValidator = v.union(
	v.literal("created"),
	v.literal("updated"),
	v.literal("published"),
	v.literal("unpublished"),
	v.literal("deleted"),
	v.literal("restored"),
	v.literal("duplicated"),
	v.literal("scheduled"),
);

/**
 * Document validator for CMS events.
 * Derived from schema - includes _id and _creationTime automatically.
 */
export const cmsEventDoc = doc(schema, "cmsEvents");

/**
 * Validator for listing events with filtering.
 */
export const listEventsArgs = v.object({
	/** Filter by resource type */
	resourceType: v.optional(eventResourceTypeValidator),
	/** Filter by action */
	action: v.optional(eventActionValidator),
	/** Filter by processed status */
	processed: v.optional(v.boolean()),
	/** Maximum events to return */
	limit: v.optional(v.number()),
	/** Cursor for pagination */
	cursor: v.optional(v.string()),
});

/**
 * Validator for getting events for a specific resource.
 */
export const getResourceEventsArgs = v.object({
	/** The resource type */
	resourceType: eventResourceTypeValidator,
	/** The resource ID */
	resourceId: v.string(),
	/** Maximum events to return */
	limit: v.optional(v.number()),
});

/**
 * Validator for marking events as processed.
 */
export const markEventsProcessedArgs = v.object({
	/** Array of event IDs to mark as processed */
	eventIds: v.array(v.id("cmsEvents")),
});

/**
 * Validator for cleaning up old events.
 */
export const cleanupEventsArgs = v.object({
	/** Number of days to retain processed events (default: 30) */
	retentionDays: v.optional(v.number()),
});

// =============================================================================
// Audit Log Validators
// =============================================================================

/**
 * Audit resource types in the CMS.
 */
export const auditResourceTypes = [
	"contentEntry",
	"contentType",
	"mediaAsset",
	"mediaFolder",
	"settings",
] as const;

export type AuditResourceType = typeof auditResourceTypes[number];

/**
 * Audit actions that can be logged.
 */
export const auditActions = [
	"created",
	"updated",
	"published",
	"unpublished",
	"deleted",
	"restored",
	"duplicated",
	"scheduled",
	"locked",
	"unlocked",
	"rolledBack",
	"migrated",
] as const;

export type AuditAction = typeof auditActions[number];

/**
 * Validator for audit resource type.
 */
export const auditResourceTypeValidator = v.union(
	v.literal("contentEntry"),
	v.literal("contentType"),
	v.literal("mediaAsset"),
	v.literal("mediaFolder"),
	v.literal("settings"),
);

/**
 * Validator for audit action type.
 */
export const auditActionValidator = v.union(
	v.literal("created"),
	v.literal("updated"),
	v.literal("published"),
	v.literal("unpublished"),
	v.literal("deleted"),
	v.literal("restored"),
	v.literal("duplicated"),
	v.literal("scheduled"),
	v.literal("locked"),
	v.literal("unlocked"),
	v.literal("rolledBack"),
	v.literal("migrated"),
);

/**
 * Document validator for audit log entries.
 * Derived from schema - includes _id and _creationTime automatically.
 */
export const auditLogDoc = doc(schema, "auditLogs");

/**
 * Validator for querying audit logs for a resource.
 */
export const getResourceAuditLogsArgs = v.object({
	/** The resource type */
	resourceType: auditResourceTypeValidator,
	/** The resource ID */
	resourceId: v.string(),
	/** Maximum logs to return (default: 50) */
	limit: v.optional(v.number()),
});

/**
 * Validator for querying audit logs by user.
 */
export const getUserAuditLogsArgs = v.object({
	/** The user ID */
	userId: v.string(),
	/** Maximum logs to return (default: 50) */
	limit: v.optional(v.number()),
});

/**
 * Validator for listing audit logs with filtering.
 */
export const listAuditLogsArgs = v.object({
	/** Filter by resource type */
	resourceType: v.optional(auditResourceTypeValidator),
	/** Filter by action */
	action: v.optional(auditActionValidator),
	/** Filter by user ID */
	userId: v.optional(v.string()),
	/** Filter by content type name (for content entries) */
	contentTypeName: v.optional(v.string()),
	/** Filter logs created after this timestamp */
	startDate: v.optional(v.number()),
	/** Filter logs created before this timestamp */
	endDate: v.optional(v.number()),
	/** Maximum logs to return (default: 50) */
	limit: v.optional(v.number()),
	/** Cursor for pagination */
	cursor: v.optional(v.string()),
});

/**
 * Validator for getting audit log statistics.
 */
export const getAuditLogStatsArgs = v.object({
	/** Filter by resource type */
	resourceType: v.optional(auditResourceTypeValidator),
	/** Filter logs created after this timestamp */
	startDate: v.optional(v.number()),
	/** Filter logs created before this timestamp */
	endDate: v.optional(v.number()),
});

/**
 * Validator for cleaning up old audit logs.
 */
export const cleanupAuditLogsArgs = v.object({
	/** Number of days to retain audit logs (default: 365) */
	retentionDays: v.optional(v.number()),
});

/**
 * Result for listing audit logs with pagination.
 */
export const listAuditLogsResult = v.object({
	logs: v.array(auditLogDoc),
	hasMore: v.boolean(),
	nextCursor: v.optional(v.string()),
});

/**
 * Result for audit log statistics.
 */
export const auditLogStatsResult = v.object({
	totalCount: v.number(),
	actionCounts: v.any(),
	topUsers: v.array(
		v.object({
			userId: v.string(),
			count: v.number(),
		}),
	),
});

/**
 * Result for audit log diff.
 */
export const auditLogDiffResult = v.object({
	hasChanges: v.boolean(),
	changedFields: v.array(v.string()),
	fieldDiffs: v.array(
		v.object({
			field: v.string(),
			previousValue: v.optional(v.any()),
			newValue: v.optional(v.any()),
		}),
	),
});

// =============================================================================
// Mutation Authorization Context
// =============================================================================

/**
 * Validator for mutation-level authorization context.
 *
 * This enables defense-in-depth authorization: the client wrapper performs
 * authorization checks, AND mutations can validate auth when context is provided.
 *
 * When `_auth` is provided to a mutation:
 * - The mutation verifies the role has permission for the operation
 * - Operations fail with PERMISSION_DENIED if the role lacks permission
 *
 * When `_auth` is NOT provided:
 * - The mutation executes without authorization checks (backwards compatible)
 * - Security relies entirely on the client wrapper's authorization
 *
 * @example
 * ```typescript
 * // Mutation with optional auth context
 * export const createEntry = mutation({
 *   args: {
 *     ...createContentEntryArgs.fields,
 *     _auth: v.optional(mutationAuthContext),
 *   },
 *   handler: async (ctx, args) => {
 *     // Check auth if provided
 *     if (args._auth) {
 *       requireMutationAuth(args._auth, "contentEntries", "create");
 *     }
 *     // ... mutation logic
 *   },
 * });
 * ```
 */
export const mutationAuthContext = v.object({
	/** The user ID performing the operation */
	userId: v.string(),
	/** The user's resolved CMS role (e.g., "admin", "editor", "author", "viewer") */
	role: v.union(v.string(), v.null()),
	/**
	 * Optional resource owner ID for ownership-based permission checks.
	 * Required for "own" scope permissions (e.g., author editing their own content).
	 */
	resourceOwnerId: v.optional(v.string()),
});

/**
 * Type for the mutation auth context.
 */
export type MutationAuthContext = {
	userId: string;
	role: string | null;
	resourceOwnerId?: string;
};

// Export the schema for reference
export { schema };
