import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const fieldTypes = [
	"text",
	"richText",
	"number",
	"boolean",
	"date",
	"datetime",
	"reference",
	"media",
	"json",
	"select",
	"multiSelect",
	"tags",
	"category",
	"money",
	"arrayObject",
] as const;

export const fieldTypeValidator = v.union(
	v.literal("text"),
	v.literal("richText"),
	v.literal("number"),
	v.literal("boolean"),
	v.literal("date"),
	v.literal("datetime"),
	v.literal("reference"),
	v.literal("media"),
	v.literal("json"),
	v.literal("select"),
	v.literal("multiSelect"),
	v.literal("tags"),
	v.literal("category"),
	v.literal("money"),
	v.literal("arrayObject"),
);

/**
 * Default content statuses for the built-in workflow.
 * Custom workflows can define additional statuses via defineWorkflow().
 */
export const contentStatuses = [
	"draft",
	"published",
	"archived",
	"scheduled",
] as const;

/**
 * Content status validator.
 *
 * Uses v.string() instead of a literal union to support custom workflow states.
 * Validation of allowed transitions happens at the application layer via
 * the WorkflowConfig (see src/client/workflows.ts).
 *
 * Built-in statuses: "draft", "published", "archived", "scheduled"
 * Custom statuses: Defined via defineWorkflow() in CMS config
 */
export const contentStatusValidator = v.string();

export const mediaTypes = [
	"image",
	"video",
	"audio",
	"document",
	"other",
] as const;

export const mediaTypeValidator = v.union(
	v.literal("image"),
	v.literal("video"),
	v.literal("audio"),
	v.literal("document"),
	v.literal("other"),
);

export const variantTypeValidator = v.union(
	v.literal("thumbnail"),
	v.literal("responsive"),
	v.literal("format"),
);

export const variantStatusValidator = v.union(
	v.literal("pending"),
	v.literal("processing"),
	v.literal("completed"),
	v.literal("failed"),
);

export const variantTypes = ["thumbnail", "responsive", "format"] as const;
export const variantStatuses = ["pending", "processing", "completed", "failed"] as const;
export const variantFormats = ["webp", "avif", "jpeg", "png"] as const;

export const baseFieldDefinition = {
	name: v.string(),
	label: v.string(),
	required: v.boolean(),
	searchable: v.optional(v.boolean()),
	localized: v.optional(v.boolean()),
	description: v.optional(v.string()),
	defaultValue: v.optional(v.any()),
	group: v.optional(v.string()),
};

export const textFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("text"),
	options: v.optional(v.object({
		minLength: v.optional(v.number()),
		maxLength: v.optional(v.number()),
		pattern: v.optional(v.string()),
		patternMessage: v.optional(v.string()),
		placeholder: v.optional(v.string()),
		multiline: v.optional(v.boolean()),
	})),
});

export const numberFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("number"),
	options: v.optional(v.object({
		min: v.optional(v.number()),
		max: v.optional(v.number()),
		step: v.optional(v.number()),
		precision: v.optional(v.number()),
		prefix: v.optional(v.string()),
		suffix: v.optional(v.string()),
	})),
});

export const booleanFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("boolean"),
	options: v.optional(v.object({
		trueLabel: v.optional(v.string()),
		falseLabel: v.optional(v.string()),
	})),
});

export const richTextFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("richText"),
	options: v.optional(v.object({
		allowedBlocks: v.optional(v.array(v.string())),
		allowedMarks: v.optional(v.array(v.string())),
		maxLength: v.optional(v.number()),
		placeholder: v.optional(v.string()),
	})),
});

export const mediaFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("media"),
	options: v.optional(v.object({
		mediaType: v.optional(mediaTypeValidator),
		allowedMimeTypes: v.optional(v.array(v.string())),
		maxFileSize: v.optional(v.number()),
		multiple: v.optional(v.boolean()),
		maxItems: v.optional(v.number()),
	})),
});

export const selectFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("select"),
	options: v.optional(v.object({
		options: v.optional(
			v.array(
				v.object({
					value: v.string(),
					label: v.string(),
				}),
			),
		),
	})),
});

