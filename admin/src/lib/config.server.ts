import { createServerFn } from "@tanstack/react-start";
import type { AdminConfig } from "./admin-config";

/**
 * Server function to retrieve runtime configuration.
 *
 * This allows the admin UI to read environment variables at runtime
 * rather than at build time, enabling a single build to work with
 * any Convex deployment.
 *
 * When running via `npx convex-cms admin`, the CLI sets these env vars
 * before starting the server.
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
