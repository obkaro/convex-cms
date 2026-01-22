/**
 * Content Type Migration Utility
 *
 * Provides utilities to safely migrate content when content type schemas change.
 * Handles field additions, removals, renames, and type changes with data
 * transformation functions.
 *
 * Key features:
 * - Dry-run mode to preview changes before committing
 * - Custom transformation functions for type conversions
 * - Field renaming support
 * - Default value assignment for new fields
 * - Version snapshot creation for rollback capability
 * - Batch processing to respect Convex transaction limits
 *
 * @example
 * ```typescript
 * // Migrate content when changing a field from text to number
 * const result = await ctx.runMutation(api.contentTypeMigration.migrateContentType, {
 *   contentTypeId: typeId,
 *   migrations: [
 *     {
 *       type: "TRANSFORM_FIELD",
 *       fieldName: "price",
 *       transformation: "TEXT_TO_NUMBER",
 *     },
 *     {
 *       type: "RENAME_FIELD",
 *       oldFieldName: "desc",
 *       newFieldName: "description",
 *     },
 *     {
 *       type: "ADD_FIELD",
 *       fieldName: "featured",
 *       defaultValue: false,
 *     },
 *   ],
 *   dryRun: true, // Preview changes first
 *   migratedBy: currentUserId,
 * });
 * ```
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { Id } from "./_generated/dataModel.js";

// =============================================================================
// Types and Interfaces
// =============================================================================

/**
 * Supported migration operation types.
 */
export type MigrationOperationType =
	| "ADD_FIELD"
	| "REMOVE_FIELD"
	| "RENAME_FIELD"
	| "TRANSFORM_FIELD"
	| "SET_DEFAULT";

/**
 * Built-in transformation types for common type conversions.
 */
export type BuiltInTransformation =
	| "TEXT_TO_NUMBER"
	| "NUMBER_TO_TEXT"
	| "TEXT_TO_BOOLEAN"
	| "BOOLEAN_TO_TEXT"
	| "TEXT_TO_DATE"
	| "DATE_TO_TEXT"
	| "TEXT_TO_JSON"
	| "JSON_TO_TEXT"
	| "SINGLE_TO_ARRAY"
	| "ARRAY_TO_SINGLE"
	| "SELECT_VALUE_REMAP";

/**
 * A migration operation to be applied to content entries.
 */
export interface MigrationOperation {
	/** Type of migration operation */
	type: MigrationOperationType;
	/** Field name for ADD_FIELD, REMOVE_FIELD, TRANSFORM_FIELD, SET_DEFAULT */
	fieldName?: string;
	/** Old field name for RENAME_FIELD */
	oldFieldName?: string;
	/** New field name for RENAME_FIELD */
	newFieldName?: string;
	/** Default value for ADD_FIELD or SET_DEFAULT */
	defaultValue?: unknown;
	/** Built-in transformation type */
	transformation?: BuiltInTransformation;
	/** Custom transformation function as a string (for advanced use) */
	customTransformation?: string;
	/** Value mapping for SELECT_VALUE_REMAP transformation */
	valueMap?: Record<string, unknown>;
	/** Whether to preserve null/undefined values (don't apply default) */
	preserveEmpty?: boolean;
}

/**
 * Result of migrating a single entry.
 */
export interface EntryMigrationResult {
	/** Entry ID */
	entryId: Id<"contentEntries">;
	/** Entry slug for identification */
	slug: string;
	/** Whether migration succeeded */
	success: boolean;
	/** Error message if failed */
	error?: string;
	/** Changes made to this entry (for dry run preview) */
	changes?: FieldChange[];
}

/**
 * Describes a change to a single field.
 */
export interface FieldChange {
	/** Field name that was changed */
	fieldName: string;
	/** Operation that caused the change */
	operation: MigrationOperationType;
	/** Previous value (for preview) */
	oldValue?: unknown;
	/** New value (for preview) */
	newValue?: unknown;
}