export const tagsFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("tags"),
	options: v.optional(v.object({
		taxonomyId: v.optional(v.string()),
		taxonomyName: v.optional(v.string()),
		allowCreate: v.optional(v.boolean()),
		maxTags: v.optional(v.number()),
		minTags: v.optional(v.number()),
	})),
});

export const categoryFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("category"),
	options: v.optional(v.object({
		taxonomyId: v.optional(v.string()),
		taxonomyName: v.optional(v.string()),
		allowMultiple: v.optional(v.boolean()),
		maxSelections: v.optional(v.number()),
		depth: v.optional(v.number()),
	})),
});

export const jsonFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("json"),
	options: v.optional(v.object({
		schema: v.optional(v.any()),
	})),
});

export const referenceFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("reference"),
	options: v.optional(v.object({
		allowedContentTypes: v.optional(v.array(v.string())),
		multiple: v.optional(v.boolean()),
		minItems: v.optional(v.number()),
		maxItems: v.optional(v.number()),
	})),
});

export const multiSelectFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("multiSelect"),
	options: v.optional(v.object({
		options: v.optional(
			v.array(
				v.object({
					value: v.string(),
					label: v.string(),
				}),
			),
		),
		minSelections: v.optional(v.number()),
		maxSelections: v.optional(v.number()),
	})),
});

export const dateFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("date"),
	options: v.optional(v.object({
		min: v.optional(v.number()),
		max: v.optional(v.number()),
		format: v.optional(v.string()),
	})),
});

export const datetimeFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("datetime"),
	options: v.optional(v.object({
		min: v.optional(v.number()),
		max: v.optional(v.number()),
		timezone: v.optional(v.string()),
		format: v.optional(v.string()),
	})),
});

export const moneyFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("money"),
	options: v.optional(v.object({
		min: v.optional(v.number()),
		max: v.optional(v.number()),
		defaultCurrency: v.optional(v.string()),
		allowedCurrencies: v.optional(v.array(v.string())),
	})),
});

export const arrayObjectFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("arrayObject"),
	options: v.optional(v.object({
		subFields: v.optional(v.any()),
		itemLabel: v.optional(v.string()),
		maxItems: v.optional(v.number()),
		minItems: v.optional(v.number()),
	})),
});

export const fieldDefinitionValidator = v.union(
	textFieldDefinitionValidator,
	numberFieldDefinitionValidator,
	booleanFieldDefinitionValidator,
	richTextFieldDefinitionValidator,
	mediaFieldDefinitionValidator,
	selectFieldDefinitionValidator,
	multiSelectFieldDefinitionValidator,
	tagsFieldDefinitionValidator,
	categoryFieldDefinitionValidator,
	jsonFieldDefinitionValidator,
	dateFieldDefinitionValidator,
	datetimeFieldDefinitionValidator,
	referenceFieldDefinitionValidator,
	moneyFieldDefinitionValidator,
	arrayObjectFieldDefinitionValidator,
);

const contentTypeFields = {
	name: v.string(),
	displayName: v.string(),
	createdBy: v.string(),
	description: v.optional(v.string()),
	fields: v.array(fieldDefinitionValidator),
	icon: v.optional(v.string()),
	singleton: v.optional(v.boolean()),
	slugField: v.optional(v.string()),
	titleField: v.optional(v.string()),
	sortOrder: v.optional(v.number()),
	isActive: v.boolean(),
	deletedAt: v.optional(v.number()),
	updatedBy: v.optional(v.string()),
};

const contentEntryFields = {
	contentTypeName: v.string(),
	slug: v.string(),
	status: contentStatusValidator,
	data: v.any(),
	locale: v.optional(v.string()),
	primaryEntryId: v.optional(v.id("contentEntries")),
	version: v.number(),
	scheduledPublishAt: v.optional(v.number()),
	firstPublishedAt: v.optional(v.number()),
	lastPublishedAt: v.optional(v.number()),
	lockedBy: v.optional(v.string()),
	lockExpiresAt: v.optional(v.number()),
	deletedAt: v.optional(v.number()),
	createdBy: v.optional(v.string()),
	updatedBy: v.optional(v.string()),
	searchText: v.optional(v.string()),
};

