/**
 * RAG Content Chunker
 *
 * Utility to extract and structure content from CMS entries for @convex-dev/rag indexing.
 * This module provides:
 *
 * 1. **Content Extraction**: Extracts text from various CMS field types (text, richText, json, etc.)
 * 2. **Semantic Chunking**: Splits content into meaningful chunks optimized for embedding
 * 3. **Metadata Tagging**: Attaches relevant metadata (content type, field source, locale, etc.)
 * 4. **Reference Handling**: Processes embedded references and includes contextual information
 *
 * The output is designed to be directly compatible with @convex-dev/rag's `add()` function.
 *
 * @example
 * ```typescript
 * import { extractContentForRag, chunkContentEntry } from "@convex-cms/core/lib";
 * import { rag } from "@convex-dev/rag";
 *
 * // In a Convex action
 * const chunks = await chunkContentEntry(ctx, entry, contentType, {
 *   includeMetadata: true,
 *   chunkOptions: { maxCharsSoftLimit: 1000 },
 * });
 *
 * await rag.add(ctx, {
 *   namespace: "cms-content",
 *   key: entry._id,
 *   chunks: chunks.map(c => c.text),
 *   title: chunks[0]?.metadata?.title,
 * });
 * ```
 *
 * @module
 */

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Field definition structure from the CMS schema.
 */
export interface FieldDefinition {
	name: string;
	label: string;
	type: string;
	required: boolean;
	searchable?: boolean;
	localized?: boolean;
	description?: string;
	options?: {
		allowedContentTypes?: string[];
		multiple?: boolean;
		[key: string]: unknown;
	};
}

/**
 * Content type structure from the CMS.
 */
export interface ContentTypeInfo {
	_id: string;
	name: string;
	displayName: string;
	fields: FieldDefinition[];
	titleField?: string;
	slugField?: string;
}

/**
 * Content entry structure from the CMS.
 */
export interface ContentEntryInfo {
	_id: string;
	contentTypeId: string;
	slug: string;
	status: string;
	data: Record<string, unknown>;
	locale?: string;
	version: number;
	_creationTime: number;
	firstPublishedAt?: number;
	lastPublishedAt?: number;
}

/**
 * A resolved reference for context enrichment.
 */
export interface ResolvedReferenceInfo {
	id: string;
	contentTypeName: string;
	title?: string;
	slug?: string;
}

/**
 * Metadata attached to each content chunk.
 * This metadata helps with filtering and relevance scoring during retrieval.
 */
export interface ChunkMetadata {
	/** The content entry ID this chunk came from */
	entryId: string;
	/** The content type name (e.g., "blog_post") */
	contentType: string;
	/** The content type display name (e.g., "Blog Post") */
	contentTypeDisplayName: string;
	/** The entry's URL slug */
	slug: string;
	/** Publishing status of the entry */
	status: string;
	/** Locale code if localized content */
	locale?: string;
	/** The field name(s) this chunk was extracted from */
	sourceFields: string[];
	/** The chunk index within the entry (0-based) */
	chunkIndex: number;
	/** Total number of chunks for this entry */
	totalChunks: number;
	/** The entry's title (if available) */
	title?: string;
	/** ISO timestamp when the entry was created */
	createdAt: string;
	/** ISO timestamp when the entry was first published */
	firstPublishedAt?: string;
	/** ISO timestamp when the entry was last published */
	lastPublishedAt?: string;
	/** Version number of the entry */
	version: number;
	/** IDs of referenced content entries (for relationship tracking) */
	referencedEntryIds?: string[];
	/** IDs of referenced media assets */
	referencedMediaIds?: string[];
	/** Semantic type of the chunk (heading, paragraph, list, etc.) */
	semanticType?: ChunkSemanticType;
}

/**
 * Semantic type classification for chunks.
 * Helps with relevance scoring and filtering.
 */
export type ChunkSemanticType =
	| "title"
	| "heading"
	| "paragraph"
	| "list"
	| "quote"
	| "code"
	| "table"
	| "mixed"
	| "field_value";

/**
 * A single content chunk ready for RAG indexing.
 */
export interface ContentChunk {
	/** The text content of the chunk */
	text: string;
	/** Metadata for filtering and context */
	metadata: ChunkMetadata;
	/** Optional custom embedding text (if different from display text) */
	embeddingText?: string;
}

/**
 * Options for the chunking algorithm.
 */
