/**
 * Content Export/Import Functions
 *
 * Provides functions to export content entries to JSON format and import from JSON.
 * Supports selective export by type or filter, handles reference resolution, and
 * validates imports against schemas.
 *
 * ## Export Features
 * - Export all entries or filter by content type
 * - Optionally resolve references to include related content
 * - Support for status filtering (export only published, etc.)
 * - Include content type definitions for schema validation during import
 *
 * ## Import Features
 * - Validate all entries against content type schemas before import
 * - Handle reference ID mapping (old IDs to new IDs)
 * - Support for skip, update, or error on duplicate slugs
 * - Dry-run mode to validate without making changes
 *
 * @example
 * ```typescript
 * // Export all published blog posts
 * const exportData = await ctx.runQuery(api.exportImport.exportEntries, {
 *   contentTypeName: "blog_post",
 *   status: "published",
 *   includeReferences: true,
 * });
 *
 * // Import entries with conflict resolution
 * const result = await ctx.runMutation(api.exportImport.importEntries, {
 *   data: exportData,
 *   onConflict: "skip",
 *   importedBy: currentUserId,
 * });
 * ```
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";
import { Id, Doc } from "./_generated/dataModel.js";
import {
	contentStatusValidator,
	contentEntryDoc,
	contentTypeDoc,
	fieldTypeValidator,
} from "./validators.js";
import {
	validateContentData,
	ContentTypeSchema,
	FieldDefinition,
} from "./validation.js";
import { generateSlug } from "./lib/slugGenerator.js";
import { ensureUniqueSlug } from "./lib/slugUniqueness.js";

// =============================================================================
// Export Types and Validators
// =============================================================================

/**
 * Field options validator for exported content types.
 * This is a specialized version that uses string for taxonomyId instead of
 * Id<"taxonomies"> since IDs are not portable across Convex deployments
 * during export/import operations.
 */
const exportedFieldOptionsValidator = v.optional(
	v.object({
		// Text fields
		minLength: v.optional(v.number()),
		maxLength: v.optional(v.number()),
		pattern: v.optional(v.string()),

		// Number fields
		min: v.optional(v.number()),
		max: v.optional(v.number()),
		step: v.optional(v.number()),
		precision: v.optional(v.number()),

		// Reference fields
		allowedContentTypes: v.optional(v.array(v.string())),
		multiple: v.optional(v.boolean()),
		minItems: v.optional(v.number()),

		// Media fields
		allowedMimeTypes: v.optional(v.array(v.string())),
		maxFileSize: v.optional(v.number()),

		// Select fields
		options: v.optional(
			v.array(
				v.object({
					value: v.string(),
					label: v.string(),
				}),
			),
		),

		// Rich text fields
		allowedBlocks: v.optional(v.array(v.string())),
		allowedMarks: v.optional(v.array(v.string())),

		// Tag fields - taxonomyId as string for portability
		taxonomyId: v.optional(v.string()),
		allowCreate: v.optional(v.boolean()),
		maxTags: v.optional(v.number()),
		minTags: v.optional(v.number()),

		// Category fields
		allowMultiple: v.optional(v.boolean()),
	}),
);

/**
 * Field definition validator for exported content types.
 * Reuses fieldTypeValidator from schema but uses exportedFieldOptionsValidator
 * which has string taxonomyId for portability across deployments.
 */
const exportedFieldDefinitionValidator = v.object({
	name: v.string(),
	label: v.string(),
	type: fieldTypeValidator,
	required: v.boolean(),
	searchable: v.optional(v.boolean()),
	localized: v.optional(v.boolean()),
	description: v.optional(v.string()),
	defaultValue: v.optional(v.any()),
	options: exportedFieldOptionsValidator,
});

/**
 * Structure for a single exported content entry.
 * Includes all data needed to recreate the entry on import.
 */
