/// <reference types="vite/client" />
/**
 * Test helpers for the Convex CMS component.
 *
 * This module provides utilities for testing applications that use the Convex CMS component:
 * - Component registration helpers for convex-test
 * - Mock data factories for content types, entries, and media assets
 * - Assertion utilities for validating CMS-specific structures
 *
 * @example
 * ```typescript
 * import { convexTest } from "convex-test";
 * import { describe, it, expect } from "vitest";
 * import {
 *   register,
 *   contentTypeFactory,
 *   contentEntryFactory,
 *   assertContentType,
 * } from "@convex-cms/core/test";
 * import schema from "./schema";
 *
 * const modules = import.meta.glob("./**\/*.ts");
 *
 * describe("my CMS tests", () => {
 *   it("creates content types correctly", async () => {
 *     const t = convexTest(schema, modules);
 *     register(t, "convexCms");
 *
 *     // Create test data using factories
 *     const blogPostType = contentTypeFactory.blogPost();
 *
 *     // Insert into test database
 *     const typeId = await t.run(async (ctx) => {
 *       return await ctx.db.insert("contentTypes", blogPostType);
 *     });
 *
 *     // Assert the structure is correct
 *     const result = await t.run(async (ctx) => {
 *       return await ctx.db.get(typeId);
 *     });
 *     assertContentType(result);
 *   });
 * });
 * ```
 *
 * @module
 */

import type { TestConvex } from "convex-test";
import type { GenericSchema, SchemaDefinition } from "convex/server";
import type { GenericId } from "convex/values";
import schema from "./component/schema.js";
import type {
	FieldType,
	ContentStatus,
	MediaType,
} from "./component/validators.js";

// Generic ID type alias for convenience
type Id<TableName extends string> = GenericId<TableName>;

// Import all component modules for testing
const modules = import.meta.glob("./component/**/*.ts");

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Field definition for content types.
 */
export interface FieldDefinition {
	name: string;
	label: string;
	type: FieldType;
	required: boolean;
	searchable?: boolean;
	localized?: boolean;
	description?: string;
	defaultValue?: unknown;
	options?: FieldOptions;
}

/**
 * Field-specific options.
 */
export interface FieldOptions {
	// Text fields
	minLength?: number;
	maxLength?: number;
	pattern?: string;

	// Number fields
	min?: number;
	max?: number;
	step?: number;
	precision?: number;

	// Reference fields
	allowedContentTypes?: string[];
	multiple?: boolean;
	minItems?: number;

	// Media fields
	allowedMimeTypes?: string[];
	maxFileSize?: number;

	// Select fields
	options?: { value: string; label: string }[];

	// Rich text fields
	allowedBlocks?: string[];
	allowedMarks?: string[];
}

// =============================================================================
// Data Types for Test Factories (without system fields)
// =============================================================================

/**
 * These types represent the data you INSERT into the database,
 * derived from internal document types by omitting system fields.
 * This ensures test factories stay in sync with schema definitions.
 */
import type {
	ContentTypeInternal,
	ContentEntryInternal,
	MediaAssetInternal,
	MediaFolderInternal,
} from "./component/documentTypes.js";

/**
 * Content type data structure (without system fields).
 * Derived from ContentTypeInternal for type safety.
 */
export type ContentTypeData = Omit<
	ContentTypeInternal,
	"_id" | "_creationTime"
>;

/**
 * Content entry data structure (without system fields).
 * Derived from ContentEntryInternal for type safety.
 */
export type ContentEntryData = Omit<
	ContentEntryInternal,
	"_id" | "_creationTime"
>;

/**
 * Media asset data structure (without system fields).
 * Derived from MediaAssetInternal for type safety.
 */
export type MediaAssetData = Omit<MediaAssetInternal, "_id" | "_creationTime">;

/**
 * Media folder data structure (without system fields).
 * Derived from MediaFolderInternal for type safety.
 */
export type MediaFolderData = Omit<
	MediaFolderInternal,
	"_id" | "_creationTime"
>;

// =============================================================================
// Component Registration
// =============================================================================

/**
 * Register the Convex CMS component with a convex-test instance.
 *
 * @param t - The test convex instance from calling `convexTest()`
 * @param name - The name of the component as registered in convex.config.ts
 *               Defaults to "convexCms"
 *
 * @example
 * ```typescript
 * import { convexTest } from "convex-test";
 * import { register } from "@convex-cms/core/test";
 * import schema from "./schema";
 *
 * const modules = import.meta.glob("./**\/*.ts");
 *
 * test("my test", async () => {
 *   const t = convexTest(schema, modules);
 *   register(t, "convexCms");
 *   // Your tests here
 * });
 * ```
 */
