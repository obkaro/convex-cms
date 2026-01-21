import { createServerFn } from "@tanstack/react-start";

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
    return {
      // Convex deployment URL - priority: CONVEX_URL > VITE_CONVEX_URL
      convexUrl:
        process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || "",

      // Authentication mode: 'demo' for mock auth, 'production' for real auth
      authMode:
        process.env.AUTH_MODE || process.env.VITE_AUTH_MODE || "demo",
    };
  }
);

/**
 * Type for the server config response.
 */
export type ServerConfig = Awaited<ReturnType<typeof getServerConfig>>;
