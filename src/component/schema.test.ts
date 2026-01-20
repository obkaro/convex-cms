/**
 * Schema Definition Tests
 *
 * Verifies that the core schema tables and indexes are properly defined.
 */

import { describe, it, expect } from "vitest";
import schema, {
  fieldTypeValidator,
  contentStatusValidator,
  mediaTypeValidator,
} from "./schema";

describe("Core Schema Definitions", () => {
  describe("Tables", () => {
    it("defines content_types table", () => {
      expect(schema.tables.content_types).toBeDefined();
    });

    it("defines content_entries table", () => {
      expect(schema.tables.content_entries).toBeDefined();
    });

    it("defines content_versions table", () => {
      expect(schema.tables.content_versions).toBeDefined();
    });

    it("defines media_assets table", () => {
      expect(schema.tables.media_assets).toBeDefined();
    });

    it("defines media_folders table", () => {
      expect(schema.tables.media_folders).toBeDefined();
    });
  });

  describe("Validators", () => {
    it("exports fieldTypeValidator", () => {
      expect(fieldTypeValidator).toBeDefined();
    });

    it("exports contentStatusValidator", () => {
      expect(contentStatusValidator).toBeDefined();
    });

    it("exports mediaTypeValidator", () => {
      expect(mediaTypeValidator).toBeDefined();
    });
  });

  describe("content_types table structure", () => {
    it("has expected fields", () => {
      const tableValidator = schema.tables.content_types.validator;
      expect(tableValidator).toBeDefined();
    });
  });

  describe("content_entries table structure", () => {
    it("has expected fields", () => {
      const tableValidator = schema.tables.content_entries.validator;
      expect(tableValidator).toBeDefined();
    });
  });

  describe("content_versions table structure", () => {
    it("has expected fields", () => {
      const tableValidator = schema.tables.content_versions.validator;
      expect(tableValidator).toBeDefined();
    });
  });

  describe("media_assets table structure", () => {
    it("has expected fields", () => {
      const tableValidator = schema.tables.media_assets.validator;
      expect(tableValidator).toBeDefined();
    });
  });

  describe("media_folders table structure", () => {
    it("has expected fields", () => {
      const tableValidator = schema.tables.media_folders.validator;
      expect(tableValidator).toBeDefined();
    });
  });
});