export interface ChunkOptions {
	/**
	 * Minimum number of lines before creating a chunk.
	 * Helps avoid very small chunks.
	 * @default 1
	 */
	minLines?: number;

	/**
	 * Soft minimum character limit for chunks.
	 * Chunker will try to create chunks at least this size.
	 * @default 100
	 */
	minCharsSoftLimit?: number;

	/**
	 * Soft maximum character limit for chunks.
	 * Chunker will try to split at natural boundaries before this limit.
	 * @default 1000
	 */
	maxCharsSoftLimit?: number;

	/**
	 * Hard maximum character limit for chunks.
	 * Chunks will be force-split at this limit.
	 * @default 4000
	 */
	maxCharsHardLimit?: number;

	/**
	 * Primary delimiter for splitting text into chunks.
	 * @default "\n\n" (paragraph breaks)
	 */
	delimiter?: string;

	/**
	 * Secondary delimiters to try when primary doesn't work.
	 * @default ["\n", ". ", ", "]
	 */
	fallbackDelimiters?: string[];

	/**
	 * Whether to preserve heading context in each chunk.
	 * When true, includes the most recent heading at the start of each chunk.
	 * @default true
	 */
	preserveHeadingContext?: boolean;

	/**
	 * Overlap characters between chunks for context continuity.
	 * @default 50
	 */
	overlapChars?: number;
}

/**
 * Options for content extraction and chunking.
 */
export interface RagExtractionOptions {
	/**
	 * Whether to include metadata with each chunk.
	 * @default true
	 */
	includeMetadata?: boolean;

	/**
	 * Field names to include in extraction.
	 * If not specified, all text-bearing fields are included.
	 */
	includeFields?: string[];

	/**
	 * Field names to exclude from extraction.
	 */
	excludeFields?: string[];

	/**
	 * Whether to extract text from rich text fields.
	 * @default true
	 */
	extractRichText?: boolean;

	/**
	 * Whether to extract text from JSON fields.
	 * @default true
	 */
	extractJson?: boolean;

	/**
	 * Whether to include reference context (titles of referenced entries).
	 * Requires passing resolved references.
	 * @default true
	 */
	includeReferenceContext?: boolean;

	/**
	 * Chunking algorithm options.
	 */
	chunkOptions?: ChunkOptions;

	/**
	 * Custom prefix for each chunk (e.g., for entry context).
	 * Supports placeholders: {contentType}, {title}, {slug}
	 */
	chunkPrefix?: string;

	/**
	 * Custom suffix for each chunk.
	 */
	chunkSuffix?: string;

	/**
	 * Whether to create a separate "summary" chunk with key fields.
	 * @default false
	 */
	createSummaryChunk?: boolean;

	/**
	 * Fields to include in the summary chunk.
	 * @default ["title", first searchable field]
	 */
	summaryFields?: string[];
}

/**
 * Result of content extraction before chunking.
 */
