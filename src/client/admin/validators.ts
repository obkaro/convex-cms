/**
 * Admin API Validators
 *
 * Derives admin validators from component validators.
 * Admin validators use v.string() for IDs instead of v.id() since IDs become
 * plain strings when crossing the component boundary.
 */

import { Infer, v } from "convex/values";
import { omit } from "convex-helpers";
import {
  baseFieldDefinition,
  textFieldDefinitionValidator,
  numberFieldDefinitionValidator,
  booleanFieldDefinitionValidator,
  richTextFieldDefinitionValidator,
  mediaFieldDefinitionValidator,
  selectFieldDefinitionValidator,
  multiSelectFieldDefinitionValidator,
  categoryFieldDefinitionValidator,
  jsonFieldDefinitionValidator,
  dateFieldDefinitionValidator,
  datetimeFieldDefinitionValidator,
  referenceFieldDefinitionValidator,
  contentStatusValidator,
  mediaTypeValidator,
  variantTypeValidator,
  variantStatusValidator,
  mediaAssetItemValidator,
  mediaFolderItemValidator,
} from "../../component/schema.js";
import {
  contentTypeDoc,
  contentEntryDoc,
  contentVersionDoc,
  taxonomyDoc,
  taxonomyTermDoc,
  trashConfigDoc,
  versionFieldDiff,
  variantPresetValidator,
} from "../../component/validators.js";
import { deleteContentTypeResult } from "../../component/contentTypeMutations.js";
import { deleteResultDoc as deleteContentEntryResult } from "../../component/contentEntryMutations.js";
import { deleteMediaAssetResult } from "../../component/mediaAssetMutations.js";

// =============================================================================
// Re-export schema validators
// =============================================================================

export {
  contentStatusValidator,
  mediaTypeValidator,
  variantTypeValidator,
  variantStatusValidator,
};

// =============================================================================
// Pagination Validators
// =============================================================================

export const paginationOptsValidator = v.object({
  numItems: v.number(),
  cursor: v.union(v.string(), v.null()),
});

export const adminPaginationResult = <T extends Parameters<typeof v.array>[0]>(
  itemValidator: T
) =>
  v.object({
    page: v.array(itemValidator),
    continueCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  });

// =============================================================================
// Field Definition Validators (Admin version with string taxonomyId)
// =============================================================================

export const adminTagsFieldDefinitionValidator = v.object({
  ...baseFieldDefinition,
  type: v.literal("tags"),
  options: v.optional(
    v.object({
      taxonomyId: v.optional(v.string()),
      allowCreate: v.optional(v.boolean()),
      maxTags: v.optional(v.number()),
      minTags: v.optional(v.number()),
    })
  ),
});

export const adminFieldDefinitionValidator = v.union(
  textFieldDefinitionValidator,
  numberFieldDefinitionValidator,
  booleanFieldDefinitionValidator,
  richTextFieldDefinitionValidator,
  mediaFieldDefinitionValidator,
  selectFieldDefinitionValidator,
  multiSelectFieldDefinitionValidator,
  adminTagsFieldDefinitionValidator,
  categoryFieldDefinitionValidator,
  jsonFieldDefinitionValidator,
  dateFieldDefinitionValidator,
  datetimeFieldDefinitionValidator,
  referenceFieldDefinitionValidator
);

// =============================================================================
// Content Type Validators (Admin versions with string IDs)
// =============================================================================

export const adminContentTypeDoc = v.object({
  ...omit(contentTypeDoc.fields, ["_id", "fields"]),
  _id: v.string(),
  fields: v.array(adminFieldDefinitionValidator),
});

export const adminContentTypeWithCountDoc = v.object({
  ...omit(contentTypeDoc.fields, ["_id", "fields"]),
  _id: v.string(),
  fields: v.array(adminFieldDefinitionValidator),
  entryCount: v.optional(v.number()),
});