export function register(
	t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
	name: string = "convexCms",
) {
	t.registerComponent(name, schema, modules);
}

// =============================================================================
// Field Factories
// =============================================================================

/**
 * Factory functions for creating common field definitions.
 * These produce valid field structures for use in content type definitions.
 */
export const fieldFactory = {
	/**
	 * Create a text field definition.
	 */
	text(
		name: string,
		label: string,
		options: {
			required?: boolean;
			searchable?: boolean;
			localized?: boolean;
			description?: string;
			defaultValue?: string;
			minLength?: number;
			maxLength?: number;
			pattern?: string;
		} = {},
	): FieldDefinition {
		return {
			name,
			label,
			type: "text",
			required: options.required ?? false,
			searchable: options.searchable,
			localized: options.localized,
			description: options.description,
			defaultValue: options.defaultValue,
			options:
				options.minLength !== undefined ||
				options.maxLength !== undefined ||
				options.pattern !== undefined
					? {
							minLength: options.minLength,
							maxLength: options.maxLength,
							pattern: options.pattern,
					  }
					: undefined,
		};
	},

	/**
	 * Create a rich text field definition.
	 */
	richText(
		name: string,
		label: string,
		options: {
			required?: boolean;
			searchable?: boolean;
			localized?: boolean;
			description?: string;
			allowedBlocks?: string[];
			allowedMarks?: string[];
		} = {},
	): FieldDefinition {
		return {
			name,
			label,
			type: "richText",
			required: options.required ?? false,
			searchable: options.searchable,
			localized: options.localized,
			description: options.description,
			options:
				options.allowedBlocks !== undefined ||
				options.allowedMarks !== undefined
					? {
							allowedBlocks: options.allowedBlocks,
							allowedMarks: options.allowedMarks,
					  }
					: undefined,
		};
	},

	/**
	 * Create a number field definition.
	 */
	number(
		name: string,
		label: string,
		options: {
			required?: boolean;
			description?: string;
			defaultValue?: number;
			min?: number;
			max?: number;
			step?: number;
			precision?: number;
		} = {},
	): FieldDefinition {
		return {
			name,
			label,
			type: "number",
			required: options.required ?? false,
			description: options.description,
			defaultValue: options.defaultValue,
			options:
				options.min !== undefined ||
				options.max !== undefined ||
				options.step !== undefined ||
				options.precision !== undefined
					? {
							min: options.min,
							max: options.max,
							step: options.step,
							precision: options.precision,
					  }
					: undefined,
		};
	},

	/**
	 * Create a boolean field definition.
	 */
	boolean(
		name: string,
		label: string,
		options: {
			required?: boolean;
			description?: string;
			defaultValue?: boolean;
		} = {},
	): FieldDefinition {
		return {
			name,
			label,
			type: "boolean",
			required: options.required ?? false,
			description: options.description,
			defaultValue: options.defaultValue,
		};
	},

	/**
	 * Create a date field definition.
	 */
	date(
		name: string,
		label: string,
		options: {
			required?: boolean;
			description?: string;
		} = {},
	): FieldDefinition {
		return {
			name,
			label,
			type: "date",
			required: options.required ?? false,
			description: options.description,
		};
	},

	/**
	 * Create a datetime field definition.
	 */
	datetime(
		name: string,
		label: string,
		options: {
			required?: boolean;
			description?: string;
		} = {},
	): FieldDefinition {
		return {
			name,
			label,
			type: "datetime",
			required: options.required ?? false,
			description: options.description,
		};
	},

	/**
	 * Create a reference field definition.
	 */
	reference(
		name: string,
		label: string,
		options: {
			required?: boolean;
			description?: string;
			allowedContentTypes?: string[];
			multiple?: boolean;
			minItems?: number;
		} = {},
	): FieldDefinition {
		return {
			name,
			label,
			type: "reference",
			required: options.required ?? false,
			description: options.description,
			options: {
				allowedContentTypes: options.allowedContentTypes,
				multiple: options.multiple,
				minItems: options.minItems,
			},
		};
	},

	/**
	 * Create a media field definition.
	 */
	media(
		name: string,
		label: string,
		options: {
			required?: boolean;
			description?: string;
			allowedMimeTypes?: string[];
			maxFileSize?: number;
			multiple?: boolean;
		} = {},
	): FieldDefinition {
		return {
			name,
			label,
			type: "media",
			required: options.required ?? false,
			description: options.description,
			options: {
				allowedMimeTypes: options.allowedMimeTypes,
				maxFileSize: options.maxFileSize,
				multiple: options.multiple,
			},
		};
	},

	/**
	 * Create a JSON field definition.
	 */
	json(
		name: string,
		label: string,
		options: {
			required?: boolean;
			description?: string;
			defaultValue?: unknown;
		} = {},
	): FieldDefinition {
		return {
			name,
			label,
			type: "json",
			required: options.required ?? false,
			description: options.description,
			defaultValue: options.defaultValue,
		};
	},

	/**
	 * Create a select field definition.
	 */
	select(
		name: string,
		label: string,
		selectOptions: { value: string; label: string }[],
		options: {
			required?: boolean;
			description?: string;
			defaultValue?: string;
		} = {},
	): FieldDefinition {
		return {
			name,
			label,
			type: "select",
			required: options.required ?? false,
			description: options.description,
			defaultValue: options.defaultValue,
			options: {
				options: selectOptions,
			},
		};
	},

	/**
	 * Create a multi-select field definition.
	 */
	multiSelect(
		name: string,
		label: string,
		selectOptions: { value: string; label: string }[],
		options: {
			required?: boolean;
			description?: string;
			defaultValue?: string[];
		} = {},
	): FieldDefinition {
		return {
			name,
			label,
			type: "multiSelect",
			required: options.required ?? false,
			description: options.description,
			defaultValue: options.defaultValue,
			options: {
				options: selectOptions,
			},
		};
	},
};

