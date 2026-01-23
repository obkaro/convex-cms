import { createServerFn } from "@tanstack/react-start";
import type { AdminConfig } from "./admin-config";
import { loadAdminConfig } from "./loadAdminConfig";

/**
 * Server function to retrieve runtime configuration.
 *
 * Configuration is loaded from (in order of precedence):
 * 1. Environment variable CONVEX_CMS_ADMIN_CONFIG (JSON string)
 * 2. Config file (cms-admin.config.ts/js/mjs) in project root
 *
 * This code-first approach allows configuration to be:
 * - Committed to git and reviewed in PRs
 * - Type-safe with TypeScript
 * - Consistent across dev/staging/production
 *
 * @example
 * // cms-admin.config.ts
 * import { defineAdminConfig } from "@convex-cms/core";
 *
 * export default defineAdminConfig({
 *   branding: { appName: "My CMS" },
 *   navigation: { showTaxonomies: false },
 * });
 */
export const getServerConfig = createServerFn({ method: "GET" }).handler(
  async () => {
    let adminConfig: Partial<AdminConfig> = {};

    const configEnv = process.env.CONVEX_CMS_ADMIN_CONFIG;
    if (configEnv) {
      try {
        adminConfig = JSON.parse(configEnv) as Partial<AdminConfig>;
      } catch {
        console.warn("Failed to parse CONVEX_CMS_ADMIN_CONFIG as JSON");
      }
    } else {
      try {
        adminConfig = await loadAdminConfig();
      } catch (error) {
        console.warn("Failed to load admin config from file:", error);
      }
    }

    return {
      convexUrl: process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || "",
      authMode: process.env.AUTH_MODE || process.env.VITE_AUTH_MODE || "demo",
      adminConfig,
    };
  }
);

/**
 * Type for the server config response.
 */
export type ServerConfig = Awaited<ReturnType<typeof getServerConfig>>;
