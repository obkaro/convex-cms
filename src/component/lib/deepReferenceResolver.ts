/**
 * Deep Reference Resolution Utilities
 *
 * Provides functions for recursively resolving content and media references
 * within content entries. Supports depth limiting and circular reference
 * prevention to avoid infinite loops.
 *
 * This module extends the basic reference resolution with:
 * - Recursive resolution of nested references
 * - Configurable maximum depth
 * - Circular reference detection and prevention
 * - Combined content and media reference resolution
 * - Selective field resolution
 *
 * @example
 * ```typescript
 * // Resolve a blog post with author and related posts
 * const resolvedEntry = await resolveEntryReferences(ctx, entry, contentType.fields, {
 *   maxDepth: 2,
 *   resolveMedia: true,
 *   publishedOnly: true,
 * });
 *
 * // The resolved entry will have:
 * // - entry.data.author resolved to full author entry
 * // - entry.data.author.data.profileImage resolved to media URL
 * // - entry.data.relatedPosts resolved to array of entries (depth 1)
 * // - entry.data.relatedPosts[].author NOT resolved (depth limit reached)
 * ```
 */

import {
	// Doc,
	Id,
} from "../_generated/dataModel.js";
import { QueryCtx } from "../_generated/server.js";
import { isDeleted } from "./softDelete.js";
import {
	resolveReference,
	// resolveReferences,
	// ResolvedReference,
	// ResolveOptions,
} from "./referenceResolver.js";
import {
	resolveMediaReference,
	// resolveMediaReferences,
	ResolvedMediaReference,
	MediaResolveOptions,
} from "./mediaReferenceResolver.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Field definition subset needed for reference resolution.
 * This type matches the fields array in content types.
 */
export interface FieldDefinitionForResolver {
	/** Field name in the data object */
	name: string;
	/** Field type identifier */
	type: string;
	/** Field-specific options */
	options?: {
		/** For reference fields: allowed content type names */
		allowedContentTypes?: string[];
		/** For reference/media fields: whether multiple values are allowed */
		multiple?: boolean;
		/** For media fields: allowed MIME types */
		allowedMimeTypes?: string[];
	};
}

/**
 * Options for deep reference resolution.
 */
export interface DeepResolveOptions {
	/**
	 * Maximum depth to resolve nested references.
	 * - 0: Don't resolve any references (just return IDs)
	 * - 1: Resolve immediate references only
	 * - 2: Resolve references and their references
	 * - etc.
	 *
	 * @default 1
	 */
	maxDepth?: number;

	/**
	 * Whether to resolve media references.
	 * When true, media IDs are replaced with full asset data including URLs.
	 *
	 * @default true
	 */
	resolveMedia?: boolean;

	/**
	 * Whether to resolve content references.
	 * When true, content entry IDs are replaced with full entry data.
	 *
	 * @default true
	 */
	resolveContent?: boolean;

	/**
	 * Only resolve references to published entries.
	 * Useful for frontend/public API usage.
	 *
	 * @default false
	 */
	publishedOnly?: boolean;

	/**
	 * Include soft-deleted entries when resolving.
	 *
	 * @default false
	 */
	includeDeleted?: boolean;

	/**
	 * Specific fields to include from resolved entries.
	 * If not specified, all fields are included.
	 * Only applies to content references.
	 */
	fields?: string[];

	/**
	 * Specific field names to resolve references for.
	 * If not specified, all reference/media fields are resolved.
	 * Useful for selective resolution of expensive operations.
	 */
	onlyFields?: string[];

	/**
	 * Field names to skip when resolving references.
	 * Useful for excluding specific fields from resolution.
	 */
	excludeFields?: string[];

	/**
	 * Whether to preserve the original reference ID alongside resolved data.
	 * When true, resolved objects include an `_originalId` field.
	 *
	 * @default false
	 */
	preserveOriginalIds?: boolean;
}

/**
 * A content entry with resolved references.
 * The data object will have reference fields replaced with resolved content.
 */