// =============================================================================
// Content Type Factories
// =============================================================================

/**
 * Factory functions for creating test content type data.
 * All factories return data suitable for inserting into the contentTypes table.
 */
export const contentTypeFactory = {
	/**
	 * Create a minimal valid content type.
	 */
	minimal(name: string = "test_type"): ContentTypeData {
		return {
			name,
			displayName: name
				.split("_")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" "),
			fields: [],
			isActive: true,
		};
	},

	/**
	 * Create a blog post content type with common fields.
	 */
	blogPost(overrides: Partial<ContentTypeData> = {}): ContentTypeData {
		return {
			name: "blog_post",
			displayName: "Blog Post",
			description: "A blog post content type for testing",
			fields: [
				fieldFactory.text("title", "Title", {
					required: true,
					searchable: true,
					maxLength: 200,
				}),
				fieldFactory.text("slug", "Slug", { required: true }),
				fieldFactory.richText("content", "Content", {
					required: true,
					searchable: true,
					localized: true,
				}),
				fieldFactory.text("excerpt", "Excerpt", {
					searchable: true,
					maxLength: 500,
				}),
				fieldFactory.media("featuredImage", "Featured Image", {
					allowedMimeTypes: ["image/*"],
				}),
				fieldFactory.reference("author", "Author", {
					allowedContentTypes: ["author"],
				}),
				fieldFactory.multiSelect(
					"tags",
					"Tags",
					[
						{ value: "tech", label: "Technology" },
						{ value: "news", label: "News" },
						{ value: "tutorial", label: "Tutorial" },
					],
					{},
				),
				fieldFactory.datetime("publishedAt", "Published At"),
			],
			icon: "📝",
			slugField: "title",
			titleField: "title",
			isActive: true,
			...overrides,
		};
	},

	/**
	 * Create a product content type for e-commerce testing.
	 */
	product(overrides: Partial<ContentTypeData> = {}): ContentTypeData {
		return {
			name: "product",
			displayName: "Product",
			description: "A product content type for testing",
			fields: [
				fieldFactory.text("name", "Product Name", {
					required: true,
					searchable: true,
				}),
				fieldFactory.text("sku", "SKU", { required: true }),
				fieldFactory.richText("description", "Description", {
					searchable: true,
				}),
				fieldFactory.number("price", "Price", {
					required: true,
					min: 0,
					precision: 2,
				}),
				fieldFactory.number("stock", "Stock Quantity", { min: 0 }),
				fieldFactory.media("images", "Product Images", {
					allowedMimeTypes: ["image/*"],
					multiple: true,
				}),
				fieldFactory.reference("category", "Category", {
					allowedContentTypes: ["category"],
				}),
				fieldFactory.select(
					"status",
					"Status",
					[
						{ value: "active", label: "Active" },
						{ value: "discontinued", label: "Discontinued" },
						{ value: "out_of_stock", label: "Out of Stock" },
					],
					{ required: true, defaultValue: "active" },
				),
				fieldFactory.json("metadata", "Metadata"),
			],
			slugField: "name",
			titleField: "name",
			isActive: true,
			...overrides,
		};
	},

	/**
	 * Create an author content type.
	 */
	author(overrides: Partial<ContentTypeData> = {}): ContentTypeData {
		return {
			name: "author",
			displayName: "Author",
			description: "An author content type for testing",
			fields: [
				fieldFactory.text("name", "Name", { required: true, searchable: true }),
				fieldFactory.text("email", "Email"),
				fieldFactory.richText("bio", "Biography"),
				fieldFactory.media("avatar", "Avatar", {
					allowedMimeTypes: ["image/*"],
				}),
				fieldFactory.json("socialLinks", "Social Links"),
			],
			slugField: "name",
			titleField: "name",
			isActive: true,
			...overrides,
		};
	},

	/**
	 * Create a category content type.
	 */
	category(overrides: Partial<ContentTypeData> = {}): ContentTypeData {
		return {
			name: "category",
			displayName: "Category",
			description: "A category content type for testing",
			fields: [
				fieldFactory.text("name", "Name", { required: true, searchable: true }),
				fieldFactory.text("description", "Description"),
				fieldFactory.media("icon", "Icon", { allowedMimeTypes: ["image/*"] }),
				fieldFactory.reference("parent", "Parent Category", {
					allowedContentTypes: ["category"],
				}),
				fieldFactory.number("sortOrder", "Sort Order", { defaultValue: 0 }),
			],
			slugField: "name",
			titleField: "name",
			isActive: true,
			...overrides,
		};
	},

	/**
	 * Create a page content type (singleton-compatible).
	 */
	page(overrides: Partial<ContentTypeData> = {}): ContentTypeData {
		return {
			name: "page",
			displayName: "Page",
			description: "A page content type for testing",
			fields: [
				fieldFactory.text("title", "Title", {
					required: true,
					searchable: true,
				}),
				fieldFactory.richText("content", "Content", {
					required: true,
					localized: true,
				}),
				fieldFactory.text("metaTitle", "Meta Title"),
				fieldFactory.text("metaDescription", "Meta Description", {
					maxLength: 160,
				}),
				fieldFactory.media("ogImage", "Open Graph Image", {
					allowedMimeTypes: ["image/*"],
				}),
			],
			slugField: "title",
			titleField: "title",
			isActive: true,
			...overrides,
		};
	},

	/**
	 * Create a singleton content type (e.g., for site settings).
	 */
	siteSettings(overrides: Partial<ContentTypeData> = {}): ContentTypeData {
		return {
			name: "site_settings",
			displayName: "Site Settings",
			description: "Global site settings (singleton)",
			fields: [
				fieldFactory.text("siteName", "Site Name", { required: true }),
				fieldFactory.text("tagline", "Tagline"),
				fieldFactory.media("logo", "Logo", { allowedMimeTypes: ["image/*"] }),
				fieldFactory.media("favicon", "Favicon", {
					allowedMimeTypes: ["image/*"],
				}),
				fieldFactory.json("socialLinks", "Social Links"),
				fieldFactory.json("analytics", "Analytics Config"),
			],
			singleton: true,
			titleField: "siteName",
			isActive: true,
			...overrides,
		};
	},

	/**
	 * Create a content type with all supported field types.
	 * Useful for comprehensive testing.
	 */
	allFieldTypes(overrides: Partial<ContentTypeData> = {}): ContentTypeData {
		return {
			name: "all_fields",
			displayName: "All Field Types",
			description: "A content type with every supported field type",
			fields: [
				fieldFactory.text("textField", "Text Field", { required: true }),
				fieldFactory.richText("richTextField", "Rich Text Field"),
				fieldFactory.number("numberField", "Number Field"),
				fieldFactory.boolean("booleanField", "Boolean Field"),
				fieldFactory.date("dateField", "Date Field"),
				fieldFactory.datetime("datetimeField", "Datetime Field"),
				fieldFactory.reference("referenceField", "Reference Field"),
				fieldFactory.media("mediaField", "Media Field"),
				fieldFactory.json("jsonField", "JSON Field"),
				fieldFactory.select("selectField", "Select Field", [
					{ value: "option1", label: "Option 1" },
					{ value: "option2", label: "Option 2" },
				]),
				fieldFactory.multiSelect("multiSelectField", "Multi Select Field", [
					{ value: "choice1", label: "Choice 1" },
					{ value: "choice2", label: "Choice 2" },
					{ value: "choice3", label: "Choice 3" },
				]),
			],
			slugField: "textField",
			titleField: "textField",
			isActive: true,
			...overrides,
		};
	},

	/**
	 * Create a custom content type with specified fields.
	 */
	custom(
		name: string,
		displayName: string,
		fields: FieldDefinition[],
		overrides: Partial<ContentTypeData> = {},
	): ContentTypeData {
		return {
			name,
			displayName,
			fields,
			isActive: true,
			...overrides,
		};
	},
};