export const exportedEntryValidator = v.object({
	/** Original entry ID (for reference mapping) */
	_originalId: v.string(),
	/** Content type name (machine-readable) */
	contentTypeName: v.string(),
	/** URL-friendly slug */
	slug: v.string(),
	/** Entry status at time of export */
	status: contentStatusValidator,
	/** Content data */
	data: v.any(),
	/** Locale code if localized */
	locale: v.optional(v.string()),
	/** Version number at time of export */
	version: v.number(),
	/** First published timestamp */
	firstPublishedAt: v.optional(v.number()),
	/** Last published timestamp */
	lastPublishedAt: v.optional(v.number()),
	/** Scheduled publish timestamp */
	scheduledPublishAt: v.optional(v.number()),
	/** User who created the entry */
	createdBy: v.optional(v.string()),
	/** Original creation timestamp */
	createdAt: v.number(),
});

export type ExportedEntry = {
	_originalId: string;
	contentTypeName: string;
	slug: string;
	status: "draft" | "published" | "archived" | "scheduled";
	data: Record<string, unknown>;
	locale?: string;
	version: number;
	firstPublishedAt?: number;
	lastPublishedAt?: number;
	scheduledPublishAt?: number;
	createdBy?: string;
	createdAt: number;
};

/**
 * Structure for an exported content type definition.
 * Allows importing schemas along with content.
 * Uses exportedFieldDefinitionValidator which has string taxonomyId
 * for portability across Convex deployments.
 */
export const exportedContentTypeValidator = v.object({
	/** Content type name (machine-readable) */
	name: v.string(),
	/** Display name */
	displayName: v.string(),
	/** Description */
	description: v.optional(v.string()),
	/** Field definitions with portable types */
	fields: v.array(exportedFieldDefinitionValidator),
	/** Icon identifier */
	icon: v.optional(v.string()),
	/** Whether this is a singleton type */
	singleton: v.optional(v.boolean()),
	/** Field to generate slugs from */
	slugField: v.optional(v.string()),
	/** Field to use for display titles */
	titleField: v.optional(v.string()),
});

export type ExportedContentType = {
	name: string;
	displayName: string;
	description?: string;
	fields: FieldDefinition[];
	icon?: string;
	singleton?: boolean;
	slugField?: string;
	titleField?: string;
};

/**
 * Complete export package structure.
 * Contains all information needed to import content into another instance.
 */
export const exportPackageValidator = v.object({
	/** Export format version for compatibility checking */
	version: v.literal("1.0"),
	/** Timestamp when export was created */
	exportedAt: v.number(),
	/** Content type definitions (optional, for schema validation) */
	contentTypes: v.optional(v.array(exportedContentTypeValidator)),
	/** Exported entries */
	entries: v.array(exportedEntryValidator),
	/** Metadata about the export */
	metadata: v.optional(
		v.object({
			/** Source system identifier */
			source: v.optional(v.string()),
			/** Export description */
			description: v.optional(v.string()),
			/** Total count of entries */
			totalEntries: v.number(),
			/** Breakdown by content type */
			entriesByType: v.optional(v.any()),
		}),
	),
});

export type ExportPackage = {
	version: "1.0";
	exportedAt: number;
	contentTypes?: ExportedContentType[];
	entries: ExportedEntry[];
	metadata?: {
		source?: string;
		description?: string;
		totalEntries: number;
		entriesByType?: Record<string, number>;
	};
};

// =============================================================================
// Import Types and Validators
// =============================================================================

/**
 * Conflict resolution strategy for imports.
 * - "skip": Skip entries with conflicting slugs
 * - "update": Update existing entries with new data
 * - "error": Fail the entire import if any conflicts exist
 */
export const conflictStrategyValidator = v.union(
	v.literal("skip"),
	v.literal("update"),
	v.literal("error"),
);

export type ConflictStrategy = "skip" | "update" | "error";

/**
 * Result for a single imported entry.
 */
export const importEntryResultValidator = v.object({
	/** Original ID from export */
	originalId: v.string(),
	/** New ID after import (if created/updated) */
	newId: v.optional(v.id("contentEntries")),
	/** Import action taken */
	action: v.union(
		v.literal("created"),
		v.literal("updated"),
		v.literal("skipped"),
		v.literal("failed"),
	),
	/** Error message if failed */
	error: v.optional(v.string()),
	/** Slug of the entry */
	slug: v.string(),
	/** Content type name */
	contentTypeName: v.string(),
});