export interface ExtractedContent {
	/** Combined text content from all fields */
	fullText: string;
	/** Text content organized by field name */
	fieldTexts: Record<string, string>;
	/** Entry title (if available) */
	title?: string;
	/** Referenced entry IDs found in content */
	referencedEntryIds: string[];
	/** Referenced media IDs found in content */
	referencedMediaIds: string[];
	/** Source field information for tracking */
	sourceInfo: Array<{
		fieldName: string;
		fieldLabel: string;
		fieldType: string;
		charCount: number;
	}>;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CHUNK_OPTIONS: Required<ChunkOptions> = {
	minLines: 1,
	minCharsSoftLimit: 100,
	maxCharsSoftLimit: 1000,
	maxCharsHardLimit: 4000,
	delimiter: "\n\n",
	fallbackDelimiters: ["\n", ". ", ", "],
	preserveHeadingContext: true,
	overlapChars: 50,
};

const DEFAULT_EXTRACTION_OPTIONS: Required<RagExtractionOptions> = {
	includeMetadata: true,
	includeFields: [],
	excludeFields: [],
	extractRichText: true,
	extractJson: true,
	includeReferenceContext: true,
	chunkOptions: DEFAULT_CHUNK_OPTIONS,
	chunkPrefix: "",
	chunkSuffix: "",
	createSummaryChunk: false,
	summaryFields: [],
};

// =============================================================================
// Text Extraction Functions
// =============================================================================

/**
 * Extracts plain text from a rich text field value.
 *
 * Handles common rich text formats:
 * - HTML strings (strips tags)
 * - ProseMirror/Tiptap JSON structure
 * - Markdown strings
 * - Plain text strings
 *
 * @param value - The rich text field value
 * @returns Plain text content
 */
export function extractTextFromRichText(value: unknown): string {
	if (value === null || value === undefined) {
		return "";
	}

	// Handle string values (HTML, Markdown, or plain text)
	if (typeof value === "string") {
		return stripHtmlTags(value);
	}

	// Handle ProseMirror/Tiptap JSON structure
	if (typeof value === "object" && value !== null) {
		const obj = value as Record<string, unknown>;

		// Check for ProseMirror doc structure
		if (obj.type === "doc" && Array.isArray(obj.content)) {
			return extractTextFromProseMirrorDoc(obj);
		}

		// Check for array of blocks
		if (Array.isArray(value)) {
			return value.map((block) => extractTextFromRichText(block)).join("\n\n");
		}

		// Generic object - try to find text content
		if ("text" in obj && typeof obj.text === "string") {
			return obj.text;
		}

		if ("content" in obj && typeof obj.content === "string") {
			return obj.content;
		}
	}

	return "";
}

/**
 * Extracts text from a ProseMirror document structure.
 */
function extractTextFromProseMirrorDoc(doc: Record<string, unknown>): string {
	const content = doc.content as unknown[];
	if (!Array.isArray(content)) {
		return "";
	}

	const textParts: string[] = [];

	for (const node of content) {
		if (typeof node !== "object" || node === null) continue;

		const nodeObj = node as Record<string, unknown>;
		const nodeType = nodeObj.type as string;

		switch (nodeType) {
			case "paragraph":
			case "heading":
				textParts.push(extractTextFromProseMirrorNode(nodeObj));
				break;

			case "bulletList":
			case "orderedList":
				textParts.push(extractTextFromProseMirrorList(nodeObj));
				break;

			case "blockquote": {
				const quoteText = extractTextFromProseMirrorDoc(nodeObj);
				textParts.push(`"${quoteText}"`);
				break;
			}

			case "codeBlock":
				if (nodeObj.content && Array.isArray(nodeObj.content)) {
					const codeText = (nodeObj.content as Array<{ text?: string }>)
						.map((c) => c.text || "")
						.join("");
					textParts.push(codeText);
				}
				break;

			case "horizontalRule":
				// Skip horizontal rules
				break;

			default:
				// Try generic extraction
				if (nodeObj.content) {
					textParts.push(extractTextFromProseMirrorDoc(nodeObj));
				}
		}
	}

	return textParts.filter(Boolean).join("\n\n");
}

/**
 * Extracts text from a ProseMirror node with inline content.
 */
function extractTextFromProseMirrorNode(node: Record<string, unknown>): string {
	const content = node.content as unknown[];
	if (!Array.isArray(content)) {
		return "";
	}

	return content
		.map((child) => {
			if (typeof child !== "object" || child === null) return "";
			const childObj = child as Record<string, unknown>;

			if (childObj.type === "text") {
				return (childObj.text as string) || "";
			}

			// Handle inline nodes with content
			if (childObj.content) {
				return extractTextFromProseMirrorNode(childObj);
			}

			return "";
		})
		.join("");
}

/**
 * Extracts text from a ProseMirror list node.
 */
function extractTextFromProseMirrorList(list: Record<string, unknown>): string {
	const items = list.content as unknown[];
	if (!Array.isArray(items)) {
		return "";
	}

	return items
		.map((item, _index) => {
			if (typeof item !== "object" || item === null) return "";
			const itemObj = item as Record<string, unknown>;

			const itemText = extractTextFromProseMirrorDoc(itemObj);
			return `- ${itemText}`;
		})
		.join("\n");
}

/**
 * Strips HTML tags from a string, preserving structure where possible.
 */
export function stripHtmlTags(html: string): string {
	if (!html) return "";

	// First, add newlines for block elements
	let text = html
		.replace(/<\/?(p|div|br|h[1-6]|li|tr)[^>]*>/gi, "\n")
		.replace(/<\/?(ul|ol|table|blockquote)[^>]*>/gi, "\n\n");

	// Remove remaining HTML tags
	text = text.replace(/<[^>]*>/g, "");

	// Decode common HTML entities
	text = text
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&mdash;/g, "—")
		.replace(/&ndash;/g, "–");

	// Clean up whitespace
	text = text
		.split("\n")
		.map((line) => line.trim())
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

	return text;
}

