/**
 * Derived TypeScript Types for CMS Documents
 *
 * This module provides TypeScript types derived from validators using Convex's `Infer<>`.
 * These types are the single source of truth for document shapes throughout the codebase.
 *
 * Two type variants are provided:
 * 1. **Internal types** (with `Id<TableName>`) - For use within Convex functions
 * 2. **Client types** (with `string` IDs) - For use at API boundaries where IDs are serialized
 *
 * @example
 * ```typescript
 * // Internal use (within Convex functions)
 * import type { ContentTypeInternal } from "./documentTypes.js";
 * const type: ContentTypeInternal = await ctx.db.get(id);
 *
 * // Client use (API boundary)
 * import type { ContentType } from "./documentTypes.js";
 * const type: ContentType = await cms.contentTypes.get(ctx, { id });
 * ```
 */

import type { Infer } from "convex/values";
import type { GenericId } from "convex/values";
import * as validators from "./validators.js";

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Recursively converts all `Id<T>` types to `string` for API boundary serialization.
 * This is used when passing documents from Convex functions to client code,
 * where Convex IDs are serialized as strings.
 */
export type StringifyIds<T> = T extends GenericId<infer _TableName>
	? string
	: T extends (infer U)[]
		? StringifyIds<U>[]
		: T extends Record<string, unknown>
			? { [K in keyof T]: StringifyIds<T[K]> }
			: T;

// =============================================================================
// Internal Types (with Id<TableName>)
// =============================================================================

/**
 * Content type document - internal use with typed IDs.
 */
export type ContentTypeInternal = Infer<typeof validators.contentTypeDoc>;

/**
 * Content entry document - internal use with typed IDs.
 */
export type ContentEntryInternal = Infer<typeof validators.contentEntryDoc>;

/**
 * Content version document - internal use with typed IDs.
 */
export type ContentVersionInternal = Infer<typeof validators.contentVersionDoc>;

/**
 * Media item document (unified asset/folder) - internal use with typed IDs.
 */
export type MediaItemInternal = Infer<typeof validators.mediaItemDoc>;

/**
 * Media asset document - internal use with typed IDs.
 * Extracts only the asset variant from the MediaItem union.
 */
export type MediaAssetInternal = Extract<MediaItemInternal, { kind: "asset" }>;

/**
 * Media folder document - internal use with typed IDs.
 * Extracts only the folder variant from the MediaItem union.
 */
export type MediaFolderInternal = Extract<MediaItemInternal, { kind: "folder" }>;

/**
 * Media variant document - internal use with typed IDs.
 */
export type MediaVariantInternal = Infer<typeof validators.mediaVariantDoc>;

/**
 * Taxonomy document - internal use with typed IDs.
 */
export type TaxonomyInternal = Infer<typeof validators.taxonomyDoc>;

/**
 * Taxonomy term document - internal use with typed IDs.
 */
export type TaxonomyTermInternal = Infer<typeof validators.taxonomyTermDoc>;

/**
 * Content entry tag junction - internal use with typed IDs.
 */
export type ContentEntryTagInternal = Infer<
	typeof validators.contentEntryTagDoc
>;

/**
 * CMS event document - internal use with typed IDs.
 */
export type CmsEventInternal = Infer<typeof validators.cmsEventDoc>;

/**
 * Trash config document - internal use with typed IDs.
 */
export type TrashConfigInternal = Infer<typeof validators.trashConfigDoc>;

/**
 * Webhook config document - internal use with typed IDs.
 */
export type WebhookConfigInternal = Infer<typeof validators.webhookConfigDoc>;

/**
 * Webhook delivery document - internal use with typed IDs.
 */
export type WebhookDeliveryInternal = Infer<
	typeof validators.webhookDeliveryDoc
>;

// =============================================================================
// Client Types (IDs as strings for API boundary)
// =============================================================================

/**
 * Content type - client-facing with string IDs.
 */
export type ContentType = StringifyIds<ContentTypeInternal>;

/**
 * Content entry - client-facing with string IDs.
 */
export type ContentEntry = StringifyIds<ContentEntryInternal>;

/**
 * Content version - client-facing with string IDs.
 */
export type ContentVersion = StringifyIds<ContentVersionInternal>;

/**
 * Media item (unified asset/folder) - client-facing with string IDs.
 */
export type MediaItem = StringifyIds<MediaItemInternal>;

/**
 * Media asset - client-facing with string IDs.
 * Extracts only the asset variant from the MediaItem union.
 */
export type MediaAsset = Extract<MediaItem, { kind: "asset" }>;

/**
 * Media folder - client-facing with string IDs.
 * Extracts only the folder variant from the MediaItem union.
 */
export type MediaFolder = Extract<MediaItem, { kind: "folder" }>;

/**
 * Media variant - client-facing with string IDs.
 */
export type MediaVariant = StringifyIds<MediaVariantInternal>;

/**
 * Taxonomy - client-facing with string IDs.
 */
export type Taxonomy = StringifyIds<TaxonomyInternal>;

/**
 * Taxonomy term - client-facing with string IDs.
 */
export type TaxonomyTerm = StringifyIds<TaxonomyTermInternal>;

/**
 * Content entry tag - client-facing with string IDs.
 */
export type ContentEntryTag = StringifyIds<ContentEntryTagInternal>;

/**
 * CMS event - client-facing with string IDs.
 */
export type CmsEvent = StringifyIds<CmsEventInternal>;

/**
 * Trash config - client-facing with string IDs.
 */
export type TrashConfig = StringifyIds<TrashConfigInternal>;

/**
 * Webhook config - client-facing with string IDs.
 */
export type WebhookConfig = StringifyIds<WebhookConfigInternal>;

/**
 * Webhook delivery - client-facing with string IDs.
 */
export type WebhookDelivery = StringifyIds<WebhookDeliveryInternal>;

// =============================================================================
// Field Definition Types (Client-Facing)
// =============================================================================

/**
 * Internal field definition type (with typed IDs).
 */
export type FieldDefinitionInternal = Infer<typeof validators.fieldDefinitionValidator>;

/**
 * Client-facing field definition type (IDs as strings).
 * Used at the API boundary where Convex IDs are serialized as strings.
 */
export type FieldDefinition = StringifyIds<FieldDefinitionInternal>;

// =============================================================================
// Extended Types
// =============================================================================

/**
 * Media variant with resolved URL.
 */
export type MediaVariantWithUrl = MediaVariant & {
	url: string | null;
};

/**
 * Trash item with deletion metadata.
 */
export type TrashItem = ContentEntry & {
	deletedDaysAgo: number;
	expiresAt?: number;
	contentTypeName?: string;
};

/**
 * Taxonomy term with children (for hierarchical display).
 */
export type TaxonomyTermWithChildren = TaxonomyTerm & {
	children: TaxonomyTermWithChildren[];
};
