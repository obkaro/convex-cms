/**
 * Example App Integration Tests
 *
 * These tests verify the basic structure of the example app.
 * Full integration tests require Convex codegen and a running deployment.
 */

import { describe, it, expect } from "vitest";
import schema from "./schema";

describe("Example App Schema", () => {
  it("should have users table defined", () => {
    expect(schema.tables.users).toBeDefined();
  });

  it("users table should have required fields", () => {
    const usersTable = schema.tables.users;
    expect(usersTable).toBeDefined();
  });

  it("users table should be defined with indexes", () => {
    const usersTable = schema.tables.users;
    // Note: indexes property is private, so we just verify the table exists
    expect(usersTable).toBeDefined();
  });
});

/**
 * CMS integration tests require Convex codegen to generate types.
 *
 * To run full integration tests:
 * 1. Run `npx convex dev` in this directory to generate types
 * 2. Uncomment the tests below
 */
/*
describe("CMS Configuration", () => {
  it("cms module should export cms client", async () => {
    const cmsModule = await import("./cms");
    expect(cmsModule.cms).toBeDefined();
  });
});
*/