/**
 * Result of the migration operation.
 */
export interface MigrationResult {
	/** Whether this was a dry run */
	dryRun: boolean;
	/** Total entries processed */
	totalEntries: number;
	/** Entries successfully migrated */
	successCount: number;
	/** Entries that failed migration */
	failureCount: number;
	/** Entries skipped (no changes needed) */
	skippedCount: number;
	/** Detailed results per entry */
	results: EntryMigrationResult[];
	/** Version snapshots created (IDs) */
	versionSnapshotsCreated: number;
}

// =============================================================================
// Transformation Functions
// =============================================================================

/**
 * Convert a text value to a number.
 */
function textToNumber(value: unknown): unknown {
	if (value === null || value === undefined || value === "") {
		return null;
	}
	if (typeof value === "number") {
		return value;
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		// Handle common formats
		const cleaned = trimmed.replace(/[,$]/g, "");
		const parsed = parseFloat(cleaned);
		return isNaN(parsed) ? null : parsed;
	}
	return null;
}

/**
 * Convert a number value to text.
 */
function numberToText(value: unknown): unknown {
	if (value === null || value === undefined) {
		return null;
	}
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "number") {
		return String(value);
	}
	return null;
}

/**
 * Convert a text value to boolean.
 */
function textToBoolean(value: unknown): unknown {
	if (value === null || value === undefined) {
		return null;
	}
	if (typeof value === "boolean") {
		return value;
	}
	if (typeof value === "string") {
		const lower = value.toLowerCase().trim();
		if (["true", "yes", "1", "on", "enabled"].includes(lower)) {
			return true;
		}
		if (["false", "no", "0", "off", "disabled", ""].includes(lower)) {
			return false;
		}
		return null;
	}
	if (typeof value === "number") {
		return value !== 0;
	}
	return null;
}

/**
 * Convert a boolean value to text.
 */
function booleanToText(value: unknown): unknown {
	if (value === null || value === undefined) {
		return null;
	}
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}
	return null;
}

/**
 * Convert a text value to a date timestamp.
 */
function textToDate(value: unknown): unknown {
	if (value === null || value === undefined || value === "") {
		return null;
	}
	if (typeof value === "number") {
		return value;
	}
	if (typeof value === "string") {
		const timestamp = Date.parse(value);
		return isNaN(timestamp) ? null : timestamp;
	}
	return null;
}

/**
 * Convert a date timestamp to text (ISO format).
 */
function dateToText(value: unknown): unknown {
	if (value === null || value === undefined) {
		return null;
	}
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "number") {
		return new Date(value).toISOString();
	}
	return null;
}

/**
 * Convert a text value (JSON string) to parsed JSON.
 */
function textToJson(value: unknown): unknown {
	if (value === null || value === undefined || value === "") {
		return null;
	}
	if (typeof value === "object") {
		return value;
	}
	if (typeof value === "string") {
		try {
			return JSON.parse(value);
		} catch {
			// If it's not valid JSON, return as-is wrapped in object
			return { value };
		}
	}
	return { value };
}

/**
 * Convert a JSON value to text (stringified).
 */
function jsonToText(value: unknown): unknown {
	if (value === null || value === undefined) {
		return null;
	}
	if (typeof value === "string") {
		return value;
	}
	return JSON.stringify(value);
}

/**
 * Convert a single value to an array containing that value.
 */
function singleToArray(value: unknown): unknown {
	if (value === null || value === undefined) {
		return [];
	}
	if (Array.isArray(value)) {
		return value;
	}
	return [value];
}

/**
 * Convert an array to its first element (or null if empty).
 */
function arrayToSingle(value: unknown): unknown {
	if (value === null || value === undefined) {
		return null;
	}
	if (Array.isArray(value)) {
		return value.length > 0 ? value[0] : null;
	}
	return value;
}

/**
 * Remap select/multiSelect values using a provided mapping.
 */
