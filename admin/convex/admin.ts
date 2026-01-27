import { defineAdminAPI } from "../../src/client/admin";
import { components } from "./_generated/api";

const adminApi = defineAdminAPI(components.cms);

// =============================================================================
// Dashboard
// =============================================================================

export const getDashboardStats = adminApi.getDashboardStats;

// =============================================================================
// Content Types
// =============================================================================

export const listContentTypes = adminApi.listContentTypes;
export const getContentType = adminApi.getContentType;
export const createContentType = adminApi.createContentType;
export const updateContentType = adminApi.updateContentType;
export const deleteContentType = adminApi.deleteContentType;

// =============================================================================
// Content Entries
// =============================================================================

export const listEntries = adminApi.listEntries;
export const getEntry = adminApi.getEntry;
export const createEntry = adminApi.createEntry;
export const updateEntry = adminApi.updateEntry;
export const publishEntry = adminApi.publishEntry;
export const unpublishEntry = adminApi.unpublishEntry;
export const deleteEntry = adminApi.deleteEntry;
export const duplicateEntry = adminApi.duplicateEntry;
export const scheduleEntry = adminApi.scheduleEntry;
export const cancelScheduledEntry = adminApi.cancelScheduledEntry;
export const getScheduledEntries = adminApi.getScheduledEntries;
export const restoreEntry = adminApi.restoreEntry;
export const getEntryBySlug = adminApi.getEntryBySlug;
export const getEntryBySlugAndTypeName = adminApi.getEntryBySlugAndTypeName;

// =============================================================================
// Bulk Operations
// =============================================================================

export const bulkPublish = adminApi.bulkPublish;
export const bulkUnpublish = adminApi.bulkUnpublish;
export const bulkDelete = adminApi.bulkDelete;
export const bulkUpdate = adminApi.bulkUpdate;
export const bulkRestore = adminApi.bulkRestore;

// =============================================================================
// Trash
// =============================================================================

export const getTrashConfig = adminApi.getTrashConfig;
export const listTrash = adminApi.listTrash;
export const getTrashStats = adminApi.getTrashStats;
export const updateTrashConfig = adminApi.updateTrashConfig;
export const emptyTrash = adminApi.emptyTrash;
export const runTrashCleanup = adminApi.runTrashCleanup;

// =============================================================================
// Content Lock
// =============================================================================

export const checkContentLock = adminApi.checkContentLock;
export const listLockedContent = adminApi.listLockedContent;
export const acquireContentLock = adminApi.acquireContentLock;
export const releaseContentLock = adminApi.releaseContentLock;
export const renewContentLock = adminApi.renewContentLock;
export const forceReleaseContentLock = adminApi.forceReleaseContentLock;

// =============================================================================
// Versions
// =============================================================================

export const getVersionHistory = adminApi.getVersionHistory;
export const getVersion = adminApi.getVersion;
export const compareVersions = adminApi.compareVersions;
export const rollbackVersion = adminApi.rollbackVersion;

// =============================================================================
// Media Assets
// =============================================================================

export const listMediaAssets = adminApi.listMediaAssets;
export const getMediaAsset = adminApi.getMediaAsset;
export const createMediaAsset = adminApi.createMediaAsset;
export const updateMediaAsset = adminApi.updateMediaAsset;
export const deleteMediaAsset = adminApi.deleteMediaAsset;
export const restoreMediaAsset = adminApi.restoreMediaAsset;
export const permanentDeleteMediaAsset = adminApi.permanentDeleteMediaAsset;
export const bulkPermanentDeleteMediaAssets =
	adminApi.bulkPermanentDeleteMediaAssets;
export const moveMediaAssets = adminApi.moveMediaAssets;
export const getMediaTrashCount = adminApi.getMediaTrashCount;

// =============================================================================
// Media Folders
// =============================================================================

export const listMediaFolders = adminApi.listMediaFolders;
export const getMediaFolder = adminApi.getMediaFolder;
export const getMediaFolderTree = adminApi.getMediaFolderTree;
export const createMediaFolder = adminApi.createMediaFolder;
export const updateMediaFolder = adminApi.updateMediaFolder;
export const moveMediaFolder = adminApi.moveMediaFolder;
export const deleteMediaFolder = adminApi.deleteMediaFolder;
export const restoreMediaFolder = adminApi.restoreMediaFolder;

// =============================================================================
// Media Variants
// =============================================================================

export const listMediaVariants = adminApi.listMediaVariants;
export const getMediaVariant = adminApi.getMediaVariant;
export const getBestMediaVariant = adminApi.getBestMediaVariant;
export const getMediaResponsiveSrcset = adminApi.getMediaResponsiveSrcset;
export const getMediaVariantPresets = adminApi.getMediaVariantPresets;
export const getMediaAssetWithVariants = adminApi.getMediaAssetWithVariants;
export const createMediaVariant = adminApi.createMediaVariant;
export const requestMediaVariantGeneration =
	adminApi.requestMediaVariantGeneration;
export const deleteMediaVariant = adminApi.deleteMediaVariant;
export const deleteMediaAssetVariants = adminApi.deleteMediaAssetVariants;
export const generateMediaVariantsFromPresets =
	adminApi.generateMediaVariantsFromPresets;
export const restoreMediaVariant = adminApi.restoreMediaVariant;

// =============================================================================
// Upload
// =============================================================================

export const generateUploadUrl = adminApi.generateUploadUrl;

// =============================================================================
// Taxonomies
// =============================================================================

export const getTaxonomy = adminApi.getTaxonomy;
export const listTaxonomies = adminApi.listTaxonomies;
export const createTaxonomy = adminApi.createTaxonomy;
export const updateTaxonomy = adminApi.updateTaxonomy;
export const deleteTaxonomy = adminApi.deleteTaxonomy;
export const restoreTaxonomy = adminApi.restoreTaxonomy;

// =============================================================================
// Terms
// =============================================================================

export const getTerm = adminApi.getTerm;
export const listTerms = adminApi.listTerms;
export const getTermsHierarchy = adminApi.getTermsHierarchy;
export const suggestTerms = adminApi.suggestTerms;
export const countTerms = adminApi.countTerms;
export const createTerm = adminApi.createTerm;
export const updateTerm = adminApi.updateTerm;
export const deleteTerm = adminApi.deleteTerm;
export const restoreTerm = adminApi.restoreTerm;

// =============================================================================
// Entry-Term Relations
// =============================================================================

export const getTermsByEntry = adminApi.getTermsByEntry;
export const getEntriesByTerm = adminApi.getEntriesByTerm;
export const setEntryTerms = adminApi.setEntryTerms;
export const addTermToEntry = adminApi.addTermToEntry;
export const removeTermFromEntry = adminApi.removeTermFromEntry;
export const createTermAndAddToEntry = adminApi.createTermAndAddToEntry;

// =============================================================================
// Media-Term Relations
// =============================================================================

export const getTermsByMedia = adminApi.getTermsByMedia;
export const getMediaByTerm = adminApi.getMediaByTerm;
export const setMediaTerms = adminApi.setMediaTerms;
export const addTermToMedia = adminApi.addTermToMedia;
export const removeTermFromMedia = adminApi.removeTermFromMedia;
export const createTermAndAddToMedia = adminApi.createTermAndAddToMedia;

// =============================================================================
// Settings
// =============================================================================

export const getSettings = adminApi.getSettings;
export const updateSettings = adminApi.updateSettings;
export const resetSettings = adminApi.resetSettings;