export type ImportEntryResult = {
	originalId: string;
	newId?: Id<"contentEntries">;
	action: "created" | "updated" | "skipped" | "failed";
	error?: string;
	slug: string;
	contentTypeName: string;
};

/**
 * Complete import result.
 */
export const importResultValidator = v.object({
	/** Whether import was successful */
	success: v.boolean(),
	/** Total entries processed */
	totalProcessed: v.number(),
	/** Number of entries created */
	created: v.number(),
	/** Number of entries updated */
	updated: v.number(),
	/** Number of entries skipped */
	skipped: v.number(),
	/** Number of entries failed */
	failed: v.number(),
	/** Detailed results for each entry */
	results: v.array(importEntryResultValidator),
	/** ID mapping from old to new IDs (for reference updates) */
	idMapping: v.any(),
	/** Validation errors encountered */
	validationErrors: v.optional(v.array(v.string())),
});

export type ImportResult = {
	success: boolean;
	totalProcessed: number;
	created: number;
	updated: number;
	skipped: number;
	failed: number;
	results: ImportEntryResult[];
	idMapping: Record<string, string>;
	validationErrors?: string[];
};

// =============================================================================
// Export Function
// =============================================================================

/**
 * Arguments for the export function.
 */
const exportEntriesArgs = v.object({
	/** Filter by content type ID */
	contentTypeId: v.optional(v.id("contentTypes")),
	/** Filter by content type name (alternative to contentTypeId) */
	contentTypeName: v.optional(v.string()),
	/** Filter by status */
	status: v.optional(contentStatusValidator),
	/** Filter by multiple statuses */
	statusIn: v.optional(v.array(contentStatusValidator)),
	/** Filter by locale */
	locale: v.optional(v.string()),
	/** Include content type definitions in export */
	includeContentTypes: v.optional(v.boolean()),
	/** Include soft-deleted entries */
	includeDeleted: v.optional(v.boolean()),
	/** Maximum number of entries to export (default: 1000) */
	limit: v.optional(v.number()),
	/** Export description for metadata */
	description: v.optional(v.string()),
	/** Source identifier for metadata */
	source: v.optional(v.string()),
});

/**
 * Export content entries to a JSON-serializable package.
 *
 * This query retrieves content entries matching the specified filters and
 * packages them into a format suitable for import into another system.
 *
 * ## Features
 * - Filter by content type, status, or locale
 * - Optionally include content type definitions for schema validation
 * - Preserves original IDs for reference mapping during import
 * - Includes metadata about the export for traceability
 *
 * @param contentTypeId - Filter by content type ID
 * @param contentTypeName - Filter by content type name (alternative to ID)
 * @param status - Filter by single status
 * @param statusIn - Filter by multiple statuses
 * @param locale - Filter by locale code
 * @param includeContentTypes - Include content type definitions (default: true)
 * @param includeDeleted - Include soft-deleted entries (default: false)
 * @param limit - Maximum entries to export (default: 1000)
 * @param description - Description for export metadata
 * @param source - Source identifier for export metadata
 *
 * @returns ExportPackage containing entries and optional content types
 *
 * @example
 * ```typescript
 * // Export all published blog posts
 * const exportData = await ctx.runQuery(api.exportImport.exportEntries, {
 *   contentTypeName: "blog_post",
 *   status: "published",
 *   includeContentTypes: true,
 * });
 *
 * // Export all entries of all types
 * const allData = await ctx.runQuery(api.exportImport.exportEntries, {
 *   limit: 5000,
 *   description: "Full site backup",
 * });
 * ```
 */
