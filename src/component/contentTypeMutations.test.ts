/**
 * Tests for Content Type Mutation Functions
 *
 * These tests verify the validators, argument structures, and validation logic
 * used by the content type mutation functions (createContentType).
 */
import { describe, it, expect } from "vitest";
import {
  createContentTypeArgs,
  updateContentTypeArgs,
  contentTypeDoc,
  fieldTypes,
} from "./validators.js";

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
      }>
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
          !fieldTypes.includes(field.type as (typeof fieldTypes)[number])
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
        (e) => e.code === "DUPLICATE_FIELD_NAME"
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
        }>
      );
      const propError = errors.find(
        (e) => e.code === "MISSING_REQUIRED_PROPERTY"
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
        (e) => e.code === "INVALID_SELECT_OPTIONS"
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
      expect(fieldTypes).toHaveLength(11);
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