export const adminDeleteContentTypeResult = v.object({
  ...omit(deleteContentTypeResult.fields, ["deletedId"]),
  deletedId: v.string(),
});

// =============================================================================
// Content Entry Validators (Admin versions with string IDs)
// =============================================================================

export const adminContentEntryDoc = v.object({
  ...omit(contentEntryDoc.fields, ["_id", "contentTypeId", "primaryEntryId"]),
  _id: v.string(),
  contentTypeId: v.string(),
  primaryEntryId: v.optional(v.string()),
});

export const adminDeleteContentEntryResult = v.object({
  ...omit(deleteContentEntryResult.fields, [
    "_id",
    "contentTypeId",
    "primaryEntryId",
  ]),
  _id: v.string(),
  contentTypeId: v.string(),
  primaryEntryId: v.optional(v.string()),
});

// =============================================================================
// Content Version Validators (Admin versions with string IDs)
// =============================================================================

export const adminContentVersionDoc = v.object({
  ...omit(contentVersionDoc.fields, ["_id", "entryId"]),
  _id: v.string(),
  entryId: v.string(),
});

export const adminVersionFieldDiff = versionFieldDiff;

export const adminCompareVersionsResult = v.object({
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
// Media Item Validators (Admin versions with string IDs)
// =============================================================================

export const adminOptimizationHintsDoc = v.object({
  isResizable: v.boolean(),
  aspectRatio: v.optional(v.number()),
  hasTransparency: v.optional(v.boolean()),
  isVector: v.optional(v.boolean()),
  suggestedMaxWidth: v.optional(v.number()),
  durationSeconds: v.optional(v.number()),
});

export const adminMediaAssetDoc = v.object({
  ...omit(mediaAssetItemValidator.fields, ["parentId", "storageId"]),
  _id: v.string(),
  _creationTime: v.number(),
  parentId: v.optional(v.string()),
  storageId: v.string(),
});

export const adminMediaAssetWithUrlDoc = v.object({
  ...omit(mediaAssetItemValidator.fields, ["parentId", "storageId"]),
  _id: v.string(),
  _creationTime: v.number(),
  parentId: v.optional(v.string()),
  storageId: v.string(),
  url: v.union(v.string(), v.null()),
  optimizationHints: adminOptimizationHintsDoc,
});

export const adminMediaFolderDoc = v.object({
  ...omit(mediaFolderItemValidator.fields, ["parentId"]),
  _id: v.string(),
  _creationTime: v.number(),
  parentId: v.optional(v.string()),
});

export const adminMediaItemDoc = v.union(adminMediaAssetDoc, adminMediaFolderDoc);

export const adminMediaItemWithUrlDoc = v.union(adminMediaAssetWithUrlDoc, adminMediaFolderDoc);

export const adminDeleteMediaAssetResult = v.object({
  ...omit(deleteMediaAssetResult.fields, ["_id", "parentId", "storageId"]),
  _id: v.string(),
  parentId: v.optional(v.string()),
  storageId: v.string(),
});

export const adminMoveMediaAssetItemResult = v.object({
  id: v.string(),
  success: v.boolean(),
  error: v.optional(v.string()),
  previousFolderId: v.optional(v.string()),
});

export const adminMoveMediaAssetsResult = v.object({
  total: v.number(),
  succeeded: v.number(),
  failed: v.number(),
  targetFolderId: v.optional(v.string()),
  targetFolderPath: v.optional(v.string()),
  results: v.array(adminMoveMediaAssetItemResult),
});

// =============================================================================
// Media Variant Validators (Admin versions with string IDs)
// =============================================================================

export const adminMediaVariantDoc = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  assetId: v.string(),
  storageId: v.string(),
  variantType: variantTypeValidator,
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  format: v.string(),
  mimeType: v.string(),
  size: v.number(),
  quality: v.optional(v.number()),
  preset: v.optional(v.string()),
  autoGenerated: v.boolean(),
  status: variantStatusValidator,
  errorMessage: v.optional(v.string()),
  processingStartedAt: v.optional(v.number()),
  processingCompletedAt: v.optional(v.number()),
  deletedAt: v.optional(v.number()),
  createdBy: v.optional(v.string()),
});

