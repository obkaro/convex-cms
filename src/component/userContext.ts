/**
 * User Context Handler Module
 *
 * Functions to receive and validate user context passed from parent apps.
 * Extracts user ID and roles for permission checks in the CMS authorization system.
 *
 * This module bridges the gap between external authentication systems and the
 * CMS's internal RBAC (Role-Based Access Control) system. The CMS is auth-agnostic,
 * meaning it doesn't own user authentication - instead, it relies on the parent
 * application to provide user identification.
 *
 * Key concepts:
 * - UserContext: The validated user information passed to CMS operations
 * - User ID: A string identifier from your auth system (Clerk, Auth0, custom, etc.)
 * - Role: The CMS role assigned to the user (admin, editor, author, viewer, or custom)
 *
 * @example
 * ```typescript
 * import { createUserContext, validateUserContext, extractUserId } from './userContext';
 *
 * // In your Convex function:
 * export const createPost = mutation({
 *   handler: async (ctx, args) => {
 *     // Get user from your auth system
 *     const identity = await ctx.auth.getUserIdentity();
 *
 *     // Create and validate user context
 *     const userContext = await createUserContext({
 *       userId: identity?.subject,
 *       getUserRole: config.getUserRole,
 *     });
 *
 *     // Use in CMS operations
 *     const entry = await cms.contentEntries.create(ctx, {
 *       ...args,
 *       createdBy: userContext.userId,
 *     });
 *   },
 * });
 * ```
 */

import type {
  GetUserRoleHook,
  GetUserRoleContext,
  GetUserRoleResult,
  AuthorizationHookContext,
  CmsOperation,
  CmsHookContext,
} from "../client/types.js";

import { getRole, type RoleDefinition } from "./roles.js";

// =============================================================================
// User Context Types
// =============================================================================

/**
 * Raw user context input from the parent application.
 * This is the initial user information before validation.
 */
export interface UserContextInput {
  /**
   * The user ID from your authentication system.
   * Can be undefined for anonymous/unauthenticated requests.
   *
   * Examples:
   * - Clerk: `user.id` or `identity.subject`
   * - Auth0: `user.sub`
   * - Custom: Your database user ID
   */
  userId?: string | null;

  /**
   * Optional pre-resolved role name.
   * If provided, skips the getUserRole hook lookup.
   * Useful when you've already determined the role elsewhere.
   */
  role?: string | null;

  /**
   * Optional email for logging/debugging purposes.
   * Not used for authorization decisions.
   */
  email?: string;

  /**
   * Optional display name for audit trails.
   * Not used for authorization decisions.
   */
  displayName?: string;

  /**
   * Additional metadata from your auth system.
   * Can be used in custom authorization hooks.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Validated user context ready for CMS operations.
 * This is the result after validation and role resolution.
 */
export interface UserContext {
  /**
   * The validated user ID.
   * Will be undefined for anonymous users.
   */
  userId: string | undefined;

  /**
   * The resolved CMS role name.
   * Will be null if the user has no CMS role assigned.
   */
  role: string | null;

  /**
   * Whether the user is authenticated (has a valid userId).
   */
  isAuthenticated: boolean;

  /**
   * Whether the user has a valid CMS role assigned.
   */
  hasRole: boolean;

  /**
   * The full role definition if the role exists.
   * Useful for checking specific permissions.
   */
  roleDefinition?: RoleDefinition;

  /**
   * Optional email (passed through from input).
   */
  email?: string;

  /**
   * Optional display name (passed through from input).
   */
  displayName?: string;

  /**
   * Optional metadata (passed through from input).
   */
  metadata?: Record<string, unknown>;
}

/**
 * Options for creating a user context.
 */
export interface CreateUserContextOptions {
  /**
   * The CMS hook context (provides db and auth access for hooks).
   * Required when using getUserRole hook.
   */
  ctx?: CmsHookContext;

  /**
   * The raw user context input.
   */
  input: UserContextInput;

  /**
   * The getUserRole hook from CMS configuration.
   * Required if input.role is not provided.
   */
  getUserRole?: GetUserRoleHook;

  /**
   * Custom role definitions to check against.
   * Used in addition to built-in roles.
   */
  customRoles?: Record<string, RoleDefinition>;

  /**
   * Whether to allow anonymous (unauthenticated) users.
   * @default true
   */
  allowAnonymous?: boolean;