export interface ResolvedContentEntry {
	/** The content entry ID */
	id: string;
	/** The content type name */
	contentTypeName: string;
	/** The content type display name */
	contentTypeDisplayName: string;
	/** The entry's URL slug */
	slug: string;
	/** The entry's publishing status (supports custom workflow states) */
	status: string;
	/** The entry's data with resolved references */
	data: Record<string, unknown>;
	/** Whether the entry exists */
	exists: boolean;
	/** Locale code if localized */
	locale?: string;
	/** Version number */
	version?: number;
	/** Fields that had circular references (were not resolved) */
	_circularReferences?: string[];
	/** Fields that had unresolved references (not found) */
	_unresolvedReferences?: Record<string, string[]>;
	/** Original entry ID (only if preserveOriginalIds is true) */
	_originalId?: string;
}

/**
 * Context for tracking resolution state during recursive resolution.
 * Used internally to prevent circular references.
 */
interface ResolutionContext {
	/** Set of entry IDs currently being resolved (for circular detection) */
	visitedEntries: Set<string>;
	/** Set of media IDs currently being resolved */
	visitedMedia: Set<string>;
	/** Current resolution depth */
	currentDepth: number;
	/** Maximum allowed depth */
	maxDepth: number;
	/** Cache of already-resolved entries at this depth */
	resolvedCache: Map<string, ResolvedContentEntry | null>;
	/** Cache of already-resolved media assets */
	mediaCache: Map<string, ResolvedMediaReference | null>;
	/** Fields with detected circular references */
	circularReferences: string[];
	/** Fields with unresolved references */
	unresolvedReferences: Record<string, string[]>;
}

/**
 * Result of resolving references for multiple entries.
 */
export interface BatchResolveResult {
	/** Successfully resolved entries */
	resolved: ResolvedContentEntry[];
	/** Entry IDs that could not be resolved */
	unresolved: string[];
	/** Summary of circular references detected */
	circularReferencesDetected: number;
}

// =============================================================================
// Core Resolution Functions
// =============================================================================

/**
 * Resolve all references within a content entry's data.
 *
 * This function recursively resolves reference and media fields up to
 * the specified depth, while preventing circular references.
 *
 * @param ctx - Convex query context
 * @param entry - The content entry to resolve references for
 * @param fields - Field definitions from the content type
 * @param options - Resolution options
 * @returns The entry with resolved references
 *
 * @example
 * ```typescript
 * // Basic usage - resolve one level deep
 * const resolved = await resolveEntryReferences(ctx, blogPost, contentType.fields);
 *
 * // Resolve two levels deep with only published entries
 * const resolved = await resolveEntryReferences(ctx, blogPost, contentType.fields, {
 *   maxDepth: 2,
 *   publishedOnly: true,
 * });
 *
 * // Resolve only specific fields
 * const resolved = await resolveEntryReferences(ctx, blogPost, contentType.fields, {
 *   onlyFields: ["author", "featuredImage"],
 * });
 * ```
 */
export async function resolveEntryReferences(
	ctx: QueryCtx,
	entry: {
		_id: string;
		slug: string;
		status: string;
		data: Record<string, unknown>;
		contentTypeId?: string;
		locale?: string;
		version?: number;
	},
	fields: FieldDefinitionForResolver[],
	options: DeepResolveOptions = {},
): Promise<ResolvedContentEntry> {
	const {
		maxDepth = 1,
		resolveMedia = true,
		resolveContent = true,
		publishedOnly = false,
		includeDeleted = false,
		fields: selectFields,
		onlyFields,
		excludeFields,
		preserveOriginalIds = false,
	} = options;

	// Get content type info
	let contentTypeName = "";
	let contentTypeDisplayName = "";

	if (entry.contentTypeId) {
		try {
			const contentType = await ctx.db.get(
				entry.contentTypeId as Id<"contentTypes">,
			);
			if (contentType) {
				contentTypeName = contentType.name;
				contentTypeDisplayName = contentType.displayName;
			}
		} catch {
			// Content type not found, continue with empty names
		}
	}

	// If maxDepth is 0, return without resolving
	if (maxDepth === 0) {
		return {
			id: entry._id,
			contentTypeName,
			contentTypeDisplayName,
			slug: entry.slug,
			status: entry.status,
			data: entry.data,
			exists: true,
			locale: entry.locale,
			version: entry.version,
			...(preserveOriginalIds && { _originalId: entry._id }),
		};
	}

	// Initialize resolution context
	const resolutionCtx: ResolutionContext = {
		visitedEntries: new Set([entry._id]),
		visitedMedia: new Set(),
		currentDepth: 0,
		maxDepth,
		resolvedCache: new Map(),
		mediaCache: new Map(),
		circularReferences: [],
		unresolvedReferences: {},
	};

	// Filter fields to resolve based on options
	const fieldsToResolve = filterFieldsToResolve(
		fields,
		onlyFields,
		excludeFields,
	);

	// Resolve the entry data
	const resolvedData = await resolveDataFields(
		ctx,
		entry.data,
		fieldsToResolve,
		resolutionCtx,
		{
			resolveMedia,
			resolveContent,
			publishedOnly,
			includeDeleted,
			selectFields,
			preserveOriginalIds,
		},
	);

	const result: ResolvedContentEntry = {
		id: entry._id,
		contentTypeName,
		contentTypeDisplayName,
		slug: entry.slug,
		status: entry.status,
		data: resolvedData,
		exists: true,
		locale: entry.locale,
		version: entry.version,
	};

	// Add metadata about resolution issues
	if (resolutionCtx.circularReferences.length > 0) {
		result._circularReferences = resolutionCtx.circularReferences;
	}

	if (Object.keys(resolutionCtx.unresolvedReferences).length > 0) {
		result._unresolvedReferences = resolutionCtx.unresolvedReferences;
	}

	if (preserveOriginalIds) {
		result._originalId = entry._id;
	}

	return result;
}