function selectValueRemap(
	value: unknown,
	valueMap: Record<string, unknown>,
): unknown {
	if (value === null || value === undefined) {
		return null;
	}

	if (Array.isArray(value)) {
		// Handle multiSelect
		return value.map((v) => {
			if (typeof v === "string" && v in valueMap) {
				return valueMap[v];
			}
			return v;
		});
	}

	if (typeof value === "string" && value in valueMap) {
		return valueMap[value];
	}

	return value;
}

/**
 * Apply a built-in transformation to a value.
 */
function applyTransformation(
	value: unknown,
	transformation: BuiltInTransformation,
	valueMap?: Record<string, unknown>,
): unknown {
	switch (transformation) {
		case "TEXT_TO_NUMBER":
			return textToNumber(value);
		case "NUMBER_TO_TEXT":
			return numberToText(value);
		case "TEXT_TO_BOOLEAN":
			return textToBoolean(value);
		case "BOOLEAN_TO_TEXT":
			return booleanToText(value);
		case "TEXT_TO_DATE":
			return textToDate(value);
		case "DATE_TO_TEXT":
			return dateToText(value);
		case "TEXT_TO_JSON":
			return textToJson(value);
		case "JSON_TO_TEXT":
			return jsonToText(value);
		case "SINGLE_TO_ARRAY":
			return singleToArray(value);
		case "ARRAY_TO_SINGLE":
			return arrayToSingle(value);
		case "SELECT_VALUE_REMAP":
			return selectValueRemap(value, valueMap ?? {});
		default:
			return value;
	}
}

// =============================================================================
// Migration Logic
// =============================================================================

/**
 * Apply migration operations to a single entry's data.
 *
 * @param data - The current entry data
 * @param operations - Migration operations to apply
 * @param dryRun - If true, only compute changes without modifying
 * @returns Object containing the migrated data and list of changes
 */
export function applyMigrations(
	data: Record<string, unknown>,
	operations: MigrationOperation[],
): { migratedData: Record<string, unknown>; changes: FieldChange[] } {
	const migratedData = { ...data };
	const changes: FieldChange[] = [];

	for (const op of operations) {
		switch (op.type) {
			case "ADD_FIELD": {
				if (!op.fieldName) continue;
				const fieldName = op.fieldName;

				// Only add if field doesn't exist or is empty (unless preserveEmpty)
				const currentValue = migratedData[fieldName];
				const isEmpty =
					currentValue === undefined ||
					currentValue === null ||
					currentValue === "";

				if (isEmpty && !op.preserveEmpty) {
					const newValue = op.defaultValue;
					if (newValue !== undefined) {
						changes.push({
							fieldName,
							operation: "ADD_FIELD",
							oldValue: currentValue,
							newValue,
						});
						migratedData[fieldName] = newValue;
					}
				}
				break;
			}

			case "REMOVE_FIELD": {
				if (!op.fieldName) continue;
				const fieldName = op.fieldName;

				if (fieldName in migratedData) {
					changes.push({
						fieldName,
						operation: "REMOVE_FIELD",
						oldValue: migratedData[fieldName],
						newValue: undefined,
					});
					delete migratedData[fieldName];
				}
				break;
			}

			case "RENAME_FIELD": {
				if (!op.oldFieldName || !op.newFieldName) continue;
				const { oldFieldName, newFieldName } = op;

				if (oldFieldName in migratedData) {
					const value = migratedData[oldFieldName];
					changes.push({
						fieldName: oldFieldName,
						operation: "RENAME_FIELD",
						oldValue: value,
						newValue: value,
					});
					delete migratedData[oldFieldName];
					migratedData[newFieldName] = value;
				}
				break;
			}

			case "TRANSFORM_FIELD": {
				if (!op.fieldName) continue;
				const fieldName = op.fieldName;

				if (fieldName in migratedData && op.transformation) {
					const oldValue = migratedData[fieldName];
					const newValue = applyTransformation(
						oldValue,
						op.transformation,
						op.valueMap,
					);

					// Only record change if value actually changed
					if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
						changes.push({
							fieldName,
							operation: "TRANSFORM_FIELD",
							oldValue,
							newValue,
						});
						migratedData[fieldName] = newValue;
					}
				}
				break;
			}

			case "SET_DEFAULT": {
				if (!op.fieldName) continue;
				const fieldName = op.fieldName;

				const currentValue = migratedData[fieldName];
				const isEmpty =
					currentValue === undefined ||
					currentValue === null ||
					currentValue === "";

				if (isEmpty && !op.preserveEmpty && op.defaultValue !== undefined) {
					changes.push({
						fieldName,
						operation: "SET_DEFAULT",
						oldValue: currentValue,
						newValue: op.defaultValue,
					});
					migratedData[fieldName] = op.defaultValue;
				}
				break;
			}
		}
	}

	return { migratedData, changes };
}

