/**
 * Content Entry Validation Internal Functions
 *
 * Provides internal functions to validate content entry data against its
 * content type schema. Used by mutations before creating/updating entries,
 * and can be called directly for preview validation.
 *
 * Validation includes:
 * - Required field checks
 * - Type correctness validation
 * - Custom field constraints (min/max, pattern, etc.)
 * - Reference validation (existence and content type constraints)
 * - Media reference validation
 */

import { v } from "convex/values";
import { isDeleted } from "./lib/softDelete.js";
import { internalQuery, query } from "./_generated/server.js";
import { Id } from "./_generated/dataModel.js";
import {
	validateContentData,
	ContentData,
	ContentTypeSchema,
	FieldDefinition,
	ValidationError,
} from "./validation.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Extended validation result that includes reference validation errors
 */
export type ContentEntryValidationResult = {
	/** Whether the validation passed */
	valid: boolean;
	/** Array of validation errors (empty if valid) */
	errors: ValidationError[];
	/** Content type name (if found) */
	contentTypeName?: string;
	/** Content type display name (if found) */
	contentTypeDisplayName?: string;
	/** Whether reference validation was performed */
	referencesValidated: boolean;
};

/**
 * Options for content entry validation
 */
export interface ValidateContentEntryOptions {
	/**
	 * If true, validates that referenced entries exist and belong to allowed content types.
	 * This requires additional database queries but provides complete validation.
	 * Default: true
	 */
	validateReferences?: boolean;

	/**
	 * If true, reports unknown fields (fields not defined in the content type) as errors.
	 * Default: false
	 */
	strictFields?: boolean;
}

// =============================================================================
// Validator Definitions
// =============================================================================

/**
 * Argument validator for validateContentEntry
 */
const validateContentEntryArgs = v.object({
	/** The content type ID to validate against */
	contentTypeId: v.id("contentTypes"),
	/** The content data to validate */
	data: v.any(),
	/** Validation options */
	options: v.optional(
		v.object({
			validateReferences: v.optional(v.boolean()),
			strictFields: v.optional(v.boolean()),
		}),
	),
});

/**
 * Argument validator for validateContentEntryByTypeName
 */
const validateContentEntryByTypeNameArgs = v.object({
	/** The content type name to validate against */
	contentTypeName: v.string(),
	/** The content data to validate */
	data: v.any(),
	/** Validation options */
	options: v.optional(
		v.object({
			validateReferences: v.optional(v.boolean()),
			strictFields: v.optional(v.boolean()),
		}),
	),
});

/**
 * Return validator for validation results
 */
const validationResultValidator = v.object({
	valid: v.boolean(),
	errors: v.array(
		v.object({
			field: v.string(),
			message: v.string(),
			code: v.string(),
		}),
	),
	contentTypeName: v.optional(v.string()),
	contentTypeDisplayName: v.optional(v.string()),
	referencesValidated: v.boolean(),
});

// =============================================================================
// Internal Query: Validate Content Entry
// =============================================================================

/**
 * Internal query to validate content entry data against its content type schema.
 *
 * This function performs comprehensive validation including:
 * 1. Required field checks - ensures all required fields have values
 * 2. Type validation - verifies values match expected types (string, number, etc.)
 * 3. Constraint validation - checks min/max length, patterns, allowed values, etc.
 * 4. Reference validation - optionally verifies referenced entries exist and have correct types
 *
 * @param contentTypeId - The ID of the content type to validate against
 * @param data - The content data to validate
 * @param options - Optional validation options
 *
 * @returns ValidationResult with any errors found
 *
 * @example
 * ```typescript
 * // Validate blog post data before creating
 * const result = await ctx.runQuery(internal.contentEntryValidation.validateContentEntry, {
 *   contentTypeId: blogTypeId,
 *   data: {
 *     title: "My Post",
 *     content: "<p>Hello world!</p>",
 *     author: authorEntryId,
 *   },
 * });
 *
 * if (!result.valid) {
 *   console.error("Validation errors:", result.errors);
 * }
 * ```
 */
