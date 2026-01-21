/**
 * Mutation-Level Authorization Helper
 *
 * Provides defense-in-depth authorization for component mutations.
 * When auth context is provided, mutations verify the role has permission.
 *
 * This complements the client wrapper's authorization:
 * - Client wrapper: Primary authorization layer (runs hooks, RBAC)
 * - Mutation auth: Secondary validation layer (pure RBAC check)
 *
 * @example
 * ```typescript
 * import { requireMutationAuth } from "./lib/mutationAuth.js";
 *
 * export const createEntry = mutation({
 *   args: {
 *     ...createContentEntryArgs.fields,
 *     _auth: v.optional(mutationAuthContext),
 *   },
 *   handler: async (ctx, args) => {
 *     requireMutationAuth(args._auth, "contentEntries", "create");
 *     // ... mutation logic
 *   },
 * });
 * ```
 */

import type { MutationAuthContext } from "../validators.js";
import { hasPermission, type Resource, type Action, type RoleDefinition } from "../roles.js";
import { permissionDenied } from "./errors.js";

/**
 * Options for mutation authorization check.
 */
export interface MutationAuthOptions {
  /**
   * Custom role definitions to include in permission checks.
   * These are in addition to the default roles (admin, editor, author, viewer).
   */
  customRoles?: Record<string, RoleDefinition>;
}

/**
 * Verify the auth context has permission for the requested operation.
 *
 * This function:
 * 1. If `_auth` is undefined, does nothing (backwards compatible)
 * 2. If `_auth` is provided, checks the role has permission
 * 3. Throws CMSError with PERMISSION_DENIED if check fails
 *
 * For ownership-scoped permissions (e.g., author editing their own content):
 * - If the role only has "own" scope, verifies resourceOwnerId matches userId
 * - If the role has "all" scope, ownership is not checked
 *
 * @param auth - The auth context from mutation args (may be undefined)
 * @param resource - The resource being accessed (e.g., "contentEntries")
 * @param action - The action being performed (e.g., "create", "update")
 * @param options - Optional configuration including custom roles
 * @throws CMSError with code PERMISSION_DENIED if authorization fails
 *
 * @example
 * ```typescript
 * // Basic usage - check if role can create content entries
 * requireMutationAuth(args._auth, "contentEntries", "create");
 *
 * // For update/delete - include resource owner for "own" scope check
 * const entry = await ctx.db.get(args.id);
 * requireMutationAuth(
 *   { ...args._auth, resourceOwnerId: entry.createdBy },
 *   "contentEntries",
 *   "update"
 * );
 * ```
 */
export function requireMutationAuth(
  auth: MutationAuthContext | undefined,
  resource: Resource,
  action: Action,
  options?: MutationAuthOptions
): void {
  // If no auth context provided, skip authorization (backwards compatible)
  // Security note: Caller is responsible for ensuring authorization was done elsewhere
  if (!auth) {
    return;
  }

  const { userId, role, resourceOwnerId } = auth;

  // No role means no permissions
  if (!role) {
    throw permissionDenied(action, resource);
  }

  // Check if role has "all" scope permission
  const hasAllScope = hasPermission(
    role,
    { resource, action, scope: "all" },
    options?.customRoles
  );

  if (hasAllScope) {
    return; // Authorized with "all" scope
  }

  // Check if role has "own" scope permission
  const hasOwnScope = hasPermission(
    role,
    { resource, action, scope: "own" },
    options?.customRoles
  );

  if (hasOwnScope) {
    // "own" scope requires ownership verification
    if (resourceOwnerId && resourceOwnerId === userId) {
      return; // Authorized - user owns the resource
    }

    // For create operations, ownership is always satisfied (user will own it)
    if (action === "create") {
      return; // Authorized - creating own resource
    }

    // Ownership check failed
    throw permissionDenied(
      `${action} other users'`,
      resource
    );
  }

  // No permission found
  throw permissionDenied(action, resource);
}

/**
 * Check if auth context has permission without throwing.
 *
 * Useful for conditional logic based on permissions.
 *
 * @param auth - The auth context from mutation args
 * @param resource - The resource being accessed
 * @param action - The action being performed
 * @param options - Optional configuration including custom roles
 * @returns true if authorized, false otherwise
 */
export function hasMutationAuth(
  auth: MutationAuthContext | undefined,
  resource: Resource,
  action: Action,
  options?: MutationAuthOptions
): boolean {
  if (!auth) {
    return true; // No auth = no restriction (backwards compatible)
  }

  const { userId, role, resourceOwnerId } = auth;

  if (!role) {
    return false;
  }

  // Check "all" scope first
  if (hasPermission(role, { resource, action, scope: "all" }, options?.customRoles)) {
    return true;
  }

  // Check "own" scope
  if (hasPermission(role, { resource, action, scope: "own" }, options?.customRoles)) {
    // For "own" scope, verify ownership or it's a create action
    if (action === "create") {
      return true;
    }
    if (resourceOwnerId && resourceOwnerId === userId) {
      return true;
    }
    return false;
  }

  return false;
}

/**
 * Augment auth context with resource owner information.
 *
 * Use this when you have an auth context and need to add ownership info
 * for permission checks on existing resources.
 *
 * @param auth - The original auth context
 * @param resourceOwnerId - The owner of the resource being accessed
 * @returns Auth context with resourceOwnerId set
 */
export function withResourceOwner(
  auth: MutationAuthContext | undefined,
  resourceOwnerId: string | undefined
): MutationAuthContext | undefined {
  if (!auth) {
    return undefined;
  }
  return { ...auth, resourceOwnerId };
}
