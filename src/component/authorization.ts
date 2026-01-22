/**
 * Authorization Module
 *
 * Core permission checking logic that evaluates user roles against requested
 * actions and resources. This module is called internally by all CMS operations
 * to enforce access control.
 *
 * Key concepts:
 * - Users are mapped to roles via the getUserRole hook (configured in ComponentConfig)
 * - Roles have permissions that define what actions can be performed on resources
 * - Permissions can be scoped to "all" (any resource) or "own" (resources created by the user)
 *
 * @example
 * ```typescript
 * import { requirePermission, checkPermission, UnauthorizedError } from './authorization';
 *
 * // In a mutation handler:
 * const userRole = await getUserRole(userId);
 * await requirePermission({
 *   userId,
 *   role: userRole,
 *   resource: 'contentEntries',
 *   action: 'update',
 *   resourceOwnerId: entry.createdBy,
 * });
 *
 * // Throws UnauthorizedError if permission denied
 * ```
 */

import {
  hasPermission,
  getRole,
  type Resource,
  type Action,
  type OwnershipScope,
  type RoleDefinition,
} from "./roles.js";

// =============================================================================
// Error Types
// =============================================================================

/**
 * Error codes for authorization failures.
 * These provide machine-readable error classification.
 */
export type AuthorizationErrorCode =
  | "NO_ROLE"
  | "UNKNOWN_ROLE"
  | "PERMISSION_DENIED"
  | "OWNERSHIP_REQUIRED"
  | "INVALID_RESOURCE"
  | "INVALID_ACTION";

/**
 * Error thrown when a user lacks permission to perform an action.
 *
 * Includes detailed context about the failed authorization check,
 * making it easy to understand why access was denied.
 *
 * @example
 * ```typescript
 * try {
 *   await requirePermission({ ... });
 * } catch (error) {
 *   if (error instanceof UnauthorizedError) {
 *     console.log(error.code);      // 'PERMISSION_DENIED'
 *     console.log(error.resource);  // 'contentEntries'
 *     console.log(error.action);    // 'delete'
 *     console.log(error.message);   // Human-readable message
 *   }
 * }
 * ```
 */
export class UnauthorizedError extends Error {
  /** Machine-readable error code for classification */
  readonly code: AuthorizationErrorCode;

  /** The resource being accessed (if applicable) */
  readonly resource?: Resource;

  /** The action being attempted (if applicable) */
  readonly action?: Action;

  /** The user's role (if known) */
  readonly role?: string;

  /** The user ID (if provided) */
  readonly userId?: string;

  /** The scope that was required but not granted */
  readonly requiredScope?: OwnershipScope;

  constructor(
    message: string,
    options: {
      code: AuthorizationErrorCode;
      resource?: Resource;
      action?: Action;
      role?: string;
      userId?: string;
      requiredScope?: OwnershipScope;
    }
  ) {
    super(message);
    this.name = "UnauthorizedError";
    this.code = options.code;
    this.resource = options.resource;
    this.action = options.action;
    this.role = options.role;
    this.userId = options.userId;
    this.requiredScope = options.requiredScope;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnauthorizedError);
    }
  }

  /**
   * Create a JSON-serializable representation of the error.
   * Useful for logging or API responses.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      resource: this.resource,
      action: this.action,
      role: this.role,
      userId: this.userId,
      requiredScope: this.requiredScope,
    };
  }
}

// =============================================================================
// Permission Check Types
// =============================================================================

/**
 * Options for checking a user's permission to perform an action.
 */
export interface PermissionCheckOptions {
  /** The user ID performing the action (for error messages and ownership checks) */
  userId?: string;

  /** The role name to check permissions for (null means no role assigned) */
  role: string | null;

  /** The resource type being accessed */
  resource: Resource;

  /** The action being performed on the resource */
  action: Action;

  /**
   * The ID of the user who owns the resource.
   * Required when the user's role only has "own" scope permission.
   * If not provided and "own" scope is needed, the check will fail.
   */
  resourceOwnerId?: string;

  /**
   * Custom roles to check in addition to default roles.
   * Use this to support organization-specific role definitions.
   */
  customRoles?: Record<string, RoleDefinition>;
}

/**
 * Result of a permission check that passed.
 */
export interface PermissionGranted {
  allowed: true;
  /** The scope that was granted (how the permission was satisfied) */
  grantedScope: OwnershipScope;
  /** Whether ownership was verified (true if resourceOwnerId matched userId) */
  ownershipVerified: boolean;
}