/**
 * Extracts text from a JSON field value.
 *
 * Recursively extracts string values from objects and arrays.
 * Useful for structured data fields that may contain text content.
 *
 * @param value - The JSON field value
 * @param maxDepth - Maximum recursion depth
 * @returns Extracted text content
 */
export function extractTextFromJson(
	value: unknown,
	maxDepth: number = 5,
): string {
	if (maxDepth <= 0) return "";

	if (value === null || value === undefined) {
		return "";
	}

	if (typeof value === "string") {
		return value;
	}

	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}

	if (Array.isArray(value)) {
		return value
			.map((item) => extractTextFromJson(item, maxDepth - 1))
			.filter(Boolean)
			.join(", ");
	}

	if (typeof value === "object") {
		const obj = value as Record<string, unknown>;
		const textParts: string[] = [];

		// Prioritize common text field names
		const priorityKeys = [
			"text",
			"content",
			"value",
			"label",
			"title",
			"name",
			"description",
		];
		const seenKeys = new Set<string>();

		for (const key of priorityKeys) {
			if (key in obj) {
				const extracted = extractTextFromJson(obj[key], maxDepth - 1);
				if (extracted) {
					textParts.push(extracted);
					seenKeys.add(key);
				}
			}
		}

		// Then process remaining keys
		for (const [key, val] of Object.entries(obj)) {
			if (seenKeys.has(key)) continue;
			// Skip internal/system keys
			if (key.startsWith("_") || key.startsWith("$")) continue;

			const extracted = extractTextFromJson(val, maxDepth - 1);
			if (extracted) {
				textParts.push(extracted);
			}
		}

		return textParts.join(" ");
	}

	return "";
}

/**
 * Extracts text from a select or multiSelect field value.
 */
export function extractTextFromSelect(value: unknown): string {
	if (value === null || value === undefined) {
		return "";
	}

	if (typeof value === "string") {
		return value;
	}

	if (Array.isArray(value)) {
		return value.filter((v) => typeof v === "string").join(", ");
	}

	return "";
}

// =============================================================================
// Content Extraction
// =============================================================================

/**
 * Extracts text content from a content entry based on its content type schema.
 *
 * This function:
 * 1. Iterates through fields defined in the content type
 * 2. Extracts text from each field based on its type
 * 3. Tracks references (content and media)
 * 4. Builds a combined text representation
 *
 * @param entry - The content entry to extract from
 * @param contentType - The content type definition
 * @param options - Extraction options
 * @param resolvedReferences - Optional map of resolved reference information
 * @returns Extracted content with metadata
 *
 * @example
 * ```typescript
 * const extracted = extractContent(entry, contentType, {
 *   includeFields: ["title", "content", "excerpt"],
 *   extractRichText: true,
 * });
 *
 * console.log(extracted.fullText);
 * // "My Blog Post\n\nThis is the main content...\n\nA brief excerpt."
 * ```
 */
