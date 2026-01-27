/**
 * Authorization Hooks Execution Module
 *
 * This module provides the infrastructure for executing authorization hooks
 * that enable custom permission logic beyond the built-in RBAC system.
 *
 * Authorization hooks allow parent applications to:
 * - Implement custom authorization logic (team-based, subscription-based, etc.)
 * - Add additional restrictions beyond RBAC
 * - Override RBAC decisions in special cases
 * - Log and audit authorization decisions
 *
 * Hook execution order:
 * 1. beforeRbac hook (can reject early or skip RBAC)
 * 2. Built-in RBAC permission check (if not skipped)
 * 3. afterRbac hook (additional restrictions)
 * 4. Operation-specific hook (fine-grained control)
 * 5. onDeny hook (if denied, can override)
 *
 * @example
 * ```typescript
 * import { executeAuthorizationHooks } from './authorizationHooks';
 *
 * // In a mutation handler
 * const authResult = await executeAuthorizationHooks({
 *   hooks: config.authorizationHooks,
 *   context: {
 *     operation: 'contentEntries.create',
 *     userId: args.createdBy,
 *     role: userRole,
 *     contentTypeId: args.contentTypeId,
 *     operationData: args,
 *   },
 *   rbacCheck: () => checkPermission({ role: userRole, ... }),
 *   skipRbac: config.skipRbac,
 * });
 *
 * if (!authResult.allowed) {
 *   throw new UnauthorizedError(authResult.reason ?? 'Access denied', { ... });
 * }
 * ```
 */

import type {
  AuthorizationHooks,
  AuthorizationHookContext,
  AuthorizationHookResult,
  AuthorizeHookContext,
  CmsOperation,
} from "../client/types.js";

import {
  checkPermission,
  type PermissionCheckOptions,
  type PermissionCheckResult,
  UnauthorizedError,
} from "./authorization.js";

import type { Resource, Action, RoleDefinition } from "./roles.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Extended authorization result with skipRbac flag.
 * Used internally during hook execution.
 */
interface ExtendedAuthResult extends AuthorizationHookResult {
  /**
   * If true, skip the built-in RBAC check.
   * Only applicable for beforeRbac hook.
   */
  skipRbac?: boolean;
}

/**
 * Options for executing the authorization hook chain.
 */
export interface ExecuteAuthorizationOptions {
  /**
   * The authorization hooks configuration from ComponentConfig.
   */
  hooks?: AuthorizationHooks;

  /**
   * The context for this authorization check.
   */
  context: AuthorizationHookContext;

  /**
   * Options for the built-in RBAC permission check.
   * If not provided, RBAC is skipped.
   */
  rbacOptions?: PermissionCheckOptions;

  /**
   * Whether to skip built-in RBAC checks entirely.
   * From ComponentConfig.skipRbac
   */
  skipRbac?: boolean;

  /**
   * Custom role definitions to use for RBAC checks.
   */
  customRoles?: Record<string, RoleDefinition>;
}

/**
 * Result from executing the authorization hook chain.
 */
export interface AuthorizationResult {
  /**
   * Whether the operation is allowed.
   */
  allowed: boolean;

  /**
   * The reason for denial (if denied).
   */
  reason?: string;

  /**
   * Modified operation data from hooks (if any).
   */
  modifiedData?: Record<string, unknown>;

  /**
   * Which check denied the operation.
   */
  deniedBy?: "beforeRbac" | "rbac" | "authorize" | "afterRbac" | "operationHook";

