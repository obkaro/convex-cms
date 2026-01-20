import { defineComponent } from "convex/server";

/**
 * Convex CMS Component
 *
 * A developer-first content management system component with:
 * - Content type definitions with typed fields
 * - Content versioning and publishing workflows
 * - Media asset management
 * - Flexible RBAC
 * - AI-ready architecture
 *
 * This component runs in a sandboxed environment with its own
 * isolated database tables and type-safe APIs.
 *
 * @example
 * ```typescript
 * // In your app's convex/convex.config.ts:
 * import { defineApp } from "convex/server";
 * import convexCms from "@convex-cms/core/convex.config";
 *
 * const app = defineApp();
 * app.use(convexCms);
 *
 * export default app;
 * ```
 *
 * @example
 * ```typescript
 * // Using the component with configuration:
 * import { createCmsClient, type ComponentConfig } from "@convex-cms/core";
 *
 * const config: ComponentConfig = {
 *   defaultLocale: "en-US",
 *   features: {
 *     versioning: true,
 *     localization: true,
 *   },
 * };
 *
 * export const cms = createCmsClient(components.convexCms, config);
 * ```
 */
const component = defineComponent("convexCms");

export default component;