// =============================================================================
// Content Entry Factories
// =============================================================================

let entryCounter = 0;

/**
 * Factory functions for creating test content entry data.
 * All factories return data suitable for inserting into the contentEntries table.
 *
 * Note: You'll need to provide a valid contentTypeId when inserting into the database.
 */
export const contentEntryFactory = {
	/**
	 * Reset the internal counter used for generating unique slugs.
	 * Call this in beforeEach() if you need predictable slug values.
	 */
	resetCounter(): void {
		entryCounter = 0;
	},

	/**
	 * Create a minimal valid content entry.
	 */
	minimal(
		contentTypeId: Id<"contentTypes">,
		overrides: Partial<ContentEntryData> = {},
	): ContentEntryData {
		entryCounter++;
		return {
			contentTypeId,
			slug: `test-entry-${entryCounter}`,
			status: "draft",
			data: {},
			version: 1,
			...overrides,
		};
	},

	/**
	 * Create a draft content entry.
	 */
	draft(
		contentTypeId: Id<"contentTypes">,
		data: Record<string, unknown>,
		overrides: Partial<ContentEntryData> = {},
	): ContentEntryData {
		entryCounter++;
		return {
			contentTypeId,
			slug: `draft-${entryCounter}`,
			status: "draft",
			data,
			version: 1,
			...overrides,
		};
	},

	/**
	 * Create a published content entry.
	 */
	published(
		contentTypeId: Id<"contentTypes">,
		data: Record<string, unknown>,
		overrides: Partial<ContentEntryData> = {},
	): ContentEntryData {
		entryCounter++;
		const now = Date.now();
		return {
			contentTypeId,
			slug: `published-${entryCounter}`,
			status: "published",
			data,
			version: 1,
			firstPublishedAt: now,
			lastPublishedAt: now,
			...overrides,
		};
	},

	/**
	 * Create an archived content entry.
	 */
	archived(
		contentTypeId: Id<"contentTypes">,
		data: Record<string, unknown>,
		overrides: Partial<ContentEntryData> = {},
	): ContentEntryData {
		entryCounter++;
		return {
			contentTypeId,
			slug: `archived-${entryCounter}`,
			status: "archived",
			data,
			version: 1,
			...overrides,
		};
	},

	/**
	 * Create a scheduled content entry.
	 */
	scheduled(
		contentTypeId: Id<"contentTypes">,
		data: Record<string, unknown>,
		scheduledPublishAt: number,
		overrides: Partial<ContentEntryData> = {},
	): ContentEntryData {
		entryCounter++;
		return {
			contentTypeId,
			slug: `scheduled-${entryCounter}`,
			status: "scheduled",
			data,
			version: 1,
			scheduledPublishAt,
			...overrides,
		};
	},

	/**
	 * Create a soft-deleted content entry.
	 */
	deleted(
		contentTypeId: Id<"contentTypes">,
		data: Record<string, unknown>,
		overrides: Partial<ContentEntryData> = {},
	): ContentEntryData {
		entryCounter++;
		return {
			contentTypeId,
			slug: `deleted-${entryCounter}`,
			status: "draft",
			data,
			version: 1,
			deletedAt: Date.now(),
			...overrides,
		};
	},

	/**
	 * Create a localized content entry variant.
	 */
	localized(
		contentTypeId: Id<"contentTypes">,
		primaryEntryId: Id<"contentEntries">,
		locale: string,
		data: Record<string, unknown>,
		overrides: Partial<ContentEntryData> = {},
	): ContentEntryData {
		entryCounter++;
		return {
			contentTypeId,
			slug: `localized-${locale}-${entryCounter}`,
			status: "draft",
			data,
			locale,
			primaryEntryId,
			version: 1,
			...overrides,
		};
	},

	/**
	 * Create a blog post entry with typical data.
	 */
	blogPost(
		contentTypeId: Id<"contentTypes">,
		overrides: Partial<ContentEntryData> = {},
	): ContentEntryData {
		entryCounter++;
		return {
			contentTypeId,
			slug: `blog-post-${entryCounter}`,
			status: "draft",
			data: {
				title: `Test Blog Post ${entryCounter}`,
				content: `<p>This is the content of test blog post ${entryCounter}.</p>`,
				excerpt: `A brief excerpt for blog post ${entryCounter}.`,
				tags: ["tech", "tutorial"],
			},
			version: 1,
			searchText: `Test Blog Post ${entryCounter} content excerpt`,
			...overrides,
		};
	},

	/**
	 * Create a product entry with typical data.
	 */
	product(
		contentTypeId: Id<"contentTypes">,
		overrides: Partial<ContentEntryData> = {},
	): ContentEntryData {
		entryCounter++;
		const price = Math.floor(Math.random() * 10000) / 100 + 9.99;
		return {
			contentTypeId,
			slug: `product-${entryCounter}`,
			status: "draft",
			data: {
				name: `Test Product ${entryCounter}`,
				sku: `SKU-${entryCounter.toString().padStart(6, "0")}`,
				description: `<p>Description for test product ${entryCounter}.</p>`,
				price,
				stock: Math.floor(Math.random() * 100),
				status: "active",
			},
			version: 1,
			searchText: `Test Product ${entryCounter}`,
			...overrides,
		};
	},

	/**
	 * Create multiple entries at once.
	 */
	batch(
		contentTypeId: Id<"contentTypes">,
		count: number,
		factory: (
			contentTypeId: Id<"contentTypes">,
			index: number,
		) => Partial<ContentEntryData> = () => ({}),
	): ContentEntryData[] {
		return Array.from({ length: count }, (_, index) => {
			const custom = factory(contentTypeId, index);
			return contentEntryFactory.minimal(contentTypeId, custom);
		});
	},
};