export const exportEntries = query({
	args: exportEntriesArgs.fields,
	returns: exportPackageValidator,
	handler: async (ctx, args) => {
		const {
			contentTypeId,
			contentTypeName,
			status,
			statusIn,
			locale,
			includeContentTypes = true,
			includeDeleted = false,
			limit = 1000,
			description,
			source,
		} = args;

		// Resolve status filter
		const resolvedStatuses = statusIn?.length
			? statusIn
			: status
			? [status]
			: undefined;

		// Resolve content type ID from name if needed
		let resolvedContentTypeId = contentTypeId;
		if (!resolvedContentTypeId && contentTypeName) {
			const contentType = await ctx.db
				.query("contentTypes")
				.withIndex("by_name", (q) => q.eq("name", contentTypeName))
				.first();
			if (contentType) {
				resolvedContentTypeId = contentType._id;
			}
		}

		// Build query for entries
		let entriesQuery;
		if (resolvedContentTypeId) {
			entriesQuery = ctx.db
				.query("contentEntries")
				.withIndex("by_content_type", (q) =>
					q.eq("contentTypeId", resolvedContentTypeId),
				);
		} else {
			entriesQuery = ctx.db.query("contentEntries");
		}

		// Fetch entries (we'll filter in memory for complex conditions)
		const allEntries = await entriesQuery.take(limit * 2);

		// Apply filters
		let filteredEntries = allEntries;

		// Filter by deleted status
		if (!includeDeleted) {
			filteredEntries = filteredEntries.filter(
				(e) => e.deletedAt === undefined,
			);
		}

		// Filter by status
		if (resolvedStatuses && resolvedStatuses.length > 0) {
			filteredEntries = filteredEntries.filter((e) =>
				resolvedStatuses.includes(e.status),
			);
		}

		// Filter by locale
		if (locale) {
			filteredEntries = filteredEntries.filter((e) => e.locale === locale);
		}

		// Limit results
		filteredEntries = filteredEntries.slice(0, limit);

		// Get unique content type IDs from entries
		const contentTypeIdsSet = new Set<Id<"contentTypes">>();
		for (const entry of filteredEntries) {
			contentTypeIdsSet.add(entry.contentTypeId);
		}
		const contentTypeIds = Array.from(contentTypeIdsSet);

		// Fetch content types
		const contentTypesMap = new Map<string, Doc<"contentTypes">>();
		for (const typeId of contentTypeIds) {
			const contentType = await ctx.db.get(typeId);
			if (contentType) {
				contentTypesMap.set(typeId as string, contentType);
			}
		}

		// Build exported entries
		const exportedEntries: ExportedEntry[] = filteredEntries.map((entry) => {
			const contentType = contentTypesMap.get(entry.contentTypeId as string);
			return {
				_originalId: entry._id as string,
				contentTypeName: contentType?.name ?? "unknown",
				slug: entry.slug,
				status: entry.status,
				data: entry.data as Record<string, unknown>,
				locale: entry.locale,
				version: entry.version,
				firstPublishedAt: entry.firstPublishedAt,
				lastPublishedAt: entry.lastPublishedAt,
				scheduledPublishAt: entry.scheduledPublishAt,
				createdBy: entry.createdBy,
				createdAt: entry._creationTime,
			};
		});

		// Build exported content types if requested
		let exportedContentTypes: ExportedContentType[] | undefined;
		if (includeContentTypes) {
			exportedContentTypes = Array.from(contentTypesMap.values())
				.filter((ct) => !ct.deletedAt)
				.map((ct) => ({
					name: ct.name,
					displayName: ct.displayName,
					description: ct.description,
					fields: ct.fields as FieldDefinition[],
					icon: ct.icon,
					singleton: ct.singleton,
					slugField: ct.slugField,
					titleField: ct.titleField,
				}));
		}

		// Build entries by type count
		const entriesByType: Record<string, number> = {};
		for (const entry of exportedEntries) {
			entriesByType[entry.contentTypeName] =
				(entriesByType[entry.contentTypeName] ?? 0) + 1;
		}

		return {
			version: "1.0" as const,
			exportedAt: Date.now(),
			contentTypes: exportedContentTypes,
			entries: exportedEntries,
			metadata: {
				source,
				description,
				totalEntries: exportedEntries.length,
				entriesByType,
			},
		};
	},
});

// =============================================================================
// Import Function
// =============================================================================

/**
 * Arguments for the import function.
 */
const importEntriesArgs = v.object({
	/** The export package to import */
	data: exportPackageValidator,
	/** How to handle conflicting slugs */
	onConflict: v.optional(conflictStrategyValidator),
	/** Whether to preserve original status or set all to draft */
	preserveStatus: v.optional(v.boolean()),
	/** Whether to run validation only without making changes */
	dryRun: v.optional(v.boolean()),
	/** User ID for audit trail */
	importedBy: v.optional(v.string()),
	/** Filter which content types to import (by name) */
	contentTypeFilter: v.optional(v.array(v.string())),
});

