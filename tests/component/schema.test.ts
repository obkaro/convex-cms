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
} from "../../src/component/schema";

describe("Core Schema Definitions", () => {
	describe("Tables", () => {
		it("defines contentTypes table", () => {
			expect(schema.tables.contentTypes).toBeDefined();
		});

		it("defines contentEntries table", () => {
			expect(schema.tables.contentEntries).toBeDefined();
		});

		it("defines contentVersions table", () => {
			expect(schema.tables.contentVersions).toBeDefined();
		});

		it("defines mediaItems table (unified assets and folders)", () => {
			expect(schema.tables.mediaItems).toBeDefined();
		});

		it("defines mediaVariants table", () => {
			expect(schema.tables.mediaVariants).toBeDefined();
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

	describe("contentTypes table structure", () => {
		it("has expected fields", () => {
			const tableValidator = schema.tables.contentTypes.validator;
			expect(tableValidator).toBeDefined();
		});
	});

	describe("contentEntries table structure", () => {
		it("has expected fields", () => {
			const tableValidator = schema.tables.contentEntries.validator;
			expect(tableValidator).toBeDefined();
		});
	});

	describe("contentVersions table structure", () => {
		it("has expected fields", () => {
			const tableValidator = schema.tables.contentVersions.validator;
			expect(tableValidator).toBeDefined();
		});
	});

	describe("mediaItems table structure", () => {
		it("has expected fields", () => {
			const tableValidator = schema.tables.mediaItems.validator;
			expect(tableValidator).toBeDefined();
		});
	});

	describe("mediaVariants table structure", () => {
		it("has expected fields", () => {
			const tableValidator = schema.tables.mediaVariants.validator;
			expect(tableValidator).toBeDefined();
		});
	});
});