/**
 * Resolve references for multiple content entries in batch.
 *
 * More efficient than calling resolveEntryReferences multiple times
 * as it shares caches across entries.
 *
 * @param ctx - Convex query context
 * @param entries - Array of content entries to resolve
 * @param fields - Field definitions from the content type
 * @param options - Resolution options
 * @returns Batch result with resolved entries and unresolved IDs
 *
 * @example
 * ```typescript
 * const { page } = await cms.contentEntries.list(ctx, { ... });
 * const result = await resolveEntryReferencesBatch(ctx, page, contentType.fields, {
 *   maxDepth: 1,
 *   publishedOnly: true,
 * });
 * ```
 */
export async function resolveEntryReferencesBatch(
	ctx: QueryCtx,
	entries: Array<{
		_id: string;
		slug: string;
		status: string;
		data: Record<string, unknown>;
		contentTypeId?: string;
		locale?: string;
		version?: number;
	}>,
	fields: FieldDefinitionForResolver[],
	options: DeepResolveOptions = {},
): Promise<BatchResolveResult> {
	const resolved: ResolvedContentEntry[] = [];
	const unresolved: string[] = [];
	let circularReferencesDetected = 0;

	// Resolve each entry in parallel
	const promises = entries.map(async (entry) => {
		try {
			const result = await resolveEntryReferences(ctx, entry, fields, options);
			if (result._circularReferences) {
				circularReferencesDetected += result._circularReferences.length;
			}
			return { success: true, result, id: entry._id };
		} catch {
			return { success: false, result: null, id: entry._id };
		}
	});

	const results = await Promise.all(promises);

	for (const { success, result, id } of results) {
		if (success && result) {
			resolved.push(result);
		} else {
			unresolved.push(id);
		}
	}

	return {
		resolved,
		unresolved,
		circularReferencesDetected,
	};
}

// =============================================================================
// Internal Resolution Functions
// =============================================================================

/**
 * Filter fields based on onlyFields and excludeFields options.
 */
function filterFieldsToResolve(
	fields: FieldDefinitionForResolver[],
	onlyFields?: string[],
	excludeFields?: string[],
): FieldDefinitionForResolver[] {
	let filtered = fields.filter(
		(f) => f.type === "reference" || f.type === "media",
	);

	if (onlyFields && onlyFields.length > 0) {
		filtered = filtered.filter((f) => onlyFields.includes(f.name));
	}

	if (excludeFields && excludeFields.length > 0) {
		filtered = filtered.filter((f) => !excludeFields.includes(f.name));
	}

	return filtered;
}

/**
 * Resolve all reference and media fields in a data object.
 */