/**
 * Import content entries from an export package.
 *
 * This mutation validates and imports content entries from an export package.
 * It supports conflict resolution, dry-run mode, and reference ID mapping.
 *
 * ## Features
 * - Validates all entries against content type schemas before import
 * - Maps old reference IDs to new IDs for reference fields
 * - Supports skip, update, or error on slug conflicts
 * - Dry-run mode validates without making changes
 * - Preserves or resets entry status
 *
 * ## Import Process
 * 1. Validate all entries against existing content type schemas
 * 2. Check for slug conflicts based on onConflict strategy
 * 3. Create or update entries, collecting ID mappings
 * 4. Update reference fields with new IDs (second pass)
 *
 * @param data - The export package to import
 * @param onConflict - How to handle slug conflicts (default: "skip")
 * @param preserveStatus - Keep original status or set to draft (default: false)
 * @param dryRun - Validate only without making changes (default: false)
 * @param importedBy - User ID for audit trail
 * @param contentTypeFilter - Only import entries of these content types
 *
 * @returns ImportResult with details of the import operation
 *
 * @example
 * ```typescript
 * // Dry run to validate import
 * const validation = await ctx.runMutation(api.exportImport.importEntries, {
 *   data: exportPackage,
 *   dryRun: true,
 * });
 *
 * // Import with skip on conflicts
 * const result = await ctx.runMutation(api.exportImport.importEntries, {
 *   data: exportPackage,
 *   onConflict: "skip",
 *   preserveStatus: true,
 *   importedBy: currentUserId,
 * });
 * ```
 */