// =============================================================================
// Media Asset Factories
// =============================================================================

let mediaCounter = 0;

/**
 * Factory functions for creating test media asset data.
 * All factories return data suitable for inserting into the mediaAssets table.
 *
 * Note: You'll need to provide a valid storageId when inserting into the database.
 */
export const mediaAssetFactory = {
	/**
	 * Reset the internal counter used for generating unique filenames.
	 */
	resetCounter(): void {
		mediaCounter = 0;
	},

	/**
	 * Create a minimal valid media asset.
	 */
	minimal(
		storageId: Id<"_storage">,
		overrides: Partial<MediaAssetData> = {},
	): MediaAssetData {
		mediaCounter++;
		return {
			storageId,
			filename: `file-${mediaCounter}.bin`,
			mimeType: "application/octet-stream",
			size: 1024,
			type: "other",
			...overrides,
		};
	},

	/**
	 * Create an image asset.
	 */
	image(
		storageId: Id<"_storage">,
		overrides: Partial<MediaAssetData> = {},
	): MediaAssetData {
		mediaCounter++;
		return {
			storageId,
			filename: `image-${mediaCounter}.jpg`,
			mimeType: "image/jpeg",
			size: 102400,
			type: "image",
			width: 1920,
			height: 1080,
			title: `Test Image ${mediaCounter}`,
			altText: `Alt text for test image ${mediaCounter}`,
			searchText: `Test Image ${mediaCounter}`,
			...overrides,
		};
	},

	/**
	 * Create a PNG image asset.
	 */
	png(
		storageId: Id<"_storage">,
		overrides: Partial<MediaAssetData> = {},
	): MediaAssetData {
		mediaCounter++;
		return {
			storageId,
			filename: `image-${mediaCounter}.png`,
			mimeType: "image/png",
			size: 204800,
			type: "image",
			width: 800,
			height: 600,
			...overrides,
		};
	},

	/**
	 * Create a video asset.
	 */
	video(
		storageId: Id<"_storage">,
		overrides: Partial<MediaAssetData> = {},
	): MediaAssetData {
		mediaCounter++;
		return {
			storageId,
			filename: `video-${mediaCounter}.mp4`,
			mimeType: "video/mp4",
			size: 10485760, // 10MB
			type: "video",
			width: 1920,
			height: 1080,
			duration: 120, // 2 minutes
			title: `Test Video ${mediaCounter}`,
			searchText: `Test Video ${mediaCounter}`,
			...overrides,
		};
	},

	/**
	 * Create an audio asset.
	 */
	audio(
		storageId: Id<"_storage">,
		overrides: Partial<MediaAssetData> = {},
	): MediaAssetData {
		mediaCounter++;
		return {
			storageId,
			filename: `audio-${mediaCounter}.mp3`,
			mimeType: "audio/mpeg",
			size: 5242880, // 5MB
			type: "audio",
			duration: 180, // 3 minutes
			title: `Test Audio ${mediaCounter}`,
			searchText: `Test Audio ${mediaCounter}`,
			...overrides,
		};
	},

	/**
	 * Create a document asset (PDF).
	 */
	document(
		storageId: Id<"_storage">,
		overrides: Partial<MediaAssetData> = {},
	): MediaAssetData {
		mediaCounter++;
		return {
			storageId,
			filename: `document-${mediaCounter}.pdf`,
			mimeType: "application/pdf",
			size: 1048576, // 1MB
			type: "document",
			title: `Test Document ${mediaCounter}`,
			searchText: `Test Document ${mediaCounter}`,
			...overrides,
		};
	},

	/**
	 * Create a soft-deleted media asset.
	 */
	deleted(
		storageId: Id<"_storage">,
		overrides: Partial<MediaAssetData> = {},
	): MediaAssetData {
		const asset = mediaAssetFactory.image(storageId, overrides);
		return {
			...asset,
			deletedAt: Date.now(),
		};
	},

	/**
	 * Create multiple assets at once.
	 */
	batch(
		storageIds: Id<"_storage">[],
		factory: (
			storageId: Id<"_storage">,
			index: number,
		) => Partial<MediaAssetData> = () => ({}),
	): MediaAssetData[] {
		return storageIds.map((storageId, index) => {
			const custom = factory(storageId, index);
			return mediaAssetFactory.minimal(storageId, custom);
		});
	},
};