async function resolveDataFields(
	ctx: QueryCtx,
	data: Record<string, unknown>,
	fields: FieldDefinitionForResolver[],
	resolutionCtx: ResolutionContext,
	options: {
		resolveMedia: boolean;
		resolveContent: boolean;
		publishedOnly: boolean;
		includeDeleted: boolean;
		selectFields?: string[];
		preserveOriginalIds: boolean;
	},
): Promise<Record<string, unknown>> {
	const resolvedData = { ...data };

	// Process each resolvable field
	for (const field of fields) {
		const value = data[field.name];

		if (value === null || value === undefined) {
			continue;
		}

		if (field.type === "reference" && options.resolveContent) {
			const resolved = await resolveReferenceField(
				ctx,
				field,
				value,
				resolutionCtx,
				options,
			);
			resolvedData[field.name] = resolved;
		} else if (field.type === "media" && options.resolveMedia) {
			const resolved = await resolveMediaField(
				ctx,
				field,
				value,
				resolutionCtx,
				options,
			);
			resolvedData[field.name] = resolved;
		}
	}

	return resolvedData;
}

/**
 * Resolve a reference field value (single or multiple).
 */
async function resolveReferenceField(
	ctx: QueryCtx,
	field: FieldDefinitionForResolver,
	value: unknown,
	resolutionCtx: ResolutionContext,
	options: {
		publishedOnly: boolean;
		includeDeleted: boolean;
		selectFields?: string[];
		preserveOriginalIds: boolean;
	},
): Promise<unknown> {
	const isMultiple = field.options?.multiple ?? false;

	if (isMultiple) {
		// Resolve array of references
		if (!Array.isArray(value)) {
			return value; // Invalid, return as-is
		}

		const resolvedArray: unknown[] = [];
		const unresolvedIds: string[] = [];

		for (const refId of value) {
			if (typeof refId !== "string") {
				resolvedArray.push(refId);
				continue;
			}

			const resolved = await resolveNestedReference(
				ctx,
				refId,
				field.name,
				resolutionCtx,
				options,
			);

			if (resolved) {
				resolvedArray.push(resolved);
			} else {
				unresolvedIds.push(refId);
				// Keep the original ID for unresolved references
				if (options.preserveOriginalIds) {
					resolvedArray.push({ _unresolvedId: refId });
				}
			}
		}

		if (unresolvedIds.length > 0) {
			resolutionCtx.unresolvedReferences[field.name] = unresolvedIds;
		}

		return resolvedArray;
	} else {
		// Resolve single reference
		if (typeof value !== "string") {
			return value; // Invalid, return as-is
		}

		const resolved = await resolveNestedReference(
			ctx,
			value,
			field.name,
			resolutionCtx,
			options,
		);

		if (!resolved) {
			resolutionCtx.unresolvedReferences[field.name] = [value];
			if (options.preserveOriginalIds) {
				return { _unresolvedId: value };
			}
		}

		return resolved ?? value;
	}
}

/**
 * Resolve a nested content reference with circular detection.
 */