export function extractContent(
	entry: ContentEntryInfo,
	contentType: ContentTypeInfo,
	options: Partial<RagExtractionOptions> = {},
	resolvedReferences?: Map<string, ResolvedReferenceInfo>,
): ExtractedContent {
	const opts = { ...DEFAULT_EXTRACTION_OPTIONS, ...options };
	const data = entry.data || {};

	const fieldTexts: Record<string, string> = {};
	const sourceInfo: ExtractedContent["sourceInfo"] = [];
	const referencedEntryIds: string[] = [];
	const referencedMediaIds: string[] = [];

	let title: string | undefined;

	// Determine which fields to process
	const fieldsToProcess = contentType.fields.filter((field) => {
		// Check include list
		if (opts.includeFields && opts.includeFields.length > 0) {
			if (!opts.includeFields.includes(field.name)) return false;
		}

		// Check exclude list
		if (opts.excludeFields && opts.excludeFields.length > 0) {
			if (opts.excludeFields.includes(field.name)) return false;
		}

		return true;
	});

	// Process each field
	for (const field of fieldsToProcess) {
		const value = data[field.name];
		if (value === null || value === undefined) continue;

		let extractedText = "";

		switch (field.type) {
			case "text":
				extractedText = typeof value === "string" ? value : String(value);
				break;

			case "richText":
				if (opts.extractRichText) {
					extractedText = extractTextFromRichText(value);
				}
				break;

			case "json":
				if (opts.extractJson) {
					extractedText = extractTextFromJson(value);
				}
				break;

			case "select":
			case "multiSelect":
				extractedText = extractTextFromSelect(value);
				break;

			case "reference": {
				// Track reference IDs
				const refIds = extractReferenceIds(value, field);
				referencedEntryIds.push(...refIds);

				// Include reference context if available
				if (opts.includeReferenceContext && resolvedReferences) {
					const refTexts = refIds
						.map((id) => {
							const ref = resolvedReferences.get(id);
							if (ref && ref.title) {
								return `[${ref.title}]`;
							}
							return null;
						})
						.filter(Boolean);

					if (refTexts.length > 0) {
						extractedText = `Referenced: ${refTexts.join(", ")}`;
					}
				}
				break;
			}

			case "media": {
				// Track media IDs
				const mediaIds = extractMediaIds(value, field);
				referencedMediaIds.push(...mediaIds);
				// Media doesn't contribute to text content
				break;
			}

			case "number":
			case "boolean":
			case "date":
			case "datetime":
				// These can optionally be included as context
				extractedText = formatFieldValue(value, field.type);
				break;

			default:
				// Unknown field type - try generic extraction
				if (typeof value === "string") {
					extractedText = value;
				}
		}

		if (extractedText) {
			fieldTexts[field.name] = extractedText;
			sourceInfo.push({
				fieldName: field.name,
				fieldLabel: field.label,
				fieldType: field.type,
				charCount: extractedText.length,
			});

			// Extract title from title field
			if (field.name === contentType.titleField) {
				title = extractedText;
			}
		}
	}

	// Build full text with field labels for context
	const fullTextParts: string[] = [];

	// Add title first if available
	if (title) {
		fullTextParts.push(title);
	}

	// Add other fields
	for (const field of fieldsToProcess) {
		if (field.name === contentType.titleField) continue; // Already added
		const text = fieldTexts[field.name];
		if (text) {
			fullTextParts.push(text);
		}
	}

	return {
		fullText: fullTextParts.join("\n\n"),
		fieldTexts,
		title,
		referencedEntryIds,
		referencedMediaIds,
		sourceInfo,
	};
}

/**
 * Extracts reference IDs from a reference field value.
 */
function extractReferenceIds(value: unknown, field: FieldDefinition): string[] {
	if (value === null || value === undefined) {
		return [];
	}

	const isMultiple = field.options?.multiple === true;

	if (isMultiple && Array.isArray(value)) {
		return value.filter((v) => typeof v === "string");
	}

	if (typeof value === "string") {
		return [value];
	}

	return [];
}

/**
 * Extracts media IDs from a media field value.
 */
function extractMediaIds(value: unknown, field: FieldDefinition): string[] {
	if (value === null || value === undefined) {
		return [];
	}

	const isMultiple = field.options?.multiple === true;

	if (isMultiple && Array.isArray(value)) {
		return value.filter((v) => typeof v === "string");
	}

	if (typeof value === "string") {
		return [value];
	}

	return [];
}

/**
 * Formats a field value for text representation.
 */
function formatFieldValue(value: unknown, fieldType: string): string {
	if (value === null || value === undefined) {
		return "";
	}

	switch (fieldType) {
		case "number":
			return typeof value === "number" ? value.toString() : String(value);

		case "boolean":
			return value ? "Yes" : "No";

		case "date":
		case "datetime":
			if (typeof value === "string") {
				return value;
			}
			if (typeof value === "number") {
				return new Date(value).toISOString();
			}
			return String(value);

		default:
			return String(value);
	}
}

// =============================================================================
// Text Chunking
// =============================================================================

/**
 * Splits text into semantic chunks optimized for embedding.
 *
 * The algorithm:
 * 1. First tries to split on paragraph breaks (default delimiter)
 * 2. Falls back to line breaks if paragraphs are too large
 * 3. Falls back to sentence boundaries if lines are too large
 * 4. Force-splits at hard limit if necessary
 * 5. Optionally preserves heading context
 *
 * @param text - The text to chunk
 * @param options - Chunking options
 * @returns Array of text chunks
 *
 * @example
 * ```typescript
 * const chunks = chunkText(longArticle, {
 *   maxCharsSoftLimit: 1000,
 *   preserveHeadingContext: true,
 * });
 * ```
 */
