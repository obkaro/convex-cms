/// <reference types="vite/client" />
/**
 * Test helpers for the Convex CMS component.
 *
 * Use these helpers to register the component with convex-test
 * for testing in your application.
 *
 * @example
 * ```typescript
 * import { convexTest } from "convex-test";
 * import convexCmsTest from "@convex-cms/core/test";
 * import schema from "./schema";
 *
 * const modules = import.meta.glob("./**\/*.ts");
 *
 * test("my test", async () => {
 *   const t = convexTest(schema, modules);
 *   convexCmsTest.register(t, "convexCms");
 *
 *   // Your tests here
 * });
 * ```
 */

import type { TestConvex } from "convex-test";
import type { GenericSchema, SchemaDefinition } from "convex/server";
import schema from "./component/schema.js";

// Import all component modules for testing
const modules = import.meta.glob("./component/**/*.ts");

/**
 * Register the Convex CMS component with a convex-test instance.
 *
 * @param t - The test convex instance from calling `convexTest()`
 * @param name - The name of the component as registered in convex.config.ts
 *               Defaults to "convexCms"
 */
export function register(
  t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
  name: string = "convexCms"
) {
  t.registerComponent(name, schema, modules);
}

/**
 * Export schema and modules for advanced testing scenarios.
 */
export { schema, modules };

/**
 * Default export for convenient importing.
 */
export default { register, schema, modules };