async function resolveNestedReference(
	ctx: QueryCtx,
	refId: string,
	fieldName: string,
	resolutionCtx: ResolutionContext,
	options: {
		publishedOnly: boolean;
		includeDeleted: boolean;
		selectFields?: string[];
		preserveOriginalIds: boolean;
	},
): Promise<ResolvedContentEntry | null> {
	// Check cache first
	if (resolutionCtx.resolvedCache.has(refId)) {
		return resolutionCtx.resolvedCache.get(refId) ?? null;
	}

	// Check for circular reference
	if (resolutionCtx.visitedEntries.has(refId)) {
		resolutionCtx.circularReferences.push(`${fieldName}:${refId}`);
		return null;
	}

	// Check depth limit
	if (resolutionCtx.currentDepth >= resolutionCtx.maxDepth) {
		// At max depth, just return the basic resolved reference without recursing
		const basicRef = await resolveReference(ctx, refId, {
			publishedOnly: options.publishedOnly,
			includeDeleted: options.includeDeleted,
			fields: options.selectFields,
		});

		if (!basicRef) {
			return null;
		}

		const result: ResolvedContentEntry = {
			id: basicRef.id,
			contentTypeName: basicRef.contentTypeName,
			contentTypeDisplayName: basicRef.contentTypeDisplayName,
			slug: basicRef.slug,
			status: basicRef.status,
			data: basicRef.data,
			exists: basicRef.exists,
			...(options.preserveOriginalIds && { _originalId: refId }),
		};

		resolutionCtx.resolvedCache.set(refId, result);
		return result;
	}

	// Mark as visiting
	resolutionCtx.visitedEntries.add(refId);
	resolutionCtx.currentDepth++;

	try {
		// Get the referenced entry
		const entry = await ctx.db.get(refId as Id<"contentEntries">);

		if (!entry) {
			resolutionCtx.resolvedCache.set(refId, null);
			return null;
		}

		// Check soft-delete
		if (!options.includeDeleted && isDeleted(entry)) {
			resolutionCtx.resolvedCache.set(refId, null);
			return null;
		}

		// Check published status
		if (options.publishedOnly && entry.status !== "published") {
			resolutionCtx.resolvedCache.set(refId, null);
			return null;
		}

		// Get content type for field definitions
		const contentType = await ctx.db.get(entry.contentTypeId);

		if (!contentType || isDeleted(contentType)) {
			resolutionCtx.resolvedCache.set(refId, null);
			return null;
		}

		// Recursively resolve this entry's references
		const nestedFields = (contentType.fields as FieldDefinitionForResolver[]).filter(
			(f) => f.type === "reference" || f.type === "media",
		);

		const resolvedData = await resolveDataFields(
			ctx,
			entry.data as Record<string, unknown>,
			nestedFields,
			resolutionCtx,
			{
				resolveMedia: true,
				resolveContent: true,
				publishedOnly: options.publishedOnly,
				includeDeleted: options.includeDeleted,
				selectFields: options.selectFields,
				preserveOriginalIds: options.preserveOriginalIds,
			},
		);

		// Filter fields if specified
		let finalData = resolvedData;
		if (options.selectFields && options.selectFields.length > 0) {
			finalData = {};
			for (const field of options.selectFields) {
				if (field in resolvedData) {
					finalData[field] = resolvedData[field];
				}
			}
		}

		const result: ResolvedContentEntry = {
			id: refId,
			contentTypeName: contentType.name,
			contentTypeDisplayName: contentType.displayName,
			slug: entry.slug,
			status: entry.status,
			data: finalData,
			exists: true,
			locale: entry.locale,
			version: entry.version,
			...(options.preserveOriginalIds && { _originalId: refId }),
		};

		resolutionCtx.resolvedCache.set(refId, result);
		return result;
	} finally {
		// Unmark as visiting (allow visiting again from different paths)
		resolutionCtx.visitedEntries.delete(refId);
		resolutionCtx.currentDepth--;
	}
}

/**
 * Resolve a media field value (single or multiple).
 */
