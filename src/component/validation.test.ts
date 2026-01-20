/**
 * Tests for Content Type Field Validators
 *
 * Tests the runtime validation functions that validate content data
 * against field configurations.
 */
import { describe, it, expect } from "vitest";
import {
  validateTextField,
  validateRichTextField,
  validateNumberField,
  validateBooleanField,
  validateDateField,
  validateReferenceField,
  validateMediaField,
  validateSelectField,
  validateMultiSelectField,
  validateJsonField,
  validateFieldValue,
  validateContentData,
  applyFieldDefaults,
  getFieldType,
  isFieldRequired,
  FieldDefinition,
  ContentTypeSchema,
} from "./validation.js";

// =============================================================================
// Text Field Tests
// =============================================================================

describe("validateTextField", () => {
  const makeTextFieldDef = (
    overrides: Partial<FieldDefinition> = {}
  ): FieldDefinition => ({
    name: "title",
    label: "Title",
    type: "text",
    required: false,
    ...overrides,
  });

  it("should pass for valid string value", () => {
    const fieldDef = makeTextFieldDef();
    const errors = validateTextField("Hello World", fieldDef);
    expect(errors).toHaveLength(0);
  });

  it("should fail for required field with empty value", () => {
    const fieldDef = makeTextFieldDef({ required: true });
    const errors = validateTextField("", fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("REQUIRED");
  });

  it("should pass for optional field with empty value", () => {
    const fieldDef = makeTextFieldDef({ required: false });
    const errors = validateTextField("", fieldDef);
    expect(errors).toHaveLength(0);
  });

  it("should fail for non-string value", () => {
    const fieldDef = makeTextFieldDef();
    const errors = validateTextField(123, fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("INVALID_TYPE");
  });

  it("should validate minLength", () => {
    const fieldDef = makeTextFieldDef({ options: { minLength: 5 } });
    const errors = validateTextField("Hi", fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("MIN_LENGTH");
  });

  it("should validate maxLength", () => {
    const fieldDef = makeTextFieldDef({ options: { maxLength: 5 } });
    const errors = validateTextField("Hello World", fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("MAX_LENGTH");
  });

  it("should validate pattern", () => {
    const fieldDef = makeTextFieldDef({ options: { pattern: "^[a-z]+$" } });
    const errors = validateTextField("Hello123", fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("PATTERN_MISMATCH");
  });

  it("should pass pattern validation", () => {
    const fieldDef = makeTextFieldDef({ options: { pattern: "^[a-z]+$" } });
    const errors = validateTextField("hello", fieldDef);
    expect(errors).toHaveLength(0);
  });
});

// =============================================================================
// Rich Text Field Tests
// =============================================================================

describe("validateRichTextField", () => {
  const makeRichTextFieldDef = (
    overrides: Partial<FieldDefinition> = {}
  ): FieldDefinition => ({
    name: "body",
    label: "Body",
    type: "richText",
    required: false,
    ...overrides,
  });

  it("should pass for valid HTML content", () => {
    const fieldDef = makeRichTextFieldDef();
    const errors = validateRichTextField("<p>Hello World</p>", fieldDef);
    expect(errors).toHaveLength(0);
  });

  it("should validate maxLength after stripping HTML", () => {
    const fieldDef = makeRichTextFieldDef({ options: { maxLength: 5 } });
    const errors = validateRichTextField("<p>Hello World</p>", fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("MAX_LENGTH");
  });

  it("should pass maxLength when content is short enough", () => {
    const fieldDef = makeRichTextFieldDef({ options: { maxLength: 15 } });
    const errors = validateRichTextField("<p>Hello</p>", fieldDef);
    expect(errors).toHaveLength(0);
  });
});

// =============================================================================
// Number Field Tests
// =============================================================================

describe("validateNumberField", () => {
  const makeNumberFieldDef = (
    overrides: Partial<FieldDefinition> = {}
  ): FieldDefinition => ({
    name: "count",
    label: "Count",
    type: "number",
    required: false,
    ...overrides,
  });

  it("should pass for valid number", () => {
    const fieldDef = makeNumberFieldDef();
    const errors = validateNumberField(42, fieldDef);
    expect(errors).toHaveLength(0);
  });

  it("should fail for non-number value", () => {
    const fieldDef = makeNumberFieldDef();
    const errors = validateNumberField("42", fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("INVALID_TYPE");
  });

  it("should validate min value", () => {
    const fieldDef = makeNumberFieldDef({ options: { min: 10 } });
    const errors = validateNumberField(5, fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("MIN_VALUE");
  });

  it("should validate max value", () => {
    const fieldDef = makeNumberFieldDef({ options: { max: 100 } });
    const errors = validateNumberField(150, fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("MAX_VALUE");
  });

  it("should validate precision = 0 (integer)", () => {
    const fieldDef = makeNumberFieldDef({ options: { precision: 0 } });
    const errors = validateNumberField(3.14, fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("NOT_INTEGER");
  });

  it("should pass for integer when precision = 0", () => {
    const fieldDef = makeNumberFieldDef({ options: { precision: 0 } });
    const errors = validateNumberField(42, fieldDef);
    expect(errors).toHaveLength(0);
  });
});

// =============================================================================
// Boolean Field Tests
// =============================================================================

describe("validateBooleanField", () => {
  const makeBooleanFieldDef = (
    overrides: Partial<FieldDefinition> = {}
  ): FieldDefinition => ({
    name: "isPublished",
    label: "Published",
    type: "boolean",
    required: false,
    ...overrides,
  });

  it("should pass for true", () => {
    const fieldDef = makeBooleanFieldDef();
    const errors = validateBooleanField(true, fieldDef);
    expect(errors).toHaveLength(0);
  });

  it("should pass for false", () => {
    const fieldDef = makeBooleanFieldDef();
    const errors = validateBooleanField(false, fieldDef);
    expect(errors).toHaveLength(0);
  });

  it("should fail for non-boolean value", () => {
    const fieldDef = makeBooleanFieldDef();
    const errors = validateBooleanField("true", fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("INVALID_TYPE");
  });

  it("should fail for required field with null", () => {
    const fieldDef = makeBooleanFieldDef({ required: true });
    const errors = validateBooleanField(null, fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("REQUIRED");
  });
});

// =============================================================================
// Date Field Tests
// =============================================================================

describe("validateDateField", () => {
  const makeDateFieldDef = (
    overrides: Partial<FieldDefinition> = {}
  ): FieldDefinition => ({
    name: "createdAt",
    label: "Created At",
    type: "date",
    required: false,
    ...overrides,
  });

  const now = Date.now();

  it("should pass for valid timestamp", () => {
    const fieldDef = makeDateFieldDef();
    const errors = validateDateField(now, fieldDef);
    expect(errors).toHaveLength(0);
  });

  it("should fail for non-number value", () => {
    const fieldDef = makeDateFieldDef();
    const errors = validateDateField("2024-01-01", fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("INVALID_TYPE");
  });

  it("should validate min date", () => {
    const fieldDef = makeDateFieldDef({ options: { min: now } });
    const errors = validateDateField(now - 1000, fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("MIN_DATE");
  });

  it("should validate max date", () => {
    const fieldDef = makeDateFieldDef({ options: { max: now } });
    const errors = validateDateField(now + 1000, fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("MAX_DATE");
  });
});

// =============================================================================
// Reference Field Tests
// =============================================================================

describe("validateReferenceField", () => {
  const makeReferenceFieldDef = (
    overrides: Partial<FieldDefinition> = {}
  ): FieldDefinition => ({
    name: "author",
    label: "Author",
    type: "reference",
    required: false,
    options: { allowedContentTypes: ["user"] },
    ...overrides,
  });

  // Basic single reference tests
  describe("single reference", () => {
    it("should pass for valid single reference", () => {
      const fieldDef = makeReferenceFieldDef();
      const errors = validateReferenceField("user_123", fieldDef);
      expect(errors).toHaveLength(0);
    });

    it("should fail for array when multiple is false", () => {
      const fieldDef = makeReferenceFieldDef();
      const errors = validateReferenceField(["user_123"], fieldDef);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe("INVALID_TYPE");
    });

    it("should pass for null when not required", () => {
      const fieldDef = makeReferenceFieldDef({ required: false });
      const errors = validateReferenceField(null, fieldDef);
      expect(errors).toHaveLength(0);
    });

    it("should fail for null when required", () => {
      const fieldDef = makeReferenceFieldDef({ required: true });
      const errors = validateReferenceField(null, fieldDef);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe("REQUIRED");
    });

    it("should fail for non-string value", () => {
      const fieldDef = makeReferenceFieldDef();
      const errors = validateReferenceField(123, fieldDef);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe("INVALID_TYPE");
    });
  });

  // Multiple references tests
  describe("multiple references", () => {
    it("should pass for valid multiple references", () => {
      const fieldDef = makeReferenceFieldDef({ options: { multiple: true } });
      const errors = validateReferenceField(["user_123", "user_456"], fieldDef);
      expect(errors).toHaveLength(0);
    });

    it("should pass for empty array when not required", () => {
      const fieldDef = makeReferenceFieldDef({
        required: false,
        options: { multiple: true },
      });
      const errors = validateReferenceField([], fieldDef);
      expect(errors).toHaveLength(0);
    });

    it("should fail for string when multiple is true", () => {
      const fieldDef = makeReferenceFieldDef({ options: { multiple: true } });
      const errors = validateReferenceField("user_123", fieldDef);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe("INVALID_TYPE");
    });

    it("should fail for empty array when required", () => {
      const fieldDef = makeReferenceFieldDef({
        required: true,
        options: { multiple: true },
      });
      const errors = validateReferenceField([], fieldDef);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe("REQUIRED");
    });

    it("should fail for array containing non-string values", () => {
      const fieldDef = makeReferenceFieldDef({ options: { multiple: true } });
      const errors = validateReferenceField(["user_123", 456], fieldDef);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe("INVALID_TYPE");
    });
  });

  // Max items tests
  describe("max items validation", () => {
    it("should validate max items for multiple references", () => {
      const fieldDef = makeReferenceFieldDef({
        options: { multiple: true, max: 2 },
      });
      const errors = validateReferenceField(
        ["user_1", "user_2", "user_3"],
        fieldDef
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe("MAX_ITEMS");
    });

    it("should pass when at max items", () => {
      const fieldDef = makeReferenceFieldDef({
        options: { multiple: true, max: 3 },
      });
      const errors = validateReferenceField(
        ["user_1", "user_2", "user_3"],
        fieldDef
      );
      expect(errors).toHaveLength(0);
    });

    it("should include item count in error message", () => {
      const fieldDef = makeReferenceFieldDef({
        options: { multiple: true, max: 2 },
      });
      const errors = validateReferenceField(
        ["user_1", "user_2", "user_3"],
        fieldDef
      );
      expect(errors[0].message).toContain("2");
    });
  });

  // Min items tests (new feature)
  describe("min items validation", () => {
    it("should validate minItems for multiple references", () => {
      const fieldDef = makeReferenceFieldDef({
        options: { multiple: true, minItems: 2 },
      });
      const errors = validateReferenceField(["user_1"], fieldDef);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe("MIN_ITEMS");
    });

    it("should pass when at minItems", () => {
      const fieldDef = makeReferenceFieldDef({
        options: { multiple: true, minItems: 2 },
      });
      const errors = validateReferenceField(["user_1", "user_2"], fieldDef);
      expect(errors).toHaveLength(0);
    });

    it("should pass when above minItems", () => {
      const fieldDef = makeReferenceFieldDef({
        options: { multiple: true, minItems: 2 },
      });
      const errors = validateReferenceField(
        ["user_1", "user_2", "user_3"],
        fieldDef
      );
      expect(errors).toHaveLength(0);
    });

    it("should include item count in error message", () => {
      const fieldDef = makeReferenceFieldDef({
        options: { multiple: true, minItems: 3 },
      });
      const errors = validateReferenceField(["user_1", "user_2"], fieldDef);
      expect(errors[0].message).toContain("3");
    });

    it("should use singular form for minItems=1", () => {
      const fieldDef = makeReferenceFieldDef({
        options: { multiple: true, minItems: 1 },
      });
      const errors = validateReferenceField([], fieldDef);
      expect(errors[0].message).toContain("1 reference");
      expect(errors[0].message).not.toContain("references");
    });

    it("should use plural form for minItems>1", () => {
      const fieldDef = makeReferenceFieldDef({
        options: { multiple: true, minItems: 2 },
      });
      const errors = validateReferenceField(["user_1"], fieldDef);
      expect(errors[0].message).toContain("2 references");
    });
  });

  // Combined min/max items tests
  describe("min and max items combined", () => {
    it("should validate both minItems and max together", () => {
      const fieldDef = makeReferenceFieldDef({
        options: { multiple: true, minItems: 2, max: 5 },
      });

      // Below min
      const belowMin = validateReferenceField(["user_1"], fieldDef);
      expect(belowMin).toHaveLength(1);
      expect(belowMin[0].code).toBe("MIN_ITEMS");

      // Within range
      const inRange = validateReferenceField(
        ["user_1", "user_2", "user_3"],
        fieldDef
      );
      expect(inRange).toHaveLength(0);

      // Above max
      const aboveMax = validateReferenceField(
        ["user_1", "user_2", "user_3", "user_4", "user_5", "user_6"],
        fieldDef
      );
      expect(aboveMax).toHaveLength(1);
      expect(aboveMax[0].code).toBe("MAX_ITEMS");
    });

    it("should support exact count constraint (minItems === max)", () => {
      const fieldDef = makeReferenceFieldDef({
        options: { multiple: true, minItems: 3, max: 3 },
      });

      const tooFew = validateReferenceField(["user_1", "user_2"], fieldDef);
      expect(tooFew.some((e) => e.code === "MIN_ITEMS")).toBe(true);

      const exact = validateReferenceField(
        ["user_1", "user_2", "user_3"],
        fieldDef
      );
      expect(exact).toHaveLength(0);

      const tooMany = validateReferenceField(
        ["user_1", "user_2", "user_3", "user_4"],
        fieldDef
      );
      expect(tooMany.some((e) => e.code === "MAX_ITEMS")).toBe(true);
    });
  });
});

// =============================================================================
// Media Field Tests
// =============================================================================

describe("validateMediaField", () => {
  const makeMediaFieldDef = (
    overrides: Partial<FieldDefinition> = {}
  ): FieldDefinition => ({
    name: "image",
    label: "Image",
    type: "media",
    required: false,
    ...overrides,
  });

  it("should pass for valid single media asset", () => {
    const fieldDef = makeMediaFieldDef();
    const errors = validateMediaField("media_123", fieldDef);
    expect(errors).toHaveLength(0);
  });

  it("should pass for valid multiple media assets", () => {
    const fieldDef = makeMediaFieldDef({ options: { multiple: true } });
    const errors = validateMediaField(["media_123", "media_456"], fieldDef);
    expect(errors).toHaveLength(0);
  });

  it("should validate max items for gallery", () => {
    const fieldDef = makeMediaFieldDef({
      options: { multiple: true, max: 2 },
    });
    const errors = validateMediaField(
      ["media_1", "media_2", "media_3"],
      fieldDef
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("MAX_ITEMS");
  });

  it("should validate minItems for gallery", () => {
    const fieldDef = makeMediaFieldDef({
      options: { multiple: true, minItems: 3 },
    });
    const errors = validateMediaField(["media_1", "media_2"], fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("MIN_ITEMS");
    expect(errors[0].message).toContain("at least 3 media assets");
  });

  it("should pass when gallery meets minItems requirement", () => {
    const fieldDef = makeMediaFieldDef({
      options: { multiple: true, minItems: 2 },
    });
    const errors = validateMediaField(["media_1", "media_2", "media_3"], fieldDef);
    expect(errors).toHaveLength(0);
  });

  it("should validate both minItems and max for gallery", () => {
    const fieldDef = makeMediaFieldDef({
      options: { multiple: true, minItems: 2, max: 5 },
    });

    // Too few
    const errorsTooFew = validateMediaField(["media_1"], fieldDef);
    expect(errorsTooFew).toHaveLength(1);
    expect(errorsTooFew[0].code).toBe("MIN_ITEMS");

    // Just right
    const errorsOk = validateMediaField(["media_1", "media_2", "media_3"], fieldDef);
    expect(errorsOk).toHaveLength(0);

    // Too many
    const errorsTooMany = validateMediaField(
      ["m1", "m2", "m3", "m4", "m5", "m6"],
      fieldDef
    );
    expect(errorsTooMany).toHaveLength(1);
    expect(errorsTooMany[0].code).toBe("MAX_ITEMS");
  });
});

// =============================================================================
// Select Field Tests
// =============================================================================

describe("validateSelectField", () => {
  const makeSelectFieldDef = (
    overrides: Partial<FieldDefinition> = {}
  ): FieldDefinition => ({
    name: "category",
    label: "Category",
    type: "select",
    required: false,
    options: {
      options: [
        { value: "tech", label: "Technology" },
        { value: "science", label: "Science" },
      ],
    },
    ...overrides,
  });

  it("should pass for valid option", () => {
    const fieldDef = makeSelectFieldDef();
    const errors = validateSelectField("tech", fieldDef);
    expect(errors).toHaveLength(0);
  });

  it("should fail for invalid option", () => {
    const fieldDef = makeSelectFieldDef();
    const errors = validateSelectField("invalid", fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("INVALID_TYPE");
  });
});

// =============================================================================
// MultiSelect Field Tests
// =============================================================================

describe("validateMultiSelectField", () => {
  const makeMultiSelectFieldDef = (
    overrides: Partial<FieldDefinition> = {}
  ): FieldDefinition => ({
    name: "tags",
    label: "Tags",
    type: "multiSelect",
    required: false,
    options: {
      options: [
        { value: "featured", label: "Featured" },
        { value: "trending", label: "Trending" },
        { value: "new", label: "New" },
      ],
    },
    ...overrides,
  });

  it("should pass for valid options array", () => {
    const fieldDef = makeMultiSelectFieldDef();
    const errors = validateMultiSelectField(["featured", "trending"], fieldDef);
    expect(errors).toHaveLength(0);
  });

  it("should fail for non-array value", () => {
    const fieldDef = makeMultiSelectFieldDef();
    const errors = validateMultiSelectField("featured", fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("INVALID_TYPE");
  });

  it("should fail for invalid option in array", () => {
    const fieldDef = makeMultiSelectFieldDef();
    const errors = validateMultiSelectField(["featured", "invalid"], fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("INVALID_TYPE");
  });
});

// =============================================================================
// JSON Field Tests
// =============================================================================

describe("validateJsonField", () => {
  const makeJsonFieldDef = (
    overrides: Partial<FieldDefinition> = {}
  ): FieldDefinition => ({
    name: "metadata",
    label: "Metadata",
    type: "json",
    required: false,
    ...overrides,
  });

  it("should pass for object value", () => {
    const fieldDef = makeJsonFieldDef();
    const errors = validateJsonField({ key: "value" }, fieldDef);
    expect(errors).toHaveLength(0);
  });

  it("should pass for array value", () => {
    const fieldDef = makeJsonFieldDef();
    const errors = validateJsonField([1, 2, 3], fieldDef);
    expect(errors).toHaveLength(0);
  });

  it("should fail for required field with null", () => {
    const fieldDef = makeJsonFieldDef({ required: true });
    const errors = validateJsonField(null, fieldDef);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("REQUIRED");
  });
});

// =============================================================================
// validateFieldValue Tests
// =============================================================================

describe("validateFieldValue", () => {
  it("should dispatch to correct validator based on field type", () => {
    const textField: FieldDefinition = {
      name: "title",
      label: "Title",
      type: "text",
      required: true,
    };
    const errors = validateFieldValue("", textField);
    expect(errors[0].code).toBe("REQUIRED");
  });

  it("should handle unknown field types gracefully", () => {
    const unknownField = {
      name: "unknown",
      label: "Unknown",
      type: "unknownType" as any,
      required: false,
    };
    const errors = validateFieldValue("test", unknownField);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("INVALID_TYPE");
  });
});

// =============================================================================
// validateContentData Tests
// =============================================================================

describe("validateContentData", () => {
  const schema: ContentTypeSchema = {
    name: "blog_post",
    displayName: "Blog Post",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "body", label: "Body", type: "richText", required: false },
      { name: "views", label: "Views", type: "number", required: false },
    ],
  };

  it("should validate all fields in content data", () => {
    const result = validateContentData(
      { title: "Hello World", body: "<p>Content</p>", views: 100 },
      schema
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should report errors for invalid fields", () => {
    const result = validateContentData({ title: "", body: "<p>Content</p>" }, schema);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe("title");
  });

  it("should report unknown fields in strict mode", () => {
    const result = validateContentData(
      { title: "Hello", unknownField: "value" },
      schema,
      { strictFields: true }
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "UNKNOWN_FIELD")).toBe(true);
  });

  it("should ignore unknown fields in non-strict mode", () => {
    const result = validateContentData(
      { title: "Hello", unknownField: "value" },
      schema
    );
    expect(result.valid).toBe(true);
  });
});

// =============================================================================
// applyFieldDefaults Tests
// =============================================================================

describe("applyFieldDefaults", () => {
  const schema: ContentTypeSchema = {
    name: "settings",
    displayName: "Settings",
    fields: [
      { name: "theme", label: "Theme", type: "text", required: false, defaultValue: "light" },
      {
        name: "fontSize",
        label: "Font Size",
        type: "number",
        required: false,
        defaultValue: 16,
      },
      {
        name: "darkMode",
        label: "Dark Mode",
        type: "boolean",
        required: false,
        defaultValue: false,
      },
    ],
  };

  it("should apply default values to missing fields", () => {
    const result = applyFieldDefaults({}, schema);
    expect(result.theme).toBe("light");
    expect(result.fontSize).toBe(16);
    expect(result.darkMode).toBe(false);
  });

  it("should not override existing values", () => {
    const result = applyFieldDefaults({ theme: "dark", fontSize: 20 }, schema);
    expect(result.theme).toBe("dark");
    expect(result.fontSize).toBe(20);
    expect(result.darkMode).toBe(false);
  });

  it("should handle null values as empty", () => {
    const result = applyFieldDefaults({ theme: null }, schema);
    expect(result.theme).toBe("light");
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe("getFieldType", () => {
  it("should return the field type", () => {
    const fieldDef: FieldDefinition = {
      name: "title",
      label: "Title",
      type: "text",
      required: false,
    };
    expect(getFieldType(fieldDef)).toBe("text");
  });
});

describe("isFieldRequired", () => {
  it("should return true for required fields", () => {
    const fieldDef: FieldDefinition = {
      name: "title",
      label: "Title",
      type: "text",
      required: true,
    };
    expect(isFieldRequired(fieldDef)).toBe(true);
  });

  it("should return false for optional fields", () => {
    const fieldDef: FieldDefinition = {
      name: "title",
      label: "Title",
      type: "text",
      required: false,
    };
    expect(isFieldRequired(fieldDef)).toBe(false);
  });
});