/**
 * Result of a permission check that failed.
 */
export interface PermissionDenied {
  allowed: false;
  /** The reason the permission was denied */
  reason: string;
  /** Machine-readable error code */
  code: AuthorizationErrorCode;
}

/**
 * Result of a permission check.
 */
export type PermissionCheckResult = PermissionGranted | PermissionDenied;

// =============================================================================
// Human-Readable Message Helpers
// =============================================================================

/**
 * Get a human-readable label for a resource.
 */
function getResourceLabel(resource: Resource): string {
  const labels: Record<Resource, string> = {
    contentTypes: "content types",
    contentEntries: "content entries",
    mediaAssets: "media assets",
    mediaFolders: "media folders",
    settings: "settings",
  };
  return labels[resource] ?? resource;
}

/**
 * Get a human-readable label for an action.
 */
function getActionLabel(action: Action): string {
  const labels: Record<Action, string> = {
    create: "create",
    read: "view",
    update: "update",
    delete: "delete",
    publish: "publish",
    unpublish: "unpublish",
    restore: "restore",
    manage: "manage",
  };
  return labels[action] ?? action;
}

/**
 * Generate a descriptive error message for a permission denial.
 */
function generateDenialMessage(options: {
  code: AuthorizationErrorCode;
  role: string | null;
  resource: Resource;
  action: Action;
  requiredScope?: OwnershipScope;
}): string {
  const { code, role, resource, action, requiredScope: _requiredScope } = options;
  const resourceLabel = getResourceLabel(resource);
  const actionLabel = getActionLabel(action);

  switch (code) {
    case "NO_ROLE":
      return `Access denied: No role assigned. You need a valid role to ${actionLabel} ${resourceLabel}.`;

    case "UNKNOWN_ROLE":
      return `Access denied: Unknown role "${role}". Contact an administrator to fix your role assignment.`;

    case "PERMISSION_DENIED":
      return `Access denied: The "${role}" role does not have permission to ${actionLabel} ${resourceLabel}.`;

    case "OWNERSHIP_REQUIRED":
      return `Access denied: The "${role}" role can only ${actionLabel} their own ${resourceLabel}. ` +
        `You can only perform this action on items you created.`;

    case "INVALID_RESOURCE":
      return `Invalid resource type: "${resource}". This is a system error.`;

    case "INVALID_ACTION":
      return `Invalid action type: "${action}". This is a system error.`;

    default:
      return `Access denied: Cannot ${actionLabel} ${resourceLabel}.`;
  }
}

// =============================================================================
// Core Permission Check Functions
// =============================================================================

/**
 * Check if a user has permission to perform an action on a resource.
 *
 * This is the core permission evaluation function. It returns a result object
 * indicating whether the permission was granted or denied, with details about
 * why.
 *
 * The function checks permissions in the following order:
 * 1. Validates that the user has a role assigned
 * 2. Validates that the role exists (in default or custom roles)
 * 3. Checks if the role has the required permission
 * 4. For "own" scope permissions, validates ownership if resourceOwnerId is provided
 *
 * @param options - The permission check configuration
 * @returns Result indicating whether permission was granted or denied
 *
 * @example
 * ```typescript
 * // Check if an editor can update any content entry
 * const result = checkPermission({
 *   role: 'editor',
 *   resource: 'contentEntries',
 *   action: 'update',
 * });
 * if (result.allowed) {
 *   console.log('Permission granted with scope:', result.grantedScope);
 * }
 *
 * // Check if an author can update their own content entry
 * const result = checkPermission({
 *   userId: 'user123',
 *   role: 'author',
 *   resource: 'contentEntries',
 *   action: 'update',
 *   resourceOwnerId: 'user123', // Same as userId - ownership verified
 * });
 * ```
 */