export const importEntries = mutation({
	args: importEntriesArgs.fields,
	returns: importResultValidator,
	handler: async (ctx, args) => {
		const {
			data,
			onConflict = "skip",
			preserveStatus = false,
			dryRun = false,
			importedBy,
			contentTypeFilter,
		} = args;

		const results: ImportEntryResult[] = [];
		const idMapping: Record<string, string> = {};
		const validationErrors: string[] = [];

		let created = 0;
		let updated = 0;
		let skipped = 0;
		let failed = 0;

		// Filter entries by content type if specified
		let entriesToImport = data.entries;
		if (contentTypeFilter && contentTypeFilter.length > 0) {
			entriesToImport = entriesToImport.filter((e) =>
				contentTypeFilter.includes(e.contentTypeName),
			);
		}

		// Build a map of content type name to content type document
		const contentTypeMap = new Map<string, Doc<"contentTypes">>();
		const contentTypeNamesSet = new Set<string>();
		for (const entry of entriesToImport) {
			contentTypeNamesSet.add(entry.contentTypeName);
		}
		const contentTypeNames = Array.from(contentTypeNamesSet);

		for (const typeName of contentTypeNames) {
			const contentType = await ctx.db
				.query("contentTypes")
				.withIndex("by_name", (q) => q.eq("name", typeName))
				.first();

			if (contentType && !contentType.deletedAt && contentType.isActive) {
				contentTypeMap.set(typeName, contentType);
			} else {
				validationErrors.push(
					`Content type "${typeName}" not found or not active`,
				);
			}
		}

		// Validate all entries first
		for (const entry of entriesToImport) {
			const contentType = contentTypeMap.get(entry.contentTypeName);
			if (!contentType) {
				results.push({
					originalId: entry._originalId,
					action: "failed",
					error: `Content type "${entry.contentTypeName}" not found`,
					slug: entry.slug,
					contentTypeName: entry.contentTypeName,
				});
				failed++;
				continue;
			}

			// Build schema for validation
			const schema: ContentTypeSchema = {
				name: contentType.name,
				displayName: contentType.displayName,
				description: contentType.description,
				fields: contentType.fields as FieldDefinition[],
				titleField: contentType.titleField,
				slugField: contentType.slugField,
				singleton: contentType.singleton,
			};

			// Validate content data
			const validationResult = validateContentData(
				entry.data as Record<string, unknown>,
				schema,
			);
			if (!validationResult.valid) {
				const errorMessages = validationResult.errors
					.map((e) => `${e.field}: ${e.message}`)
					.join("; ");
				validationErrors.push(
					`Entry "${entry.slug}" (${entry.contentTypeName}): ${errorMessages}`,
				);
				results.push({
					originalId: entry._originalId,
					action: "failed",
					error: `Validation failed: ${errorMessages}`,
					slug: entry.slug,
					contentTypeName: entry.contentTypeName,
				});
				failed++;
				continue;
			}

			// Check for existing entry with same slug
			const existingEntry = await ctx.db
				.query("contentEntries")
				.withIndex("by_content_type_and_slug", (q) =>
					q.eq("contentTypeId", contentType._id).eq("slug", entry.slug),
				)
				.filter((q) => q.eq(q.field("deletedAt"), undefined))
				.first();

			if (existingEntry) {
				// Handle conflict based on strategy
				switch (onConflict) {
					case "error":
						validationErrors.push(
							`Slug conflict: "${entry.slug}" already exists for type "${entry.contentTypeName}"`,
						);
						results.push({
							originalId: entry._originalId,
							action: "failed",
							error: `Slug "${entry.slug}" already exists`,
							slug: entry.slug,
							contentTypeName: entry.contentTypeName,
						});
						failed++;
						continue;

					case "skip":
						results.push({
							originalId: entry._originalId,
							newId: existingEntry._id,
							action: "skipped",
							slug: entry.slug,
							contentTypeName: entry.contentTypeName,
						});
						idMapping[entry._originalId] = existingEntry._id as string;
						skipped++;
						continue;

					case "update":
						if (!dryRun) {
							// Update existing entry
							const status = preserveStatus
								? entry.status
								: existingEntry.status;
							await ctx.db.patch(existingEntry._id, {
								data: entry.data,
								status,
								version: existingEntry.version + 1,
								updatedBy: importedBy,
							});
						}
						results.push({
							originalId: entry._originalId,
							newId: existingEntry._id,
							action: "updated",
							slug: entry.slug,
							contentTypeName: entry.contentTypeName,
						});
						idMapping[entry._originalId] = existingEntry._id as string;
						updated++;
						continue;
				}
			}

			// Create new entry
			if (!dryRun) {
				// Generate search text from searchable fields
				let searchText = "";
				for (const field of contentType.fields) {
					const fieldData = entry.data as Record<string, unknown>;
					if (field.searchable && fieldData[field.name]) {
						const value = fieldData[field.name];
						if (typeof value === "string") {
							searchText += ` ${value}`;
						}
					}
				}

				// Ensure unique slug
				const queryFn = async (candidateSlug: string) => {
					return await ctx.db
						.query("contentEntries")
						.withIndex("by_content_type_and_slug", (q) =>
							q.eq("contentTypeId", contentType._id).eq("slug", candidateSlug),
						)
						.filter((q) => q.eq(q.field("deletedAt"), undefined))
						.first();
				};

				const uniqueSlug = await ensureUniqueSlug(entry.slug, queryFn);

				const newEntryId = await ctx.db.insert("contentEntries", {
					contentTypeId: contentType._id,
					slug: uniqueSlug,
					status: preserveStatus ? entry.status : "draft",
					data: entry.data,
					locale: entry.locale,
					version: 1,
					createdBy: importedBy ?? entry.createdBy,
					updatedBy: importedBy ?? entry.createdBy,
					searchText: searchText.trim() || undefined,
					// Only preserve publication timestamps if preserving status
					firstPublishedAt: preserveStatus ? entry.firstPublishedAt : undefined,
					lastPublishedAt: preserveStatus ? entry.lastPublishedAt : undefined,
					scheduledPublishAt: preserveStatus
						? entry.scheduledPublishAt
						: undefined,
				});

				results.push({
					originalId: entry._originalId,
					newId: newEntryId,
					action: "created",
					slug: uniqueSlug,
					contentTypeName: entry.contentTypeName,
				});
				idMapping[entry._originalId] = newEntryId as string;
				created++;
			} else {
				// Dry run - simulate creation
				results.push({
					originalId: entry._originalId,
					action: "created",
					slug: entry.slug,
					contentTypeName: entry.contentTypeName,
				});
				created++;
			}
		}

		// Second pass: Update reference fields with new IDs
		if (!dryRun && Object.keys(idMapping).length > 0) {
			for (const result of results) {
				if (
					(result.action === "created" || result.action === "updated") &&
					result.newId
				) {
					const entry = await ctx.db.get(result.newId);
					if (!entry) continue;

					const contentType = contentTypeMap.get(result.contentTypeName);
					if (!contentType) continue;

					const entryData = entry.data as Record<string, unknown>;
					let dataChanged = false;
					const updatedData = { ...entryData };

					// Find reference fields and update IDs
					for (const field of contentType.fields) {
						if (field.type === "reference") {
							const value = entryData[field.name];
							if (field.options?.multiple && Array.isArray(value)) {
								const newRefs = value.map(
									(refId: string) => idMapping[refId] ?? refId,
								);
								if (JSON.stringify(newRefs) !== JSON.stringify(value)) {
									updatedData[field.name] = newRefs;
									dataChanged = true;
								}
							} else if (typeof value === "string" && idMapping[value]) {
								updatedData[field.name] = idMapping[value];
								dataChanged = true;
							}
						}
					}

					if (dataChanged) {
						await ctx.db.patch(result.newId, {
							data: updatedData,
						});
					}
				}
			}
		}

		const success =
			failed === 0 &&
			validationErrors.filter((e) => !e.includes("Slug conflict")).length === 0;

		return {
			success,
			totalProcessed: entriesToImport.length,
			created,
			updated,
			skipped,
			failed,
			results,
			idMapping,
			validationErrors:
				validationErrors.length > 0 ? validationErrors : undefined,
		};
	},
});

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get a summary of content that would be exported without actually exporting.
 *
 * This is useful for previewing what an export would contain before
 * running the full export operation.
 */