export const validateContentEntry = internalQuery({
	args: validateContentEntryArgs.fields,
	returns: validationResultValidator,
	handler: async (ctx, args): Promise<ContentEntryValidationResult> => {
		const { contentTypeId, data, options } = args;
		const validateReferences = options?.validateReferences ?? true;
		const strictFields = options?.strictFields ?? false;

		// Fetch the content type
		const contentType = await ctx.db.get(contentTypeId);
		if (!contentType) {
			return {
				valid: false,
				errors: [
					{
						field: "_contentType",
						message: `Content type not found: ${contentTypeId}`,
						code: "INVALID_CONTENT_TYPE",
					},
				],
				referencesValidated: false,
			};
		}

		if (isDeleted(contentType)) {
			return {
				valid: false,
				errors: [
					{
						field: "_contentType",
						message: `Content type has been deleted: ${contentType.name}`,
						code: "INVALID_CONTENT_TYPE",
					},
				],
				contentTypeName: contentType.name,
				contentTypeDisplayName: contentType.displayName,
				referencesValidated: false,
			};
		}

		if (!contentType.isActive) {
			return {
				valid: false,
				errors: [
					{
						field: "_contentType",
						message: `Content type is not active: ${contentType.name}`,
						code: "INVALID_CONTENT_TYPE",
					},
				],
				contentTypeName: contentType.name,
				contentTypeDisplayName: contentType.displayName,
				referencesValidated: false,
			};
		}

		// Build the schema for validation
		const schema: ContentTypeSchema = {
			name: contentType.name,
			displayName: contentType.displayName,
			description: contentType.description,
			fields: contentType.fields as FieldDefinition[],
			titleField: contentType.titleField,
			slugField: contentType.slugField,
			singleton: contentType.singleton,
		};

		// Perform basic validation
		const contentData = data as ContentData;
		const basicResult = validateContentData(contentData, schema, {
			strictFields,
		});

		// Collect all errors
		const errors: ValidationError[] = [...basicResult.errors];

		// Perform reference validation if enabled
		let referencesValidated = false;
		if (validateReferences) {
			const referenceErrors = await validateReferences_internal(
				ctx,
				contentData,
				schema.fields,
			);
			errors.push(...referenceErrors);
			referencesValidated = true;
		}

		return {
			valid: errors.length === 0,
			errors,
			contentTypeName: contentType.name,
			contentTypeDisplayName: contentType.displayName,
			referencesValidated,
		};
	},
});

/**
 * Public query to validate content entry data.
 *
 * Same as the internal version but exposed as a public query for use
 * from the client (e.g., for form validation before submission).
 */
export const validateEntry = query({
	args: validateContentEntryArgs.fields,
	returns: validationResultValidator,
	handler: async (ctx, args): Promise<ContentEntryValidationResult> => {
		const { contentTypeId, data, options } = args;
		const validateReferencesOption = options?.validateReferences ?? true;
		const strictFields = options?.strictFields ?? false;

		// Fetch the content type
		const contentType = await ctx.db.get(contentTypeId);
		if (!contentType) {
			return {
				valid: false,
				errors: [
					{
						field: "_contentType",
						message: `Content type not found: ${contentTypeId}`,
						code: "INVALID_CONTENT_TYPE",
					},
				],
				referencesValidated: false,
			};
		}

		if (isDeleted(contentType)) {
			return {
				valid: false,
				errors: [
					{
						field: "_contentType",
						message: `Content type has been deleted: ${contentType.name}`,
						code: "INVALID_CONTENT_TYPE",
					},
				],
				contentTypeName: contentType.name,
				contentTypeDisplayName: contentType.displayName,
				referencesValidated: false,
			};
		}

		if (!contentType.isActive) {
			return {
				valid: false,
				errors: [
					{
						field: "_contentType",
						message: `Content type is not active: ${contentType.name}`,
						code: "INVALID_CONTENT_TYPE",
					},
				],
				contentTypeName: contentType.name,
				contentTypeDisplayName: contentType.displayName,
				referencesValidated: false,
			};
		}

		// Build the schema for validation
		const schema: ContentTypeSchema = {
			name: contentType.name,
			displayName: contentType.displayName,
			description: contentType.description,
			fields: contentType.fields as FieldDefinition[],
			titleField: contentType.titleField,
			slugField: contentType.slugField,
			singleton: contentType.singleton,
		};

		// Perform basic validation
		const contentData = data as ContentData;
		const basicResult = validateContentData(contentData, schema, {
			strictFields,
		});

		// Collect all errors
		const errors: ValidationError[] = [...basicResult.errors];

		// Perform reference validation if enabled
		let referencesValidated = false;
		if (validateReferencesOption) {
			const referenceErrors = await validateReferences_internal(
				ctx,
				contentData,
				schema.fields,
			);
			errors.push(...referenceErrors);
			referencesValidated = true;
		}

		return {
			valid: errors.length === 0,
			errors,
			contentTypeName: contentType.name,
			contentTypeDisplayName: contentType.displayName,
			referencesValidated,
		};
	},
});