  /**
   * The RBAC check result (if RBAC was run).
   */
  rbacResult?: PermissionCheckResult;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Maps a CMS operation to an RBAC resource and action.
 */
export function operationToRbac(operation: CmsOperation): { resource: Resource; action: Action } | null {
  const mapping: Record<CmsOperation, { resource: Resource; action: Action }> = {
    // Content Types
    "contentTypes.create": { resource: "contentTypes", action: "create" },
    "contentTypes.update": { resource: "contentTypes", action: "update" },
    "contentTypes.delete": { resource: "contentTypes", action: "delete" },
    "contentTypes.read": { resource: "contentTypes", action: "read" },

    // Content Entries
    "contentEntries.create": { resource: "contentEntries", action: "create" },
    "contentEntries.update": { resource: "contentEntries", action: "update" },
    "contentEntries.delete": { resource: "contentEntries", action: "delete" },
    "contentEntries.read": { resource: "contentEntries", action: "read" },
    "contentEntries.publish": { resource: "contentEntries", action: "publish" },
    "contentEntries.unpublish": { resource: "contentEntries", action: "unpublish" },
    "contentEntries.restore": { resource: "contentEntries", action: "restore" },
    "contentEntries.schedule": { resource: "contentEntries", action: "update" }, // Schedule uses update permission

    // Media Items (unified assets and folders)
    "mediaItems.create": { resource: "mediaItems", action: "create" },
    "mediaItems.update": { resource: "mediaItems", action: "update" },
    "mediaItems.delete": { resource: "mediaItems", action: "delete" },
    "mediaItems.read": { resource: "mediaItems", action: "read" },
    "mediaItems.move": { resource: "mediaItems", action: "move" },

    // Versions
    "versions.read": { resource: "contentEntries", action: "read" }, // Version read uses entry read
    "versions.rollback": { resource: "contentEntries", action: "update" }, // Rollback uses entry update
  };

  return mapping[operation] ?? null;
}

/**
 * Execute a single authorization hook safely.
 * Catches errors and converts them to denied results.
 */
async function executeHook(
  hook: ((context: AuthorizationHookContext) => Promise<AuthorizationHookResult> | AuthorizationHookResult) | undefined,
  context: AuthorizationHookContext
): Promise<ExtendedAuthResult> {
  if (!hook) {
    return { allowed: true };
  }

  try {
    const result = await hook(context);
    return result as ExtendedAuthResult;
  } catch (error) {
    // Hook threw an error - treat as denial
    const message = error instanceof Error ? error.message : "Authorization hook failed";
    return {
      allowed: false,
      reason: message,
    };
  }
}

/**
 * Execute the authorize hook with the extended context that includes the RBAC decision.
 * This hook receives the default RBAC decision and can override it.
 */
async function executeAuthorizeHook(
  hook: ((context: AuthorizeHookContext) => Promise<AuthorizationHookResult> | AuthorizationHookResult) | undefined,
  context: AuthorizationHookContext,
  defaultDecision: AuthorizeHookContext["defaultDecision"]
): Promise<ExtendedAuthResult> {
  if (!hook) {
    // If no authorize hook, return the default decision
    return {
      allowed: defaultDecision.allowed,
      reason: defaultDecision.reason,
    };
  }

  const authorizeContext: AuthorizeHookContext = {
    ...context,
    defaultDecision,
  };

  try {
    const result = await hook(authorizeContext);
    return result as ExtendedAuthResult;
  } catch (error) {
    // Hook threw an error - treat as denial
    const message = error instanceof Error ? error.message : "Authorize hook failed";
    return {
      allowed: false,
      reason: message,
    };
  }
}

// =============================================================================
// Main Authorization Execution Function
// =============================================================================

/**
 * Execute the full authorization hook chain for an operation.
 *
 * This function orchestrates the execution of all authorization hooks and the
 * built-in RBAC check in the correct order:
 *
 * 1. **beforeRbac hook**: Can reject early or skip RBAC
 * 2. **Built-in RBAC**: Standard role-based permission check
 * 3. **authorize hook**: Receives RBAC decision, can override allow/deny
 * 4. **afterRbac hook**: Additional restrictions after authorize passes
 * 5. **Operation hook**: Operation-specific restrictions
 * 6. **onDeny hook**: Can override denials
 *
 * @param options - Configuration for the authorization execution
 * @returns AuthorizationResult indicating if the operation is allowed
 *
 * @example
 * ```typescript
 * const result = await executeAuthorizationHooks({
 *   hooks: config.authorizationHooks,
 *   context: {
 *     operation: 'contentEntries.publish',
 *     userId: currentUser,
 *     role: 'editor',
 *     resourceId: entryId,
 *     resourceOwnerId: entry.createdBy,
 *   },
 *   rbacOptions: {
 *     role: 'editor',
 *     resource: 'contentEntries',
 *     action: 'publish',
 *     userId: currentUser,
 *     resourceOwnerId: entry.createdBy,
 *   },
 * });
 *
 * if (!result.allowed) {
 *   throw new Error(result.reason ?? 'Operation not allowed');
 * }
 * ```
 */
export async function executeAuthorizationHooks(
  options: ExecuteAuthorizationOptions
): Promise<AuthorizationResult> {
  const { hooks, context, rbacOptions, skipRbac = false, customRoles } = options;

  let modifiedData: Record<string, unknown> | undefined;
  let rbacResult: PermissionCheckResult | undefined;
  let shouldSkipRbac = skipRbac;

  // -------------------------------------------------------------------------
  // Step 1: Execute beforeRbac hook
  // -------------------------------------------------------------------------
  if (hooks?.beforeRbac) {
    const beforeResult = await executeHook(hooks.beforeRbac, context);

    if (!beforeResult.allowed) {
      // beforeRbac denied - check onDeny hook
      if (hooks.onDeny) {
        const denyResult = await executeHook(hooks.onDeny, {
          ...context,
          operationData: {
            ...context.operationData,
            deniedBy: "beforeRbac",
            reason: beforeResult.reason,
          },
        });

        if (denyResult.allowed) {
          // onDeny overrode the denial
          modifiedData = denyResult.modifiedData;
        } else {
          return {
            allowed: false,
            reason: beforeResult.reason ?? "Denied by beforeRbac hook",
            deniedBy: "beforeRbac",
          };
        }
      } else {
        return {
          allowed: false,
          reason: beforeResult.reason ?? "Denied by beforeRbac hook",
          deniedBy: "beforeRbac",
        };
      }
    } else {
      // beforeRbac allowed - check if we should skip RBAC
      if (beforeResult.skipRbac) {
        shouldSkipRbac = true;
      }
      if (beforeResult.modifiedData) {
        modifiedData = beforeResult.modifiedData;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Step 2: Execute built-in RBAC check (if not skipped)
  // -------------------------------------------------------------------------
  let rbacDecision: AuthorizeHookContext["defaultDecision"] = {
    allowed: true, // Default if RBAC is skipped
  };

  if (!shouldSkipRbac && rbacOptions) {
    // Add custom roles if provided
    const rbacOptionsWithRoles: PermissionCheckOptions = {
      ...rbacOptions,
      customRoles: customRoles ?? rbacOptions.customRoles,
    };

    rbacResult = checkPermission(rbacOptionsWithRoles);

    if (rbacResult.allowed) {
      // Type narrowing: rbacResult is PermissionGranted when allowed is true
      const grantedResult = rbacResult as {
        allowed: true;
        grantedScope: "all" | "own";
        ownershipVerified: boolean;
      };
      rbacDecision = {
        allowed: true,
        grantedScope: grantedResult.grantedScope,
        ownershipVerified: grantedResult.ownershipVerified,
      };
    } else {
      // Type narrowing: rbacResult is PermissionDenied when allowed is false
      const deniedResult = rbacResult as { allowed: false; reason: string; code: string };
      rbacDecision = {
        allowed: false,
        reason: deniedResult.reason,
        code: deniedResult.code,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Step 3: Execute authorize hook (receives RBAC decision)
  // -------------------------------------------------------------------------
  // The authorize hook can override the RBAC decision in either direction
  if (hooks?.authorize) {
    const authorizeResult = await executeAuthorizeHook(
      hooks.authorize,
      {
        ...context,
        operationData: {
          ...context.operationData,
          ...(modifiedData ?? {}),
        },
      },
      rbacDecision
    );

    if (!authorizeResult.allowed) {
      // authorize hook denied - check onDeny hook
      if (hooks.onDeny) {
        const denyResult = await executeHook(hooks.onDeny, {
          ...context,
          operationData: {
            ...context.operationData,
            deniedBy: "authorize",
            reason: authorizeResult.reason,
            defaultDecision: rbacDecision,
          },
        });

        if (denyResult.allowed) {
          // onDeny overrode the denial
          modifiedData = denyResult.modifiedData ?? modifiedData;
        } else {
          return {
            allowed: false,
            reason: authorizeResult.reason ?? "Denied by authorize hook",
            deniedBy: "authorize",
            rbacResult,
          };
        }
      } else {
        return {
          allowed: false,
          reason: authorizeResult.reason ?? "Denied by authorize hook",
          deniedBy: "authorize",
          rbacResult,
        };
      }
    } else if (authorizeResult.modifiedData) {
      modifiedData = { ...modifiedData, ...authorizeResult.modifiedData };
    }
  } else if (!rbacDecision.allowed) {
    // No authorize hook and RBAC denied - check onDeny hook
    if (hooks?.onDeny) {
      const denyResult = await executeHook(hooks.onDeny, {
        ...context,
        operationData: {
          ...context.operationData,
          deniedBy: "rbac",
          reason: rbacDecision.reason,
          rbacCode: rbacDecision.code,
        },
      });

      if (denyResult.allowed) {
        // onDeny overrode the denial
        modifiedData = denyResult.modifiedData ?? modifiedData;
      } else {
        return {
          allowed: false,
          reason: rbacDecision.reason ?? "Denied by RBAC",
          deniedBy: "rbac",
          rbacResult,
        };
      }
    } else {
      return {
        allowed: false,
        reason: rbacDecision.reason ?? "Denied by RBAC",
        deniedBy: "rbac",
        rbacResult,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Step 4: Execute afterRbac hook
  // -------------------------------------------------------------------------
  if (hooks?.afterRbac) {
    const afterResult = await executeHook(hooks.afterRbac, {
      ...context,
      operationData: {
        ...context.operationData,
        ...(modifiedData ?? {}),
      },
    });

    if (!afterResult.allowed) {
      // afterRbac denied - check onDeny hook
      if (hooks.onDeny) {
        const denyResult = await executeHook(hooks.onDeny, {
          ...context,
          operationData: {
            ...context.operationData,
            deniedBy: "afterRbac",
            reason: afterResult.reason,
          },
        });

        if (denyResult.allowed) {
          // onDeny overrode the denial
          modifiedData = denyResult.modifiedData ?? modifiedData;
        } else {
          return {
            allowed: false,
            reason: afterResult.reason ?? "Denied by afterRbac hook",
            deniedBy: "afterRbac",
            rbacResult,
          };
        }
      } else {
        return {
          allowed: false,
          reason: afterResult.reason ?? "Denied by afterRbac hook",
          deniedBy: "afterRbac",
          rbacResult,
        };
      }
    } else if (afterResult.modifiedData) {
      modifiedData = { ...modifiedData, ...afterResult.modifiedData };
    }
  }

  // -------------------------------------------------------------------------
  // Step 5: Execute operation-specific hook
  // -------------------------------------------------------------------------
  const operationHook = hooks?.operationHooks?.[context.operation];
  if (operationHook) {
    const opResult = await executeHook(operationHook, {
      ...context,
      operationData: {
        ...context.operationData,
        ...(modifiedData ?? {}),
      },
    });

    if (!opResult.allowed) {
      // Operation hook denied - check onDeny hook
      if (hooks?.onDeny) {
        const denyResult = await executeHook(hooks.onDeny, {
          ...context,
          operationData: {
            ...context.operationData,
            deniedBy: "operationHook",
            reason: opResult.reason,
          },
        });

        if (denyResult.allowed) {
          // onDeny overrode the denial
          modifiedData = denyResult.modifiedData ?? modifiedData;
        } else {
          return {
            allowed: false,
            reason: opResult.reason ?? `Denied by ${context.operation} hook`,
            deniedBy: "operationHook",
            rbacResult,
          };
        }
      } else {
        return {
          allowed: false,
          reason: opResult.reason ?? `Denied by ${context.operation} hook`,
          deniedBy: "operationHook",
          rbacResult,
        };
      }
    } else if (opResult.modifiedData) {
      modifiedData = { ...modifiedData, ...opResult.modifiedData };
    }
  }

  // -------------------------------------------------------------------------
  // All checks passed
  // -------------------------------------------------------------------------
  return {
    allowed: true,
    modifiedData,
    rbacResult,
  };
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Create an authorization context for a content entry operation.
 *
 * @param operation - The CMS operation being performed
 * @param userId - The user performing the operation
 * @param role - The user's CMS role
 * @param entry - The content entry (if available)
 * @param contentType - The content type (if available)
 * @param operationData - Additional operation data (args)
 * @returns AuthorizationHookContext
 */
export function createContentEntryAuthContext(
  operation: CmsOperation,
  userId: string | undefined,
  role: string | null | undefined,
  entry?: { _id: unknown; createdBy?: string; contentTypeName: string },
  contentType?: { _id: unknown; name: string },
  operationData?: Record<string, unknown>
): Omit<AuthorizationHookContext, "ctx"> {
  return {
    operation,
    userId,
    role,
    resourceId: entry?._id as string | undefined,
    resourceOwnerId: entry?.createdBy,
    contentTypeId: contentType?._id as string | undefined,
    contentTypeName: entry?.contentTypeName ?? contentType?.name,
    operationData,
  };
}

/**
 * Create RBAC options from an authorization context.
 *
 * @param context - The authorization context
 * @returns PermissionCheckOptions for the RBAC check
 */
export function contextToRbacOptions(
  context: AuthorizationHookContext
): PermissionCheckOptions | null {
  const rbacMapping = operationToRbac(context.operation);
  if (!rbacMapping) {
    return null;
  }

  return {
    userId: context.userId,
    role: context.role ?? null,
    resource: rbacMapping.resource,
    action: rbacMapping.action,
    resourceOwnerId: context.resourceOwnerId,
  };
}

/**
 * Execute authorization for an operation and throw if denied.
 *
 * This is a convenience wrapper that executes hooks and throws
 * UnauthorizedError if the operation is not allowed.
 *
 * @param options - Authorization execution options
 * @throws UnauthorizedError if the operation is denied
 * @returns The authorization result (if allowed)
 */
export async function requireAuthorization(
  options: ExecuteAuthorizationOptions
): Promise<AuthorizationResult> {
  const result = await executeAuthorizationHooks(options);

  if (!result.allowed) {
    const rbacMapping = operationToRbac(options.context.operation);

    // Get the error code from RBAC result if available
    let errorCode: "PERMISSION_DENIED" | "NO_ROLE" | "UNKNOWN_ROLE" | "OWNERSHIP_REQUIRED" = "PERMISSION_DENIED";
    if (result.rbacResult && !result.rbacResult.allowed) {
      // Type narrowing: rbacResult is PermissionDenied when allowed is false
      const deniedRbac = result.rbacResult as { allowed: false; code: string };
      errorCode = deniedRbac.code as typeof errorCode;
    }

    throw new UnauthorizedError(
      result.reason ?? "Operation not allowed",
      {
        code: errorCode,
        resource: rbacMapping?.resource,
        action: rbacMapping?.action,
        role: options.context.role ?? undefined,
        userId: options.context.userId,
      }
    );
  }

  return result;
}