// =============================================================================
// Media Folder Factories
// =============================================================================

let folderCounter = 0;

/**
 * Factory functions for creating test media folder data.
 */
export const mediaFolderFactory = {
	/**
	 * Reset the internal counter.
	 */
	resetCounter(): void {
		folderCounter = 0;
	},

	/**
	 * Create a root-level folder.
	 */
	root(
		name: string,
		overrides: Partial<MediaFolderData> = {},
	): MediaFolderData {
		folderCounter++;
		return {
			name,
			path: `/${name}`,
			...overrides,
		};
	},

	/**
	 * Create a child folder.
	 */
	child(
		name: string,
		parentId: Id<"mediaFolders">,
		parentPath: string,
		overrides: Partial<MediaFolderData> = {},
	): MediaFolderData {
		folderCounter++;
		return {
			name,
			parentId,
			path: `${parentPath}/${name}`,
			...overrides,
		};
	},

	/**
	 * Create a common folder structure for testing.
	 */
	common(): {
		images: MediaFolderData;
		videos: MediaFolderData;
		documents: MediaFolderData;
	} {
		return {
			images: mediaFolderFactory.root("images"),
			videos: mediaFolderFactory.root("videos"),
			documents: mediaFolderFactory.root("documents"),
		};
	},
};

// =============================================================================
// Assertion Utilities
// =============================================================================