  /**
   * Whether to require a valid CMS role.
   * If true, throws an error when the user has no role.
   * @default false
   */
  requireRole?: boolean;
}

/**
 * Validation error details for user context.
 */
export interface UserContextValidationError {
  /**
   * Error code for programmatic handling.
   */
  code:
    | "INVALID_USER_ID"
    | "ANONYMOUS_NOT_ALLOWED"
    | "ROLE_REQUIRED"
    | "UNKNOWN_ROLE"
    | "HOOK_ERROR";

  /**
   * Human-readable error message.
   */
  message: string;

  /**
   * Additional details about the error.
   */
  details?: Record<string, unknown>;
}

/**
 * Result of user context validation.
 */
export interface UserContextValidationResult {
  /**
   * Whether the validation passed.
   */
  valid: boolean;

  /**
   * The validated user context (only present if valid).
   */
  context?: UserContext;

  /**
   * Validation errors (only present if invalid).
   */
  errors?: UserContextValidationError[];
}

// =============================================================================
// User Context Error Class
// =============================================================================

/**
 * Error thrown when user context validation fails.
 *
 * @example
 * ```typescript
 * try {
 *   const context = await createUserContext({ input, getUserRole });
 * } catch (error) {
 *   if (error instanceof UserContextError) {
 *     console.log(error.code); // 'ANONYMOUS_NOT_ALLOWED'
 *     console.log(error.message); // 'Anonymous users are not allowed'
 *   }
 * }
 * ```
 */
export class UserContextError extends Error {
  readonly code: UserContextValidationError["code"];
  readonly details?: Record<string, unknown>;

