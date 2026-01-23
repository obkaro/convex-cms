/**
 * Convex client utilities for the Admin UI
 *
 * This module provides helpers for interacting with the Convex CMS component
 * from within the admin application.
 *
 * NOTE: The Convex API types are generated when running `npx convex dev`.
 * Until then, TypeScript may show import errors which can be ignored.
 */

import { useQuery, useMutation } from "convex/react";

/**
 * Re-export Convex hooks for convenience
 */
export { useQuery, useMutation };

/**
 * Access to the generated Convex API
 * This will be available once `npx convex dev` is run
 *
 * Usage:
 *   import { api } from '~/lib/convex'
 *   const contentTypes = useQuery(api.convexCms.contentEntries.get, { id: '...' })
 */
export { api } from "../../convex/_generated/api";