/**
 * Assert that a value is a valid content type document.
 * Throws an error if the assertion fails.
 */
export function assertContentType(
	value: unknown,
	message?: string,
): asserts value is ContentTypeData & { _id: string; _creationTime: number } {
	if (!value || typeof value !== "object") {
		throw new Error(message ?? "Expected a content type object");
	}

	const obj = value as Record<string, unknown>;

	if (typeof obj.name !== "string") {
		throw new Error(message ?? "Content type missing required 'name' field");
	}

	if (typeof obj.displayName !== "string") {
		throw new Error(
			message ?? "Content type missing required 'displayName' field",
		);
	}

	if (!Array.isArray(obj.fields)) {
		throw new Error(message ?? "Content type missing required 'fields' array");
	}

	if (typeof obj.isActive !== "boolean") {
		throw new Error(
			message ?? "Content type missing required 'isActive' field",
		);
	}
}

/**
 * Assert that a value is a valid content entry document.
 * Throws an error if the assertion fails.
 */
export function assertContentEntry(
	value: unknown,
	message?: string,
): asserts value is ContentEntryData & { _id: string; _creationTime: number } {
	if (!value || typeof value !== "object") {
		throw new Error(message ?? "Expected a content entry object");
	}

	const obj = value as Record<string, unknown>;

	if (!obj.contentTypeId) {
		throw new Error(
			message ?? "Content entry missing required 'contentTypeId' field",
		);
	}

	if (typeof obj.slug !== "string") {
		throw new Error(message ?? "Content entry missing required 'slug' field");
	}

	if (typeof obj.status !== "string") {
		throw new Error(message ?? "Content entry missing required 'status' field");
	}

	const validStatuses = ["draft", "published", "archived", "scheduled"];
	if (!validStatuses.includes(obj.status)) {
		throw new Error(
			message ?? `Content entry has invalid status '${obj.status}'`,
		);
	}

	if (typeof obj.version !== "number") {
		throw new Error(
			message ?? "Content entry missing required 'version' field",
		);
	}
}

