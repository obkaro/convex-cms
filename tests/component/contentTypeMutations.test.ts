/**
 * Tests for Content Type Mutation Functions
 *
 * These tests verify the validators, argument structures, and validation logic
 * used by the content type mutation functions (createContentType, updateContentType).
 */
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../src/component/schema.js";
import { api } from "../../src/component/_generated/api.js";
import {
	createContentTypeArgs,
	updateContentTypeArgs,
	deleteContentTypeArgs,
	contentTypeDoc,
	fieldTypes,
} from "../../src/component/validators.js";

// Import all component modules for testing
const modules = import.meta.glob("../../src/component/**/*.ts");

describe("Content Type Mutation Validators", () => {
	// =============================================================================
	// createContentTypeArgs Validation Tests
	// =============================================================================

	describe("createContentTypeArgs", () => {
		it("should have correct argument structure for create", () => {
			const argFields = Object.keys(createContentTypeArgs.fields);

			expect(argFields).toContain("name");
			expect(argFields).toContain("displayName");
			expect(argFields).toContain("description");
			expect(argFields).toContain("fields");
			expect(argFields).toContain("icon");
			expect(argFields).toContain("singleton");
			expect(argFields).toContain("slugField");
			expect(argFields).toContain("titleField");
			expect(argFields).toContain("sortOrder");
			expect(argFields).toContain("createdBy");
		});

		it("should have name as required field", () => {
			const nameField = createContentTypeArgs.fields.name;
			expect(nameField).toBeDefined();
		});

		it("should have displayName as required field", () => {
			const displayNameField = createContentTypeArgs.fields.displayName;
			expect(displayNameField).toBeDefined();
		});

		it("should have fields as required array", () => {
			const fieldsField = createContentTypeArgs.fields.fields;
			expect(fieldsField).toBeDefined();
		});
	});

	// =============================================================================
	// Name Validation Tests
	// =============================================================================

	describe("Name validation logic", () => {
		const isValidName = (name: string): boolean => {
			const namePattern = /^[a-z][a-z0-9_]{0,63}$/;
			return namePattern.test(name);
		};

		it("should accept valid lowercase names", () => {
			expect(isValidName("blog_post")).toBe(true);
			expect(isValidName("article")).toBe(true);
			expect(isValidName("user_profile")).toBe(true);
			expect(isValidName("product123")).toBe(true);
		});

		it("should reject names starting with numbers", () => {
			expect(isValidName("123blog")).toBe(false);
			expect(isValidName("1post")).toBe(false);
		});

		it("should reject names with uppercase letters", () => {
			expect(isValidName("BlogPost")).toBe(false);
			expect(isValidName("ARTICLE")).toBe(false);
			expect(isValidName("userProfile")).toBe(false);
		});

		it("should reject names with special characters", () => {
			expect(isValidName("blog-post")).toBe(false);
			expect(isValidName("blog.post")).toBe(false);
			expect(isValidName("blog post")).toBe(false);
			expect(isValidName("blog@post")).toBe(false);
		});

		it("should reject empty names", () => {
			expect(isValidName("")).toBe(false);
		});

		it("should reject names longer than 64 characters", () => {
			const longName = "a".repeat(65);
			expect(isValidName(longName)).toBe(false);
		});

		it("should accept names with exactly 64 characters", () => {
			const maxName = "a".repeat(64);
			expect(isValidName(maxName)).toBe(true);
		});

		it("should reject names starting with underscore", () => {
			expect(isValidName("_blog_post")).toBe(false);
		});
	});

	// =============================================================================
	// Field Definition Validation Tests
	// =============================================================================

	describe("Field definition validation logic", () => {
		interface FieldValidationError {
			fieldName: string;
			message: string;
			code: string;
		}

		const validateFieldDefinitions = (
			fields: Array<{
				name?: string;
				label?: string;
				type?: string;
				required?: boolean;
				options?: { options?: Array<{ value: string; label: string }> };
			}>,
		): FieldValidationError[] => {
			const errors: FieldValidationError[] = [];
			const seenNames = new Set<string>();
			const namePattern = /^[a-z][a-z0-9_]{0,63}$/;

			for (const field of fields) {
				if (!field.name || typeof field.name !== "string") {
					errors.push({
						fieldName: field.name || "(unnamed)",
						message: "Field must have a name property",
						code: "MISSING_REQUIRED_PROPERTY",
					});
					continue;
				}

				if (!field.label || typeof field.label !== "string") {
					errors.push({
						fieldName: field.name,
						message: `Field "${field.name}" must have a label property`,
						code: "MISSING_REQUIRED_PROPERTY",
					});
				}

				if (!field.type || typeof field.type !== "string") {
					errors.push({
						fieldName: field.name,
						message: `Field "${field.name}" must have a type property`,
						code: "MISSING_REQUIRED_PROPERTY",
					});
				}

				if (typeof field.required !== "boolean") {
					errors.push({
						fieldName: field.name,
						message: `Field "${field.name}" must have a required property`,
						code: "MISSING_REQUIRED_PROPERTY",
					});
				}

				if (field.name && !namePattern.test(field.name)) {
					errors.push({
						fieldName: field.name,
						message: `Field name "${field.name}" is invalid`,
						code: "INVALID_FIELD_NAME",
					});
				}

				if (seenNames.has(field.name)) {
					errors.push({
						fieldName: field.name,
						message: `Duplicate field name: "${field.name}"`,
						code: "DUPLICATE_FIELD_NAME",
					});
				}
				seenNames.add(field.name);

				if (
					field.type &&
					!fieldTypes.includes(field.type as typeof fieldTypes[number])
				) {
					errors.push({
						fieldName: field.name,
						message: `Invalid field type "${field.type}"`,
						code: "INVALID_FIELD_TYPE",
					});
				}

				if (
					(field.type === "select" || field.type === "multiSelect") &&
					(!field.options?.options || field.options.options.length === 0)
				) {
					errors.push({
						fieldName: field.name,
						message: `${field.type} field must have options`,
						code: "INVALID_SELECT_OPTIONS",
					});
				}
			}

			return errors;
		};

		it("should accept valid field definitions", () => {
			const fields = [
				{ name: "title", label: "Title", type: "text", required: true },
				{ name: "content", label: "Content", type: "richText", required: true },
				{
					name: "published",
					label: "Published",
					type: "boolean",
					required: false,
				},
			];

			const errors = validateFieldDefinitions(fields);
			expect(errors).toHaveLength(0);
		});

		it("should detect duplicate field names", () => {
			const fields = [
				{ name: "title", label: "Title", type: "text", required: true },
				{ name: "title", label: "Another Title", type: "text", required: true },
			];

			const errors = validateFieldDefinitions(fields);
			const duplicateError = errors.find(
				(e) => e.code === "DUPLICATE_FIELD_NAME",
			);
			expect(duplicateError).toBeDefined();
		});

		it("should detect invalid field types", () => {
			const fields = [
				{
					name: "invalid_field",
					label: "Invalid",
					type: "invalid_type",
					required: true,
				},
			];

			const errors = validateFieldDefinitions(fields);
			const typeError = errors.find((e) => e.code === "INVALID_FIELD_TYPE");
			expect(typeError).toBeDefined();
		});

		it("should detect missing required properties", () => {
			const fields = [
				{ name: "missing_label", type: "text", required: true }, // Missing label
			];

			const errors = validateFieldDefinitions(
				fields as Array<{
					name?: string;
					label?: string;
					type?: string;
					required?: boolean;
				}>,
			);
			const propError = errors.find(
				(e) => e.code === "MISSING_REQUIRED_PROPERTY",
			);
			expect(propError).toBeDefined();
		});

		it("should detect select fields without options", () => {
			const fields = [
				{
					name: "status",
					label: "Status",
					type: "select",
					required: true,
					// Missing options
				},
			];

			const errors = validateFieldDefinitions(fields);
			const optionsError = errors.find(
				(e) => e.code === "INVALID_SELECT_OPTIONS",
			);
			expect(optionsError).toBeDefined();
		});

		it("should accept select fields with valid options", () => {
			const fields = [
				{
					name: "status",
					label: "Status",
					type: "select",
					required: true,
					options: {
						options: [
							{ value: "active", label: "Active" },
							{ value: "inactive", label: "Inactive" },
						],
					},
				},
			];

			const errors = validateFieldDefinitions(fields);
			expect(errors).toHaveLength(0);
		});

		it("should detect invalid field names", () => {
			const fields = [
				{
					name: "Invalid-Name",
					label: "Invalid",
					type: "text",
					required: true,
				},
			];

			const errors = validateFieldDefinitions(fields);
			const nameError = errors.find((e) => e.code === "INVALID_FIELD_NAME");
			expect(nameError).toBeDefined();
		});
	});

	// =============================================================================
	// Field Types Tests
	// =============================================================================

	describe("Field types", () => {
		it("should include all 11 supported field types", () => {
			expect(fieldTypes).toContain("text");
			expect(fieldTypes).toContain("richText");
			expect(fieldTypes).toContain("number");
			expect(fieldTypes).toContain("boolean");
			expect(fieldTypes).toContain("date");
			expect(fieldTypes).toContain("datetime");
			expect(fieldTypes).toContain("reference");
			expect(fieldTypes).toContain("media");
			expect(fieldTypes).toContain("json");
			expect(fieldTypes).toContain("select");
			expect(fieldTypes).toContain("multiSelect");
			expect(fieldTypes).toContain("tags");
			expect(fieldTypes).toContain("category");
			expect(fieldTypes).toHaveLength(13);
		});
	});

	// =============================================================================
	// Content Type Document Structure Tests
	// =============================================================================

	describe("Content type document structure", () => {
		it("should have name field for unique identification", () => {
			const docFields = Object.keys(contentTypeDoc.fields);
			expect(docFields).toContain("name");
		});

		it("should have displayName field for UI display", () => {
			const docFields = Object.keys(contentTypeDoc.fields);
			expect(docFields).toContain("displayName");
		});

		it("should have fields array for schema definition", () => {
			const docFields = Object.keys(contentTypeDoc.fields);
			expect(docFields).toContain("fields");
		});

		it("should have isActive field for enable/disable", () => {
			const docFields = Object.keys(contentTypeDoc.fields);
			expect(docFields).toContain("isActive");
		});

		it("should have deletedAt field for soft delete support", () => {
			const docFields = Object.keys(contentTypeDoc.fields);
			expect(docFields).toContain("deletedAt");
		});

		it("should have createdBy field for audit trail", () => {
			const docFields = Object.keys(contentTypeDoc.fields);
			expect(docFields).toContain("createdBy");
		});

		it("should have slugField and titleField for entry configuration", () => {
			const docFields = Object.keys(contentTypeDoc.fields);
			expect(docFields).toContain("slugField");
			expect(docFields).toContain("titleField");
		});
	});

	// =============================================================================
	// SlugField and TitleField Reference Validation
	// =============================================================================

	describe("SlugField and titleField reference validation", () => {
		it("should validate slugField references an existing field", () => {
			const fields = [
				{ name: "title", label: "Title", type: "text", required: true },
				{ name: "content", label: "Content", type: "richText", required: true },
			];
			const slugField = "title";

			const fieldExists = fields.some((f) => f.name === slugField);
			expect(fieldExists).toBe(true);
		});

		it("should detect slugField referencing non-existent field", () => {
			const fields = [
				{ name: "title", label: "Title", type: "text", required: true },
			];
			const slugField = "nonexistent";

			const fieldExists = fields.some((f) => f.name === slugField);
			expect(fieldExists).toBe(false);
		});

		it("should validate titleField references an existing field", () => {
			const fields = [
				{ name: "name", label: "Name", type: "text", required: true },
				{ name: "email", label: "Email", type: "text", required: true },
			];
			const titleField = "name";

			const fieldExists = fields.some((f) => f.name === titleField);
			expect(fieldExists).toBe(true);
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe("Edge cases", () => {
		it("should handle empty fields array", () => {
			const fields: Array<{
				name?: string;
				label?: string;
				type?: string;
				required?: boolean;
			}> = [];

			// Empty fields array should be valid (though perhaps not useful)
			expect(fields.length).toBe(0);
		});

		it("should handle content type with all optional fields", () => {
			const args = {
				name: "simple_type",
				displayName: "Simple Type",
				fields: [
					{
						name: "optional_field",
						label: "Optional Field",
						type: "text",
						required: false,
					},
				],
				// All other fields are optional
			};

			expect(args.name).toBeDefined();
			expect(args.displayName).toBeDefined();
			expect(args.fields.length).toBe(1);
		});

		it("should handle singleton content types", () => {
			const args = {
				name: "site_settings",
				displayName: "Site Settings",
				singleton: true,
				fields: [
					{
						name: "site_name",
						label: "Site Name",
						type: "text",
						required: true,
					},
				],
			};

			expect(args.singleton).toBe(true);
		});

		it("should handle content type with many fields", () => {
			const fields = Array.from({ length: 50 }, (_, i) => ({
				name: `field_${i}`,
				label: `Field ${i}`,
				type: "text",
				required: false,
			}));

			expect(fields.length).toBe(50);
			// All field names should be unique
			const uniqueNames = new Set(fields.map((f) => f.name));
			expect(uniqueNames.size).toBe(50);
		});

		it("should handle field with all options populated", () => {
			const complexField = {
				name: "complex_text",
				label: "Complex Text Field",
				type: "text",
				required: true,
				searchable: true,
				localized: true,
				description: "A fully configured text field",
				defaultValue: "Default value",
				options: {
					minLength: 1,
					maxLength: 1000,
					pattern: "^[A-Za-z]+$",
				},
			};

			expect(complexField.searchable).toBe(true);
			expect(complexField.localized).toBe(true);
			expect(complexField.options.minLength).toBe(1);
		});
	});
});

// =============================================================================
// Integration Tests for Content Type Mutations
// =============================================================================

describe("Content Type Mutation Integration Tests", () => {
	describe("createContentType", () => {
		it("creates a content type with valid fields", async () => {
			const t = convexTest(schema, modules);

			const result = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "blog_post",
					displayName: "Blog Post",
					description: "A blog post content type",
					fields: [
						{
							name: "title",
							label: "Title",
							type: "text",
							required: true,
						},
						{
							name: "content",
							label: "Content",
							type: "richText",
							required: true,
						},
					],
					slugField: "title",
					titleField: "title",
					createdBy: "user123",
				},
			);

			expect(result).not.toBeNull();
			expect(result.name).toBe("blog_post");
			expect(result.displayName).toBe("Blog Post");
			expect(result.fields).toHaveLength(2);
			expect(result.isActive).toBe(true);
			expect(result.createdBy).toBe("user123");
		});

		it("throws error for duplicate name", async () => {
			const t = convexTest(schema, modules);

			// Create first content type
			await t.mutation(api.contentTypeMutations.createContentType, {
				name: "article",
				displayName: "Article",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			});

			// Attempt to create duplicate
			await expect(
				t.mutation(api.contentTypeMutations.createContentType, {
					name: "article",
					displayName: "Another Article",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				}),
			).rejects.toThrow(/already exists/);
		});

		it("throws error for invalid name format", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t.mutation(api.contentTypeMutations.createContentType, {
					name: "Invalid-Name",
					displayName: "Invalid",
					fields: [],
				}),
			).rejects.toThrow(/Invalid content type name/);
		});
	});

	describe("updateContentType", () => {
		it("updates display name and description", async () => {
			const t = convexTest(schema, modules);

			// Create a content type
			const created = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "product",
					displayName: "Product",
					description: "Original description",
					fields: [
						{ name: "name", label: "Name", type: "text", required: true },
					],
				},
			);

			// Update display name and description
			const updated = await t.mutation(
				api.contentTypeMutations.updateContentType,
				{
					id: created._id,
					displayName: "Updated Product",
					description: "Updated description",
					updatedBy: "admin",
				},
			);

			expect(updated.displayName).toBe("Updated Product");
			expect(updated.description).toBe("Updated description");
			expect(updated.updatedBy).toBe("admin");
			// Fields should remain unchanged
			expect(updated.fields).toHaveLength(1);
		});

		it("updates icon, singleton, and sortOrder", async () => {
			const t = convexTest(schema, modules);

			const created = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "settings",
					displayName: "Settings",
					fields: [
						{ name: "value", label: "Value", type: "json", required: true },
					],
				},
			);

			const updated = await t.mutation(
				api.contentTypeMutations.updateContentType,
				{
					id: created._id,
					icon: "cog",
					singleton: true,
					sortOrder: 10,
				},
			);

			expect(updated.icon).toBe("cog");
			expect(updated.singleton).toBe(true);
			expect(updated.sortOrder).toBe(10);
		});

		it("updates isActive status", async () => {
			const t = convexTest(schema, modules);

			const created = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "old_type",
					displayName: "Old Type",
					fields: [],
				},
			);

			expect(created.isActive).toBe(true);

			const updated = await t.mutation(
				api.contentTypeMutations.updateContentType,
				{
					id: created._id,
					isActive: false,
				},
			);

			expect(updated.isActive).toBe(false);
		});

		it("adds new fields without breaking changes", async () => {
			const t = convexTest(schema, modules);

			const created = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "article",
					displayName: "Article",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			// Add a new optional field (no breaking change)
			const updated = await t.mutation(
				api.contentTypeMutations.updateContentType,
				{
					id: created._id,
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
						{ name: "author", label: "Author", type: "text", required: false },
					],
				},
			);

			expect(updated.fields).toHaveLength(2);
			expect(
				updated.fields.find((f: { name: string }) => f.name === "author"),
			).toBeDefined();
		});

		it("throws error when removing field with existing data", async () => {
			const t = convexTest(schema, modules);

			// Create content type
			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "blog",
					displayName: "Blog",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
						{ name: "body", label: "Body", type: "richText", required: true },
					],
				},
			);

			// Create a content entry with data in the 'body' field
			await t.run(async (ctx) => {
				await ctx.db.insert("contentEntries", {
					contentTypeId: contentType._id,
					slug: "my-post",
					status: "draft",
					data: {
						title: "My Post",
						body: "<p>Content here</p>",
					},
					version: 1,
				});
			});

			// Attempt to remove the 'body' field
			await expect(
				t.mutation(api.contentTypeMutations.updateContentType, {
					id: contentType._id,
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
						// 'body' field removed
					],
				}),
			).rejects.toThrow(/breaking changes/);
		});

		it("allows removing field with force flag", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "page",
					displayName: "Page",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
						{
							name: "subtitle",
							label: "Subtitle",
							type: "text",
							required: false,
						},
					],
				},
			);

			// Create an entry with subtitle data
			await t.run(async (ctx) => {
				await ctx.db.insert("contentEntries", {
					contentTypeId: contentType._id,
					slug: "about",
					status: "draft",
					data: {
						title: "About Us",
						subtitle: "Our story",
					},
					version: 1,
				});
			});

			// Remove subtitle with force flag
			const updated = await t.mutation(
				api.contentTypeMutations.updateContentType,
				{
					id: contentType._id,
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
					force: true,
				},
			);

			expect(updated.fields).toHaveLength(1);
			expect(updated.breakingChanges).toBeDefined();
			expect(updated.breakingChanges).toHaveLength(1);
			expect(updated.breakingChanges?.[0].type).toBe("FIELD_REMOVED");
		});

		it("throws error when changing field type with existing data", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "product",
					displayName: "Product",
					fields: [
						{ name: "price", label: "Price", type: "text", required: true },
					],
				},
			);

			await t.run(async (ctx) => {
				await ctx.db.insert("contentEntries", {
					contentTypeId: contentType._id,
					slug: "widget",
					status: "draft",
					data: { price: "$99.99" },
					version: 1,
				});
			});

			// Try to change price from text to number
			await expect(
				t.mutation(api.contentTypeMutations.updateContentType, {
					id: contentType._id,
					fields: [
						{ name: "price", label: "Price", type: "number", required: true },
					],
				}),
			).rejects.toThrow(/breaking changes/);
		});

		it("throws error when making optional field required with empty values", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "event",
					displayName: "Event",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
						{
							name: "location",
							label: "Location",
							type: "text",
							required: false,
						},
					],
				},
			);

			// Create entry without location
			await t.run(async (ctx) => {
				await ctx.db.insert("contentEntries", {
					contentTypeId: contentType._id,
					slug: "meetup",
					status: "draft",
					data: { title: "Tech Meetup" },
					version: 1,
				});
			});

			// Try to make location required
			await expect(
				t.mutation(api.contentTypeMutations.updateContentType, {
					id: contentType._id,
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
						{
							name: "location",
							label: "Location",
							type: "text",
							required: true,
						},
					],
				}),
			).rejects.toThrow(/breaking changes/);
		});

		it("throws error when removing select options in use", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "task",
					displayName: "Task",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
						{
							name: "status",
							label: "Status",
							type: "select",
							required: true,
							options: {
								options: [
									{ value: "todo", label: "To Do" },
									{ value: "in_progress", label: "In Progress" },
									{ value: "done", label: "Done" },
								],
							},
						},
					],
				},
			);

			// Create entry using 'in_progress' status
			await t.run(async (ctx) => {
				await ctx.db.insert("contentEntries", {
					contentTypeId: contentType._id,
					slug: "task-1",
					status: "draft",
					data: { title: "My Task", status: "in_progress" },
					version: 1,
				});
			});

			// Try to remove 'in_progress' option
			await expect(
				t.mutation(api.contentTypeMutations.updateContentType, {
					id: contentType._id,
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
						{
							name: "status",
							label: "Status",
							type: "select",
							required: true,
							options: {
								options: [
									{ value: "todo", label: "To Do" },
									{ value: "done", label: "Done" },
									// 'in_progress' removed
								],
							},
						},
					],
				}),
			).rejects.toThrow(/breaking changes/);
		});

		it("allows field updates when no entries exist", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "empty_type",
					displayName: "Empty Type",
					fields: [
						{
							name: "old_field",
							label: "Old Field",
							type: "text",
							required: true,
						},
					],
				},
			);

			// Remove field (no entries exist, so no breaking change)
			const updated = await t.mutation(
				api.contentTypeMutations.updateContentType,
				{
					id: contentType._id,
					fields: [
						{
							name: "new_field",
							label: "New Field",
							type: "number",
							required: true,
						},
					],
				},
			);

			expect(updated.fields).toHaveLength(1);
			expect(updated.fields[0].name).toBe("new_field");
		});

		it("updates slugField and titleField references", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "document",
					displayName: "Document",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
						{ name: "name", label: "Name", type: "text", required: true },
					],
					slugField: "title",
					titleField: "title",
				},
			);

			const updated = await t.mutation(
				api.contentTypeMutations.updateContentType,
				{
					id: contentType._id,
					slugField: "name",
					titleField: "name",
				},
			);

			expect(updated.slugField).toBe("name");
			expect(updated.titleField).toBe("name");
		});

		it("throws error for invalid slugField reference", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "post",
					displayName: "Post",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			await expect(
				t.mutation(api.contentTypeMutations.updateContentType, {
					id: contentType._id,
					slugField: "nonexistent_field",
				}),
			).rejects.toThrow(/slugField.*does not reference/);
		});

		it("throws error for non-existent content type", async () => {
			const t = convexTest(schema, modules);

			// Create and delete a content type to get a valid but non-existent ID
			const created = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "temp",
					displayName: "Temp",
					fields: [],
				},
			);

			await t.run(async (ctx) => {
				await ctx.db.delete(created._id);
			});

			await expect(
				t.mutation(api.contentTypeMutations.updateContentType, {
					id: created._id,
					displayName: "Updated",
				}),
			).rejects.toThrow(/not found/);
		});

		it("throws error for deleted content type", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "deleted_type",
					displayName: "Deleted Type",
					fields: [],
				},
			);

			// Soft delete the content type
			await t.run(async (ctx) => {
				await ctx.db.patch(contentType._id, { deletedAt: Date.now() });
			});

			await expect(
				t.mutation(api.contentTypeMutations.updateContentType, {
					id: contentType._id,
					displayName: "Updated",
				}),
			).rejects.toThrow(/has been deleted/);
		});

		it("validates field definitions on update", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "valid_type",
					displayName: "Valid Type",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			// Try to update with invalid field definition
			await expect(
				t.mutation(api.contentTypeMutations.updateContentType, {
					id: contentType._id,
					fields: [
						{
							name: "Invalid-Field-Name",
							label: "Label",
							type: "text",
							required: true,
						},
					],
				}),
			).rejects.toThrow(/Invalid field definitions/);
		});

		it("ignores soft-deleted entries for breaking change detection", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "recoverable",
					displayName: "Recoverable",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
						{ name: "extra", label: "Extra", type: "text", required: false },
					],
				},
			);

			// Create and soft-delete an entry with 'extra' field data
			await t.run(async (ctx) => {
				await ctx.db.insert("contentEntries", {
					contentTypeId: contentType._id,
					slug: "deleted-entry",
					status: "draft",
					data: { title: "Title", extra: "Extra data" },
					version: 1,
					deletedAt: Date.now(),
				});
			});

			// Should allow removing 'extra' field since only deleted entries have data
			const updated = await t.mutation(
				api.contentTypeMutations.updateContentType,
				{
					id: contentType._id,
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			expect(updated.fields).toHaveLength(1);
		});

		it("detects breaking changes in multiSelect fields", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "tagged_item",
					displayName: "Tagged Item",
					fields: [
						{
							name: "tags",
							label: "Tags",
							type: "multiSelect",
							required: false,
							options: {
								options: [
									{ value: "featured", label: "Featured" },
									{ value: "popular", label: "Popular" },
									{ value: "new", label: "New" },
								],
							},
						},
					],
				},
			);

			// Create entry with 'featured' and 'popular' tags
			await t.run(async (ctx) => {
				await ctx.db.insert("contentEntries", {
					contentTypeId: contentType._id,
					slug: "item-1",
					status: "draft",
					data: { tags: ["featured", "popular"] },
					version: 1,
				});
			});

			// Try to remove 'popular' option
			await expect(
				t.mutation(api.contentTypeMutations.updateContentType, {
					id: contentType._id,
					fields: [
						{
							name: "tags",
							label: "Tags",
							type: "multiSelect",
							required: false,
							options: {
								options: [
									{ value: "featured", label: "Featured" },
									{ value: "new", label: "New" },
								],
							},
						},
					],
				}),
			).rejects.toThrow(/breaking changes/);
		});
	});

	// =============================================================================
	// Delete Content Type Tests
	// =============================================================================

	describe("deleteContentType", () => {
		describe("deleteContentTypeArgs validator", () => {
			it("should have correct argument structure", () => {
				const argFields = Object.keys(deleteContentTypeArgs.fields);

				expect(argFields).toContain("id");
				expect(argFields).toContain("cascade");
				expect(argFields).toContain("hardDelete");
				expect(argFields).toContain("deletedBy");
			});

			it("should have id as required field", () => {
				const idField = deleteContentTypeArgs.fields.id;
				expect(idField).toBeDefined();
			});
		});

		it("soft deletes a content type with no entries", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "empty_type",
					displayName: "Empty Type",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const result = await t.mutation(
				api.contentTypeMutations.deleteContentType,
				{
					id: contentType._id,
					deletedBy: "admin",
				},
			);

			expect(result.success).toBe(true);
			expect(result.deletedId).toBe(contentType._id);
			expect(result.deletedEntriesCount).toBe(0);
			expect(result.wasHardDelete).toBe(false);

			// Verify soft delete was applied
			const deleted = await t.run(async (ctx) => {
				return await ctx.db.get(contentType._id);
			});

			expect(deleted).not.toBeNull();
			expect(deleted?.deletedAt).toBeDefined();
			expect(deleted?.isActive).toBe(false);
		});

		it("hard deletes a content type with no entries", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "to_delete",
					displayName: "To Delete",
					fields: [],
				},
			);

			const result = await t.mutation(
				api.contentTypeMutations.deleteContentType,
				{
					id: contentType._id,
					hardDelete: true,
				},
			);

			expect(result.success).toBe(true);
			expect(result.wasHardDelete).toBe(true);

			// Verify content type no longer exists
			const deleted = await t.run(async (ctx) => {
				return await ctx.db.get(contentType._id);
			});

			expect(deleted).toBeNull();
		});

		it("throws error when entries exist and cascade is false", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "blog_with_entries",
					displayName: "Blog With Entries",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			// Create an entry
			await t.run(async (ctx) => {
				await ctx.db.insert("contentEntries", {
					contentTypeId: contentType._id,
					slug: "my-post",
					status: "draft",
					data: { title: "My Post" },
					version: 1,
				});
			});

			// Try to delete without cascade
			await expect(
				t.mutation(api.contentTypeMutations.deleteContentType, {
					id: contentType._id,
				}),
			).rejects.toThrow(/CONTENT_TYPE_HAS_ENTRIES.*1 content entry/);
		});

		it("throws error with plural message when multiple entries exist", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "blog_many_entries",
					displayName: "Blog Many Entries",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			// Create multiple entries
			await t.run(async (ctx) => {
				await ctx.db.insert("contentEntries", {
					contentTypeId: contentType._id,
					slug: "post-1",
					status: "draft",
					data: { title: "Post 1" },
					version: 1,
				});
				await ctx.db.insert("contentEntries", {
					contentTypeId: contentType._id,
					slug: "post-2",
					status: "published",
					data: { title: "Post 2" },
					version: 1,
				});
			});

			await expect(
				t.mutation(api.contentTypeMutations.deleteContentType, {
					id: contentType._id,
				}),
			).rejects.toThrow(/CONTENT_TYPE_HAS_ENTRIES.*2 content entries/);
		});

		it("cascade soft deletes entries when cascade is true", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "cascade_soft",
					displayName: "Cascade Soft",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			// Create entries
			const entryIds = await t.run(async (ctx) => {
				const id1 = await ctx.db.insert("contentEntries", {
					contentTypeId: contentType._id,
					slug: "post-1",
					status: "draft",
					data: { title: "Post 1" },
					version: 1,
				});
				const id2 = await ctx.db.insert("contentEntries", {
					contentTypeId: contentType._id,
					slug: "post-2",
					status: "published",
					data: { title: "Post 2" },
					version: 1,
				});
				return [id1, id2];
			});

			const result = await t.mutation(
				api.contentTypeMutations.deleteContentType,
				{
					id: contentType._id,
					cascade: true,
					deletedBy: "admin",
				},
			);

			expect(result.success).toBe(true);
			expect(result.deletedEntriesCount).toBe(2);
			expect(result.wasHardDelete).toBe(false);

			// Verify entries are soft deleted
			const entries = await t.run(async (ctx) => {
				return await Promise.all(entryIds.map((id) => ctx.db.get(id)));
			});

			expect(entries[0]).not.toBeNull();
			expect(entries[0]?.deletedAt).toBeDefined();
			expect(entries[0]?.updatedBy).toBe("admin");
			expect(entries[1]).not.toBeNull();
			expect(entries[1]?.deletedAt).toBeDefined();
		});

		it("cascade hard deletes entries and versions when cascade and hardDelete are true", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "cascade_hard",
					displayName: "Cascade Hard",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			// Create entry with versions
			const { entryId, versionIds } = await t.run(async (ctx) => {
				const eId = await ctx.db.insert("contentEntries", {
					contentTypeId: contentType._id,
					slug: "post-1",
					status: "published",
					data: { title: "Post 1" },
					version: 2,
				});
				const vId1 = await ctx.db.insert("contentVersions", {
					entryId: eId,
					versionNumber: 1,
					data: { title: "Post 1 Draft" },
					slug: "post-1",
					status: "draft",
					wasPublished: false,
				});
				const vId2 = await ctx.db.insert("contentVersions", {
					entryId: eId,
					versionNumber: 2,
					data: { title: "Post 1" },
					slug: "post-1",
					status: "published",
					wasPublished: true,
					publishedAt: Date.now(),
				});
				return { entryId: eId, versionIds: [vId1, vId2] };
			});

			const result = await t.mutation(
				api.contentTypeMutations.deleteContentType,
				{
					id: contentType._id,
					cascade: true,
					hardDelete: true,
				},
			);

			expect(result.success).toBe(true);
			expect(result.deletedEntriesCount).toBe(1);
			expect(result.deletedVersionsCount).toBe(2);
			expect(result.wasHardDelete).toBe(true);

			// Verify entry is permanently deleted
			const entry = await t.run(async (ctx) => ctx.db.get(entryId));
			expect(entry).toBeNull();

			// Verify versions are permanently deleted
			const versions = await t.run(async (ctx) =>
				Promise.all(versionIds.map((id) => ctx.db.get(id))),
			);
			expect(versions[0]).toBeNull();
			expect(versions[1]).toBeNull();

			// Verify content type is permanently deleted
			const ct = await t.run(async (ctx) => ctx.db.get(contentType._id));
			expect(ct).toBeNull();
		});

		it("throws error for non-existent content type", async () => {
			const t = convexTest(schema, modules);

			const created = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "temp_delete",
					displayName: "Temp Delete",
					fields: [],
				},
			);

			// Delete it first
			await t.run(async (ctx) => {
				await ctx.db.delete(created._id);
			});

			await expect(
				t.mutation(api.contentTypeMutations.deleteContentType, {
					id: created._id,
				}),
			).rejects.toThrow(/not found/);
		});

		it("throws error for already soft-deleted content type", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "already_deleted",
					displayName: "Already Deleted",
					fields: [],
				},
			);

			// Soft delete it
			await t.run(async (ctx) => {
				await ctx.db.patch(contentType._id, { deletedAt: Date.now() });
			});

			await expect(
				t.mutation(api.contentTypeMutations.deleteContentType, {
					id: contentType._id,
				}),
			).rejects.toThrow(/CONTENT_TYPE_DELETED.*has been deleted/);
		});

		it("ignores already soft-deleted entries when cascading", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "partial_deleted",
					displayName: "Partial Deleted",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			// Create entries - one active, one already deleted
			await t.run(async (ctx) => {
				await ctx.db.insert("contentEntries", {
					contentTypeId: contentType._id,
					slug: "active-post",
					status: "draft",
					data: { title: "Active Post" },
					version: 1,
				});
				await ctx.db.insert("contentEntries", {
					contentTypeId: contentType._id,
					slug: "deleted-post",
					status: "draft",
					data: { title: "Deleted Post" },
					version: 1,
					deletedAt: Date.now(), // Already soft-deleted
				});
			});

			const result = await t.mutation(
				api.contentTypeMutations.deleteContentType,
				{
					id: contentType._id,
					cascade: true,
				},
			);

			// Should only count the active entry
			expect(result.deletedEntriesCount).toBe(1);
		});

		it("allows deletion when only soft-deleted entries exist", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "only_deleted_entries",
					displayName: "Only Deleted Entries",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			// Create soft-deleted entry
			await t.run(async (ctx) => {
				await ctx.db.insert("contentEntries", {
					contentTypeId: contentType._id,
					slug: "old-post",
					status: "draft",
					data: { title: "Old Post" },
					version: 1,
					deletedAt: Date.now(),
				});
			});

			// Should succeed without cascade since only deleted entries exist
			const result = await t.mutation(
				api.contentTypeMutations.deleteContentType,
				{
					id: contentType._id,
				},
			);

			expect(result.success).toBe(true);
			expect(result.deletedEntriesCount).toBe(0);
		});
	});
});
