/**
 * Admin API for CMS Admin UI
 *
 * Uses the unified config pattern - all CMS settings are defined
 * once in cms.config.ts and shared with the client API.
 *
 * Usage:
 * 1. Run your Convex dev server: `npx convex dev`
 * 2. Launch the admin UI: `npx convex-cms admin`
 * 3. Or embed in your app: `<CmsAdmin convexUrl={...} />`
 */

import { defineAdminAPI } from "convex-cms";
import { components } from "./_generated/api";
import cmsConfig from "./cms.config";

const admin = defineAdminAPI(components.convexCms, cmsConfig);

// =============================================================================
// Dashboard
// =============================================================================

export const getDashboardStats = admin.getDashboardStats;

// =============================================================================
// Content Types
// =============================================================================

export const listContentTypes = admin.listContentTypes;
export const getContentType = admin.getContentType;
export const createContentType = admin.createContentType;
export const updateContentType = admin.updateContentType;
export const deleteContentType = admin.deleteContentType;

// =============================================================================
// Content Entries
// =============================================================================

export const listEntries = admin.listEntries;
export const getEntry = admin.getEntry;
export const createEntry = admin.createEntry;
export const updateEntry = admin.updateEntry;
export const publishEntry = admin.publishEntry;
export const unpublishEntry = admin.unpublishEntry;
export const deleteEntry = admin.deleteEntry;
export const duplicateEntry = admin.duplicateEntry;
export const scheduleEntry = admin.scheduleEntry;
export const cancelScheduledEntry = admin.cancelScheduledEntry;
export const getScheduledEntries = admin.getScheduledEntries;
export const restoreEntry = admin.restoreEntry;
export const getEntryBySlug = admin.getEntryBySlug;
export const getEntryBySlugAndTypeName = admin.getEntryBySlugAndTypeName;

// =============================================================================
// Bulk Operations
// =============================================================================

export const bulkPublish = admin.bulkPublish;
export const bulkUnpublish = admin.bulkUnpublish;
export const bulkDelete = admin.bulkDelete;
export const bulkUpdate = admin.bulkUpdate;
export const bulkRestore = admin.bulkRestore;

// =============================================================================
// Trash
// =============================================================================

export const getTrashConfig = admin.getTrashConfig;
export const listTrash = admin.listTrash;
export const getTrashStats = admin.getTrashStats;
export const updateTrashConfig = admin.updateTrashConfig;
export const emptyTrash = admin.emptyTrash;
export const runTrashCleanup = admin.runTrashCleanup;

// =============================================================================
// Content Lock
// =============================================================================

export const checkContentLock = admin.checkContentLock;
export const listLockedContent = admin.listLockedContent;
export const acquireContentLock = admin.acquireContentLock;
export const releaseContentLock = admin.releaseContentLock;
export const renewContentLock = admin.renewContentLock;
export const forceReleaseContentLock = admin.forceReleaseContentLock;

// =============================================================================
// Versions
// =============================================================================

export const getVersionHistory = admin.getVersionHistory;
export const getVersion = admin.getVersion;
export const compareVersions = admin.compareVersions;
export const rollbackVersion = admin.rollbackVersion;

// =============================================================================
// Media Assets
// =============================================================================

export const listMediaAssets = admin.listMediaAssets;
export const getMediaAsset = admin.getMediaAsset;
export const createMediaAsset = admin.createMediaAsset;
export const updateMediaAsset = admin.updateMediaAsset;
export const deleteMediaAsset = admin.deleteMediaAsset;
export const restoreMediaAsset = admin.restoreMediaAsset;
export const permanentDeleteMediaAsset = admin.permanentDeleteMediaAsset;
export const bulkPermanentDeleteMediaAssets =
	admin.bulkPermanentDeleteMediaAssets;
export const moveMediaAssets = admin.moveMediaAssets;
export const getMediaTrashCount = admin.getMediaTrashCount;

// =============================================================================
// Media Folders
// =============================================================================

export const listMediaFolders = admin.listMediaFolders;
export const getMediaFolder = admin.getMediaFolder;
export const getMediaFolderTree = admin.getMediaFolderTree;
export const createMediaFolder = admin.createMediaFolder;
export const updateMediaFolder = admin.updateMediaFolder;
export const moveMediaFolder = admin.moveMediaFolder;
export const deleteMediaFolder = admin.deleteMediaFolder;
export const restoreMediaFolder = admin.restoreMediaFolder;

// =============================================================================
// Media Variants
// =============================================================================

export const listMediaVariants = admin.listMediaVariants;
export const getMediaVariant = admin.getMediaVariant;
export const getBestMediaVariant = admin.getBestMediaVariant;
export const getMediaResponsiveSrcset = admin.getMediaResponsiveSrcset;
export const getMediaVariantPresets = admin.getMediaVariantPresets;
export const getMediaAssetWithVariants = admin.getMediaAssetWithVariants;
export const createMediaVariant = admin.createMediaVariant;
export const requestMediaVariantGeneration =
	admin.requestMediaVariantGeneration;
export const deleteMediaVariant = admin.deleteMediaVariant;
export const deleteMediaAssetVariants = admin.deleteMediaAssetVariants;
export const generateMediaVariantsFromPresets =
	admin.generateMediaVariantsFromPresets;
export const restoreMediaVariant = admin.restoreMediaVariant;

// =============================================================================
// Upload
// =============================================================================

export const generateUploadUrl = admin.generateUploadUrl;

// =============================================================================
// Taxonomies
// =============================================================================

export const getTaxonomy = admin.getTaxonomy;
export const listTaxonomies = admin.listTaxonomies;
export const createTaxonomy = admin.createTaxonomy;
export const updateTaxonomy = admin.updateTaxonomy;
export const deleteTaxonomy = admin.deleteTaxonomy;
export const restoreTaxonomy = admin.restoreTaxonomy;

// =============================================================================
// Terms
// =============================================================================

export const getTerm = admin.getTerm;
export const listTerms = admin.listTerms;
export const getTermsHierarchy = admin.getTermsHierarchy;
export const suggestTerms = admin.suggestTerms;
export const countTerms = admin.countTerms;
export const createTerm = admin.createTerm;
export const updateTerm = admin.updateTerm;
export const deleteTerm = admin.deleteTerm;
export const restoreTerm = admin.restoreTerm;

// =============================================================================
// Entry-Term Relations
// =============================================================================

export const getTermsByEntry = admin.getTermsByEntry;
export const getEntriesByTerm = admin.getEntriesByTerm;
export const setEntryTerms = admin.setEntryTerms;
export const addTermToEntry = admin.addTermToEntry;
export const removeTermFromEntry = admin.removeTermFromEntry;
export const createTermAndAddToEntry = admin.createTermAndAddToEntry;

// =============================================================================
// Media-Term Relations
// =============================================================================

export const getTermsByMedia = admin.getTermsByMedia;
export const getMediaByTerm = admin.getMediaByTerm;
export const setMediaTerms = admin.setMediaTerms;
export const addTermToMedia = admin.addTermToMedia;
export const removeTermFromMedia = admin.removeTermFromMedia;
export const createTermAndAddToMedia = admin.createTermAndAddToMedia;

// =============================================================================
// Settings
// =============================================================================

export const getSettings = admin.getSettings;
export const updateSettings = admin.updateSettings;
export const resetSettings = admin.resetSettings;