export const getExportPreview = query({
	args: {
		contentTypeId: v.optional(v.id("contentTypes")),
		contentTypeName: v.optional(v.string()),
		status: v.optional(contentStatusValidator),
		statusIn: v.optional(v.array(contentStatusValidator)),
		locale: v.optional(v.string()),
		includeDeleted: v.optional(v.boolean()),
	},
	returns: v.object({
		totalEntries: v.number(),
		entriesByType: v.any(),
		entriesByStatus: v.any(),
		contentTypes: v.array(v.string()),
	}),
	handler: async (ctx, args) => {
		const {
			contentTypeId,
			contentTypeName,
			status,
			statusIn,
			locale,
			includeDeleted = false,
		} = args;

		// Resolve status filter
		const resolvedStatuses = statusIn?.length
			? statusIn
			: status
			? [status]
			: undefined;

		// Resolve content type ID
		let resolvedContentTypeId = contentTypeId;
		if (!resolvedContentTypeId && contentTypeName) {
			const contentType = await ctx.db
				.query("contentTypes")
				.withIndex("by_name", (q) => q.eq("name", contentTypeName))
				.first();
			if (contentType) {
				resolvedContentTypeId = contentType._id;
			}
		}

		// Build query
		let entriesQuery;
		if (resolvedContentTypeId) {
			entriesQuery = ctx.db
				.query("contentEntries")
				.withIndex("by_content_type", (q) =>
					q.eq("contentTypeId", resolvedContentTypeId),
				);
		} else {
			entriesQuery = ctx.db.query("contentEntries");
		}

		// Fetch all matching entries
		const allEntries = await entriesQuery.collect();

		// Apply filters
		let filteredEntries = allEntries;

		if (!includeDeleted) {
			filteredEntries = filteredEntries.filter(
				(e) => e.deletedAt === undefined,
			);
		}

		if (resolvedStatuses && resolvedStatuses.length > 0) {
			filteredEntries = filteredEntries.filter((e) =>
				resolvedStatuses.includes(e.status),
			);
		}

		if (locale) {
			filteredEntries = filteredEntries.filter((e) => e.locale === locale);
		}

		// Get content types
		const contentTypeIdsSet = new Set<Id<"contentTypes">>();
		for (const entry of filteredEntries) {
			contentTypeIdsSet.add(entry.contentTypeId);
		}
		const contentTypeIds = Array.from(contentTypeIdsSet);
		const contentTypeNames: string[] = [];
		const contentTypeNameMap = new Map<string, string>();

		for (const typeId of contentTypeIds) {
			const contentType = await ctx.db.get(typeId);
			if (contentType) {
				contentTypeNames.push(contentType.name);
				contentTypeNameMap.set(typeId as string, contentType.name);
			}
		}

		// Count by type
		const entriesByType: Record<string, number> = {};
		for (const entry of filteredEntries) {
			const typeName =
				contentTypeNameMap.get(entry.contentTypeId as string) ?? "unknown";
			entriesByType[typeName] = (entriesByType[typeName] ?? 0) + 1;
		}

		// Count by status
		const entriesByStatus: Record<string, number> = {};
		for (const entry of filteredEntries) {
			entriesByStatus[entry.status] = (entriesByStatus[entry.status] ?? 0) + 1;
		}

		return {
			totalEntries: filteredEntries.length,
			entriesByType,
			entriesByStatus,
			contentTypes: contentTypeNames,
		};
	},
});