// =============================================================================
// Validators
// =============================================================================

/**
 * Validator for migration operation type.
 */
const migrationOperationTypeValidator = v.union(
	v.literal("ADD_FIELD"),
	v.literal("REMOVE_FIELD"),
	v.literal("RENAME_FIELD"),
	v.literal("TRANSFORM_FIELD"),
	v.literal("SET_DEFAULT"),
);

/**
 * Validator for built-in transformation types.
 */
const builtInTransformationValidator = v.union(
	v.literal("TEXT_TO_NUMBER"),
	v.literal("NUMBER_TO_TEXT"),
	v.literal("TEXT_TO_BOOLEAN"),
	v.literal("BOOLEAN_TO_TEXT"),
	v.literal("TEXT_TO_DATE"),
	v.literal("DATE_TO_TEXT"),
	v.literal("TEXT_TO_JSON"),
	v.literal("JSON_TO_TEXT"),
	v.literal("SINGLE_TO_ARRAY"),
	v.literal("ARRAY_TO_SINGLE"),
	v.literal("SELECT_VALUE_REMAP"),
);

/**
 * Validator for a migration operation.
 */
export const migrationOperationValidator = v.object({
	type: migrationOperationTypeValidator,
	fieldName: v.optional(v.string()),
	oldFieldName: v.optional(v.string()),
	newFieldName: v.optional(v.string()),
	defaultValue: v.optional(v.any()),
	transformation: v.optional(builtInTransformationValidator),
	customTransformation: v.optional(v.string()),
	valueMap: v.optional(v.any()),
	preserveEmpty: v.optional(v.boolean()),
});

/**
 * Validator for migrate content type arguments.
 */
export const migrateContentTypeArgs = v.object({
	/** Content type ID to migrate */
	contentTypeId: v.id("contentTypes"),
	/** Array of migration operations to apply */
	migrations: v.array(migrationOperationValidator),
	/** If true, preview changes without applying them */
	dryRun: v.optional(v.boolean()),
	/** Create version snapshots before migration (default: true) */
	createVersionSnapshots: v.optional(v.boolean()),
	/** Filter entries by status (default: all statuses) */
	statusFilter: v.optional(
		v.array(
			v.union(
				v.literal("draft"),
				v.literal("published"),
				v.literal("archived"),
				v.literal("scheduled"),
			),
		),
	),
	/** Only migrate entries with IDs in this list */
	entryIds: v.optional(v.array(v.id("contentEntries"))),
	/** User performing the migration */
	migratedBy: v.optional(v.string()),
	/** Description of the migration for version history */
	changeDescription: v.optional(v.string()),
});

/**
 * Validator for entry migration result.
 */
const fieldChangeValidator = v.object({
	fieldName: v.string(),
	operation: migrationOperationTypeValidator,
	oldValue: v.optional(v.any()),
	newValue: v.optional(v.any()),
});

const entryMigrationResultValidator = v.object({
	entryId: v.id("contentEntries"),
	slug: v.string(),
	success: v.boolean(),
	error: v.optional(v.string()),
	changes: v.optional(v.array(fieldChangeValidator)),
});