/**
 * Internal query to validate content entry data by content type name.
 *
 * Same as validateContentEntry but accepts content type name instead of ID.
 * Useful when you know the type name but not the ID.
 */
export const validateContentEntryByTypeName = internalQuery({
	args: validateContentEntryByTypeNameArgs.fields,
	returns: validationResultValidator,
	handler: async (ctx, args): Promise<ContentEntryValidationResult> => {
		const { contentTypeName, data, options } = args;

		// Find the content type by name
		const contentType = await ctx.db
			.query("contentTypes")
			.withIndex("by_name", (q) => q.eq("name", contentTypeName))
			.first();

		if (!contentType) {
			return {
				valid: false,
				errors: [
					{
						field: "_contentType",
						message: `Content type not found: ${contentTypeName}`,
						code: "INVALID_CONTENT_TYPE",
					},
				],
				referencesValidated: false,
			};
		}

		// Delegate to the ID-based validation
		const validateReferencesOption = options?.validateReferences ?? true;
		const strictFields = options?.strictFields ?? false;

		if (isDeleted(contentType)) {
			return {
				valid: false,
				errors: [
					{
						field: "_contentType",
						message: `Content type has been deleted: ${contentType.name}`,
						code: "INVALID_CONTENT_TYPE",
					},
				],
				contentTypeName: contentType.name,
				contentTypeDisplayName: contentType.displayName,
				referencesValidated: false,
			};
		}

		if (!contentType.isActive) {
			return {
				valid: false,
				errors: [
					{
						field: "_contentType",
						message: `Content type is not active: ${contentType.name}`,
						code: "INVALID_CONTENT_TYPE",
					},
				],
				contentTypeName: contentType.name,
				contentTypeDisplayName: contentType.displayName,
				referencesValidated: false,
			};
		}

		// Build the schema for validation
		const schema: ContentTypeSchema = {
			name: contentType.name,
			displayName: contentType.displayName,
			description: contentType.description,
			fields: contentType.fields as FieldDefinition[],
			titleField: contentType.titleField,
			slugField: contentType.slugField,
			singleton: contentType.singleton,
		};

		// Perform basic validation
		const contentData = data as ContentData;
		const basicResult = validateContentData(contentData, schema, {
			strictFields,
		});

		// Collect all errors
		const errors: ValidationError[] = [...basicResult.errors];

		// Perform reference validation if enabled
		let referencesValidated = false;
		if (validateReferencesOption) {
			const referenceErrors = await validateReferences_internal(
				ctx,
				contentData,
				schema.fields,
			);
			errors.push(...referenceErrors);
			referencesValidated = true;
		}

		return {
			valid: errors.length === 0,
			errors,
			contentTypeName: contentType.name,
			contentTypeDisplayName: contentType.displayName,
			referencesValidated,
		};
	},
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validates reference and media fields by checking that referenced entries exist
 * and belong to allowed content types.
 *
 * @param ctx - The query context for database access
 * @param data - The content data being validated
 * @param fields - The field definitions from the content type
 * @returns Array of validation errors for invalid references
 */
async function validateReferences_internal(
	ctx: { db: { get: (id: Id<any>) => Promise<any> } },
	data: ContentData,
	fields: FieldDefinition[],
): Promise<ValidationError[]> {
	const errors: ValidationError[] = [];

	for (const field of fields) {
		const value = data[field.name];

		// Skip if no value
		if (value === null || value === undefined) {
			continue;
		}

		if (field.type === "reference") {
			const multiple = field.options?.multiple ?? false;
			const allowedContentTypes = field.options?.allowedContentTypes;

			if (multiple && Array.isArray(value)) {
				// Multiple references
				for (let i = 0; i < value.length; i++) {
					const refId = value[i];
					if (typeof refId === "string") {
						const refErrors = await validateSingleReference(
							ctx,
							refId,
							field.name,
							allowedContentTypes,
							i,
						);
						errors.push(...refErrors);
					}
				}
			} else if (!multiple && typeof value === "string") {
				// Single reference
				const refErrors = await validateSingleReference(
					ctx,
					value,
					field.name,
					allowedContentTypes,
				);
				errors.push(...refErrors);
			}
		}

		if (field.type === "media") {
			const multiple = field.options?.multiple ?? false;

			if (multiple && Array.isArray(value)) {
				// Multiple media assets
				for (let i = 0; i < value.length; i++) {
					const assetId = value[i];
					if (typeof assetId === "string") {
						const mediaErrors = await validateSingleMediaAsset(
							ctx,
							assetId,
							field.name,
							field.options?.allowedMimeTypes,
							field.options?.maxFileSize,
							i,
						);
						errors.push(...mediaErrors);
					}
				}
			} else if (!multiple && typeof value === "string") {
				// Single media asset
				const mediaErrors = await validateSingleMediaAsset(
					ctx,
					value,
					field.name,
					field.options?.allowedMimeTypes,
					field.options?.maxFileSize,
				);
				errors.push(...mediaErrors);
			}
		}
	}

	return errors;
}

/**
 * Validates a single reference to a content entry.
 */
async function validateSingleReference(
	ctx: { db: { get: (id: Id<any>) => Promise<any> } },
	referenceId: string,
	fieldName: string,
	allowedContentTypes?: string[],
	index?: number,
): Promise<ValidationError[]> {
	const errors: ValidationError[] = [];
	const fieldLabel = index !== undefined ? `${fieldName}[${index}]` : fieldName;

	try {
		// Try to get the referenced entry
		const entry = await ctx.db.get(referenceId as Id<"contentEntries">);

		if (!entry) {
			errors.push({
				field: fieldLabel,
				message: `Referenced entry not found: ${referenceId}`,
				code: "INVALID_CONTENT_TYPE",
			});
			return errors;
		}

		// Check if entry is deleted
		if (isDeleted(entry)) {
			errors.push({
				field: fieldLabel,
				message: `Referenced entry has been deleted: ${referenceId}`,
				code: "INVALID_CONTENT_TYPE",
			});
			return errors;
		}

		// Validate content type constraint
		if (allowedContentTypes && allowedContentTypes.length > 0) {
			const contentType = await ctx.db.get(entry.contentTypeId);
			if (contentType) {
				if (!allowedContentTypes.includes(contentType.name)) {
					errors.push({
						field: fieldLabel,
						message: `Reference must be of type: ${allowedContentTypes.join(
							", ",
						)}. Got: ${contentType.name}`,
						code: "INVALID_CONTENT_TYPE",
					});
				}
			}
		}
	} catch {
		// Invalid ID format
		errors.push({
			field: fieldLabel,
			message: `Invalid reference ID format: ${referenceId}`,
			code: "INVALID_TYPE",
		});
	}

	return errors;
}

/**
 * Validates a single media asset reference.
 */
async function validateSingleMediaAsset(
	ctx: { db: { get: (id: Id<any>) => Promise<any> } },
	assetId: string,
	fieldName: string,
	allowedMimeTypes?: string[],
	maxFileSize?: number,
	index?: number,
): Promise<ValidationError[]> {
	const errors: ValidationError[] = [];
	const fieldLabel = index !== undefined ? `${fieldName}[${index}]` : fieldName;

	try {
		// Try to get the media item
		const item = await ctx.db.get(assetId as Id<"mediaItems">);

		if (!item) {
			errors.push({
				field: fieldLabel,
				message: `Media asset not found: ${assetId}`,
				code: "INVALID_TYPE",
			});
			return errors;
		}

		// Check if it's an asset (not a folder)
		if (item.kind !== "asset") {
			errors.push({
				field: fieldLabel,
				message: `Media reference must be an asset, not a folder: ${assetId}`,
				code: "INVALID_TYPE",
			});
			return errors;
		}

		// Check if asset is deleted
		if (isDeleted(item)) {
			errors.push({
				field: fieldLabel,
				message: `Media asset has been deleted: ${assetId}`,
				code: "INVALID_TYPE",
			});
			return errors;
		}

		// Validate MIME type constraint
		if (allowedMimeTypes && allowedMimeTypes.length > 0) {
			if (!allowedMimeTypes.includes(item.mimeType)) {
				errors.push({
					field: fieldLabel,
					message: `Media type not allowed. Expected: ${allowedMimeTypes.join(
						", ",
					)}. Got: ${item.mimeType}`,
					code: "INVALID_MIME_TYPE",
				});
			}
		}

		// Validate file size constraint
		if (maxFileSize !== undefined && item.size > maxFileSize) {
			const maxSizeKB = Math.round(maxFileSize / 1024);
			const actualSizeKB = Math.round(item.size / 1024);
			errors.push({
				field: fieldLabel,
				message: `File too large. Maximum: ${maxSizeKB}KB. Actual: ${actualSizeKB}KB`,
				code: "FILE_TOO_LARGE",
			});
		}
	} catch {
		// Invalid ID format
		errors.push({
			field: fieldLabel,
			message: `Invalid media asset ID format: ${assetId}`,
			code: "INVALID_TYPE",
		});
	}

	return errors;
}