export const adminMediaVariantWithUrlDoc = v.object({
  ...adminMediaVariantDoc.fields,
  url: v.union(v.string(), v.null()),
});

export const adminVariantPresetValidator = variantPresetValidator;

export const adminGenerateVariantsResult = v.object({
  total: v.number(),
  succeeded: v.number(),
  failed: v.number(),
  results: v.array(
    v.object({
      preset: v.string(),
      success: v.boolean(),
      variantId: v.optional(v.string()),
      error: v.optional(v.string()),
    })
  ),
});

export const adminResponsiveSrcsetResult = v.object({
  src: v.union(v.string(), v.null()),
  srcset: v.string(),
  entries: v.array(
    v.object({
      url: v.string(),
      descriptor: v.string(),
      width: v.number(),
      format: v.string(),
    })
  ),
  sizes: v.optional(v.string()),
});

export const adminAssetWithVariantsResult = v.object({
  asset: adminMediaAssetDoc,
  variants: v.array(adminMediaVariantWithUrlDoc),
  originalUrl: v.union(v.string(), v.null()),
});

// =============================================================================
// Taxonomy Validators (Admin versions with string IDs)
// =============================================================================

export const adminTaxonomyDoc = v.object({
  ...omit(taxonomyDoc.fields, ["_id"]),
  _id: v.string(),
});

export const adminTaxonomyTermDoc = v.object({
  ...omit(taxonomyTermDoc.fields, ["_id", "taxonomyId", "parentId"]),
  _id: v.string(),
  taxonomyId: v.string(),
  parentId: v.optional(v.string()),
});

export const adminTermHierarchyNode = v.object({
  _id: v.string(),
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  color: v.optional(v.string()),
  icon: v.optional(v.string()),
  sortOrder: v.optional(v.number()),
  usageCount: v.number(),
  depth: v.number(),
  children: v.array(v.any()),
});

// =============================================================================
// Trash Validators (Admin versions with string IDs)
// =============================================================================

export const adminTrashConfigDoc = v.object({
  ...omit(trashConfigDoc.fields, ["_id"]),
  _id: v.optional(v.string()),
});

export const adminTrashItemDoc = v.object({
  ...adminContentEntryDoc.fields,
  deletedDaysAgo: v.number(),
  expiresAt: v.optional(v.number()),
  contentTypeName: v.optional(v.string()),
});

export const adminTrashStatsDoc = v.object({
  totalItems: v.number(),
  byContentType: v.array(
    v.object({
      contentTypeId: v.string(),
      contentTypeName: v.string(),
      count: v.number(),
    })
  ),
  expiringWithin7Days: v.number(),
  oldestItemDaysAgo: v.optional(v.number()),
});

export const adminEmptyTrashResult = v.object({
  deletedCount: v.number(),
  deletedVersionsCount: v.number(),
  errors: v.array(
    v.object({
      id: v.string(),
      error: v.string(),
    })
  ),
});

// =============================================================================
// Content Lock Validators (Admin versions with string IDs)
// =============================================================================

export const adminLockStatusDoc = v.object({
  isLocked: v.boolean(),
  lockedBy: v.optional(v.string()),
  lockExpiresAt: v.optional(v.number()),
  timeRemaining: v.optional(v.number()),
  isExpired: v.optional(v.boolean()),
});

export const adminLockAcquisitionResult = v.object({
  success: v.boolean(),
  entry: v.optional(adminContentEntryDoc),
  error: v.optional(v.string()),
  currentLockHolder: v.optional(v.string()),
  currentLockExpiresAt: v.optional(v.number()),
});

export const adminLockedEntryDoc = v.object({
  ...adminContentEntryDoc.fields,
  contentTypeName: v.optional(v.string()),
});