export function chunkText(
	text: string,
	options: Partial<ChunkOptions> = {},
): string[] {
	const opts = { ...DEFAULT_CHUNK_OPTIONS, ...options };

	if (!text || text.trim().length === 0) {
		return [];
	}

	// If text is small enough, return as single chunk
	if (text.length <= opts.maxCharsSoftLimit) {
		return [text.trim()];
	}

	const chunks: string[] = [];
	let currentHeading: string | null = null;

	// Split by primary delimiter
	let segments = text.split(opts.delimiter);

	// If we have very few segments, try secondary splitting
	if (segments.length <= 2 && text.length > opts.maxCharsSoftLimit) {
		for (const fallback of opts.fallbackDelimiters) {
			const fallbackSegments = text.split(fallback);
			if (fallbackSegments.length > segments.length) {
				segments = fallbackSegments;
				break;
			}
		}
	}

	let currentChunk = "";

	for (const segment of segments) {
		const trimmedSegment = segment.trim();
		if (!trimmedSegment) continue;

		// Detect headings (lines that look like titles)
		const isHeading = detectHeading(trimmedSegment);
		if (isHeading && opts.preserveHeadingContext) {
			currentHeading = trimmedSegment;
		}

		// Check if adding this segment would exceed soft limit
		const potentialChunk = currentChunk
			? `${currentChunk}\n\n${trimmedSegment}`
			: trimmedSegment;

		if (potentialChunk.length > opts.maxCharsSoftLimit && currentChunk) {
			// Save current chunk
			chunks.push(finalizeChunk(currentChunk, currentHeading, opts));

			// Start new chunk, potentially with heading context
			if (opts.preserveHeadingContext && currentHeading && !isHeading) {
				currentChunk = `${currentHeading}\n\n${trimmedSegment}`;
			} else {
				currentChunk = trimmedSegment;
			}
		} else {
			currentChunk = potentialChunk;
		}

		// Handle segments that are too large even alone
		if (currentChunk.length > opts.maxCharsHardLimit) {
			const subChunks = forceSplitText(currentChunk, opts);
			chunks.push(...subChunks.slice(0, -1));
			currentChunk = subChunks[subChunks.length - 1] || "";
		}
	}

	// Don't forget the last chunk
	if (currentChunk.trim()) {
		chunks.push(finalizeChunk(currentChunk, null, opts));
	}

	return chunks;
}

/**
 * Detects if a text segment is likely a heading.
 */