export function checkPermission(
  options: PermissionCheckOptions
): PermissionCheckResult {
  const { userId, role, resource, action, resourceOwnerId, customRoles } = options;

  // Check 1: User must have a role assigned
  if (role === null || role === undefined) {
    return {
      allowed: false,
      reason: "No role assigned to user",
      code: "NO_ROLE",
    };
  }

  // Check 2: Role must exist
  const roleDefinition = getRole(role, customRoles);
  if (!roleDefinition) {
    return {
      allowed: false,
      reason: `Unknown role: ${role}`,
      code: "UNKNOWN_ROLE",
    };
  }

  // Check 3: Check if role has permission with "all" scope
  if (hasPermission(role, { resource, action, scope: "all" }, customRoles)) {
    return {
      allowed: true,
      grantedScope: "all",
      ownershipVerified: false,
    };
  }

  // Check 4: Check if role has permission with "own" scope
  if (hasPermission(role, { resource, action, scope: "own" }, customRoles)) {
    // If no resourceOwnerId provided, we cannot verify ownership - deny access
    // for defense-in-depth (callers must always provide resourceOwnerId for
    // ownership-scoped operations)
    if (resourceOwnerId === undefined) {
      return {
        allowed: false,
        reason: "Ownership cannot be verified: resourceOwnerId not provided",
        code: "OWNERSHIP_REQUIRED",
      };
    }

    // Verify ownership: user must own the resource
    if (userId !== undefined && resourceOwnerId === userId) {
      return {
        allowed: true,
        grantedScope: "own",
        ownershipVerified: true,
      };
    }

    // User has "own" permission but doesn't own this resource
    return {
      allowed: false,
      reason: `Ownership required: user does not own this resource`,
      code: "OWNERSHIP_REQUIRED",
    };
  }

  // No matching permission found
  return {
    allowed: false,
    reason: `Role "${role}" does not have ${action} permission on ${resource}`,
    code: "PERMISSION_DENIED",
  };
}

/**
 * Require that a user has permission to perform an action.
 *
 * This is the throwing version of `checkPermission`. It's designed to be used
 * at the start of mutation/query handlers to enforce access control. If the
 * permission check fails, it throws an UnauthorizedError with a descriptive
 * message.
 *
 * @param options - The permission check configuration
 * @returns The granted permission details (if allowed)
 * @throws UnauthorizedError if the permission is denied
 *
 * @example
 * ```typescript
 * // In a content entry update mutation:
 * export const updateEntry = mutation({
 *   args: { id: v.id("contentEntries"), data: v.any() },
 *   handler: async (ctx, { id, data }) => {
 *     const entry = await ctx.db.get(id);
 *     if (!entry) throw new Error("Entry not found");
 *
 *     // Check authorization before proceeding
 *     const userRole = await getUserRole(ctx.auth.userId);
 *     await requirePermission({
 *       userId: ctx.auth.userId,
 *       role: userRole,
 *       resource: 'contentEntries',
 *       action: 'update',
 *       resourceOwnerId: entry.createdBy,
 *     });
 *
 *     // If we get here, the user is authorized
 *     await ctx.db.patch(id, data);
 *   },
 * });
 * ```
 */
export function requirePermission(
  options: PermissionCheckOptions
): PermissionGranted {
  const result = checkPermission(options);

  if (!result.allowed) {
    // Type narrowing: result is PermissionDenied when allowed is false
    const denied = result as PermissionDenied;
    throw new UnauthorizedError(
      generateDenialMessage({
        code: denied.code,
        role: options.role,
        resource: options.resource,
        action: options.action,
      }),
      {
        code: denied.code,
        resource: options.resource,
        action: options.action,
        role: options.role ?? undefined,
        userId: options.userId,
      }
    );
  }

  return result;
}

// =============================================================================
// Ownership Validation Helpers
// =============================================================================

/**
 * Check if a user owns a resource.
 *
 * This is a simple helper for ownership checks without full permission validation.
 * Use this when you've already verified the permission and just need to check
 * ownership for scope enforcement.
 *
 * @param userId - The ID of the user performing the action
 * @param resourceOwnerId - The ID of the user who created/owns the resource
 * @returns True if the user owns the resource
 *
 * @example
 * ```typescript
 * // Check ownership before allowing a delete
 * if (!isResourceOwner(currentUserId, entry.createdBy)) {
 *   throw new UnauthorizedError(
 *     'You can only delete your own content entries',
 *     { code: 'OWNERSHIP_REQUIRED', resource: 'contentEntries', action: 'delete' }
 *   );
 * }
 * ```
 */
export function isResourceOwner(
  userId: string | undefined,
  resourceOwnerId: string | undefined
): boolean {
  // Both must be defined and equal for ownership to be verified
  if (userId === undefined || resourceOwnerId === undefined) {
    return false;
  }
  return userId === resourceOwnerId;
}

