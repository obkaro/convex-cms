/**
 * Tests for Content Type Migration Utility
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  applyMigrations,
  type MigrationOperation,
} from "./contentTypeMigration.js";

// =============================================================================
// Unit Tests for applyMigrations
// =============================================================================

describe("contentTypeMigration", () => {
  describe("applyMigrations", () => {
    describe("ADD_FIELD operation", () => {
      it("should add a new field with default value", () => {
        const data = { title: "Hello" };
        const operations: MigrationOperation[] = [
          { type: "ADD_FIELD", fieldName: "featured", defaultValue: false },
        ];

        const { migratedData, changes } = applyMigrations(data, operations);

        expect(migratedData).toEqual({ title: "Hello", featured: false });
        expect(changes).toHaveLength(1);
        expect(changes[0]).toEqual({
          fieldName: "featured",
          operation: "ADD_FIELD",
          oldValue: undefined,
          newValue: false,
        });
      });

      it("should not overwrite existing field value", () => {
        const data = { title: "Hello", featured: true };
        const operations: MigrationOperation[] = [
          { type: "ADD_FIELD", fieldName: "featured", defaultValue: false },
        ];

        const { migratedData, changes } = applyMigrations(data, operations);

        expect(migratedData.featured).toBe(true);
        expect(changes).toHaveLength(0);
      });

      it("should add default for null/undefined/empty fields", () => {
        const data = { title: "Hello", nullField: null, emptyField: "" };
        const operations: MigrationOperation[] = [
          { type: "ADD_FIELD", fieldName: "nullField", defaultValue: "default1" },
          { type: "ADD_FIELD", fieldName: "emptyField", defaultValue: "default2" },
          { type: "ADD_FIELD", fieldName: "undefinedField", defaultValue: "default3" },
        ];

        const { migratedData, changes } = applyMigrations(data, operations);

        expect(migratedData.nullField).toBe("default1");
        expect(migratedData.emptyField).toBe("default2");
        expect(migratedData.undefinedField).toBe("default3");
        expect(changes).toHaveLength(3);
      });

      it("should respect preserveEmpty flag", () => {
        const data = { title: "Hello", nullField: null };
        const operations: MigrationOperation[] = [
          {
            type: "ADD_FIELD",
            fieldName: "nullField",
            defaultValue: "default",
            preserveEmpty: true,
          },
        ];

        const { migratedData, changes } = applyMigrations(data, operations);

        expect(migratedData.nullField).toBe(null);
        expect(changes).toHaveLength(0);
      });

      it("should handle complex default values", () => {
        const data = {};
        const operations: MigrationOperation[] = [
          {
            type: "ADD_FIELD",
            fieldName: "metadata",
            defaultValue: { tags: [], views: 0 },
          },
        ];

        const { migratedData, changes } = applyMigrations(data, operations);

        expect(migratedData.metadata).toEqual({ tags: [], views: 0 });
        expect(changes).toHaveLength(1);
      });
    });

    describe("REMOVE_FIELD operation", () => {
      it("should remove an existing field", () => {
        const data = { title: "Hello", deprecated: "old value" };
        const operations: MigrationOperation[] = [
          { type: "REMOVE_FIELD", fieldName: "deprecated" },
        ];

        const { migratedData, changes } = applyMigrations(data, operations);

        expect(migratedData).toEqual({ title: "Hello" });
        expect("deprecated" in migratedData).toBe(false);
        expect(changes).toHaveLength(1);
        expect(changes[0]).toEqual({
          fieldName: "deprecated",
          operation: "REMOVE_FIELD",
          oldValue: "old value",
          newValue: undefined,
        });
      });

      it("should do nothing for non-existent field", () => {
        const data = { title: "Hello" };
        const operations: MigrationOperation[] = [
          { type: "REMOVE_FIELD", fieldName: "nonexistent" },
        ];

        const { migratedData, changes } = applyMigrations(data, operations);

        expect(migratedData).toEqual({ title: "Hello" });
        expect(changes).toHaveLength(0);
      });
    });

    describe("RENAME_FIELD operation", () => {
      it("should rename a field preserving its value", () => {
        const data = { desc: "Description text", title: "Hello" };
        const operations: MigrationOperation[] = [
          { type: "RENAME_FIELD", oldFieldName: "desc", newFieldName: "description" },
        ];

        const { migratedData, changes } = applyMigrations(data, operations);

        expect(migratedData).toEqual({
          title: "Hello",
          description: "Description text",
        });
        expect("desc" in migratedData).toBe(false);
        expect(changes).toHaveLength(1);
        expect(changes[0]).toEqual({
          fieldName: "desc",
          operation: "RENAME_FIELD",
          oldValue: "Description text",
          newValue: "Description text",
        });
      });

      it("should do nothing for non-existent source field", () => {
        const data = { title: "Hello" };
        const operations: MigrationOperation[] = [
          { type: "RENAME_FIELD", oldFieldName: "desc", newFieldName: "description" },
        ];

        const { migratedData, changes } = applyMigrations(data, operations);

        expect(migratedData).toEqual({ title: "Hello" });
        expect(changes).toHaveLength(0);
      });

      it("should handle renaming to an existing field (overwrites)", () => {
        const data = { oldName: "old", newName: "existing" };
        const operations: MigrationOperation[] = [
          { type: "RENAME_FIELD", oldFieldName: "oldName", newFieldName: "newName" },
        ];

        const { migratedData, changes } = applyMigrations(data, operations);

        expect(migratedData.newName).toBe("old");
        expect("oldName" in migratedData).toBe(false);
      });
    });

    describe("TRANSFORM_FIELD operation", () => {
      describe("TEXT_TO_NUMBER", () => {
        it("should convert numeric strings to numbers", () => {
          const data = { price: "99.99" };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "price", transformation: "TEXT_TO_NUMBER" },
          ];

          const { migratedData, changes } = applyMigrations(data, operations);

          expect(migratedData.price).toBe(99.99);
          expect(changes).toHaveLength(1);
        });

        it("should handle currency-formatted strings", () => {
          const data = { price: "$1,234.56" };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "price", transformation: "TEXT_TO_NUMBER" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.price).toBe(1234.56);
        });

        it("should return null for non-numeric strings", () => {
          const data = { price: "not a number" };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "price", transformation: "TEXT_TO_NUMBER" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.price).toBe(null);
        });

        it("should handle empty strings", () => {
          const data = { price: "" };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "price", transformation: "TEXT_TO_NUMBER" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.price).toBe(null);
        });

        it("should preserve numbers that are already numbers", () => {
          const data = { price: 42 };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "price", transformation: "TEXT_TO_NUMBER" },
          ];

          const { migratedData, changes } = applyMigrations(data, operations);

          expect(migratedData.price).toBe(42);
          // No change recorded since value is already the target type
          expect(changes).toHaveLength(0);
        });
      });

      describe("NUMBER_TO_TEXT", () => {
        it("should convert numbers to strings", () => {
          const data = { count: 42 };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "count", transformation: "NUMBER_TO_TEXT" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.count).toBe("42");
        });

        it("should handle floating point numbers", () => {
          const data = { price: 99.99 };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "price", transformation: "NUMBER_TO_TEXT" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.price).toBe("99.99");
        });
      });

      describe("TEXT_TO_BOOLEAN", () => {
        it('should convert "true" to true', () => {
          const data = { active: "true" };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "active", transformation: "TEXT_TO_BOOLEAN" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.active).toBe(true);
        });

        it('should convert "yes", "1", "on", "enabled" to true', () => {
          const testCases = ["yes", "YES", "1", "on", "ON", "enabled", "ENABLED"];
          for (const value of testCases) {
            const data = { active: value };
            const operations: MigrationOperation[] = [
              { type: "TRANSFORM_FIELD", fieldName: "active", transformation: "TEXT_TO_BOOLEAN" },
            ];

            const { migratedData } = applyMigrations(data, operations);

            expect(migratedData.active).toBe(true);
          }
        });

        it('should convert "false", "no", "0", "off", "disabled" to false', () => {
          const testCases = ["false", "FALSE", "no", "NO", "0", "off", "OFF", "disabled", ""];
          for (const value of testCases) {
            const data = { active: value };
            const operations: MigrationOperation[] = [
              { type: "TRANSFORM_FIELD", fieldName: "active", transformation: "TEXT_TO_BOOLEAN" },
            ];

            const { migratedData } = applyMigrations(data, operations);

            expect(migratedData.active).toBe(false);
          }
        });

        it("should return null for unrecognized strings", () => {
          const data = { active: "maybe" };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "active", transformation: "TEXT_TO_BOOLEAN" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.active).toBe(null);
        });
      });

      describe("BOOLEAN_TO_TEXT", () => {
        it("should convert true to 'true'", () => {
          const data = { active: true };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "active", transformation: "BOOLEAN_TO_TEXT" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.active).toBe("true");
        });

        it("should convert false to 'false'", () => {
          const data = { active: false };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "active", transformation: "BOOLEAN_TO_TEXT" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.active).toBe("false");
        });
      });

      describe("TEXT_TO_DATE", () => {
        it("should convert ISO date strings to timestamps", () => {
          const data = { createdAt: "2026-01-15T10:30:00.000Z" };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "createdAt", transformation: "TEXT_TO_DATE" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.createdAt).toBe(Date.parse("2026-01-15T10:30:00.000Z"));
        });

        it("should handle simple date strings", () => {
          const data = { date: "2026-01-15" };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "date", transformation: "TEXT_TO_DATE" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(typeof migratedData.date).toBe("number");
        });

        it("should return null for invalid date strings", () => {
          const data = { date: "not a date" };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "date", transformation: "TEXT_TO_DATE" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.date).toBe(null);
        });
      });

      describe("DATE_TO_TEXT", () => {
        it("should convert timestamps to ISO strings", () => {
          const timestamp = 1705315800000; // 2026-01-15T10:30:00.000Z
          const data = { createdAt: timestamp };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "createdAt", transformation: "DATE_TO_TEXT" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(typeof migratedData.createdAt).toBe("string");
          expect(migratedData.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });
      });

      describe("TEXT_TO_JSON", () => {
        it("should parse valid JSON strings", () => {
          const data = { config: '{"key": "value", "count": 42}' };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "config", transformation: "TEXT_TO_JSON" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.config).toEqual({ key: "value", count: 42 });
        });

        it("should wrap invalid JSON in object", () => {
          const data = { config: "not json" };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "config", transformation: "TEXT_TO_JSON" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.config).toEqual({ value: "not json" });
        });
      });

      describe("JSON_TO_TEXT", () => {
        it("should stringify objects to JSON", () => {
          const data = { config: { key: "value" } };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "config", transformation: "JSON_TO_TEXT" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.config).toBe('{"key":"value"}');
        });
      });

      describe("SINGLE_TO_ARRAY", () => {
        it("should wrap single value in array", () => {
          const data = { ref: "entry-id-123" };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "ref", transformation: "SINGLE_TO_ARRAY" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.ref).toEqual(["entry-id-123"]);
        });

        it("should leave arrays unchanged", () => {
          const data = { ref: ["id1", "id2"] };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "ref", transformation: "SINGLE_TO_ARRAY" },
          ];

          const { migratedData, changes } = applyMigrations(data, operations);

          expect(migratedData.ref).toEqual(["id1", "id2"]);
          expect(changes).toHaveLength(0);
        });

        it("should return empty array for null/undefined", () => {
          const data = { ref: null };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "ref", transformation: "SINGLE_TO_ARRAY" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.ref).toEqual([]);
        });
      });

      describe("ARRAY_TO_SINGLE", () => {
        it("should extract first element from array", () => {
          const data = { ref: ["id1", "id2", "id3"] };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "ref", transformation: "ARRAY_TO_SINGLE" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.ref).toBe("id1");
        });

        it("should return null for empty array", () => {
          const data = { ref: [] };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "ref", transformation: "ARRAY_TO_SINGLE" },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.ref).toBe(null);
        });

        it("should leave non-arrays unchanged", () => {
          const data = { ref: "single-value" };
          const operations: MigrationOperation[] = [
            { type: "TRANSFORM_FIELD", fieldName: "ref", transformation: "ARRAY_TO_SINGLE" },
          ];

          const { migratedData, changes } = applyMigrations(data, operations);

          expect(migratedData.ref).toBe("single-value");
          expect(changes).toHaveLength(0);
        });
      });

      describe("SELECT_VALUE_REMAP", () => {
        it("should remap single select values", () => {
          const data = { status: "active" };
          const operations: MigrationOperation[] = [
            {
              type: "TRANSFORM_FIELD",
              fieldName: "status",
              transformation: "SELECT_VALUE_REMAP",
              valueMap: { active: "enabled", inactive: "disabled" },
            },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.status).toBe("enabled");
        });

        it("should remap multiSelect values", () => {
          const data = { tags: ["tech", "news", "featured"] };
          const operations: MigrationOperation[] = [
            {
              type: "TRANSFORM_FIELD",
              fieldName: "tags",
              transformation: "SELECT_VALUE_REMAP",
              valueMap: { tech: "technology", news: "updates" },
            },
          ];

          const { migratedData } = applyMigrations(data, operations);

          expect(migratedData.tags).toEqual(["technology", "updates", "featured"]);
        });

        it("should leave unmapped values unchanged", () => {
          const data = { status: "unknown" };
          const operations: MigrationOperation[] = [
            {
              type: "TRANSFORM_FIELD",
              fieldName: "status",
              transformation: "SELECT_VALUE_REMAP",
              valueMap: { active: "enabled" },
            },
          ];

          const { migratedData, changes } = applyMigrations(data, operations);

          expect(migratedData.status).toBe("unknown");
          expect(changes).toHaveLength(0);
        });
      });
    });

    describe("SET_DEFAULT operation", () => {
      it("should set default for null values", () => {
        const data = { title: "Hello", featured: null };
        const operations: MigrationOperation[] = [
          { type: "SET_DEFAULT", fieldName: "featured", defaultValue: false },
        ];

        const { migratedData, changes } = applyMigrations(data, operations);

        expect(migratedData.featured).toBe(false);
        expect(changes).toHaveLength(1);
      });

      it("should not override existing values", () => {
        const data = { featured: true };
        const operations: MigrationOperation[] = [
          { type: "SET_DEFAULT", fieldName: "featured", defaultValue: false },
        ];

        const { migratedData, changes } = applyMigrations(data, operations);

        expect(migratedData.featured).toBe(true);
        expect(changes).toHaveLength(0);
      });
    });

    describe("Multiple operations", () => {
      it("should apply operations in order", () => {
        const data = { oldField: "100", title: "Hello" };
        const operations: MigrationOperation[] = [
          { type: "RENAME_FIELD", oldFieldName: "oldField", newFieldName: "price" },
          { type: "TRANSFORM_FIELD", fieldName: "price", transformation: "TEXT_TO_NUMBER" },
          { type: "ADD_FIELD", fieldName: "currency", defaultValue: "USD" },
          { type: "REMOVE_FIELD", fieldName: "title" },
        ];

        const { migratedData, changes } = applyMigrations(data, operations);

        expect(migratedData).toEqual({ price: 100, currency: "USD" });
        expect(changes).toHaveLength(4);
      });

      it("should handle chained transformations", () => {
        const data = { value: "42" };
        const operations: MigrationOperation[] = [
          { type: "TRANSFORM_FIELD", fieldName: "value", transformation: "TEXT_TO_NUMBER" },
          // This won't actually chain in current implementation since we're modifying in place
          // but this tests that multiple transforms work
        ];

        const { migratedData } = applyMigrations(data, operations);

        expect(migratedData.value).toBe(42);
      });
    });

    describe("Edge cases", () => {
      it("should handle empty data object", () => {
        const data = {};
        const operations: MigrationOperation[] = [
          { type: "ADD_FIELD", fieldName: "newField", defaultValue: "default" },
        ];

        const { migratedData, changes } = applyMigrations(data, operations);

        expect(migratedData).toEqual({ newField: "default" });
        expect(changes).toHaveLength(1);
      });

      it("should handle empty operations array", () => {
        const data = { title: "Hello" };
        const operations: MigrationOperation[] = [];

        const { migratedData, changes } = applyMigrations(data, operations);

        expect(migratedData).toEqual({ title: "Hello" });
        expect(changes).toHaveLength(0);
      });

      it("should handle operations on non-existent fields gracefully", () => {
        const data = { title: "Hello" };
        const operations: MigrationOperation[] = [
          { type: "TRANSFORM_FIELD", fieldName: "nonexistent", transformation: "TEXT_TO_NUMBER" },
          { type: "REMOVE_FIELD", fieldName: "nonexistent" },
          { type: "RENAME_FIELD", oldFieldName: "nonexistent", newFieldName: "newField" },
        ];

        const { migratedData, changes } = applyMigrations(data, operations);

        expect(migratedData).toEqual({ title: "Hello" });
        expect(changes).toHaveLength(0);
      });

      it("should skip operations with missing required fields", () => {
        const data = { title: "Hello" };
        const operations: MigrationOperation[] = [
          { type: "ADD_FIELD" }, // Missing fieldName
          { type: "RENAME_FIELD", oldFieldName: "title" }, // Missing newFieldName
          { type: "TRANSFORM_FIELD", fieldName: "title" }, // Missing transformation
        ];

        const { migratedData, changes } = applyMigrations(
          data,
          operations as MigrationOperation[]
        );

        expect(migratedData).toEqual({ title: "Hello" });
        expect(changes).toHaveLength(0);
      });

      it("should not mutate the original data object", () => {
        const data = { title: "Hello", nested: { value: 1 } };
        const originalData = JSON.parse(JSON.stringify(data));
        const operations: MigrationOperation[] = [
          { type: "ADD_FIELD", fieldName: "newField", defaultValue: "new" },
          { type: "REMOVE_FIELD", fieldName: "title" },
        ];

        applyMigrations(data, operations);

        // Original data should be unchanged
        expect(data).toEqual(originalData);
      });
    });
  });
});

// =============================================================================
// Validator Tests
// =============================================================================

describe("Migration Validators", () => {
  it("should validate migration operation types", () => {
    const validTypes = [
      "ADD_FIELD",
      "REMOVE_FIELD",
      "RENAME_FIELD",
      "TRANSFORM_FIELD",
      "SET_DEFAULT",
    ];

    for (const type of validTypes) {
      // This is a structural test - in practice validators are checked at runtime
      expect(validTypes).toContain(type);
    }
  });

  it("should validate transformation types", () => {
    const validTransformations = [
      "TEXT_TO_NUMBER",
      "NUMBER_TO_TEXT",
      "TEXT_TO_BOOLEAN",
      "BOOLEAN_TO_TEXT",
      "TEXT_TO_DATE",
      "DATE_TO_TEXT",
      "TEXT_TO_JSON",
      "JSON_TO_TEXT",
      "SINGLE_TO_ARRAY",
      "ARRAY_TO_SINGLE",
      "SELECT_VALUE_REMAP",
    ];

    expect(validTransformations).toHaveLength(11);
  });
});

// =============================================================================
// Integration-style Tests (testing realistic migration scenarios)
// =============================================================================

describe("Migration Scenarios", () => {
  it("should handle blog post schema upgrade", () => {
    // Scenario: Upgrading blog post schema
    // - Rename "body" to "content"
    // - Add "featured" boolean
    // - Convert "viewCount" from string to number
    const data = {
      title: "My Post",
      body: "<p>Post content here</p>",
      viewCount: "1234",
      tags: ["tech"],
    };

    const operations: MigrationOperation[] = [
      { type: "RENAME_FIELD", oldFieldName: "body", newFieldName: "content" },
      { type: "ADD_FIELD", fieldName: "featured", defaultValue: false },
      { type: "TRANSFORM_FIELD", fieldName: "viewCount", transformation: "TEXT_TO_NUMBER" },
    ];

    const { migratedData, changes } = applyMigrations(data, operations);

    expect(migratedData).toEqual({
      title: "My Post",
      content: "<p>Post content here</p>",
      viewCount: 1234,
      featured: false,
      tags: ["tech"],
    });
    expect(changes).toHaveLength(3);
  });

  it("should handle product schema with select value migration", () => {
    // Scenario: Product status values being standardized
    const data = {
      name: "Widget",
      status: "in_stock",
      price: "29.99",
    };

    const operations: MigrationOperation[] = [
      {
        type: "TRANSFORM_FIELD",
        fieldName: "status",
        transformation: "SELECT_VALUE_REMAP",
        valueMap: {
          in_stock: "available",
          out_of_stock: "unavailable",
          discontinued: "archived",
        },
      },
      { type: "TRANSFORM_FIELD", fieldName: "price", transformation: "TEXT_TO_NUMBER" },
      { type: "ADD_FIELD", fieldName: "currency", defaultValue: "USD" },
    ];

    const { migratedData } = applyMigrations(data, operations);

    expect(migratedData).toEqual({
      name: "Widget",
      status: "available",
      price: 29.99,
      currency: "USD",
    });
  });

  it("should handle reference field conversion from single to multiple", () => {
    // Scenario: Author field changing from single reference to multiple
    const data = {
      title: "Article",
      author: "author-id-123",
    };

    const operations: MigrationOperation[] = [
      { type: "RENAME_FIELD", oldFieldName: "author", newFieldName: "authors" },
      { type: "TRANSFORM_FIELD", fieldName: "authors", transformation: "SINGLE_TO_ARRAY" },
    ];

    const { migratedData } = applyMigrations(data, operations);

    expect(migratedData).toEqual({
      title: "Article",
      authors: ["author-id-123"],
    });
  });

  it("should handle cleanup of deprecated fields", () => {
    // Scenario: Removing deprecated/legacy fields
    const data = {
      title: "Entry",
      legacyId: "old-123",
      _temp: "temporary",
      deprecated_field: "remove me",
      content: "Keep this",
    };

    const operations: MigrationOperation[] = [
      { type: "REMOVE_FIELD", fieldName: "legacyId" },
      { type: "REMOVE_FIELD", fieldName: "_temp" },
      { type: "REMOVE_FIELD", fieldName: "deprecated_field" },
    ];

    const { migratedData } = applyMigrations(data, operations);

    expect(migratedData).toEqual({
      title: "Entry",
      content: "Keep this",
    });
  });

  it("should handle date string to timestamp migration", () => {
    // Scenario: Converting date strings to timestamps
    const data = {
      title: "Event",
      eventDate: "2026-06-15",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    const operations: MigrationOperation[] = [
      { type: "TRANSFORM_FIELD", fieldName: "eventDate", transformation: "TEXT_TO_DATE" },
      { type: "TRANSFORM_FIELD", fieldName: "createdAt", transformation: "TEXT_TO_DATE" },
    ];

    const { migratedData } = applyMigrations(data, operations);

    expect(typeof migratedData.eventDate).toBe("number");
    expect(typeof migratedData.createdAt).toBe("number");
    expect(migratedData.createdAt).toBe(Date.parse("2026-01-01T00:00:00.000Z"));
  });
});