const contentVersionFields = {
	entryId: v.id("contentEntries"),
	versionNumber: v.number(),
	data: v.any(),
	slug: v.string(),
	status: contentStatusValidator,
	changeDescription: v.optional(v.string()),
	createdBy: v.optional(v.string()),
	wasPublished: v.boolean(),
	publishedAt: v.optional(v.number()),
};

const mediaItemBaseFields = {
	name: v.string(),
	title: v.optional(v.string()),
	description: v.optional(v.string()),
	parentId: v.optional(v.id("mediaItems")),
	path: v.string(),
	tags: v.optional(v.array(v.string())),
	size: v.optional(v.number()),
	metadata: v.optional(v.record(v.string(), v.any())),
	deletedAt: v.optional(v.number()),
	createdBy: v.optional(v.string()),
	updatedBy: v.optional(v.string()),
	searchText: v.optional(v.string()),
};

const mediaAssetSpecificFields = {
	kind: v.literal("asset"),
	storageId: v.id("_storage"),
	mimeType: v.string(),
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	duration: v.optional(v.number()),
	altText: v.optional(v.string()),
};

const mediaFolderSpecificFields = {
	kind: v.literal("folder"),
	sortOrder: v.optional(v.number()),
};

export const mediaAssetItemValidator = v.object({
	...mediaItemBaseFields,
	...mediaAssetSpecificFields,
});

export const mediaFolderItemValidator = v.object({
	...mediaItemBaseFields,
	...mediaFolderSpecificFields,
});

export const mediaItemValidator = v.union(
	mediaAssetItemValidator,
	mediaFolderItemValidator,
);

const mediaVariantFields = {
	assetId: v.id("mediaItems"),
	storageId: v.id("_storage"),
	variantType: v.union(
		v.literal("thumbnail"),
		v.literal("responsive"),
		v.literal("format"),
	),
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	format: v.string(),
	mimeType: v.string(),
	size: v.number(),
	quality: v.optional(v.number()),
	preset: v.optional(v.string()),
	autoGenerated: v.boolean(),
	status: v.union(
		v.literal("pending"),
		v.literal("processing"),
		v.literal("completed"),
		v.literal("failed"),
	),
	errorMessage: v.optional(v.string()),
	processingStartedAt: v.optional(v.number()),
	processingCompletedAt: v.optional(v.number()),
	deletedAt: v.optional(v.number()),
	createdBy: v.optional(v.string()),
};

const taxonomyFields = {
	name: v.string(),
	displayName: v.string(),
	description: v.optional(v.string()),
	isHierarchical: v.boolean(),
	allowInlineCreation: v.boolean(),
	icon: v.optional(v.string()),
	sortOrder: v.optional(v.number()),
	isActive: v.boolean(),
	deletedAt: v.optional(v.number()),
	createdBy: v.optional(v.string()),
	updatedBy: v.optional(v.string()),
};

const taxonomyTermFields = {
	taxonomyId: v.id("taxonomies"),
	slug: v.string(),
	name: v.string(),
	description: v.optional(v.string()),
	parentId: v.optional(v.id("taxonomyTerms")),
	path: v.optional(v.string()),
	depth: v.number(),
	color: v.optional(v.string()),
	icon: v.optional(v.string()),
	sortOrder: v.optional(v.number()),
	usageCount: v.number(),
	deletedAt: v.optional(v.number()),
	createdBy: v.optional(v.string()),
	updatedBy: v.optional(v.string()),
	searchText: v.optional(v.string()),
};