/**
 * Require that a user owns a resource.
 *
 * Throws an UnauthorizedError if the user doesn't own the resource.
 * Use this when you need to enforce "own" scope on a resource.
 *
 * @param userId - The ID of the user performing the action
 * @param resourceOwnerId - The ID of the user who created/owns the resource
 * @param options - Additional context for the error message
 * @throws UnauthorizedError if the user doesn't own the resource
 *
 * @example
 * ```typescript
 * // Require ownership before allowing update
 * requireResourceOwnership(currentUserId, entry.createdBy, {
 *   resource: 'contentEntries',
 *   action: 'update',
 *   role: userRole,
 * });
 * ```
 */
export function requireResourceOwnership(
  userId: string | undefined,
  resourceOwnerId: string | undefined,
  options: {
    resource: Resource;
    action: Action;
    role?: string;
  }
): void {
  if (!isResourceOwner(userId, resourceOwnerId)) {
    throw new UnauthorizedError(
      generateDenialMessage({
        code: "OWNERSHIP_REQUIRED",
        role: options.role ?? null,
        resource: options.resource,
        action: options.action,
      }),
      {
        code: "OWNERSHIP_REQUIRED",
        resource: options.resource,
        action: options.action,
        role: options.role,
        userId: userId,
        requiredScope: "own",
      }
    );
  }
}

// =============================================================================
// Authorization Context Helpers
// =============================================================================

/**
 * Context for performing authorization checks within a request.
 * This can be built up at the start of a handler and reused for multiple checks.
 */
export interface AuthorizationContext {
  /** The user's ID */
  userId: string;
  /** The user's CMS role */
  role: string;
  /** Optional custom roles to check */
  customRoles?: Record<string, RoleDefinition>;
}

/**
 * Create an authorization context for a user.
 *
 * This is a convenience function for building the context object used by
 * authorization functions. It validates that the user has a role assigned.
 *
 * @param userId - The user's ID
 * @param role - The user's role (from getUserRole hook)
 * @param customRoles - Optional custom role definitions
 * @returns Authorization context for permission checks
 * @throws UnauthorizedError if the user has no role assigned
 *
 * @example
 * ```typescript
 * // At the start of a mutation handler:
 * const userRole = await getUserRole({ userId });
 * const authCtx = createAuthContext(userId, userRole);
 *
 * // Later, check permissions with the context:
 * requirePermission({
 *   ...authCtx,
 *   resource: 'contentEntries',
 *   action: 'create',
 * });
 * ```
 */
export function createAuthContext(
  userId: string,
  role: string | null,
  customRoles?: Record<string, RoleDefinition>
): AuthorizationContext {
  if (role === null) {
    throw new UnauthorizedError(
      "No CMS role assigned. Contact an administrator to get access.",
      {
        code: "NO_ROLE",
        userId,
      }
    );
  }

  const roleDefinition = getRole(role, customRoles);
  if (!roleDefinition) {
    throw new UnauthorizedError(
      `Unknown role "${role}". Contact an administrator to fix your role assignment.`,
      {
        code: "UNKNOWN_ROLE",
        role,
        userId,
      }
    );
  }

  return {
    userId,
    role,
    customRoles,
  };
}

/**
 * Check if a user can perform an action using an authorization context.
 *
 * This is a convenience wrapper around checkPermission that uses a pre-built
 * authorization context.
 *
 * @param authCtx - The authorization context
 * @param resource - The resource type being accessed
 * @param action - The action being performed
 * @param resourceOwnerId - Optional owner ID for ownership validation
 * @returns Permission check result
 */
export function canPerform(
  authCtx: AuthorizationContext,
  resource: Resource,
  action: Action,
  resourceOwnerId?: string
): PermissionCheckResult {
  return checkPermission({
    userId: authCtx.userId,
    role: authCtx.role,
    resource,
    action,
    resourceOwnerId,
    customRoles: authCtx.customRoles,
  });
}

/**
 * Require that a user can perform an action using an authorization context.
 *
 * This is a convenience wrapper around requirePermission that uses a pre-built
 * authorization context.
 *
 * @param authCtx - The authorization context
 * @param resource - The resource type being accessed
 * @param action - The action being performed
 * @param resourceOwnerId - Optional owner ID for ownership validation
 * @returns The granted permission details
 * @throws UnauthorizedError if permission is denied
 */
export function mustPerform(
  authCtx: AuthorizationContext,
  resource: Resource,
  action: Action,
  resourceOwnerId?: string
): PermissionGranted {
  return requirePermission({
    userId: authCtx.userId,
    role: authCtx.role,
    resource,
    action,
    resourceOwnerId,
    customRoles: authCtx.customRoles,
  });
}