async function resolveMediaField(
	ctx: QueryCtx,
	field: FieldDefinitionForResolver,
	value: unknown,
	resolutionCtx: ResolutionContext,
	options: {
		preserveOriginalIds: boolean;
		includeDeleted: boolean;
	},
): Promise<unknown> {
	const isMultiple = field.options?.multiple ?? false;
	const mediaOptions: MediaResolveOptions = {
		includeDeleted: options.includeDeleted,
	};

	if (isMultiple) {
		// Resolve array of media references
		if (!Array.isArray(value)) {
			return value;
		}

		const resolvedArray: unknown[] = [];
		const unresolvedIds: string[] = [];

		for (const mediaId of value) {
			if (typeof mediaId !== "string") {
				resolvedArray.push(mediaId);
				continue;
			}

			// Check cache
			if (resolutionCtx.mediaCache.has(mediaId)) {
				const cached = resolutionCtx.mediaCache.get(mediaId);
				if (cached) {
					resolvedArray.push(
						options.preserveOriginalIds
							? { ...cached, _originalId: mediaId }
							: cached,
					);
				} else {
					unresolvedIds.push(mediaId);
				}
				continue;
			}

			const resolved = await resolveMediaReference(ctx, mediaId, mediaOptions);

			if (resolved) {
				resolutionCtx.mediaCache.set(mediaId, resolved);
				resolvedArray.push(
					options.preserveOriginalIds
						? { ...resolved, _originalId: mediaId }
						: resolved,
				);
			} else {
				resolutionCtx.mediaCache.set(mediaId, null);
				unresolvedIds.push(mediaId);
				if (options.preserveOriginalIds) {
					resolvedArray.push({ _unresolvedId: mediaId });
				}
			}
		}

		if (unresolvedIds.length > 0) {
			resolutionCtx.unresolvedReferences[field.name] = unresolvedIds;
		}

		return resolvedArray;
	} else {
		// Resolve single media reference
		if (typeof value !== "string") {
			return value;
		}

		// Check cache
		if (resolutionCtx.mediaCache.has(value)) {
			const cached = resolutionCtx.mediaCache.get(value);
			if (cached) {
				return options.preserveOriginalIds
					? { ...cached, _originalId: value }
					: cached;
			}
			resolutionCtx.unresolvedReferences[field.name] = [value];
			return options.preserveOriginalIds ? { _unresolvedId: value } : value;
		}

		const resolved = await resolveMediaReference(ctx, value, mediaOptions);

		if (resolved) {
			resolutionCtx.mediaCache.set(value, resolved);
			return options.preserveOriginalIds
				? { ...resolved, _originalId: value }
				: resolved;
		}

		resolutionCtx.mediaCache.set(value, null);
		resolutionCtx.unresolvedReferences[field.name] = [value];
		return options.preserveOriginalIds ? { _unresolvedId: value } : value;
	}
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a value contains circular reference markers.
 *
 * @param data - Data object to check
 * @returns Array of field paths with circular references
 */
export function findCircularReferenceMarkers(
	data: Record<string, unknown>,
): string[] {
	const markers: string[] = [];

	function traverse(obj: unknown, path: string): void {
		if (obj === null || obj === undefined) {
			return;
		}

		if (typeof obj === "object") {
			if (Array.isArray(obj)) {
				obj.forEach((item, index) => traverse(item, `${path}[${index}]`));
			} else {
				const record = obj as Record<string, unknown>;
				if ("_circularReferences" in record) {
					markers.push(path);
				}
				for (const [key, value] of Object.entries(record)) {
					traverse(value, path ? `${path}.${key}` : key);
				}
			}
		}
	}

	traverse(data, "");
	return markers;
}

/**
 * Flatten resolved references to a simple lookup map.
 * Useful for deduplicating references across multiple entries.
 *
 * @param entries - Array of resolved entries
 * @returns Map of entry ID to resolved entry
 */
export function flattenResolvedReferences(
	entries: ResolvedContentEntry[],
): Map<string, ResolvedContentEntry> {
	const map = new Map<string, ResolvedContentEntry>();

	function extractReferences(data: Record<string, unknown>): void {
		for (const value of Object.values(data)) {
			if (value === null || value === undefined) {
				continue;
			}

			if (typeof value === "object") {
				if (Array.isArray(value)) {
					for (const item of value) {
						if (isResolvedContentEntry(item)) {
							map.set(item.id, item);
							extractReferences(item.data);
						}
					}
				} else if (isResolvedContentEntry(value as Record<string, unknown>)) {
					const entry = value as ResolvedContentEntry;
					map.set(entry.id, entry);
					extractReferences(entry.data);
				}
			}
		}
	}

	for (const entry of entries) {
		map.set(entry.id, entry);
		extractReferences(entry.data);
	}

	return map;
}

/**
 * Type guard to check if a value is a resolved content entry.
 */
function isResolvedContentEntry(value: unknown): value is ResolvedContentEntry {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const obj = value as Record<string, unknown>;
	return (
		"id" in obj &&
		"contentTypeName" in obj &&
		"slug" in obj &&
		"status" in obj &&
		"data" in obj &&
		"exists" in obj
	);
}

/**
 * Count the total number of references resolved in an entry.
 *
 * @param entry - Resolved entry to count
 * @returns Object with counts of content and media references
 */
export function countResolvedReferences(
	entry: ResolvedContentEntry,
): {
	content: number;
	media: number;
	total: number;
} {
	let content = 0;
	let media = 0;

	function count(value: unknown): void {
		if (value === null || value === undefined) {
			return;
		}

		if (typeof value === "object") {
			if (Array.isArray(value)) {
				for (const item of value) {
					count(item);
				}
			} else {
				const record = value as Record<string, unknown>;

				// Check if it's a resolved content entry
				if (isResolvedContentEntry(record)) {
					content++;
					count(record.data);
				}
				// Check if it's a resolved media reference
				else if (
					"storageId" in record &&
					"url" in record &&
					"mimeType" in record
				) {
					media++;
				}
				// Otherwise recurse into nested objects
				else {
					for (const val of Object.values(record)) {
						count(val);
					}
				}
			}
		}
	}

	count(entry.data);

	return { content, media, total: content + media };
}