  constructor(error: UserContextValidationError) {
    super(error.message);
    this.name = "UserContextError";
    this.code = error.code;
    this.details = error.details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UserContextError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate a user ID string.
 *
 * @param userId - The user ID to validate
 * @returns True if the user ID is valid
 *
 * @example
 * ```typescript
 * isValidUserId("user_123"); // true
 * isValidUserId(""); // false
 * isValidUserId(null); // false
 * ```
 */
export function isValidUserId(userId: unknown): userId is string {
  return typeof userId === "string" && userId.trim().length > 0;
}

/**
 * Validate that a role name exists in the role definitions.
 *
 * @param roleName - The role name to validate
 * @param customRoles - Optional custom role definitions
 * @returns True if the role exists
 *
 * @example
 * ```typescript
 * isValidRole("admin"); // true (built-in)
 * isValidRole("blog-author", { "blog-author": {...} }); // true (custom)
 * isValidRole("unknown"); // false
 * ```
 */
export function isValidRole(
  roleName: string | null | undefined,
  customRoles?: Record<string, RoleDefinition>
): boolean {
  if (roleName === null || roleName === undefined) {
    return false;
  }
  // getRole returns undefined if role not found
  return getRole(roleName, customRoles) !== undefined;
}

/**
 * Validate user context input without creating the full context.
 * Use this for quick validation before expensive operations.
 *
 * @param input - The user context input to validate
 * @param options - Validation options
 * @returns Validation result with errors if invalid
 *
 * @example
 * ```typescript
 * const result = validateUserContextInput(
 *   { userId: "user_123" },
 *   { allowAnonymous: false }
 * );
 *
 * if (!result.valid) {
 *   console.log(result.errors); // Validation errors
 * }
 * ```
 */
export function validateUserContextInput(
  input: UserContextInput,
  options: {
    allowAnonymous?: boolean;
    requireRole?: boolean;
    customRoles?: Record<string, RoleDefinition>;
  } = {}
): { valid: boolean; errors?: UserContextValidationError[] } {
  const { allowAnonymous = true, requireRole = false, customRoles } = options;
  const errors: UserContextValidationError[] = [];

  // Validate user ID format (if provided)
  if (input.userId !== undefined && input.userId !== null) {
    if (typeof input.userId !== "string") {
      errors.push({
        code: "INVALID_USER_ID",
        message: "User ID must be a string",
        details: { receivedType: typeof input.userId },
      });
    } else if (input.userId.trim().length === 0) {
      errors.push({
        code: "INVALID_USER_ID",
        message: "User ID cannot be empty",
      });
    }
  }

  // Check anonymous access
  const isAuthenticated = isValidUserId(input.userId);
  if (!allowAnonymous && !isAuthenticated) {
    errors.push({
      code: "ANONYMOUS_NOT_ALLOWED",
      message: "Authentication is required for this operation",
    });
  }

  // Validate role if provided
  if (input.role !== undefined && input.role !== null) {
    if (!isValidRole(input.role, customRoles)) {
      errors.push({
        code: "UNKNOWN_ROLE",
        message: `Unknown role: ${input.role}`,
        details: { role: input.role },
      });
    }
  } else if (requireRole) {
    // Role is required but not provided
    errors.push({
      code: "ROLE_REQUIRED",
      message: "A CMS role is required for this operation",
    });
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// =============================================================================
// User Context Creation Functions
// =============================================================================

/**
 * Resolve the user's CMS role using the getUserRole hook.
 *
 * @param ctx - The CMS hook context (provides db and auth access)
 * @param userId - The user ID to look up
 * @param getUserRole - The getUserRole hook from configuration
 * @returns The resolved role name or null
 *
 * @example
 * ```typescript
 * const role = await resolveUserRole(ctx, "user_123", config.getUserRole);
 * console.log(role); // "editor" or null
 * ```
 */
export async function resolveUserRole(
  ctx: CmsHookContext,
  userId: string,
  getUserRole?: GetUserRoleHook
): Promise<GetUserRoleResult> {
  if (!getUserRole) {
    return null;
  }

  try {
    const context: GetUserRoleContext = { userId };
    return await getUserRole(ctx, context);
  } catch (error) {
    // Re-throw with context for better error handling
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new UserContextError({
      code: "HOOK_ERROR",
      message: `getUserRole hook failed: ${message}`,
      details: { userId, originalError: message },
    });
  }
}

/**
 * Create a validated user context from input.
 *
 * This is the main function for converting raw user input into a validated
 * UserContext that can be used throughout CMS operations. It handles:
 * - User ID validation
 * - Role resolution via the getUserRole hook
 * - Role validation against built-in and custom roles
 * - Access control checks (anonymous, role requirements)
 *
 * @param options - Options including input and hooks
 * @returns Validated UserContext
 * @throws UserContextError if validation fails
 *
 * @example
 * ```typescript
 * // Basic usage with getUserRole hook
 * const context = await createUserContext({
 *   input: { userId: identity?.subject },
 *   getUserRole: config.getUserRole,
 * });
 *
 * // With pre-resolved role (skips hook)
 * const context = await createUserContext({
 *   input: { userId: "user_123", role: "editor" },
 * });
 *
 * // Require authentication
 * const context = await createUserContext({
 *   input: { userId },
 *   allowAnonymous: false,
 * });
 * ```
 */
export async function createUserContext(
  options: CreateUserContextOptions
): Promise<UserContext> {
  const {
    ctx,
    input,
    getUserRole,
    customRoles,
    allowAnonymous = true,
    requireRole = false,
  } = options;

  // Validate input
  const validation = validateUserContextInput(input, {
    allowAnonymous,
    requireRole: false, // We'll check this after resolving the role
    customRoles,
  });

  if (!validation.valid && validation.errors) {
    throw new UserContextError(validation.errors[0]);
  }

  // Normalize userId
  const userId = isValidUserId(input.userId) ? input.userId : undefined;
  const isAuthenticated = userId !== undefined;

  // Resolve role
  let role: string | null = null;

  if (input.role !== undefined && input.role !== null) {
    // Use pre-provided role
    role = input.role;
  } else if (userId && getUserRole && ctx) {
    // Resolve role via hook
    role = await resolveUserRole(ctx, userId, getUserRole);
  }

  // Validate resolved role
  const roleDefinition = role ? getRole(role, customRoles) ?? undefined : undefined;
  const hasRole = roleDefinition !== undefined;

  // Check role requirement
  if (requireRole && !hasRole) {
    throw new UserContextError({
      code: "ROLE_REQUIRED",
      message: isAuthenticated
        ? `User ${userId} has no CMS role assigned`
        : "Authentication and a CMS role are required",
      details: { userId, resolvedRole: role },
    });
  }

  // Warn about unknown roles (but don't fail if requireRole is false)
  if (role !== null && !hasRole) {
    // Role was provided but doesn't exist - this is logged but not an error
    // unless requireRole is true (handled above)
    console.warn(`Unknown CMS role "${role}" for user ${userId ?? "anonymous"}`);
  }

  return {
    userId,
    role,
    isAuthenticated,
    hasRole,
    roleDefinition,
    email: input.email,
    displayName: input.displayName,
    metadata: input.metadata,
  };
}

/**
 * Create a user context synchronously when the role is already known.
 * Use this when you've already resolved the role or want to skip hook execution.
 *
 * @param input - User context input with role pre-resolved
 * @param customRoles - Optional custom role definitions
 * @returns Validated UserContext
 *
 * @example
 * ```typescript
 * // When role is already known
 * const context = createUserContextSync({
 *   userId: "user_123",
 *   role: "editor",
 * });
 * ```
 */
export function createUserContextSync(
  input: UserContextInput,
  customRoles?: Record<string, RoleDefinition>
): UserContext {
  const userId = isValidUserId(input.userId) ? input.userId : undefined;
  const role = input.role ?? null;
  const roleDefinition = role ? getRole(role, customRoles) ?? undefined : undefined;

  return {
    userId,
    role,
    isAuthenticated: userId !== undefined,
    hasRole: roleDefinition !== undefined,
    roleDefinition,
    email: input.email,
    displayName: input.displayName,
    metadata: input.metadata,
  };
}

// =============================================================================
// User ID Extraction Functions
// =============================================================================

/**
 * Extract user ID from various input formats.
 * Handles common patterns from different auth systems.
 *
 * @param input - The input to extract userId from
 * @returns The extracted userId or undefined
 *
 * @example
 * ```typescript
 * // From Convex identity
 * extractUserId(identity); // uses identity.subject
 *
 * // From string
 * extractUserId("user_123"); // "user_123"
 *
 * // From object with common fields
 * extractUserId({ sub: "user_123" }); // "user_123"
 * extractUserId({ userId: "user_123" }); // "user_123"
 * extractUserId({ id: "user_123" }); // "user_123"
 * ```
 */
export function extractUserId(
  input: string | { subject?: string; sub?: string; userId?: string; id?: string; _id?: string } | null | undefined
): string | undefined {
  if (input === null || input === undefined) {
    return undefined;
  }

  // String input
  if (typeof input === "string") {
    return isValidUserId(input) ? input : undefined;
  }

  // Object input - try common fields in order of priority
  const candidates = [
    input.subject, // Convex identity
    input.sub, // JWT standard
    input.userId, // Common custom field
    input.id, // Generic ID field
    input._id, // MongoDB-style
  ];

  for (const candidate of candidates) {
    if (isValidUserId(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * Extract user ID from a Convex auth context.
 * This is a convenience wrapper for extractUserId that works with ctx.auth.
 *
 * @param authContext - The auth context from ctx.auth
 * @returns The user ID or undefined if not authenticated
 *
 * @example
 * ```typescript
 * export const myMutation = mutation({
 *   handler: async (ctx, args) => {
 *     const userId = await extractUserIdFromAuth(ctx.auth);
 *     if (!userId) {
 *       throw new Error("Authentication required");
 *     }
 *     // ... use userId
 *   },
 * });
 * ```
 */
export async function extractUserIdFromAuth(
  authContext: { getUserIdentity: () => Promise<{ subject?: string } | null> }
): Promise<string | undefined> {
  const identity = await authContext.getUserIdentity();
  return extractUserId(identity);
}

// =============================================================================
// Authorization Context Builders
// =============================================================================

/**
 * Build an AuthorizationHookContext from a UserContext and operation details.
 * This creates the context object used by authorization hooks.
 *
 * @param userContext - The validated user context
 * @param operation - The CMS operation being performed
 * @param resourceInfo - Additional resource information
 * @returns AuthorizationHookContext for hook execution
 *
 * @example
 * ```typescript
 * const hookContext = buildAuthorizationContext(
 *   userContext,
 *   "contentEntries.update",
 *   {
 *     resourceId: entry._id,
 *     resourceOwnerId: entry.createdBy,
 *     contentTypeName: entry.contentTypeName,
 *   }
 * );
 * ```
 */
export function buildAuthorizationContext(
  userContext: UserContext,
  operation: CmsOperation,
  resourceInfo?: {
    resourceId?: string;
    resourceOwnerId?: string;
    contentTypeId?: string;
    contentTypeName?: string;
    operationData?: Record<string, unknown>;
  }
): Omit<AuthorizationHookContext, "ctx"> {
  return {
    operation,
    userId: userContext.userId,
    role: userContext.role,
    resourceId: resourceInfo?.resourceId,
    resourceOwnerId: resourceInfo?.resourceOwnerId,
    contentTypeId: resourceInfo?.contentTypeId,
    contentTypeName: resourceInfo?.contentTypeName,
    operationData: {
      ...resourceInfo?.operationData,
      // Include user context metadata for custom hooks
      _userMetadata: userContext.metadata,
    },
  };
}

/**
 * Create a minimal user context for anonymous operations.
 * Use this for public read operations that don't require authentication.
 *
 * @returns A UserContext representing an anonymous user
 *
 * @example
 * ```typescript
 * // For public content queries
 * const context = createAnonymousContext();
 * // context.isAuthenticated === false
 * // context.hasRole === false
 * ```
 */
export function createAnonymousContext(): UserContext {
  return {
    userId: undefined,
    role: null,
    isAuthenticated: false,
    hasRole: false,
  };
}

/**
 * Create a system context for internal operations.
 * This bypasses normal user authentication for system-level operations.
 * Use with caution - only for trusted internal operations.
 *
 * @param systemId - Optional identifier for the system operation
 * @returns A UserContext representing a system operation
 *
 * @example
 * ```typescript
 * // For scheduled jobs or internal migrations
 * const context = createSystemContext("scheduled-publisher");
 * // context.userId === "_system:scheduled-publisher"
 * // context.role === "admin" (full access)
 * ```
 */
export function createSystemContext(systemId?: string): UserContext {
  const userId = systemId ? `_system:${systemId}` : "_system";
  return {
    userId,
    role: "admin",
    isAuthenticated: true,
    hasRole: true,
    metadata: {
      isSystemContext: true,
      systemId,
    },
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a user context represents an authenticated user.
 *
 * @param context - The user context to check
 * @returns True if the user is authenticated
 */
export function isAuthenticated(context: UserContext): boolean {
  return context.isAuthenticated && context.userId !== undefined;
}

/**
 * Check if a user context has a specific role.
 *
 * @param context - The user context to check
 * @param roleName - The role name to check for
 * @returns True if the user has the specified role
 */
export function hasUserRole(context: UserContext, roleName: string): boolean {
  return context.role === roleName && context.hasRole;
}

/**
 * Check if a user context represents a system operation.
 *
 * @param context - The user context to check
 * @returns True if this is a system context
 */
export function isSystemContext(context: UserContext): boolean {
  return context.metadata?.isSystemContext === true;
}

/**
 * Get the display identifier for a user context.
 * Useful for logging and audit trails.
 *
 * @param context - The user context
 * @returns A human-readable identifier for the user
 */
export function getUserDisplayId(context: UserContext): string {
  if (context.displayName) {
    return context.displayName;
  }
  if (context.email) {
    return context.email;
  }
  if (context.userId) {
    if (context.userId.startsWith("_system")) {
      return `System (${context.userId.replace("_system:", "")})`;
    }
    return context.userId;
  }
  return "Anonymous";
}

/**
 * Validate that a user context meets minimum requirements for an operation.
 * Returns validation result with specific error messages.
 *
 * @param context - The user context to validate
 * @param requirements - The requirements to check
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateUserContext(context, {
 *   requireAuthentication: true,
 *   requireRole: true,
 *   allowedRoles: ["admin", "editor"],
 * });
 *
 * if (!result.valid) {
 *   throw new Error(result.errors[0].message);
 * }
 * ```
 */
export function validateUserContext(
  context: UserContext,
  requirements: {
    requireAuthentication?: boolean;
    requireRole?: boolean;
    allowedRoles?: string[];
  }
): UserContextValidationResult {
  const errors: UserContextValidationError[] = [];

  if (requirements.requireAuthentication && !context.isAuthenticated) {
    errors.push({
      code: "ANONYMOUS_NOT_ALLOWED",
      message: "Authentication is required for this operation",
    });
  }

  if (requirements.requireRole && !context.hasRole) {
    errors.push({
      code: "ROLE_REQUIRED",
      message: "A valid CMS role is required for this operation",
    });
  }

  if (requirements.allowedRoles && context.role) {
    if (!requirements.allowedRoles.includes(context.role)) {
      errors.push({
        code: "UNKNOWN_ROLE",
        message: `Role "${context.role}" is not allowed for this operation`,
        details: {
          allowedRoles: requirements.allowedRoles,
          actualRole: context.role,
        },
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, context };
}