/**
 * Assert that a value is a valid media asset document.
 * Throws an error if the assertion fails.
 */
export function assertMediaAsset(
	value: unknown,
	message?: string,
): asserts value is MediaAssetData & { _id: string; _creationTime: number } {
	if (!value || typeof value !== "object") {
		throw new Error(message ?? "Expected a media asset object");
	}

	const obj = value as Record<string, unknown>;

	if (!obj.storageId) {
		throw new Error(
			message ?? "Media asset missing required 'storageId' field",
		);
	}

	if (typeof obj.filename !== "string") {
		throw new Error(message ?? "Media asset missing required 'filename' field");
	}

	if (typeof obj.mimeType !== "string") {
		throw new Error(message ?? "Media asset missing required 'mimeType' field");
	}

	if (typeof obj.size !== "number") {
		throw new Error(message ?? "Media asset missing required 'size' field");
	}

	const validTypes = ["image", "video", "audio", "document", "other"];
	if (typeof obj.type !== "string" || !validTypes.includes(obj.type)) {
		throw new Error(message ?? `Media asset has invalid type '${obj.type}'`);
	}
}

/**
 * Assert that a content entry has a specific status.
 */
export function assertStatus(
	entry: { status: string },
	expectedStatus: ContentStatus,
	message?: string,
): void {
	if (entry.status !== expectedStatus) {
		throw new Error(
			message ??
				`Expected entry status to be '${expectedStatus}', but got '${entry.status}'`,
		);
	}
}

/**
 * Assert that a content entry is published.
 */
export function assertPublished(
	entry: { status: string; lastPublishedAt?: number },
	message?: string,
): void {
	assertStatus(entry, "published", message);
	if (!entry.lastPublishedAt) {
		throw new Error(
			message ?? "Published entry should have 'lastPublishedAt' set",
		);
	}
}

/**
 * Assert that a document is soft-deleted.
 */
export function assertDeleted(
	doc: { deletedAt?: number },
	message?: string,
): void {
	if (!doc.deletedAt) {
		throw new Error(message ?? "Expected document to be soft-deleted");
	}
}

/**
 * Assert that a document is not soft-deleted.
 */
export function assertNotDeleted(
	doc: { deletedAt?: number },
	message?: string,
): void {
	if (doc.deletedAt) {
		throw new Error(message ?? "Expected document to not be soft-deleted");
	}
}

/**
 * Assert that a field definition has expected properties.
 */
export function assertField(
	fields: FieldDefinition[],
	fieldName: string,
	expectations: Partial<FieldDefinition>,
	message?: string,
): void {
	const field = fields.find((f) => f.name === fieldName);

	if (!field) {
		throw new Error(message ?? `Field '${fieldName}' not found`);
	}

	for (const [key, expectedValue] of Object.entries(expectations)) {
		const actualValue = field[key as keyof FieldDefinition];
		if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
			throw new Error(
				message ??
					`Field '${fieldName}' expected ${key} to be ${JSON.stringify(
						expectedValue,
					)}, but got ${JSON.stringify(actualValue)}`,
			);
		}
	}
}

// =============================================================================
// Test Data Helpers
// =============================================================================

/**
 * Generate a unique slug for testing.
 */
export function uniqueSlug(prefix: string = "test"): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate a unique name for testing.
 */
export function uniqueName(prefix: string = "test"): string {
	return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a timestamp in the past.
 */
export function pastTimestamp(daysAgo: number): number {
	return Date.now() - daysAgo * 24 * 60 * 60 * 1000;
}

/**
 * Create a timestamp in the future.
 */
export function futureTimestamp(daysFromNow: number): number {
	return Date.now() + daysFromNow * 24 * 60 * 60 * 1000;
}

// =============================================================================
// Exports
// =============================================================================

/**
 * Export schema and modules for advanced testing scenarios.
 */
export { schema, modules };

/**
 * Re-export type constants for convenience.
 */
export {
	fieldTypes,
	contentStatuses,
	mediaTypes,
} from "./component/validators.js";

/**
 * Default export for convenient importing.
 */
export default {
	// Registration
	register,
	schema,
	modules,

	// Factories
	fieldFactory,
	contentTypeFactory,
	contentEntryFactory,
	mediaAssetFactory,
	mediaFolderFactory,

	// Assertions
	assertContentType,
	assertContentEntry,
	assertMediaAsset,
	assertStatus,
	assertPublished,
	assertDeleted,
	assertNotDeleted,
	assertField,

	// Helpers
	uniqueSlug,
	uniqueName,
	pastTimestamp,
	futureTimestamp,
};