// =============================================================================
// Bulk Operation Validators (Admin versions with string IDs)
// =============================================================================

export const adminBulkOperationItemResult = v.object({
  id: v.string(),
  success: v.boolean(),
  error: v.optional(v.string()),
});

export const adminBulkOperationResult = v.object({
  total: v.number(),
  succeeded: v.number(),
  failed: v.number(),
  results: v.array(adminBulkOperationItemResult),
});

// =============================================================================
// Dashboard Stats Validators
// =============================================================================

export const adminDashboardStatsDoc = v.object({
  contentTypes: v.number(),
  contentEntries: v.number(),
  mediaAssets: v.number(),
  published: v.number(),
});

// =============================================================================
// Settings Validators
// =============================================================================

export const adminSettingsDoc = v.object({
  _id: v.union(v.string(), v.null()),
  _creationTime: v.optional(v.number()),
  defaultLocale: v.string(),
  availableLocales: v.array(v.string()),
  features: v.object({
    versioning: v.boolean(),
    scheduling: v.boolean(),
    localization: v.boolean(),
    mediaManagement: v.boolean(),
  }),
  updatedBy: v.optional(v.string()),
});

// =============================================================================
// Inferred Types
// =============================================================================

export type AdminContentType = Infer<typeof adminContentTypeDoc>;
export type AdminContentTypeWithCount = Infer<typeof adminContentTypeWithCountDoc>;
export type AdminContentEntry = Infer<typeof adminContentEntryDoc>;
export type AdminContentVersion = Infer<typeof adminContentVersionDoc>;
export type AdminMediaItem = Infer<typeof adminMediaItemDoc>;
export type AdminMediaItemWithUrl = Infer<typeof adminMediaItemWithUrlDoc>;
export type AdminMediaAsset = Infer<typeof adminMediaAssetDoc>;
export type AdminMediaAssetWithUrl = Infer<typeof adminMediaAssetWithUrlDoc>;
export type AdminMediaFolder = Infer<typeof adminMediaFolderDoc>;
export type AdminOptimizationHints = Infer<typeof adminOptimizationHintsDoc>;
export type AdminMediaVariant = Infer<typeof adminMediaVariantDoc>;
export type AdminMediaVariantWithUrl = Infer<typeof adminMediaVariantWithUrlDoc>;
export type AdminTaxonomy = Infer<typeof adminTaxonomyDoc>;
export type AdminTaxonomyTerm = Infer<typeof adminTaxonomyTermDoc>;
export type AdminTrashConfig = Infer<typeof adminTrashConfigDoc>;
export type AdminTrashItem = Infer<typeof adminTrashItemDoc>;
export type AdminTrashStats = Infer<typeof adminTrashStatsDoc>;
export type AdminLockStatus = Infer<typeof adminLockStatusDoc>;
export type AdminLockAcquisitionResult = Infer<typeof adminLockAcquisitionResult>;
export type AdminBulkOperationResult = Infer<typeof adminBulkOperationResult>;
export type AdminDashboardStats = Infer<typeof adminDashboardStatsDoc>;
export type AdminSettings = Infer<typeof adminSettingsDoc>;
export type AdminDeleteContentTypeResult = Infer<typeof adminDeleteContentTypeResult>;
export type AdminDeleteContentEntryResult = Infer<typeof adminDeleteContentEntryResult>;
export type AdminDeleteMediaAssetResult = Infer<typeof adminDeleteMediaAssetResult>;
export type AdminMoveMediaAssetsResult = Infer<typeof adminMoveMediaAssetsResult>;
export type AdminEmptyTrashResult = Infer<typeof adminEmptyTrashResult>;
export type AdminCompareVersionsResult = Infer<typeof adminCompareVersionsResult>;
export type AdminGenerateVariantsResult = Infer<typeof adminGenerateVariantsResult>;
export type AdminResponsiveSrcsetResult = Infer<typeof adminResponsiveSrcsetResult>;