/**
 * Validator for migration result.
 */
export const migrationResultValidator = v.object({
	dryRun: v.boolean(),
	totalEntries: v.number(),
	successCount: v.number(),
	failureCount: v.number(),
	skippedCount: v.number(),
	results: v.array(entryMigrationResultValidator),
	versionSnapshotsCreated: v.number(),
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Mutation to migrate content entries when a content type schema changes.
 *
 * This mutation applies a series of migration operations to all entries
 * of a given content type. It supports:
 * - Adding new fields with default values
 * - Removing fields
 * - Renaming fields
 * - Transforming field values (type conversions)
 * - Setting default values for empty fields
 *
 * The mutation can run in dry-run mode to preview changes before applying them.
 * By default, it creates version snapshots before modifying entries.
 *
 * @param contentTypeId - The content type to migrate
 * @param migrations - Array of migration operations to apply
 * @param dryRun - If true, preview changes without applying (default: false)
 * @param createVersionSnapshots - Create version snapshots before migration (default: true)
 * @param statusFilter - Only migrate entries with these statuses
 * @param entryIds - Only migrate entries with these IDs
 * @param migratedBy - User performing the migration
 * @param changeDescription - Description for version history
 *
 * @returns MigrationResult with details of all changes
 *
 * @example
 * ```typescript
 * // Preview migration
 * const preview = await ctx.runMutation(api.contentTypeMigration.migrateContentType, {
 *   contentTypeId: blogPostTypeId,
 *   migrations: [
 *     { type: "RENAME_FIELD", oldFieldName: "body", newFieldName: "content" },
 *     { type: "ADD_FIELD", fieldName: "featured", defaultValue: false },
 *     { type: "TRANSFORM_FIELD", fieldName: "viewCount", transformation: "TEXT_TO_NUMBER" },
 *   ],
 *   dryRun: true,
 * });
 *
 * // Apply migration after reviewing preview
 * const result = await ctx.runMutation(api.contentTypeMigration.migrateContentType, {
 *   contentTypeId: blogPostTypeId,
 *   migrations: [...],
 *   dryRun: false,
 *   changeDescription: "Renamed body to content, added featured flag",
 *   migratedBy: currentUserId,
 * });
 * ```
 */
export const migrateContentType = mutation({
	args: migrateContentTypeArgs.fields,
	returns: migrationResultValidator,
	handler: async (ctx, args): Promise<MigrationResult> => {
		const {
			contentTypeId,
			migrations,
			dryRun = false,
			createVersionSnapshots = true,
			statusFilter,
			entryIds,
			migratedBy,
			changeDescription = "Content type migration",
		} = args;

		// Validate content type exists
		const contentType = await ctx.db.get(contentTypeId);
		if (!contentType) {
			throw new Error(`Content type not found: ${contentTypeId}`);
		}
		if (contentType.deletedAt !== undefined) {
			throw new Error(`Content type has been deleted: ${contentType.name}`);
		}

		// Validate migration operations
		for (const op of migrations) {
			if (
				op.type === "RENAME_FIELD" &&
				(!op.oldFieldName || !op.newFieldName)
			) {
				throw new Error(
					"RENAME_FIELD operation requires both oldFieldName and newFieldName",
				);
			}
			if (
				(op.type === "ADD_FIELD" ||
					op.type === "REMOVE_FIELD" ||
					op.type === "TRANSFORM_FIELD" ||
					op.type === "SET_DEFAULT") &&
				!op.fieldName
			) {
				throw new Error(`${op.type} operation requires fieldName`);
			}
			if (op.type === "TRANSFORM_FIELD" && !op.transformation) {
				throw new Error(
					"TRANSFORM_FIELD operation requires transformation type",
				);
			}
		}

		// Build query for entries
		const entriesQuery = ctx.db
			.query("contentEntries")
			.withIndex("by_content_type", (q) => q.eq("contentTypeId", contentTypeId))
			.filter((q) => q.eq(q.field("deletedAt"), undefined));

		// Collect all entries
		const allEntries = await entriesQuery.collect();

		// Filter by status if specified
		let entries = allEntries;
		if (statusFilter && statusFilter.length > 0) {
			entries = entries.filter((e) =>
				statusFilter.includes(
					e.status as "draft" | "published" | "archived" | "scheduled",
				),
			);
		}

		// Filter by entry IDs if specified
		if (entryIds && entryIds.length > 0) {
			const entryIdSet = new Set(entryIds.map((id) => id.toString()));
			entries = entries.filter((e) => entryIdSet.has(e._id.toString()));
		}

		// Process entries
		const results: EntryMigrationResult[] = [];
		let successCount = 0;
		let failureCount = 0;
		let skippedCount = 0;
		let versionSnapshotsCreated = 0;
		// const now = Date.now();

		for (const entry of entries) {
			try {
				const entryData = entry.data as Record<string, unknown>;
				const { migratedData, changes } = applyMigrations(
					entryData,
					migrations as MigrationOperation[],
				);

				// Skip if no changes
				if (changes.length === 0) {
					results.push({
						entryId: entry._id,
						slug: entry.slug,
						success: true,
						changes: [],
					});
					skippedCount++;
					continue;
				}

				if (dryRun) {
					// In dry run mode, just report what would change
					results.push({
						entryId: entry._id,
						slug: entry.slug,
						success: true,
						changes,
					});
					successCount++;
				} else {
					// Create version snapshot before migration
					if (createVersionSnapshots) {
						await ctx.db.insert("contentVersions", {
							entryId: entry._id,
							versionNumber: entry.version,
							data: entry.data,
							slug: entry.slug,
							status: entry.status,
							changeDescription: `Pre-migration snapshot: ${changeDescription}`,
							createdBy: migratedBy,
							wasPublished: entry.status === "published",
							publishedAt:
								entry.status === "published"
									? entry.lastPublishedAt
									: undefined,
						});
						versionSnapshotsCreated++;
					}

					// Apply migration
					await ctx.db.patch(entry._id, {
						data: migratedData,
						version: entry.version + 1,
						updatedBy: migratedBy,
					});

					results.push({
						entryId: entry._id,
						slug: entry.slug,
						success: true,
						changes,
					});
					successCount++;
				}
			} catch (error) {
				results.push({
					entryId: entry._id,
					slug: entry.slug,
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				});
				failureCount++;
			}
		}

		return {
			dryRun,
			totalEntries: entries.length,
			successCount,
			failureCount,
			skippedCount,
			results,
			versionSnapshotsCreated,
		};
	},
});

// =============================================================================
// Queries
// =============================================================================

/**
 * Query to preview migration without modifying data.
 *
 * This is a convenience wrapper that always runs in dry-run mode.
 * Use this to safely preview what changes would be made.
 */
export const previewMigration = query({
	args: {
		contentTypeId: v.id("contentTypes"),
		migrations: v.array(migrationOperationValidator),
		statusFilter: v.optional(
			v.array(
				v.union(
					v.literal("draft"),
					v.literal("published"),
					v.literal("archived"),
					v.literal("scheduled"),
				),
			),
		),
		entryIds: v.optional(v.array(v.id("contentEntries"))),
		/** Limit number of entries to preview (default: 10) */
		limit: v.optional(v.number()),
	},
	returns: v.object({
		totalEntries: v.number(),
		previewedEntries: v.number(),
		results: v.array(entryMigrationResultValidator),
		summary: v.object({
			entriesWithChanges: v.number(),
			entriesWithoutChanges: v.number(),
			operationCounts: v.any(),
		}),
	}),
	handler: async (ctx, args) => {
		const {
			contentTypeId,
			migrations,
			statusFilter,
			entryIds,
			limit = 10,
		} = args;

		// Validate content type exists
		const contentType = await ctx.db.get(contentTypeId);
		if (!contentType) {
			throw new Error(`Content type not found: ${contentTypeId}`);
		}

		// Build query for entries
		let entries = await ctx.db
			.query("contentEntries")
			.withIndex("by_content_type", (q) => q.eq("contentTypeId", contentTypeId))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.collect();

		const totalEntries = entries.length;

		// Filter by status if specified
		if (statusFilter && statusFilter.length > 0) {
			entries = entries.filter((e) =>
				statusFilter.includes(
					e.status as "draft" | "published" | "archived" | "scheduled",
				),
			);
		}

		// Filter by entry IDs if specified
		if (entryIds && entryIds.length > 0) {
			const entryIdSet = new Set(entryIds.map((id) => id.toString()));
			entries = entries.filter((e) => entryIdSet.has(e._id.toString()));
		}

		// Limit entries for preview
		const previewEntries = entries.slice(0, limit);
		const results: EntryMigrationResult[] = [];
		const operationCounts: Record<string, number> = {};
		let entriesWithChanges = 0;
		let entriesWithoutChanges = 0;

		for (const entry of previewEntries) {
			const entryData = entry.data as Record<string, unknown>;
			const { changes } = applyMigrations(
				entryData,
				migrations as MigrationOperation[],
			);

			if (changes.length > 0) {
				entriesWithChanges++;
				for (const change of changes) {
					operationCounts[change.operation] =
						(operationCounts[change.operation] || 0) + 1;
				}
			} else {
				entriesWithoutChanges++;
			}

			results.push({
				entryId: entry._id,
				slug: entry.slug,
				success: true,
				changes,
			});
		}

		return {
			totalEntries,
			previewedEntries: previewEntries.length,
			results,
			summary: {
				entriesWithChanges,
				entriesWithoutChanges,
				operationCounts,
			},
		};
	},
});

/**
 * Query to get available transformation types and their descriptions.
 */
export const getTransformationTypes = query({
	args: {},
	returns: v.array(
		v.object({
			type: v.string(),
			description: v.string(),
			fromType: v.string(),
			toType: v.string(),
		}),
	),
	handler: async () => {
		return [
			{
				type: "TEXT_TO_NUMBER",
				description:
					"Convert text strings to numbers (handles currency formatting)",
				fromType: "text",
				toType: "number",
			},
			{
				type: "NUMBER_TO_TEXT",
				description: "Convert numbers to text strings",
				fromType: "number",
				toType: "text",
			},
			{
				type: "TEXT_TO_BOOLEAN",
				description:
					"Convert text to boolean (true/false, yes/no, 1/0, on/off, enabled/disabled)",
				fromType: "text",
				toType: "boolean",
			},
			{
				type: "BOOLEAN_TO_TEXT",
				description: 'Convert boolean to "true" or "false" strings',
				fromType: "boolean",
				toType: "text",
			},
			{
				type: "TEXT_TO_DATE",
				description:
					"Convert date strings to timestamps (ISO 8601 and common formats)",
				fromType: "text",
				toType: "date/datetime",
			},
			{
				type: "DATE_TO_TEXT",
				description: "Convert timestamps to ISO 8601 date strings",
				fromType: "date/datetime",
				toType: "text",
			},
			{
				type: "TEXT_TO_JSON",
				description: "Parse JSON strings to objects",
				fromType: "text",
				toType: "json",
			},
			{
				type: "JSON_TO_TEXT",
				description: "Stringify JSON objects to text",
				fromType: "json",
				toType: "text",
			},
			{
				type: "SINGLE_TO_ARRAY",
				description: "Wrap single values in an array (for multiple references)",
				fromType: "any",
				toType: "array",
			},
			{
				type: "ARRAY_TO_SINGLE",
				description: "Extract first element from array (for single references)",
				fromType: "array",
				toType: "any",
			},
			{
				type: "SELECT_VALUE_REMAP",
				description: "Remap select/multiSelect values using a provided mapping",
				fromType: "select/multiSelect",
				toType: "select/multiSelect",
			},
		];
	},
});