const schema = defineSchema({
	contentTypes: defineTable({
		...contentTypeFields,
	})
		.index("by_name", ["name"])
		.index("by_active", ["isActive"])
		.index("by_deleted", ["deletedAt"]),
	contentEntries: defineTable({
		...contentEntryFields,
	})
		.index("by_content_type", ["contentTypeName"])
		.index("by_content_type_and_slug", ["contentTypeName", "slug"])
		.index("by_status", ["status"])
		.index("by_content_type_and_status", ["contentTypeName", "status"])
		.index("by_primary_entry", ["primaryEntryId"])
		.index("by_locale", ["locale"])
		.index("by_deleted", ["deletedAt"])
		.index("by_scheduled_publish", ["status", "scheduledPublishAt"])
		.index("by_locked", ["lockedBy"])
		.searchIndex("search_content", {
			searchField: "searchText",
			filterFields: ["contentTypeName", "status", "locale"],
		}),
	contentVersions: defineTable({
		...contentVersionFields,
	})
		.index("by_entry", ["entryId"])
		.index("by_entry_and_version", ["entryId", "versionNumber"])
		.index("by_entry_and_published", ["entryId", "wasPublished"]),
	mediaItems: defineTable(
		v.union(
			v.object({
				...mediaItemBaseFields,
				...mediaAssetSpecificFields,
			}),
			v.object({
				...mediaItemBaseFields,
				...mediaFolderSpecificFields,
			}),
		),
	)
		.index("by_parent", ["parentId"])
		.index("by_path", ["path"])
		.index("by_kind", ["kind"])
		.index("by_kind_and_parent", ["kind", "parentId"])
		.index("by_storage_id", ["storageId"])
		.index("by_mime_type", ["mimeType"])
		.index("by_deleted", ["deletedAt"])
		.searchIndex("search_media", {
			searchField: "searchText",
		}),
	mediaVariants: defineTable({
		...mediaVariantFields,
	})
		.index("by_asset", ["assetId"])
		.index("by_asset_and_type", ["assetId", "variantType"])
		.index("by_asset_and_preset", ["assetId", "preset"])
		.index("by_asset_and_format", ["assetId", "format"])
		.index("by_status", ["status"])
		.index("by_deleted", ["deletedAt"]),
	taxonomies: defineTable({
		...taxonomyFields,
	})
		.index("by_name", ["name"])
		.index("by_active", ["isActive"])
		.index("by_deleted", ["deletedAt"]),
	taxonomyTerms: defineTable({
		...taxonomyTermFields,
	})
		.index("by_taxonomy", ["taxonomyId"])
		.index("by_taxonomy_and_slug", ["taxonomyId", "slug"])
		.index("by_parent", ["parentId"])
		.index("by_taxonomy_and_path", ["taxonomyId", "path"])
		.index("by_deleted", ["deletedAt"])
		.index("by_taxonomy_and_usage", ["taxonomyId", "usageCount"])
		.searchIndex("search_terms", {
			searchField: "searchText",
			filterFields: ["taxonomyId"],
		}),
	contentEntryTags: defineTable({
		entryId: v.id("contentEntries"),
		termId: v.id("taxonomyTerms"),
		taxonomyId: v.id("taxonomies"),
		fieldName: v.string(),
		sortOrder: v.optional(v.number()),
	})
		.index("by_entry", ["entryId"])
		.index("by_term", ["termId"])
		.index("by_taxonomy", ["taxonomyId"])
		.index("by_entry_and_field", ["entryId", "fieldName"])
		.index("by_taxonomy_and_term", ["taxonomyId", "termId"]),
	mediaAssetTags: defineTable({
		mediaId: v.id("mediaItems"),
		termId: v.id("taxonomyTerms"),
		taxonomyId: v.id("taxonomies"),
		sortOrder: v.optional(v.number()),
	})
		.index("by_media", ["mediaId"])
		.index("by_term", ["termId"])
		.index("by_taxonomy", ["taxonomyId"])
		.index("by_media_and_taxonomy", ["mediaId", "taxonomyId"])
		.index("by_taxonomy_and_term", ["taxonomyId", "termId"]),
	cmsUserRoles: defineTable({
		externalUserId: v.string(),
		role: v.string(),
		displayName: v.optional(v.string()),
		email: v.optional(v.string()),
		avatarUrl: v.optional(v.string()),
		lastAccessedAt: v.optional(v.number()),
		createdAt: v.number(),
		createdBy: v.optional(v.string()),
		updatedAt: v.optional(v.number()),
		updatedBy: v.optional(v.string()),
		status: v.union(v.literal("active"), v.literal("invited"), v.literal("revoked")),
	})
		.index("by_external_user_id", ["externalUserId"])
		.index("by_role", ["role"])
		.index("by_status", ["status"]),
	trashConfig: defineTable({
		retentionDays: v.number(),
		autoCleanupEnabled: v.boolean(),
		lastCleanupAt: v.optional(v.number()),
		lastCleanupCount: v.optional(v.number()),
		updatedBy: v.optional(v.string()),
	}),
	cmsEvents: defineTable({
		eventType: v.string(),
		resourceType: v.union(
			v.literal("contentEntry"),
			v.literal("contentType"),
			v.literal("mediaAsset"),
			v.literal("mediaFolder"),
		),
		resourceId: v.string(),
		action: v.union(
			v.literal("created"),
			v.literal("updated"),
			v.literal("published"),
			v.literal("unpublished"),
			v.literal("deleted"),
			v.literal("restored"),
			v.literal("duplicated"),
			v.literal("scheduled"),
		),
		payload: v.any(),
		userId: v.optional(v.string()),
		processed: v.boolean(),
		processedAt: v.optional(v.number()),
		correlationId: v.optional(v.string()),
		metadata: v.optional(v.any()),
	})
		.index("by_event_type", ["eventType"])
		.index("by_resource", ["resourceType", "resourceId"])
		.index("by_processed", ["processed"])
		.index("by_user", ["userId"])
		.index("by_correlation_id", ["correlationId"]),
	webhookConfigs: defineTable({
		name: v.string(),
		description: v.optional(v.string()),
		url: v.string(),
		secret: v.optional(v.string()),
		eventTypes: v.array(v.string()),
		resourceTypes: v.optional(
			v.array(
				v.union(
					v.literal("contentEntry"),
					v.literal("contentType"),
					v.literal("mediaAsset"),
					v.literal("mediaFolder"),
				),
			),
		),
		contentTypes: v.optional(v.array(v.string())),
		headers: v.optional(v.any()),
		enabled: v.boolean(),
		maxRetries: v.optional(v.number()),
		timeoutMs: v.optional(v.number()),
		deletedAt: v.optional(v.number()),
		createdBy: v.optional(v.string()),
		updatedBy: v.optional(v.string()),
	})
		.index("by_enabled", ["enabled"])
		.index("by_deleted", ["deletedAt"]),
	webhookDeliveries: defineTable({
		webhookId: v.id("webhookConfigs"),
		eventId: v.id("cmsEvents"),
		eventType: v.string(),
		status: v.union(
			v.literal("pending"),
			v.literal("processing"),
			v.literal("delivered"),
			v.literal("failed"),
			v.literal("retrying"),
		),
		attemptCount: v.number(),
		maxAttempts: v.number(),
		lastAttemptAt: v.optional(v.number()),
		nextRetryAt: v.optional(v.number()),
		lastStatusCode: v.optional(v.number()),
		lastError: v.optional(v.string()),
		lastResponseBody: v.optional(v.string()),
		lastDurationMs: v.optional(v.number()),
		payload: v.any(),
		deliveredAt: v.optional(v.number()),
	})
		.index("by_webhook", ["webhookId"])
		.index("by_event", ["eventId"])
		.index("by_status", ["status"])
		.index("by_next_retry", ["status", "nextRetryAt"])
		.index("by_webhook_and_status", ["webhookId", "status"]),
	cmsSettings: defineTable({
		defaultLocale: v.string(),
		availableLocales: v.array(v.string()),
		updatedBy: v.optional(v.string()),
	}),
});

export default schema;

export const {
	contentTypes,
	contentEntries,
	contentVersions,
	mediaItems,
	mediaVariants,
	taxonomies,
	taxonomyTerms,
	contentEntryTags,
	mediaAssetTags,
	cmsEvents,
	webhookConfigs,
	webhookDeliveries,
	cmsSettings,
} = schema.tables;