function detectHeading(text: string): boolean {
	const trimmed = text.trim();

	// Short lines that don't end with sentence punctuation are likely headings
	if (trimmed.length < 100 && !trimmed.match(/[.!?]$/)) {
		// Check if it starts with heading patterns
		if (
			trimmed.match(/^#{1,6}\s/) || // Markdown headings
			trimmed.match(/^[A-Z][\w\s]+:?$/) || // Title Case lines
			trimmed.match(/^\d+\.\s+[A-Z]/)
		) {
			// Numbered sections
			return true;
		}
	}

	return false;
}

/**
 * Finalizes a chunk by adding overlap if needed.
 */
function finalizeChunk(
	chunk: string,
	_heading: string | null,
	_opts: Required<ChunkOptions>,
): string {
	return chunk.trim();
}

/**
 * Force-splits text that exceeds the hard limit.
 */
function forceSplitText(text: string, opts: Required<ChunkOptions>): string[] {
	const chunks: string[] = [];
	let remaining = text;

	while (remaining.length > opts.maxCharsHardLimit) {
		// Try to find a good split point
		let splitPoint = opts.maxCharsSoftLimit;

		// Look for sentence boundary
		const sentenceEnd = remaining.lastIndexOf(". ", splitPoint);
		if (sentenceEnd > opts.minCharsSoftLimit) {
			splitPoint = sentenceEnd + 1;
		} else {
			// Look for word boundary
			const spacePoint = remaining.lastIndexOf(" ", splitPoint);
			if (spacePoint > opts.minCharsSoftLimit) {
				splitPoint = spacePoint;
			}
		}

		chunks.push(remaining.slice(0, splitPoint).trim());
		remaining = remaining.slice(splitPoint).trim();
	}

	if (remaining) {
		chunks.push(remaining);
	}

	return chunks;
}

// =============================================================================
// Main API Functions
// =============================================================================

/**
 * Processes a content entry into chunks ready for RAG indexing.
 *
 * This is the main function to use for preparing CMS content for @convex-dev/rag.
 * It combines extraction and chunking with full metadata.
 *
 * @param entry - The content entry to process
 * @param contentType - The content type definition
 * @param options - Extraction and chunking options
 * @param resolvedReferences - Optional map of resolved references for context
 * @returns Array of content chunks with metadata
 *
 * @example
 * ```typescript
 * // In a Convex action
 * export const indexEntry = action({
 *   args: { entryId: v.id("contentEntries") },
 *   handler: async (ctx, { entryId }) => {
 *     const entry = await ctx.runQuery(api.contentEntries.get, { id: entryId });
 *     const contentType = await ctx.runQuery(api.contentTypes.get, {
 *       id: entry.contentTypeId
 *     });
 *
 *     const chunks = chunkContentEntry(entry, contentType, {
 *       chunkOptions: { maxCharsSoftLimit: 800 },
 *       includeMetadata: true,
 *     });
 *
 *     // Add to RAG index
 *     await rag.add(ctx, {
 *       namespace: `cms:${contentType.name}`,
 *       key: entryId,
 *       chunks: chunks.map(c => c.text),
 *       title: entry.data.title,
 *     });
 *
 *     return { indexed: chunks.length };
 *   },
 * });
 * ```
 */
export function chunkContentEntry(
	entry: ContentEntryInfo,
	contentType: ContentTypeInfo,
	options: Partial<RagExtractionOptions> = {},
	resolvedReferences?: Map<string, ResolvedReferenceInfo>,
): ContentChunk[] {
	const opts = { ...DEFAULT_EXTRACTION_OPTIONS, ...options };

	// Extract content from the entry
	const extracted = extractContent(
		entry,
		contentType,
		opts,
		resolvedReferences,
	);

	if (!extracted.fullText) {
		return [];
	}

	// Apply prefix/suffix to full text before chunking
	let textToChunk = extracted.fullText;
	if (opts.chunkPrefix) {
		const prefix = opts.chunkPrefix
			.replace("{contentType}", contentType.displayName)
			.replace("{title}", extracted.title || entry.slug)
			.replace("{slug}", entry.slug);
		textToChunk = `${prefix}\n\n${textToChunk}`;
	}
	if (opts.chunkSuffix) {
		textToChunk = `${textToChunk}\n\n${opts.chunkSuffix}`;
	}

	// Chunk the text
	const textChunks = chunkText(textToChunk, opts.chunkOptions);

	// Build content chunks with metadata
	const chunks: ContentChunk[] = textChunks.map((text, index) => {
		const metadata: ChunkMetadata = {
			entryId: entry._id,
			contentType: contentType.name,
			contentTypeDisplayName: contentType.displayName,
			slug: entry.slug,
			status: entry.status,
			locale: entry.locale,
			sourceFields: extracted.sourceInfo.map((s) => s.fieldName),
			chunkIndex: index,
			totalChunks: textChunks.length,
			title: extracted.title,
			createdAt: new Date(entry._creationTime).toISOString(),
			firstPublishedAt: entry.firstPublishedAt
				? new Date(entry.firstPublishedAt).toISOString()
				: undefined,
			lastPublishedAt: entry.lastPublishedAt
				? new Date(entry.lastPublishedAt).toISOString()
				: undefined,
			version: entry.version,
			referencedEntryIds:
				extracted.referencedEntryIds.length > 0
					? extracted.referencedEntryIds
					: undefined,
			referencedMediaIds:
				extracted.referencedMediaIds.length > 0
					? extracted.referencedMediaIds
					: undefined,
			semanticType: detectSemanticType(text),
		};

		return opts.includeMetadata ? { text, metadata } : { text, metadata };
	});

	// Optionally create a summary chunk
	if (opts.createSummaryChunk && chunks.length > 0) {
		const summaryChunk = createSummaryChunk(
			entry,
			contentType,
			extracted,
			chunks.length,
		);
		chunks.unshift(summaryChunk);

		// Update chunk indices
		chunks.forEach((chunk, index) => {
			chunk.metadata.chunkIndex = index;
			chunk.metadata.totalChunks = chunks.length;
		});
	}

	return chunks;
}

/**
 * Detects the semantic type of a chunk based on its content.
 */
function detectSemanticType(text: string): ChunkSemanticType {
	const trimmed = text.trim();

	// Check for headings
	if (
		trimmed.match(/^#{1,6}\s/) ||
		(trimmed.length < 100 && !trimmed.includes("\n"))
	) {
		const lines = trimmed.split("\n");
		if (lines.length === 1 && !trimmed.match(/[.!?]$/)) {
			return lines[0].length < 20 ? "title" : "heading";
		}
	}

	// Check for lists
	if (trimmed.match(/^[-*]\s/m) || trimmed.match(/^\d+\.\s/m)) {
		return "list";
	}

	// Check for quotes
	if (trimmed.startsWith('"') || trimmed.startsWith(">")) {
		return "quote";
	}

	// Check for code
	if (trimmed.startsWith("```") || trimmed.match(/^\s{4}/m)) {
		return "code";
	}

	// Default to paragraph or mixed
	return trimmed.includes("\n\n") ? "mixed" : "paragraph";
}

/**
 * Creates a summary chunk from key fields.
 */
function createSummaryChunk(
	entry: ContentEntryInfo,
	contentType: ContentTypeInfo,
	extracted: ExtractedContent,
	totalChunks: number,
): ContentChunk {
	const summaryParts: string[] = [];

	// Add title
	if (extracted.title) {
		summaryParts.push(`Title: ${extracted.title}`);
	}

	// Add content type
	summaryParts.push(`Type: ${contentType.displayName}`);

	// Add status and dates
	summaryParts.push(`Status: ${entry.status}`);
	if (entry.lastPublishedAt) {
		summaryParts.push(
			`Published: ${new Date(entry.lastPublishedAt).toLocaleDateString()}`,
		);
	}

	// Add brief excerpt from first field
	const firstField = Object.keys(extracted.fieldTexts)[0];
	if (firstField && extracted.fieldTexts[firstField]) {
		const excerpt = extracted.fieldTexts[firstField].slice(0, 200);
		summaryParts.push(
			`Summary: ${excerpt}${excerpt.length >= 200 ? "..." : ""}`,
		);
	}

	return {
		text: summaryParts.join("\n"),
		metadata: {
			entryId: entry._id,
			contentType: contentType.name,
			contentTypeDisplayName: contentType.displayName,
			slug: entry.slug,
			status: entry.status,
			locale: entry.locale,
			sourceFields: ["_summary"],
			chunkIndex: 0,
			totalChunks: totalChunks + 1,
			title: extracted.title,
			createdAt: new Date(entry._creationTime).toISOString(),
			firstPublishedAt: entry.firstPublishedAt
				? new Date(entry.firstPublishedAt).toISOString()
				: undefined,
			lastPublishedAt: entry.lastPublishedAt
				? new Date(entry.lastPublishedAt).toISOString()
				: undefined,
			version: entry.version,
			semanticType: "field_value",
		},
	};
}

// =============================================================================
// Batch Processing Utilities
// =============================================================================

/**
 * Processes multiple content entries into chunks.
 *
 * Useful for batch indexing operations.
 *
 * @param entries - Array of content entries
 * @param contentTypes - Map of content type ID to content type
 * @param options - Extraction options
 * @returns Map of entry ID to chunks
 */
export function chunkMultipleEntries(
	entries: ContentEntryInfo[],
	contentTypes: Map<string, ContentTypeInfo>,
	options: Partial<RagExtractionOptions> = {},
): Map<string, ContentChunk[]> {
	const results = new Map<string, ContentChunk[]>();

	for (const entry of entries) {
		const contentType = contentTypes.get(entry.contentTypeId);
		if (!contentType) {
			console.warn(`Content type not found for entry ${entry._id}`);
			continue;
		}

		const chunks = chunkContentEntry(entry, contentType, options);
		results.set(entry._id, chunks);
	}

	return results;
}

/**
 * Calculates the total character count and chunk count for entries.
 *
 * Useful for estimating indexing costs.
 */
export function estimateChunkingStats(
	entries: ContentEntryInfo[],
	contentTypes: Map<string, ContentTypeInfo>,
	options: Partial<RagExtractionOptions> = {},
): {
	totalEntries: number;
	totalChunks: number;
	totalCharacters: number;
	averageChunksPerEntry: number;
	averageCharsPerChunk: number;
} {
	let totalChunks = 0;
	let totalCharacters = 0;

	for (const entry of entries) {
		const contentType = contentTypes.get(entry.contentTypeId);
		if (!contentType) continue;

		const chunks = chunkContentEntry(entry, contentType, options);
		totalChunks += chunks.length;
		totalCharacters += chunks.reduce((sum, c) => sum + c.text.length, 0);
	}

	return {
		totalEntries: entries.length,
		totalChunks,
		totalCharacters,
		averageChunksPerEntry:
			entries.length > 0 ? totalChunks / entries.length : 0,
		averageCharsPerChunk: totalChunks > 0 ? totalCharacters / totalChunks : 0,
	};
}

// =============================================================================
// Exports
// =============================================================================

export { DEFAULT_CHUNK_OPTIONS, DEFAULT_EXTRACTION_OPTIONS };