/**
 * Validate an export package without importing.
 *
 * Checks that all entries can be validated against existing content type
 * schemas and reports any issues that would occur during import.
 */
export const validateImportPackage = query({
	args: {
		data: exportPackageValidator,
		contentTypeFilter: v.optional(v.array(v.string())),
	},
	returns: v.object({
		valid: v.boolean(),
		totalEntries: v.number(),
		validEntries: v.number(),
		invalidEntries: v.number(),
		missingContentTypes: v.array(v.string()),
		validationErrors: v.array(
			v.object({
				slug: v.string(),
				contentTypeName: v.string(),
				errors: v.array(v.string()),
			}),
		),
	}),
	handler: async (ctx, args) => {
		const { data, contentTypeFilter } = args;

		const missingContentTypes: string[] = [];
		const validationErrors: Array<{
			slug: string;
			contentTypeName: string;
			errors: string[];
		}> = [];

		// Filter entries
		let entriesToValidate = data.entries;
		if (contentTypeFilter && contentTypeFilter.length > 0) {
			entriesToValidate = entriesToValidate.filter((e) =>
				contentTypeFilter.includes(e.contentTypeName),
			);
		}

		// Build content type map
		const contentTypeMap = new Map<string, Doc<"contentTypes">>();
		const contentTypeNamesSet = new Set<string>();
		for (const entry of entriesToValidate) {
			contentTypeNamesSet.add(entry.contentTypeName);
		}
		const contentTypeNames = Array.from(contentTypeNamesSet);

		for (const typeName of contentTypeNames) {
			const contentType = await ctx.db
				.query("contentTypes")
				.withIndex("by_name", (q) => q.eq("name", typeName))
				.first();

			if (contentType && !contentType.deletedAt && contentType.isActive) {
				contentTypeMap.set(typeName, contentType);
			} else {
				missingContentTypes.push(typeName);
			}
		}

		let validEntries = 0;
		let invalidEntries = 0;

		// Validate each entry
		for (const entry of entriesToValidate) {
			const contentType = contentTypeMap.get(entry.contentTypeName);
			if (!contentType) {
				invalidEntries++;
				validationErrors.push({
					slug: entry.slug,
					contentTypeName: entry.contentTypeName,
					errors: [`Content type "${entry.contentTypeName}" not found`],
				});
				continue;
			}

			// Build schema
			const schema: ContentTypeSchema = {
				name: contentType.name,
				displayName: contentType.displayName,
				description: contentType.description,
				fields: contentType.fields as FieldDefinition[],
				titleField: contentType.titleField,
				slugField: contentType.slugField,
				singleton: contentType.singleton,
			};

			// Validate
			const result = validateContentData(
				entry.data as Record<string, unknown>,
				schema,
			);

			if (result.valid) {
				validEntries++;
			} else {
				invalidEntries++;
				validationErrors.push({
					slug: entry.slug,
					contentTypeName: entry.contentTypeName,
					errors: result.errors.map((e) => `${e.field}: ${e.message}`),
				});
			}
		}

		return {
			valid: invalidEntries === 0 && missingContentTypes.length === 0,
			totalEntries: entriesToValidate.length,
			validEntries,
			invalidEntries,
			missingContentTypes,
			validationErrors,
		};
	},
});
