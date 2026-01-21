/**
 * TypeScript type definitions for the Convex CMS component.
 *
 * These types are derived from the schema validators and can be used
 * in parent applications for type-safe CMS operations.
 *
 * Note: All IDs are strings at the component API boundary
 * (Convex component IDs become strings when crossing the boundary).
 */

// =============================================================================
// Component Configuration
// =============================================================================

/**
 * Supported locales for content localization.
 * Follows IETF BCP 47 language tag format.
 */
export type LocaleCode = string;

/**
 * Feature flags for enabling/disabling CMS capabilities.
 */
export interface FeatureFlags {
  /**
   * Enable content versioning and history tracking.
   * When enabled, creates version snapshots on content changes.
   * @default true
   */
  versioning?: boolean;

  /**
   * Enable content scheduling for future publish/unpublish.
   * @default true
   */
  scheduling?: boolean;

  /**
   * Enable multi-locale content support.
   * When enabled, content entries can have locale-specific variants.
   * @default false
   */
  localization?: boolean;

  /**
   * Enable media asset management features.
   * @default true
   */
  mediaManagement?: boolean;

  /**
   * Enable content entry locking to prevent concurrent edits.
   * @default true
   */
  contentLocking?: boolean;

  /**
   * Enable soft delete for content and media (recoverable).
   * When disabled, deletions are permanent.
   * @default true
   */
  softDelete?: boolean;

  /**
   * Enable full-text search indexing for content.
   * @default true
   */
  searchIndexing?: boolean;
}

// =============================================================================
// Convex Context Types for Hooks
// =============================================================================

/**
 * Database access interface for authorization hooks.
 * This provides a minimal type-safe interface for querying the parent app's database.
 *
 * Note: The actual ctx.db at runtime has full capabilities based on the parent app's
 * context type. Users can cast to their specific MutationCtx/QueryCtx for full type safety.
 */
export interface CmsHookDatabaseAccess {
  /**
   * Query a table in the parent app's database.
   * @param tableName - The name of the table to query
   * @returns A query builder (actual type depends on parent app's schema)
   */
  query<TableName extends string>(tableName: TableName): {
    filter(predicate: (q: unknown) => unknown): unknown;
    first(): Promise<unknown>;
    collect(): Promise<unknown[]>;
  };

  /**
   * Get a document by ID from the parent app's database.
   * @param id - The document ID
   * @returns The document or null
   */
  get(id: unknown): Promise<unknown>;
}

/**
 * Authentication access interface for authorization hooks.
 * Provides access to the authenticated user identity from the parent app.
 */
export interface CmsHookAuthAccess {
  /**
   * Get the authenticated user's identity.
   * @returns The user identity or null if not authenticated
   */
  getUserIdentity(): Promise<{
    tokenIdentifier: string;
    subject: string;
    issuer: string;
    [key: string]: unknown;
  } | null>;
}

/**
 * Extended Convex context for CMS authorization hooks.
 *
 * This extends the minimal ConvexContext with database and auth access,
 * allowing hooks to query the parent app's database and check authentication.
 *
 * @example
 * ```typescript
 * // In getUserRole hook - query parent app's users table
 * getUserRole: async (ctx, { userId }) => {
 *   const user = await ctx.db.query("users")
 *     .filter(q => q.eq(q.field("_id"), userId))
 *     .first();
 *   return user?.cmsRole ?? null;
 * }
 *
 * // For full type safety, cast to your app's context type
 * getUserRole: async (ctx, { userId }) => {
 *   const typedCtx = ctx as MutationCtx; // Your app's MutationCtx
 *   const user = await typedCtx.db.get(userId as Id<"users">);
 *   return user?.role ?? null;
 * }
 * ```
 */
export interface CmsHookContext {
  /**
   * Database access for querying the parent app's tables.
   */
  db: CmsHookDatabaseAccess;

  /**
   * Authentication access (available if auth is configured in parent app).
   */
  auth: CmsHookAuthAccess;

  /**
   * Run a mutation on a component.
   */
  runMutation: (mutation: unknown, ...args: unknown[]) => Promise<unknown>;

  /**
   * Run a query on a component.
   */
  runQuery: (query: unknown, ...args: unknown[]) => Promise<unknown>;
}

// =============================================================================
// User Role Hook Types
// =============================================================================

/**
 * Context passed to the getUserRole hook (excluding ctx which is passed separately).
 */
export interface GetUserRoleContext {
  /**
   * The user ID to look up the role for.
   * This is the same ID passed to createdBy/updatedBy in CMS operations.
   */
  userId: string;
}

// =============================================================================
// Authorization Hook Types
// =============================================================================

/**
 * CMS operations that can have authorization hooks applied.
 */
export type CmsOperation =
  // Content Type operations
  | "contentTypes.create"
  | "contentTypes.update"
  | "contentTypes.delete"
  | "contentTypes.read"
  // Content Entry operations
  | "contentEntries.create"
  | "contentEntries.update"
  | "contentEntries.delete"
  | "contentEntries.read"
  | "contentEntries.publish"
  | "contentEntries.unpublish"
  | "contentEntries.restore"
  | "contentEntries.schedule"
  // Media Asset operations
  | "mediaAssets.create"
  | "mediaAssets.update"
  | "mediaAssets.delete"
  | "mediaAssets.read"
  // Media Folder operations
  | "mediaFolders.create"
  | "mediaFolders.update"
  | "mediaFolders.delete"
  | "mediaFolders.read"
  | "mediaFolders.move"
  // Version operations
  | "versions.read"
  | "versions.rollback";

/**
 * Context passed to authorization hooks.
 * Contains all information needed to make authorization decisions.
 *
 * The ctx property provides access to the parent app's database and auth,
 * allowing hooks to perform custom queries for authorization decisions.
 */
export interface AuthorizationHookContext {
  /**
   * The Convex context from the parent app.
   * Provides access to the database and authentication.
   *
   * @example
   * ```typescript
   * // Query parent app's database in authorization hook
   * authorize: async (context) => {
   *   const user = await context.ctx.db.query("users")
   *     .filter(q => q.eq(q.field("_id"), context.userId))
   *     .first();
   *   return { allowed: user?.isApproved === true };
   * }
   * ```
   */
  ctx: CmsHookContext;

  /**
   * The operation being performed.
   */
  operation: CmsOperation;

  /**
   * The user ID performing the operation.
   * May be undefined for unauthenticated operations.
   */
  userId?: string;

  /**
   * The user's CMS role (if resolved via getUserRole hook).
   */
  role?: string | null;

  /**
   * The resource ID being accessed (for read/update/delete operations).
   */
  resourceId?: string;

  /**
   * The ID of the user who owns the resource (for ownership-based authorization).
   */
  resourceOwnerId?: string;

  /**
   * The content type ID (for content entry operations).
   */
  contentTypeId?: string;

  /**
   * The content type name (for content entry operations).
   */
  contentTypeName?: string;

  /**
   * Additional operation-specific data.
   * Contains the arguments passed to the operation.
   */
  operationData?: Record<string, unknown>;
}

/**
 * Result from an authorization hook.
 */
export interface AuthorizationHookResult {
  /**
   * Whether the operation is allowed.
   */
  allowed: boolean;

  /**
   * Optional reason for denial (used in error messages).
   */
  reason?: string;

  /**
   * Optional modified data to use instead of the original.
   * Allows hooks to filter or transform operation data.
   */
  modifiedData?: Record<string, unknown>;
}

/**
 * Context passed to the authorize hook.
 * Extends AuthorizationHookContext with information about the default RBAC decision.
 */
export interface AuthorizeHookContext extends AuthorizationHookContext {
  /**
   * The default decision from the built-in RBAC check.
   * This allows the authorize hook to see what RBAC decided before making its own decision.
   */
  defaultDecision: {
    /**
     * Whether RBAC allowed the operation.
     */
    allowed: boolean;

    /**
     * The reason for denial (if denied by RBAC).
     */
    reason?: string;

    /**
     * The error code from RBAC (if denied).
     * Possible values: 'NO_ROLE', 'UNKNOWN_ROLE', 'PERMISSION_DENIED', 'OWNERSHIP_REQUIRED'
     */
    code?: string;

    /**
     * The scope that was granted by RBAC (if allowed).
     * 'all' means the user can access any resource.
     * 'own' means the user can only access resources they own.
     */
    grantedScope?: "all" | "own";

    /**
     * Whether ownership was verified during the RBAC check.
     */
    ownershipVerified?: boolean;
  };
}

/**
 * Authorize hook function signature.
 *
 * This hook is called AFTER the built-in RBAC check and receives the default
 * decision. It can override or augment the RBAC decision based on custom logic.
 *
 * Unlike other hooks, this receives full context including the RBAC decision,
 * allowing for complex authorization logic that considers what RBAC decided.
 *
 * @param context - Contains operation details, user info, resource info, AND the default RBAC decision
 * @returns AuthorizationHookResult indicating whether to allow or deny the operation
 *
 * @example
 * ```typescript
 * // Override RBAC denial for premium users
 * const premiumOverride: AuthorizeHook = async (context) => {
 *   // If RBAC allowed, don't interfere
 *   if (context.defaultDecision.allowed) {
 *     return { allowed: true };
 *   }
 *
 *   // Check if user is premium and can bypass normal restrictions
 *   const isPremium = await checkPremiumStatus(context.userId);
 *   if (isPremium && context.operation === "contentEntries.publish") {
 *     return { allowed: true }; // Override RBAC denial
 *   }
 *
 *   // Respect RBAC decision
 *   return { allowed: false, reason: context.defaultDecision.reason };
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Add content-type specific restrictions after RBAC
 * const contentTypeRestrictions: AuthorizeHook = async (context) => {
 *   // Check RBAC decision first
 *   if (!context.defaultDecision.allowed) {
 *     return { allowed: false, reason: context.defaultDecision.reason };
 *   }
 *
 *   // Add extra checks for sensitive content types
 *   if (context.contentTypeName === "legal_notices") {
 *     const hasLegalAccess = await checkLegalTeamMembership(context.userId);
 *     if (!hasLegalAccess) {
 *       return { allowed: false, reason: "Legal content requires legal team membership" };
 *     }
 *   }
 *
 *   return { allowed: true };
 * };
 * ```
 */
export type AuthorizeHook = (
  context: AuthorizeHookContext
) => Promise<AuthorizationHookResult> | AuthorizationHookResult;

/**
 * Authorization hook function signature.
 *
 * Authorization hooks are called before CMS operations to determine if the
 * operation should be allowed. They enable custom permission logic beyond
 * the built-in RBAC system.
 *
 * @param context - Contains operation details, user info, and resource info
 * @returns AuthorizationHookResult indicating if the operation is allowed
 *
 * @example
 * ```typescript
 * // Custom hook that only allows publishing on weekdays
 * const onlyWeekdayPublish: AuthorizationHook = async (context) => {
 *   if (context.operation === "contentEntries.publish") {
 *     const day = new Date().getDay();
 *     if (day === 0 || day === 6) {
 *       return { allowed: false, reason: "Publishing is only allowed on weekdays" };
 *     }
 *   }
 *   return { allowed: true };
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Custom hook that checks team membership
 * const teamBasedAuth: AuthorizationHook = async (context) => {
 *   if (!context.userId) {
 *     return { allowed: false, reason: "Authentication required" };
 *   }
 *
 *   // Check if user is in the team that owns this content type
 *   const userTeams = await getUserTeams(context.userId);
 *   const contentTypeTeam = await getContentTypeTeam(context.contentTypeId);
 *
 *   if (!userTeams.includes(contentTypeTeam)) {
 *     return { allowed: false, reason: "You must be a member of the team" };
 *   }
 *
 *   return { allowed: true };
 * };
 * ```
 */
export type AuthorizationHook = (
  context: AuthorizationHookContext
) => Promise<AuthorizationHookResult> | AuthorizationHookResult;

/**
 * Configuration for authorization hooks.
 *
 * Hooks are organized by when they run relative to the built-in RBAC checks:
 * - `beforeRbac`: Runs before built-in permission checks. Can reject early or skip RBAC.
 * - `afterRbac`: Runs after RBAC passes. Can add additional restrictions.
 * - `onDeny`: Called when authorization is denied. Can override denials.
 *
 * @example
 * ```typescript
 * const authHooks: AuthorizationHooks = {
 *   // Run custom checks before RBAC
 *   beforeRbac: async (context) => {
 *     // Maintenance mode check
 *     if (isMaintenanceMode() && !isAdmin(context.userId)) {
 *       return { allowed: false, reason: "System is in maintenance mode" };
 *     }
 *     return { allowed: true };
 *   },
 *
 *   // Additional checks after RBAC passes
 *   afterRbac: async (context) => {
 *     // Rate limiting
 *     if (context.operation.startsWith("contentEntries.")) {
 *       const isRateLimited = await checkRateLimit(context.userId);
 *       if (isRateLimited) {
 *         return { allowed: false, reason: "Rate limit exceeded" };
 *       }
 *     }
 *     return { allowed: true };
 *   },
 *
 *   // Handle denials (logging, custom error messages)
 *   onDeny: async (context) => {
 *     await logDeniedAccess(context);
 *     // Return allowed: true to override the denial
 *     return { allowed: false };
 *   },
 * };
 * ```
 */
export interface AuthorizationHooks {
  /**
   * Hook that runs before built-in RBAC permission checks.
   *
   * Use this for:
   * - Early rejection (maintenance mode, IP blocking, etc.)
   * - Bypassing RBAC for certain conditions (return allowed: true to skip RBAC)
   * - Pre-authorization validation
   *
   * If this hook returns `{ allowed: false }`, the operation is denied
   * immediately without running RBAC checks.
   *
   * If this hook returns `{ allowed: true, skipRbac: true }`, RBAC is skipped.
   */
  beforeRbac?: AuthorizationHook;

  /**
   * Hook that runs after built-in RBAC permission checks pass.
   *
   * Use this for:
   * - Additional restrictions beyond RBAC (team membership, quotas, etc.)
   * - Rate limiting
   * - Time-based restrictions
   *
   * This hook only runs if RBAC allowed the operation.
   * If this hook returns `{ allowed: false }`, the operation is denied.
   */
  afterRbac?: AuthorizationHook;

  /**
   * Optional authorize hook for complex authorization logic beyond role-based checks.
   *
   * This hook is called AFTER the RBAC check and receives the full context including
   * the default RBAC decision. It can override or augment the default permission decision.
   *
   * Key differences from other hooks:
   * - Runs after RBAC check regardless of RBAC outcome (pass or fail)
   * - Receives the RBAC decision in context.defaultDecision
   * - Can override RBAC denials (grant access RBAC would deny)
   * - Can override RBAC grants (deny access RBAC would allow)
   *
   * Use this for:
   * - Complex multi-factor authorization decisions
   * - Premium user overrides
   * - Content-type specific access rules that need to know the base RBAC decision
   * - Audit logging with access to both context and decision
   * - Implementing "break glass" emergency access patterns
   *
   * Execution order in the hook chain:
   * 1. beforeRbac (can skip RBAC)
   * 2. RBAC check (if not skipped)
   * 3. **authorize** (this hook - receives RBAC decision)
   * 4. afterRbac (only if authorize allowed)
   * 5. operationHooks (only if afterRbac allowed)
   * 6. onDeny (if any step denied)
   *
   * @example
   * ```typescript
   * authorize: async (context) => {
   *   // Premium users can bypass rate limits that RBAC doesn't know about
   *   if (!context.defaultDecision.allowed) {
   *     const isPremium = await checkPremiumStatus(context.userId);
   *     if (isPremium && context.defaultDecision.code === "RATE_LIMITED") {
   *       return { allowed: true }; // Override denial for premium users
   *     }
   *   }
   *
   *   // Add extra checks for sensitive operations even if RBAC allowed
   *   if (context.defaultDecision.allowed && context.contentTypeName === "pii_data") {
   *     const hasPiiAccess = await checkPiiCertification(context.userId);
   *     if (!hasPiiAccess) {
   *       return { allowed: false, reason: "PII access requires certification" };
   *     }
   *   }
   *
   *   // Return the default RBAC decision if no overrides apply
   *   return {
   *     allowed: context.defaultDecision.allowed,
   *     reason: context.defaultDecision.reason,
   *   };
   * }
   * ```
   */
  authorize?: AuthorizeHook;

  /**
   * Hook that runs when authorization is denied (by RBAC or other hooks).
   *
   * Use this for:
   * - Custom logging of denied access
   * - Overriding denials in special cases
   * - Custom error messages
   *
   * If this hook returns `{ allowed: true }`, the denial is overridden
   * and the operation proceeds.
   */
  onDeny?: AuthorizationHook;

  /**
   * Operation-specific hooks that run for specific operations only.
   *
   * These hooks run after the general hooks and allow fine-grained control
   * over specific operations.
   *
   * @example
   * ```typescript
   * operationHooks: {
   *   "contentEntries.publish": async (context) => {
   *     // Require approval for certain content types
   *     if (context.contentTypeName === "legal_document") {
   *       const isApproved = await checkApproval(context.resourceId);
   *       if (!isApproved) {
   *         return { allowed: false, reason: "Legal documents require approval" };
   *       }
   *     }
   *     return { allowed: true };
   *   },
   * }
   * ```
   */
  operationHooks?: Partial<Record<CmsOperation, AuthorizationHook>>;
}

// =============================================================================
// Rate Limiting Hook Types
// =============================================================================

/**
 * Operation categories for rate limiting.
 * Allows configuring rate limits by operation type rather than individual operations.
 */
export type OperationCategory =
  | "read"
  | "write"
  | "publish"
  | "media"
  | "admin";

/**
 * Context passed to rate limit hooks.
 * Contains all information needed to make rate limiting decisions.
 */
export interface RateLimitHookContext {
  /**
   * The operation being performed.
   */
  operation: CmsOperation;

  /**
   * The category of operation (read, write, publish, media, admin).
   * Useful for applying rate limits by category.
   */
  operationCategory: OperationCategory;

  /**
   * The user ID performing the operation.
   * May be undefined for unauthenticated operations.
   */
  userId?: string;

  /**
   * The user's CMS role (if resolved via getUserRole hook).
   */
  role?: string | null;

  /**
   * The content type ID (for content entry operations).
   */
  contentTypeId?: string;

  /**
   * The content type name (for content entry operations).
   */
  contentTypeName?: string;

  /**
   * Additional metadata that can be used for rate limiting decisions.
   * For example: IP address, session ID, API key, user tier, etc.
   */
  metadata?: Record<string, unknown>;

  /**
   * The current timestamp in milliseconds.
   * Useful for time-based rate limiting.
   */
  timestamp: number;
}

/**
 * Result from a rate limit check hook.
 */
export interface RateLimitCheckResult {
  /**
   * Whether the operation is allowed (not rate limited).
   */
  allowed: boolean;

  /**
   * The timestamp when the operation can be retried (if rate limited).
   * In milliseconds since epoch.
   */
  retryAt?: number;

  /**
   * Optional reason for rate limiting (for error messages).
   */
  reason?: string;

  /**
   * Optional metadata about the rate limit state.
   * Can include remaining tokens, limit info, etc.
   */
  rateLimitInfo?: {
    /** The name of the rate limit that was triggered */
    limitName?: string;
    /** Remaining tokens/requests before hitting the limit */
    remaining?: number;
    /** Total limit for the time window */
    limit?: number;
    /** Time window in milliseconds */
    windowMs?: number;
    /** Whether this is a soft limit (warning) vs hard limit (denial) */
    isSoftLimit?: boolean;
  };
}

/**
 * Result from consuming a rate limit (actually recording the operation).
 */
export interface RateLimitConsumeResult extends RateLimitCheckResult {
  /**
   * Whether the rate limit was successfully consumed.
   * This is true if the operation was allowed and recorded.
   */
  consumed: boolean;
}

/**
 * Hook function signature for checking if an operation is rate limited.
 *
 * This hook is called BEFORE the operation executes to check if the user
 * has exceeded their rate limit. It should NOT modify rate limit state -
 * use the consume hook for that.
 *
 * @param context - Contains operation details, user info, and metadata
 * @returns RateLimitCheckResult indicating if the operation is allowed
 *
 * @example
 * ```typescript
 * // Check rate limit using convex-helpers
 * const checkRateLimit: RateLimitCheckHook = async (context) => {
 *   if (!context.userId) {
 *     return { allowed: true }; // Skip rate limiting for anonymous users
 *   }
 *
 *   const result = await checkRateLimitFn(ctx, {
 *     name: `cms.${context.operationCategory}`,
 *     key: context.userId,
 *   });
 *
 *   return {
 *     allowed: result.ok,
 *     retryAt: result.retryAt,
 *     reason: result.ok ? undefined : "Rate limit exceeded",
 *   };
 * };
 * ```
 */
export type RateLimitCheckHook = (
  context: RateLimitHookContext
) => Promise<RateLimitCheckResult> | RateLimitCheckResult;

/**
 * Hook function signature for consuming/recording a rate limit.
 *
 * This hook is called AFTER the rate limit check passes but BEFORE
 * the actual operation executes. It should record the rate limit usage.
 *
 * @param context - Contains operation details, user info, and metadata
 * @returns RateLimitConsumeResult indicating if consumption was successful
 *
 * @example
 * ```typescript
 * // Consume rate limit using convex-helpers
 * const consumeRateLimit: RateLimitConsumeHook = async (context) => {
 *   const result = await rateLimitFn(ctx, {
 *     name: `cms.${context.operationCategory}`,
 *     key: context.userId,
 *   });
 *
 *   return {
 *     allowed: result.ok,
 *     consumed: result.ok,
 *     retryAt: result.retryAt,
 *   };
 * };
 * ```
 */
export type RateLimitConsumeHook = (
  context: RateLimitHookContext
) => Promise<RateLimitConsumeResult> | RateLimitConsumeResult;

/**
 * Hook function signature for getting rate limit configuration.
 *
 * This hook allows dynamic rate limit configuration based on user tier,
 * operation type, content type, or other factors.
 *
 * @param context - Contains operation details, user info, and metadata
 * @returns Rate limit configuration for this context
 *
 * @example
 * ```typescript
 * // Dynamic rate limits based on user tier
 * const getRateLimitConfig: RateLimitConfigHook = async (context) => {
 *   const userTier = await getUserTier(context.userId);
 *
 *   const tierLimits = {
 *     free: { rate: 10, period: 60000 },    // 10 per minute
 *     pro: { rate: 100, period: 60000 },    // 100 per minute
 *     enterprise: { rate: 1000, period: 60000 }, // 1000 per minute
 *   };
 *
 *   return {
 *     enabled: true,
 *     config: tierLimits[userTier] ?? tierLimits.free,
 *   };
 * };
 * ```
 */
export type RateLimitConfigHook = (
  context: RateLimitHookContext
) => Promise<RateLimitConfigResult> | RateLimitConfigResult;

/**
 * Result from the rate limit configuration hook.
 */
export interface RateLimitConfigResult {
  /**
   * Whether rate limiting is enabled for this context.
   * If false, rate limiting is skipped entirely.
   */
  enabled: boolean;

  /**
   * Rate limit configuration if enabled.
   */
  config?: {
    /** Number of tokens/requests allowed per period */
    rate: number;
    /** Time period in milliseconds */
    period: number;
    /** Maximum burst capacity (optional) */
    capacity?: number;
    /** Maximum tokens that can be reserved (optional) */
    maxReserved?: number;
  };

  /**
   * Custom key to use for rate limiting.
   * Defaults to userId if not specified.
   */
  key?: string;

  /**
   * Number of tokens to consume for this operation.
   * Defaults to 1 if not specified.
   */
  cost?: number;
}

/**
 * Configuration for rate limiting hooks.
 *
 * Rate limiting hooks enable parent applications to implement custom rate
 * limiting strategies for CMS operations. The hooks are designed to integrate
 * with various rate limiting libraries (like convex-helpers/rateLimit) or
 * custom implementations.
 *
 * Hook execution order:
 * 1. getConfig (optional) - Get dynamic rate limit configuration
 * 2. check - Check if operation is rate limited
 * 3. consume - Record the rate limit usage (only if check passed)
 *
 * @example
 * ```typescript
 * import { defineRateLimits } from "convex-helpers/server/rateLimit";
 *
 * const { checkRateLimit, rateLimit } = defineRateLimits({
 *   "cms.write": { kind: "token bucket", rate: 10, period: 60000 },
 *   "cms.publish": { kind: "token bucket", rate: 5, period: 60000 },
 *   "cms.read": { kind: "token bucket", rate: 100, period: 60000 },
 * });
 *
 * const cms = createCmsClient(components.convexCms, {
 *   rateLimitHooks: {
 *     check: async (context) => {
 *       const result = await checkRateLimit(ctx, {
 *         name: `cms.${context.operationCategory}`,
 *         key: context.userId,
 *       });
 *       return { allowed: result.ok, retryAt: result.retryAt };
 *     },
 *     consume: async (context) => {
 *       const result = await rateLimit(ctx, {
 *         name: `cms.${context.operationCategory}`,
 *         key: context.userId,
 *       });
 *       return { allowed: result.ok, consumed: result.ok, retryAt: result.retryAt };
 *     },
 *   },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Per-operation rate limits with user tier support
 * const cms = createCmsClient(components.convexCms, {
 *   rateLimitHooks: {
 *     getConfig: async (context) => {
 *       // Different limits for different user tiers
 *       const tier = context.metadata?.userTier as string ?? "free";
 *       const limits = {
 *         free: { rate: 10, period: 60000 },
 *         pro: { rate: 100, period: 60000 },
 *       };
 *       return { enabled: true, config: limits[tier] };
 *     },
 *
 *     check: async (context) => {
 *       // Your rate limit check logic
 *       return { allowed: true };
 *     },
 *
 *     // Operation-specific overrides
 *     operationHooks: {
 *       "contentEntries.publish": {
 *         check: async (context) => {
 *           // Stricter limits for publish operations
 *           return { allowed: true };
 *         },
 *       },
 *     },
 *   },
 * });
 * ```
 */
export interface RateLimitHooks {
  /**
   * Hook for checking if an operation is rate limited.
   * Called before the operation executes.
   */
  check?: RateLimitCheckHook;

  /**
   * Hook for consuming/recording rate limit usage.
   * Called after check passes, before operation executes.
   * If not provided, check is used for both checking and consuming.
   */
  consume?: RateLimitConsumeHook;

  /**
   * Hook for getting dynamic rate limit configuration.
   * Allows different limits based on user tier, operation, etc.
   */
  getConfig?: RateLimitConfigHook;

  /**
   * Whether to skip rate limiting for admin role users.
   * @default false
   */
  skipForAdmin?: boolean;

  /**
   * Operations to exclude from rate limiting.
   * Read operations are often excluded to avoid limiting content viewing.
   */
  excludeOperations?: CmsOperation[];

  /**
   * Operation categories to exclude from rate limiting.
   */
  excludeCategories?: OperationCategory[];

  /**
   * Operation-specific rate limit hooks.
   * These override the global hooks for specific operations.
   */
  operationHooks?: Partial<
    Record<CmsOperation, {
      check?: RateLimitCheckHook;
      consume?: RateLimitConsumeHook;
      getConfig?: RateLimitConfigHook;
    }>
  >;

  /**
   * Callback invoked when rate limiting denies an operation.
   * Useful for logging, analytics, or custom error handling.
   */
  onRateLimited?: (context: RateLimitHookContext, result: RateLimitCheckResult) => void | Promise<void>;
}

/**
 * Result from the getUserRole hook.
 * Can return a role name or null if the user has no CMS role.
 */
export type GetUserRoleResult = string | null;

/**
 * Hook function signature for mapping user IDs to CMS roles.
 *
 * Developers implement this hook to integrate their authentication system
 * with the CMS role-based access control. The hook receives a userId and
 * should return the corresponding CMS role name.
 *
 * @param context - Contains the userId to look up
 * @returns The role name (e.g., 'admin', 'editor', 'author', 'viewer', or custom role)
 *          or null if the user has no CMS role
 *
 * @example
 * ```typescript
 * // Query your database directly - ctx has full db access!
 * const getUserRole: GetUserRoleHook = async (ctx, { userId }) => {
 *   const user = await ctx.db.query("users")
 *     .filter(q => q.eq(q.field("_id"), userId))
 *     .first();
 *   return user?.cmsRole ?? null;
 * };
 *
 * // Integration with Clerk (access publicMetadata stored in your users table)
 * const getUserRole: GetUserRoleHook = async (ctx, { userId }) => {
 *   const user = await ctx.db.get(userId);
 *   return user?.role ?? "viewer";
 * };
 *
 * // Role based on user type
 * const getUserRole: GetUserRoleHook = async (ctx, { userId }) => {
 *   const user = await ctx.db.get(userId);
 *   if (!user) return null;
 *   if (user.isAdmin) return "admin";
 *   if (user.isEditor) return "editor";
 *   if (user.canWriteContent) return "author";
 *   return "viewer";
 * };
 *
 * // For full type safety, cast ctx to your app's type
 * const getUserRole: GetUserRoleHook = async (ctx, { userId }) => {
 *   const typedCtx = ctx as MutationCtx; // Your app's MutationCtx
 *   const user = await typedCtx.db.get(userId as Id<"users">);
 *   return user?.role ?? null;
 * };
 * ```
 */
export type GetUserRoleHook = (
  ctx: CmsHookContext,
  context: GetUserRoleContext
) => Promise<GetUserRoleResult> | GetUserRoleResult;

// =============================================================================
// Simplified Configuration Types (Progressive Disclosure)
// =============================================================================

/**
 * Minimal CMS configuration for basic setup.
 *
 * This is the simplest way to configure the CMS - just provide the role lookup hook.
 * All other settings use sensible defaults.
 *
 * @example
 * ```typescript
 * // Minimal setup - just map users to roles
 * const cms = createCmsClient(components.convexCms, {
 *   getUserRole: async (ctx, { userId }) => {
 *     const user = await db.query("users").filter(...).first();
 *     return user?.cmsRole ?? null;
 *   },
 * });
 * ```
 */
export interface CmsConfig {
  /**
   * Hook for mapping user IDs to CMS roles.
   *
   * This is the only required configuration for basic CMS usage.
   * Built-in roles: 'admin', 'editor', 'author', 'viewer'
   */
  getUserRole: GetUserRoleHook;

  /**
   * Default locale for content when no locale is specified.
   * @default "en"
   */
  defaultLocale?: LocaleCode;
}

/**
 * CMS configuration with feature flags.
 *
 * Extends the minimal config with optional feature toggles.
 * Use this when you need to customize which CMS features are enabled.
 *
 * @example
 * ```typescript
 * const cms = createCmsClient(components.convexCms, {
 *   getUserRole: async (ctx, { userId }) => getUserCmsRole(userId),
 *   features: {
 *     versioning: true,
 *     localization: true,
 *   },
 * });
 * ```
 */
export interface CmsConfigWithFeatures extends CmsConfig {
  /**
   * Feature flags to enable/disable specific CMS capabilities.
   */
  features?: FeatureFlags;

  /**
   * List of supported locales (only relevant when localization is enabled).
   */
  supportedLocales?: LocaleCode[];
}

/**
 * Full CMS configuration with all advanced options.
 *
 * Extends CmsConfigWithFeatures with authorization hooks, rate limiting,
 * custom roles, and other advanced settings. Use this for complex setups
 * that need fine-grained control over CMS behavior.
 *
 * For most applications, use `CmsConfig` or `CmsConfigWithFeatures` instead.
 *
 * @example
 * ```typescript
 * const cms = createCmsClient(components.convexCms, {
 *   getUserRole: async (ctx, { userId }) => getUserCmsRole(userId),
 *   features: { versioning: true },
 *   authorizationHooks: {
 *     beforeRbac: async (ctx) => {
 *       if (isMaintenanceMode()) {
 *         return { allowed: false, reason: "Maintenance mode" };
 *       }
 *       return { allowed: true };
 *     },
 *   },
 * });
 * ```
 */
export interface FullCmsConfig extends CmsConfigWithFeatures {
  /**
   * Authorization hooks for custom permission logic.
   */
  authorizationHooks?: AuthorizationHooks;

  /**
   * Rate limiting hooks for controlling CMS operation frequency.
   */
  rateLimitHooks?: RateLimitHooks;

  /**
   * Custom roles to extend or override the default RBAC roles.
   */
  customRoles?: Array<CustomRoleInput>;

  /**
   * Whether to skip built-in RBAC checks entirely.
   * @default false
   */
  skipRbac?: boolean;
}

/**
 * Development-only CMS configuration.
 *
 * Enables permissive mode for development without setting up authentication.
 *
 * **WARNING**: Never use in production - this bypasses all authorization!
 *
 * @example
 * ```typescript
 * // Development only!
 * const cms = createCmsClient(components.convexCms, {
 *   permissiveMode: true, // Bypasses all auth - NEVER in production!
 * });
 * ```
 */
export interface CmsDevConfig {
  /**
   * Enable permissive mode - bypasses all authorization checks.
   * Only use for local development!
   */
  permissiveMode: true;

  /**
   * Default locale for content when no locale is specified.
   * @default "en"
   */
  defaultLocale?: LocaleCode;
}

/**
 * Union type for all simplified CMS configurations.
 *
 * Use this type when you want to accept any of the simplified config formats.
 */
export type SimplifiedCmsConfig =
  | CmsConfig
  | CmsConfigWithFeatures
  | FullCmsConfig
  | CmsDevConfig;

// =============================================================================
// Legacy Configuration (Full)
// =============================================================================

/**
 * Configuration options for the Convex CMS component.
 *
 * This is the full configuration interface with all options.
 * For simpler setups, consider using:
 * - `CmsConfig` - Minimal config (just getUserRole)
 * - `CmsConfigWithFeatures` - With feature flags
 * - `FullCmsConfig` - With hooks and custom roles
 *
 * @example
 * ```typescript
 * const config: ComponentConfig = {
 *   defaultLocale: "en-US",
 *   supportedLocales: ["en-US", "es-ES", "fr-FR"],
 *   features: {
 *     versioning: true,
 *     localization: true,
 *     scheduling: true,
 *   },
 *   // Map user IDs to CMS roles
 *   getUserRole: async (ctx, { userId }) => {
 *     const user = await db.query("users").filter(q => q.eq(q.field("_id"), userId)).first();
 *     return user?.cmsRole ?? null;
 *   },
 * };
 * ```
 */
export interface ComponentConfig {
  /**
   * Default locale for content when no locale is specified.
   * @default "en"
   */
  defaultLocale?: LocaleCode;

  /**
   * List of supported locales for content localization.
   * Only relevant when `features.localization` is enabled.
   * @default ["en"]
   */
  supportedLocales?: LocaleCode[];

  /**
   * Locale fallback chains configuration.
   *
   * Defines how the system should resolve content when the requested locale
   * is not available. Each locale can have an ordered array of fallback locales
   * to try before falling back to the default locale.
   *
   * @example
   * ```typescript
   * localeFallbackChains: {
   *   "es-MX": ["es-ES", "en-US"],  // Mexican Spanish -> Spain Spanish -> US English
   *   "es-AR": ["es-ES", "en-US"],  // Argentine Spanish -> Spain Spanish -> US English
   *   "pt-BR": ["pt-PT", "en-US"],  // Brazilian Portuguese -> Portugal Portuguese
   *   "zh-Hans-CN": ["zh-Hans", "en-US"], // Simplified Chinese (China) -> Simplified Chinese
   * }
   * ```
   *
   * When `autoGenerateLocaleFallbacks` is enabled, the system will automatically
   * generate fallback chains based on locale hierarchy (e.g., "en-US" -> ["en"]).
   * Explicit chains take precedence over auto-generated ones.
   */
  localeFallbackChains?: Record<LocaleCode, LocaleCode[]>;

  /**
   * Whether to automatically generate fallback chains based on locale hierarchy.
   *
   * When enabled, the system will automatically create fallback chains based on
   * the BCP 47 locale structure:
   * - "zh-Hans-CN" -> ["zh-Hans", "zh", defaultLocale]
   * - "en-US" -> ["en", defaultLocale]
   *
   * Explicit `localeFallbackChains` take precedence over auto-generated ones.
   *
   * @default true
   */
  autoGenerateLocaleFallbacks?: boolean;

  /**
   * Feature flags to enable/disable specific CMS capabilities.
   */
  features?: FeatureFlags;

  /**
   * Maximum number of versions to retain per content entry.
   * Older versions are automatically pruned.
   * Set to 0 for unlimited versions.
   * @default 50
   */
  maxVersionsPerEntry?: number;

  /**
   * Default lock duration in milliseconds for content locking.
   * @default 300000 (5 minutes)
   */
  lockDurationMs?: number;

  /**
   * Maximum file size for media uploads in bytes.
   * @default 52428800 (50MB)
   */
  maxMediaFileSize?: number;

  /**
   * Hook for mapping user IDs to CMS roles.
   *
   * This hook enables integration with any authentication system without
   * the CMS owning user tables. Implement this function to return the
   * appropriate CMS role for a given user ID.
   *
   * Built-in roles: 'admin', 'editor', 'author', 'viewer'
   * Custom roles can be defined and will be checked against customRoles config.
   *
   * @example
   * ```typescript
   * getUserRole: async (ctx, { userId }) => {
   *   const user = await db.query("users")
   *     .filter(q => q.eq(q.field("_id"), userId))
   *     .first();
   *   return user?.cmsRole ?? null;
   * }
   * ```
   */
  getUserRole?: GetUserRoleHook;

  /**
   * Authorization hooks for custom permission logic.
   *
   * These hooks allow you to implement custom authorization logic beyond
   * the built-in RBAC system. They can be used for:
   * - Team-based access control
   * - Subscription-based feature gating
   * - Time-based restrictions
   * - Content-type specific rules
   * - Custom approval workflows
   *
   * @example
   * ```typescript
   * authorizationHooks: {
   *   // Early rejection or bypass
   *   beforeRbac: async (context) => {
   *     if (isMaintenanceMode()) {
   *       return { allowed: false, reason: "System in maintenance" };
   *     }
   *     return { allowed: true };
   *   },
   *
   *   // Additional checks after RBAC passes
   *   afterRbac: async (context) => {
   *     if (context.operation === "contentEntries.publish") {
   *       const quota = await getPublishQuota(context.userId);
   *       if (quota.remaining <= 0) {
   *         return { allowed: false, reason: "Publish quota exceeded" };
   *       }
   *     }
   *     return { allowed: true };
   *   },
   *
   *   // Operation-specific hooks
   *   operationHooks: {
   *     "contentEntries.publish": async (context) => {
   *       // Require approval for legal documents
   *       if (context.contentTypeName === "legal") {
   *         const approved = await checkApproval(context.resourceId);
   *         if (!approved) {
   *           return { allowed: false, reason: "Approval required" };
   *         }
   *       }
   *       return { allowed: true };
   *     },
   *   },
   * }
   * ```
   */
  authorizationHooks?: AuthorizationHooks;

  /**
   * Rate limiting hooks for controlling CMS operation frequency.
   *
   * Rate limiting hooks enable parent applications to implement custom rate
   * limiting strategies for CMS operations. This is useful for:
   * - Preventing abuse and DoS attacks
   * - Implementing tiered usage limits (free vs pro users)
   * - Protecting expensive operations like publish/media upload
   * - Meeting API quota requirements
   *
   * The CMS provides the hook infrastructure while the parent app owns
   * the actual rate limit storage and checking logic. This allows integration
   * with various rate limiting libraries (like convex-helpers/rateLimit) or
   * custom implementations.
   *
   * @example
   * ```typescript
   * import { defineRateLimits } from "convex-helpers/server/rateLimit";
   *
   * const { checkRateLimit, rateLimit } = defineRateLimits({
   *   "cms.write": { kind: "token bucket", rate: 10, period: 60000 },
   *   "cms.publish": { kind: "token bucket", rate: 5, period: 60000 },
   * });
   *
   * const config: ComponentConfig = {
   *   rateLimitHooks: {
   *     check: async (context) => {
   *       const result = await checkRateLimit(ctx, {
   *         name: `cms.${context.operationCategory}`,
   *         key: context.userId,
   *       });
   *       return { allowed: result.ok, retryAt: result.retryAt };
   *     },
   *     consume: async (context) => {
   *       const result = await rateLimit(ctx, {
   *         name: `cms.${context.operationCategory}`,
   *         key: context.userId,
   *       });
   *       return { allowed: result.ok, consumed: result.ok };
   *     },
   *     skipForAdmin: true,
   *     excludeCategories: ["read"], // Don't rate limit reads
   *   },
   * };
   * ```
   */
  rateLimitHooks?: RateLimitHooks;

  /**
   * Whether to skip built-in RBAC checks entirely.
   *
   * When set to `true`, the built-in role-based permission checks are skipped,
   * and authorization is handled entirely by the `authorizationHooks`.
   *
   * This is useful when you want to implement a completely custom authorization
   * system without using the built-in RBAC roles.
   *
   * @default false
   *
   * @example
   * ```typescript
   * // Use only custom authorization logic
   * const config = {
   *   skipRbac: true,
   *   authorizationHooks: {
   *     beforeRbac: async (context) => {
   *       // Your custom authorization logic here
   *       const allowed = await myCustomAuthCheck(context);
   *       return { allowed };
   *     },
   *   },
   * };
   * ```
   */
  skipRbac?: boolean;

  /**
   * Enable permissive mode for development/migration scenarios.
   *
   * **Security Implications:**
   * - When `false` (default): Write operations (create, update, delete, publish, etc.)
   *   will throw an error if `getUserRole` is not configured. This is the secure default
   *   that ensures authorization is properly set up before mutations can execute.
   * - When `true`: Authorization checks are silently skipped when `getUserRole` is not
   *   configured. A warning is logged to the console. This mode is ONLY recommended for:
   *   - Initial development before auth is implemented
   *   - Testing environments
   *   - Migration from a previous version
   *
   * **CRITICAL**: Never enable permissive mode in production as it allows any user
   * to perform any operation without authorization checks.
   *
   * @default false
   *
   * @example
   * ```typescript
   * // Development mode - temporarily allow unauthenticated operations
   * const cms = createCmsClient(components.convexCms, {
   *   permissiveMode: true, // WARNING: Only for development!
   * });
   *
   * // Production mode (default) - require authorization
   * const cms = createCmsClient(components.convexCms, {
   *   getUserRole: async (ctx, { userId }) => {
   *     const user = await db.query("users").filter(...).first();
   *     return user?.cmsRole ?? null;
   *   },
   * });
   * ```
   */
  permissiveMode?: boolean;

  /**
   * Validate required hooks at initialization time.
   *
   * When specified, the CMS client will validate that the required hooks are
   * configured when `createCmsClient()` is called, rather than waiting until
   * the methods are invoked at runtime.
   *
   * This is useful for:
   * - Catching configuration errors early during app startup
   * - Ensuring RBAC features work before deployment
   * - Failing fast rather than at runtime when a user triggers an operation
   *
   * Available validation options:
   * - `getUserRole`: Requires the `getUserRole` hook for role-based methods
   * - `authorizationHooks`: Requires at least one authorization hook
   * - `rateLimitHooks`: Requires the rate limiting check hook
   *
   * @default undefined (no upfront validation)
   *
   * @example
   * ```typescript
   * // Validate getUserRole hook is configured at init time
   * const cms = createCmsClient(components.convexCms, {
   *   requireHooks: ["getUserRole"],
   *   getUserRole: async (ctx, { userId }) => {
   *     // This is now required - init will fail without it
   *     return user?.role ?? null;
   *   },
   * });
   * ```
   *
   * @example
   * ```typescript
   * // This will throw at initialization time:
   * // "Missing required hook: getUserRole. Configure getUserRole in createCmsClient options."
   * const cms = createCmsClient(components.convexCms, {
   *   requireHooks: ["getUserRole"],
   *   // getUserRole is missing!
   * });
   * ```
   */
  requireHooks?: Array<"getUserRole" | "authorizationHooks" | "rateLimitHooks">;

  /**
   * Custom roles to extend or override the default RBAC roles.
   *
   * This allows developers to define additional roles beyond the built-in
   * admin, editor, author, and viewer roles. Custom roles can:
   * - Define entirely new roles with specific permissions
   * - Extend existing roles with additional or restricted permissions
   * - Restrict permissions to specific content types
   *
   * Custom roles are merged with the default roles. Built-in role names
   * cannot be overridden - use extendRole() to create a modified version
   * with a different name.
   *
   * @example
   * ```typescript
   * import { createCustomRole, extendRole, fullCrudForContentType } from "@convex-cms/core";
   *
   * // Create a blog-specific author role
   * const blogAuthor = createCustomRole({
   *   name: "blog-author",
   *   displayName: "Blog Author",
   *   description: "Can create and manage blog posts only",
   *   permissions: [
   *     { resource: "contentTypes", action: "read" },
   *     ...fullCrudForContentType("contentEntries", {
   *       scope: "own",
   *       contentTypes: ["blog_post"],
   *     }),
   *     { resource: "mediaAssets", action: "create" },
   *     { resource: "mediaAssets", action: "read" },
   *   ],
   * });
   *
   * // Extend the editor role with restricted content type access
   * const blogEditor = extendRole({
   *   name: "blog-editor",
   *   displayName: "Blog Editor",
   *   description: "Editor for blog content only",
   *   extends: "editor",
   *   restrictToContentTypes: ["blog_post", "blog_category"],
   * });
   *
   * // Configure the CMS with custom roles
   * const cms = createCmsClient(components.convexCms, {
   *   customRoles: [blogAuthor, blogEditor],
   *   getUserRole: async (ctx, { userId }) => {
   *     // Return custom role names like "blog-author" or "blog-editor"
   *     const user = await getUser(userId);
   *     return user.cmsRole;
   *   },
   * });
   * ```
   */
  customRoles?: Array<CustomRoleInput>;

  /**
   * Content type schema for type-safe content access.
   *
   * When provided, the CMS client methods can infer content data types
   * based on the defined content type schemas.
   *
   * @example
   * ```typescript
   * import { v } from "convex/values";
   * import { defineContentType, createContentSchema } from "@convex-cms/core";
   *
   * const blogPost = defineContentType({
   *   name: "blog_post",
   *   validator: v.object({
   *     title: v.string(),
   *     content: v.string(),
   *   }),
   *   meta: { displayName: "Blog Post" },
   * });
   *
   * const contentSchema = createContentSchema({ blogPost });
   *
   * const cms = createCmsClient(components.convexCms, {
   *   schema: contentSchema,
   * });
   *
   * // Now content entries are typed
   * const post = await cms.contentEntries.get<"blog_post">(ctx, id);
   * post.data.title  // ✅ TypeScript knows this is a string
   * ```
   */
  schema?: ContentSchemaConfig;
}

/**
 * Content schema configuration type.
 * Accepts any schema created via createContentSchema().
 */
export type ContentSchemaConfig = {
  definitions: Record<string, ContentTypeDefinitionBase>;
  getDefinition(name: string): ContentTypeDefinitionBase | undefined;
  getContentTypeNames(): string[];
  hasContentType(name: string): boolean;
};

/**
 * Base interface for content type definitions in schema config.
 * This is the minimal interface needed for runtime operations.
 */
export interface ContentTypeDefinitionBase {
  readonly name: string;
  readonly validator: unknown;
  readonly meta: {
    displayName: string;
    description?: string;
    titleField?: string;
    slugField?: string;
    singleton?: boolean;
  };
  readonly _type: "content_type_definition";
}

/**
 * Input type for custom role definitions when configuring the CMS.
 * The isSystem field is optional and defaults to false.
 */
export interface CustomRoleInput {
  /** Unique role identifier */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Description of the role's purpose */
  description: string;
  /** List of permissions granted to this role */
  permissions: CustomPermission[];
  /** Whether this is a system role that cannot be deleted (defaults to false) */
  isSystem?: boolean;
  /** If this role was extended from another, the source role name */
  extendsRole?: string;
}

/**
 * Resolved custom role definition with all defaults applied.
 * This is the runtime representation stored in the config.
 */
export interface CustomRoleDefinition {
  /** Unique role identifier */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Description of the role's purpose */
  description: string;
  /** List of permissions granted to this role */
  permissions: CustomPermission[];
  /** Whether this is a system role that cannot be deleted */
  isSystem: boolean;
  /** If this role was extended from another, the source role name */
  extendsRole?: string;
}

/**
 * Permission that may include content-type-specific restrictions.
 */
export interface CustomPermission {
  /** The resource this permission applies to */
  resource: "contentTypes" | "contentEntries" | "mediaAssets" | "mediaFolders" | "settings";
  /** The action being granted */
  action: "create" | "read" | "update" | "delete" | "publish" | "unpublish" | "restore" | "manage";
  /** Ownership scope (defaults to "all" if not specified) */
  scope?: "all" | "own";
  /** Whitelist of content type names this permission applies to */
  contentTypes?: string[];
  /** Blacklist of content type names this permission does NOT apply to */
  excludeContentTypes?: string[];
}

/**
 * Resolved configuration type.
 * This is the configuration with all defaults applied, excluding the getUserRole hook
 * and authorizationHooks which are stored separately in the client closure.
 */
export type ResolvedComponentConfig = Required<Omit<ComponentConfig, "getUserRole" | "authorizationHooks" | "rateLimitHooks" | "localeFallbackChains" | "customRoles" | "requireHooks" | "schema">> & {
  getUserRole?: GetUserRoleHook;
  authorizationHooks?: AuthorizationHooks;
  rateLimitHooks?: RateLimitHooks;
  localeFallbackChains: Record<LocaleCode, LocaleCode[]>;
  customRoles: Record<string, CustomRoleDefinition>;
  requireHooks: Array<"getUserRole" | "authorizationHooks" | "rateLimitHooks">;
  schema?: ContentSchemaConfig;
};

/**
 * Default component configuration values.
 */
export const DEFAULT_CONFIG: Omit<ResolvedComponentConfig, "getUserRole" | "authorizationHooks" | "rateLimitHooks"> = {
  defaultLocale: "en",
  supportedLocales: ["en"],
  localeFallbackChains: {},
  autoGenerateLocaleFallbacks: true,
  features: {
    versioning: true,
    scheduling: true,
    localization: false,
    mediaManagement: true,
    contentLocking: true,
    softDelete: true,
    searchIndexing: true,
  },
  maxVersionsPerEntry: 50,
  lockDurationMs: 300000, // 5 minutes
  maxMediaFileSize: 52428800, // 50MB
  skipRbac: false,
  permissiveMode: false,
  customRoles: {},
  requireHooks: [],
};

/**
 * Hook validation error types.
 */
export type RequiredHookName = "getUserRole" | "authorizationHooks" | "rateLimitHooks";

/**
 * Error thrown when a required hook is not configured.
 *
 * This error is thrown at initialization time when `requireHooks` is specified
 * in the configuration but the required hook is not provided.
 *
 * @example
 * ```typescript
 * try {
 *   const cms = createCmsClient(components.convexCms, {
 *     requireHooks: ["getUserRole"],
 *     // getUserRole is missing!
 *   });
 * } catch (error) {
 *   if (error instanceof MissingHookError) {
 *     console.error(`Missing hook: ${error.hookName}`);
 *     console.error(`Suggestion: ${error.suggestion}`);
 *   }
 * }
 * ```
 */
export class MissingHookError extends Error {
  /**
   * The name of the missing hook.
   */
  readonly hookName: RequiredHookName;

  /**
   * A suggestion for how to fix the error.
   */
  readonly suggestion: string;

  /**
   * List of methods that require this hook.
   */
  readonly affectedMethods: string[];

  constructor(hookName: RequiredHookName) {
    const hookInfo = HOOK_INFO[hookName];
    const message = `Missing required hook: ${hookName}. ${hookInfo.suggestion}`;

    super(message);
    this.name = "MissingHookError";
    this.hookName = hookName;
    this.suggestion = hookInfo.suggestion;
    this.affectedMethods = hookInfo.affectedMethods;

    // Maintains proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, MissingHookError.prototype);
  }
}

/**
 * Error thrown when a mutation is attempted without authorization configured.
 *
 * This error is thrown at runtime when:
 * 1. `permissiveMode` is `false` (the secure default)
 * 2. No `getUserRole` hook is configured
 * 3. A write operation (create, update, delete, publish, etc.) is attempted
 *
 * This ensures that the CMS fails securely by default, requiring explicit
 * authorization configuration before mutations can execute.
 *
 * @example
 * ```typescript
 * try {
 *   await cms.contentEntries.create(ctx, { ... });
 * } catch (error) {
 *   if (error instanceof AuthorizationNotConfiguredError) {
 *     // Authorization not set up - configure getUserRole hook
 *     console.error("Configure getUserRole to enable mutations");
 *   }
 * }
 * ```
 */
export class AuthorizationNotConfiguredError extends Error {
  /**
   * The operation that was attempted.
   */
  readonly operation: string;

  /**
   * A suggestion for how to fix the error.
   */
  readonly suggestion: string;

  constructor(operation: string) {
    const message =
      `Authorization not configured for operation "${operation}". ` +
      "Configure a getUserRole hook in createCmsClient options, or set permissiveMode: true for development.";

    super(message);
    this.name = "AuthorizationNotConfiguredError";
    this.operation = operation;
    this.suggestion =
      "Add getUserRole hook: createCmsClient(api, { getUserRole: async (ctx, { userId }) => getUserRoleFromDb(userId) })";

    // Maintains proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AuthorizationNotConfiguredError.prototype);
  }
}

/**
 * Information about each hook including what it enables and how to configure it.
 */
const HOOK_INFO: Record<RequiredHookName, { suggestion: string; affectedMethods: string[] }> = {
  getUserRole: {
    suggestion: "Configure a getUserRole function in createCmsClient options to map user IDs to CMS roles.",
    affectedMethods: [
      "getUserRole()",
      "hasPermissionForUser()",
      "hasContentTypePermissionForUser()",
      "getPermittedContentTypesForUser()",
      "canUserPerformOnResource()",
      "requireUserCanPerformOnResource()",
    ],
  },
  authorizationHooks: {
    suggestion: "Configure authorizationHooks in createCmsClient options (beforeRbac, afterRbac, authorize, onDeny, or operationHooks).",
    affectedMethods: [
      "authorize()",
      "requireAuthorization()",
    ],
  },
  rateLimitHooks: {
    suggestion: "Configure rateLimitHooks.check in createCmsClient options to implement rate limiting.",
    affectedMethods: [
      "Rate-limited CMS operations",
    ],
  },
};

/**
 * Validates that required hooks are configured.
 *
 * @param config - The component configuration to validate
 * @throws MissingHookError if a required hook is not configured
 *
 * @example
 * ```typescript
 * // Called internally by createCmsClient
 * validateRequiredHooks({
 *   requireHooks: ["getUserRole"],
 *   // getUserRole is missing - will throw MissingHookError
 * });
 * ```
 */
export function validateRequiredHooks(config?: ComponentConfig): void {
  const requireHooks = config?.requireHooks ?? [];

  for (const hookName of requireHooks) {
    switch (hookName) {
      case "getUserRole":
        if (!config?.getUserRole) {
          throw new MissingHookError("getUserRole");
        }
        break;

      case "authorizationHooks":
        if (!config?.authorizationHooks) {
          throw new MissingHookError("authorizationHooks");
        }
        // Check that at least one hook is configured
        const hooks = config.authorizationHooks;
        const hasHook = !!(
          hooks.beforeRbac ||
          hooks.afterRbac ||
          hooks.authorize ||
          hooks.onDeny ||
          (hooks.operationHooks && Object.keys(hooks.operationHooks).length > 0)
        );
        if (!hasHook) {
          throw new MissingHookError("authorizationHooks");
        }
        break;

      case "rateLimitHooks":
        if (!config?.rateLimitHooks?.check) {
          throw new MissingHookError("rateLimitHooks");
        }
        break;
    }
  }
}

/**
 * Merges user configuration with defaults.
 * @param config - User-provided configuration
 * @returns Complete configuration with defaults applied
 */
export function resolveConfig(config?: ComponentConfig): ResolvedComponentConfig {
  // Build custom roles record from array, ensuring isSystem defaults to false
  const customRolesRecord: Record<string, CustomRoleDefinition> = {};
  if (config?.customRoles) {
    for (const role of config.customRoles) {
      customRolesRecord[role.name] = {
        ...role,
        isSystem: role.isSystem ?? false, // Default isSystem to false
      };
    }
  }

  return {
    defaultLocale: config?.defaultLocale ?? DEFAULT_CONFIG.defaultLocale,
    supportedLocales: config?.supportedLocales ?? DEFAULT_CONFIG.supportedLocales,
    localeFallbackChains: config?.localeFallbackChains ?? DEFAULT_CONFIG.localeFallbackChains,
    autoGenerateLocaleFallbacks: config?.autoGenerateLocaleFallbacks ?? DEFAULT_CONFIG.autoGenerateLocaleFallbacks,
    features: {
      ...DEFAULT_CONFIG.features,
      ...config?.features,
    },
    maxVersionsPerEntry: config?.maxVersionsPerEntry ?? DEFAULT_CONFIG.maxVersionsPerEntry,
    lockDurationMs: config?.lockDurationMs ?? DEFAULT_CONFIG.lockDurationMs,
    maxMediaFileSize: config?.maxMediaFileSize ?? DEFAULT_CONFIG.maxMediaFileSize,
    skipRbac: config?.skipRbac ?? DEFAULT_CONFIG.skipRbac,
    permissiveMode: config?.permissiveMode ?? DEFAULT_CONFIG.permissiveMode,
    getUserRole: config?.getUserRole,
    authorizationHooks: config?.authorizationHooks,
    rateLimitHooks: config?.rateLimitHooks,
    customRoles: customRolesRecord,
    requireHooks: config?.requireHooks ?? DEFAULT_CONFIG.requireHooks,
    schema: config?.schema,
  };
}

// =============================================================================
// Field Types
// =============================================================================

/**
 * Supported field types for content type definitions.
 */
export type FieldType =
  | "text"
  | "richText"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "reference"
  | "media"
  | "json"
  | "select"
  | "multiSelect";

/**
 * Field-specific configuration options.
 */
export interface FieldOptions {
  // Text fields
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  // Number fields
  min?: number;
  max?: number;
  step?: number;
  precision?: number;

  // Reference fields
  /** Array of content type names that can be referenced */
  allowedContentTypes?: string[];
  /** If true, accepts multiple references (array of IDs) */
  multiple?: boolean;
  /** Minimum number of references required (only when multiple is true) */
  minItems?: number;

  // Media fields
  allowedMimeTypes?: string[];
  maxFileSize?: number;

  // Select fields
  options?: Array<{
    value: string;
    label: string;
  }>;

  // Rich text fields
  allowedBlocks?: string[];
  allowedMarks?: string[];
}

// =============================================================================
// Field Filter Types
// =============================================================================

// =============================================================================
// Sort Types
// =============================================================================

/**
 * Sort direction for query results.
 */
export type SortDirection = "asc" | "desc";

/**
 * System fields that can be used for sorting.
 * These are fields that exist on all content entries.
 */
export type SystemSortField =
  | "_creationTime"
  | "_id"
  | "firstPublishedAt"
  | "lastPublishedAt"
  | "scheduledPublishAt"
  | "version";

/**
 * Sort field can be a system field or a custom data field (prefixed with "data.").
 *
 * @example
 * ```typescript
 * // System field sorting
 * sortField: "_creationTime"
 * sortField: "firstPublishedAt"
 *
 * // Custom data field sorting (prefix with "data.")
 * sortField: "data.title"
 * sortField: "data.price"
 * sortField: "data.sortOrder"
 * ```
 */
export type SortField = SystemSortField | `data.${string}` | string;

/**
 * Sort options for content entry queries.
 *
 * @example
 * ```typescript
 * // Sort by creation time (newest first)
 * { sortField: "_creationTime", sortDirection: "desc" }
 *
 * // Sort by publish date (oldest published first)
 * { sortField: "firstPublishedAt", sortDirection: "asc" }
 *
 * // Sort by custom field (e.g., price low to high)
 * { sortField: "data.price", sortDirection: "asc" }
 * ```
 */
export interface SortOptions {
  /** The field to sort by (system field or "data.fieldName" for custom fields) */
  sortField: SortField;
  /** The sort direction ("asc" for ascending, "desc" for descending) */
  sortDirection: SortDirection;
}

// =============================================================================
// Field Filter Types
// =============================================================================

/**
 * Comparison operators for field filtering.
 *
 * - `eq`: Exact equality (works with all field types)
 * - `ne`: Not equal (works with all field types)
 * - `gt`: Greater than (numbers, dates)
 * - `gte`: Greater than or equal (numbers, dates)
 * - `lt`: Less than (numbers, dates)
 * - `lte`: Less than or equal (numbers, dates)
 * - `contains`: String contains substring, or array contains value
 * - `startsWith`: String starts with prefix
 * - `endsWith`: String ends with suffix
 * - `in`: Value is in array of allowed values
 * - `notIn`: Value is not in array of disallowed values
 */
export type FilterOperator =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "in"
  | "notIn";

/**
 * A single field filter condition.
 *
 * Used to filter content entries by their field values.
 * Multiple filters are combined with AND logic.
 *
 * @example
 * ```typescript
 * // Filter by exact title match
 * { field: "title", operator: "eq", value: "My Post" }
 *
 * // Filter by price range
 * { field: "price", operator: "gte", value: 100 }
 *
 * // Filter by category (in list)
 * { field: "category", operator: "in", value: ["tech", "science"] }
 *
 * // Filter by tag contains
 * { field: "tags", operator: "contains", value: "javascript" }
 *
 * // Filter by string prefix
 * { field: "slug", operator: "startsWith", value: "2026-" }
 * ```
 */
export interface FieldFilter {
  /** The name of the field in the content entry's data object */
  field: string;
  /** The comparison operator to use */
  operator: FilterOperator;
  /** The value to compare against (type depends on field type and operator) */
  value: unknown;
}

// =============================================================================
// Reference Field Types
// =============================================================================

/**
 * A single reference to another content entry.
 * This is the value stored when `multiple: false` (default).
 */
export type SingleReference = string;

/**
 * Multiple references to other content entries.
 * This is the value stored when `multiple: true`.
 */
export type MultipleReferences = string[];

/**
 * Reference field value type.
 * Use this type when working with reference field values in content data.
 *
 * @example
 * ```typescript
 * interface BlogPostData {
 *   title: string;
 *   author: SingleReference;  // Single reference to a user
 *   relatedPosts: MultipleReferences;  // Multiple references to posts
 * }
 * ```
 */
export type ReferenceValue = SingleReference | MultipleReferences;

/**
 * A resolved reference with full content entry details.
 * This is the structure returned when populating references.
 */
export interface ResolvedReference {
  /** The content entry ID */
  id: string;
  /** The content type name */
  contentTypeName: string;
  /** The content type display name */
  contentTypeDisplayName: string;
  /** The entry's URL slug */
  slug: string;
  /** The entry's publishing status */
  status: ContentStatus;
  /** The entry's data (field values) */
  data: Record<string, unknown>;
  /** Whether the referenced entry exists */
  exists: boolean;
}

// =============================================================================
// Deep Reference Resolution Types
// =============================================================================

/**
 * Options for deep reference resolution.
 * Used when resolving nested references within content entries.
 */
export interface DeepResolveOptions {
  /**
   * Maximum depth to resolve nested references.
   * - 0: Don't resolve any references (just return IDs)
   * - 1: Resolve immediate references only
   * - 2: Resolve references and their references
   * - etc.
   *
   * @default 1
   */
  maxDepth?: number;

  /**
   * Whether to resolve media references.
   * When true, media IDs are replaced with full asset data including URLs.
   *
   * @default true
   */
  resolveMedia?: boolean;

  /**
   * Whether to resolve content references.
   * When true, content entry IDs are replaced with full entry data.
   *
   * @default true
   */
  resolveContent?: boolean;

  /**
   * Only resolve references to published entries.
   * Useful for frontend/public API usage.
   *
   * @default false
   */
  publishedOnly?: boolean;

  /**
   * Include soft-deleted entries when resolving.
   *
   * @default false
   */
  includeDeleted?: boolean;

  /**
   * Specific fields to include from resolved entries.
   * If not specified, all fields are included.
   * Only applies to content references.
   */
  fields?: string[];

  /**
   * Specific field names to resolve references for.
   * If not specified, all reference/media fields are resolved.
   * Useful for selective resolution of expensive operations.
   */
  onlyFields?: string[];

  /**
   * Field names to skip when resolving references.
   * Useful for excluding specific fields from resolution.
   */
  excludeFields?: string[];

  /**
   * Whether to preserve the original reference ID alongside resolved data.
   * When true, resolved objects include an `_originalId` field.
   *
   * @default false
   */
  preserveOriginalIds?: boolean;
}

/**
 * A content entry with all references recursively resolved.
 * The data object will have reference fields replaced with resolved content.
 */
export interface ResolvedContentEntry {
  /** The content entry ID */
  id: string;
  /** The content type name */
  contentTypeName: string;
  /** The content type display name */
  contentTypeDisplayName: string;
  /** The entry's URL slug */
  slug: string;
  /** The entry's publishing status */
  status: ContentStatus;
  /** The entry's data with resolved references */
  data: Record<string, unknown>;
  /** Whether the entry exists */
  exists: boolean;
  /** Locale code if localized */
  locale?: string;
  /** Version number */
  version?: number;
  /** Fields that had circular references (were not resolved) */
  _circularReferences?: string[];
  /** Fields that had unresolved references (not found) */
  _unresolvedReferences?: Record<string, string[]>;
  /** Original entry ID (only if preserveOriginalIds is true) */
  _originalId?: string;
}

/**
 * Result of resolving references for multiple entries in batch.
 */
export interface BatchResolveResult {
  /** Successfully resolved entries */
  resolved: ResolvedContentEntry[];
  /** Entry IDs that could not be resolved */
  unresolved: string[];
  /** Summary of circular references detected across all entries */
  circularReferencesDetected: number;
}

/**
 * A field definition within a content type.
 */
export interface FieldDefinition {
  /** Unique identifier for the field within the content type */
  name: string;
  /** Human-readable label for the field */
  label: string;
  /** The type of field */
  type: FieldType;
  /** Whether this field is required */
  required: boolean;
  /** Whether this field should be indexed for search */
  searchable?: boolean;
  /** Whether this field should support localization */
  localized?: boolean;
  /** Optional description/help text for the field */
  description?: string;
  /** Default value for the field */
  defaultValue?: unknown;
  /** Field-specific configuration options */
  options?: FieldOptions;
}

// =============================================================================
// Content Status
// =============================================================================

/**
 * Publishing status for content entries.
 */
export type ContentStatus = "draft" | "published" | "archived" | "scheduled";

// =============================================================================
// Media Types
// =============================================================================

/**
 * Classification of media assets.
 */
export type MediaType = "image" | "video" | "audio" | "document" | "other";

/**
 * Classification of media variant types.
 */
export type VariantType = "thumbnail" | "responsive" | "format";

/**
 * Status of media variant generation.
 */
export type VariantStatus = "pending" | "processing" | "completed" | "failed";

/**
 * A media variant (optimized version of a media asset).
 */
export interface MediaVariant {
  _id: string;
  _creationTime: number;
  /** Parent media asset ID */
  assetId: string;
  /** Storage ID for the variant file */
  storageId: string;
  /** Type of variant */
  variantType: VariantType;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Output format (e.g., "webp", "avif") */
  format: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Quality setting (0-100) */
  quality?: number;
  /** Preset name if generated from preset */
  preset?: string;
  /** Whether auto-generated */
  autoGenerated: boolean;
  /** Generation status */
  status: VariantStatus;
  /** Error message if failed */
  errorMessage?: string;
  /** When processing started */
  processingStartedAt?: number;
  /** When processing completed */
  processingCompletedAt?: number;
  /** Soft delete timestamp */
  deletedAt?: number;
  /** User who created this variant */
  createdBy?: string;
}

/**
 * Media variant with resolved storage URL.
 */
export interface MediaVariantWithUrl extends MediaVariant {
  /** Resolved URL for the variant file */
  url: string | null;
}

// =============================================================================
// Content Type
// =============================================================================

/**
 * A content type definition.
 */
export interface ContentType {
  _id: string;
  _creationTime: number;
  /** Unique machine-readable name (e.g., "blog_post") */
  name: string;
  /** Human-readable display name (e.g., "Blog Post") */
  displayName: string;
  /** Optional description */
  description?: string;
  /** Array of field definitions */
  fields: FieldDefinition[];
  /** Icon identifier for UI display */
  icon?: string;
  /** Whether only one entry is allowed */
  singleton?: boolean;
  /** Field name to use for generating slugs */
  slugField?: string;
  /** Field name to use as the display title */
  titleField?: string;
  /** Custom sort order for admin UI */
  sortOrder?: number;
  /** Whether the content type is active */
  isActive: boolean;
  /** Soft delete timestamp */
  deletedAt?: number;
  /** User who created this type */
  createdBy?: string;
  /** User who last updated this type */
  updatedBy?: string;
}

// =============================================================================
// Content Entry
// =============================================================================

/**
 * A content entry instance.
 */
export interface ContentEntry {
  _id: string;
  _creationTime: number;
  /** Reference to the content type */
  contentTypeId: string;
  /** URL-friendly slug */
  slug: string;
  /** Publishing status */
  status: ContentStatus;
  /** The actual content data */
  data: Record<string, unknown>;
  /** Locale code (e.g., "en-US") */
  locale?: string;
  /** Reference to primary entry for localized variants */
  primaryEntryId?: string;
  /** Current version number */
  version: number;
  /** Scheduled publish timestamp */
  scheduledPublishAt?: number;
  /** First publish timestamp */
  firstPublishedAt?: number;
  /** Last publish timestamp */
  lastPublishedAt?: number;
  /** User who has locked the entry */
  lockedBy?: string;
  /** Lock expiration timestamp */
  lockExpiresAt?: number;
  /** Soft delete timestamp */
  deletedAt?: number;
  /** User who created this entry */
  createdBy?: string;
  /** User who last updated this entry */
  updatedBy?: string;
}

// =============================================================================
// Content Version
// =============================================================================

/**
 * A version snapshot of a content entry.
 */
export interface ContentVersion {
  _id: string;
  _creationTime: number;
  /** Reference to the content entry */
  entryId: string;
  /** Version number */
  versionNumber: number;
  /** Snapshot of the content data */
  data: Record<string, unknown>;
  /** Snapshot of the slug */
  slug: string;
  /** Status when version was created */
  status: ContentStatus;
  /** Description of changes */
  changeDescription?: string;
  /** User who created this version */
  createdBy?: string;
  /** Whether this version was published */
  wasPublished: boolean;
  /** When this version was published */
  publishedAt?: number;
}

// =============================================================================
// Version Comparison Types
// =============================================================================

/**
 * Type of change detected in a field comparison.
 */
export type FieldChangeType = "added" | "removed" | "modified" | "unchanged";

/**
 * Represents a change in a single field between two versions.
 */
export interface FieldChange {
  /** The field name */
  field: string;
  /** Type of change */
  changeType: FieldChangeType;
  /** Value in the older version (undefined if field was added) */
  oldValue?: unknown;
  /** Value in the newer version (undefined if field was removed) */
  newValue?: unknown;
}

/**
 * Result of comparing two content versions.
 */
export interface VersionComparison {
  /** The older version being compared */
  fromVersion: ContentVersion;
  /** The newer version being compared */
  toVersion: ContentVersion;
  /** List of field-level changes */
  changes: FieldChange[];
  /** Whether the slug changed between versions */
  slugChanged: boolean;
  /** Whether the status changed between versions */
  statusChanged: boolean;
  /** Summary statistics */
  summary: {
    /** Number of fields added */
    fieldsAdded: number;
    /** Number of fields removed */
    fieldsRemoved: number;
    /** Number of fields modified */
    fieldsModified: number;
    /** Total number of changes */
    totalChanges: number;
  };
}

/**
 * Options for version history queries.
 */
export interface VersionHistoryOptions {
  /** The content entry ID to get history for */
  entryId: string;
  /** Only include published versions */
  publishedOnly?: boolean;
  /** Pagination options */
  paginationOpts: PaginationOpts;
}

// =============================================================================
// Media Asset
// =============================================================================

/**
 * A media asset record.
 */
export interface MediaAsset {
  _id: string;
  _creationTime: number;
  /** Convex storage ID */
  storageId: string;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Classified media type */
  type: MediaType;
  /** Human-readable title */
  title?: string;
  /** Description/caption */
  description?: string;
  /** Alt text for accessibility */
  altText?: string;
  /** Reference to containing folder */
  folderId?: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
  /** Duration in seconds (video/audio) */
  duration?: number;
  /** Additional extracted metadata */
  metadata?: Record<string, unknown>;
  /** Tags for organization */
  tags?: string[];
  /** Soft delete timestamp */
  deletedAt?: number;
  /** User who uploaded this asset */
  createdBy?: string;
}

// =============================================================================
// Media Folder
// =============================================================================

/**
 * A folder for organizing media assets.
 */
export interface MediaFolder {
  _id: string;
  _creationTime: number;
  /** Folder name */
  name: string;
  /** Reference to parent folder */
  parentId?: string;
  /** Full path from root */
  path: string;
  /** Description */
  description?: string;
  /** Custom sort order */
  sortOrder?: number;
  /** Soft delete timestamp */
  deletedAt?: number;
  /** User who created this folder */
  createdBy?: string;
}

// =============================================================================
// Pagination
// =============================================================================

/**
 * Legacy paginated response shape.
 * @deprecated Use PaginationResult for new implementations.
 */
export interface PaginatedResponse<T> {
  items: T[];
  cursor?: string;
  hasMore: boolean;
}

/**
 * Standard Convex pagination result format.
 * This is compatible with:
 * - Convex's usePaginatedQuery React hook
 * - convex-helpers paginator
 * - Standard Convex pagination patterns
 */
export interface PaginationResult<T> {
  /** Array of items for the current page */
  page: T[];
  /** Cursor to continue fetching (null if no more results) */
  continueCursor: string | null;
  /** Whether this is the last page (no more results available) */
  isDone: boolean;
}

/**
 * Standard Convex pagination options.
 * Pass this to paginated queries.
 *
 * Note: The cursor field is required by the Convex runtime but can be null
 * for the first page. If you don't have a cursor, pass `null` explicitly.
 */
export interface PaginationOpts {
  /** Number of items to fetch per page */
  numItems: number;
  /** Cursor from previous page's continueCursor (pass null for first page) */
  cursor: string | null;
}

// =============================================================================
// Query Options
// =============================================================================

/**
 * Options for querying content entries with cursor-based pagination.
 */
export interface ContentQueryOptions {
  contentTypeId?: string;
  contentTypeName?: string;
  /** Filter by a single status (for backward compatibility) */
  status?: ContentStatus;
  /**
   * Filter by multiple statuses.
   * Useful for admin views that need to show draft AND scheduled content.
   *
   * @example
   * ```typescript
   * // Show all non-archived content in admin
   * const { page, continueCursor, isDone } = await cms.contentEntries.list(ctx, {
   *   statusIn: ["draft", "published", "scheduled"],
   *   paginationOpts: { numItems: 20 },
   * });
   *
   * // Show only editorial content (not yet published)
   * const { page } = await cms.contentEntries.list(ctx, {
   *   statusIn: ["draft", "scheduled"],
   *   paginationOpts: { numItems: 10 },
   * });
   * ```
   */
  statusIn?: ContentStatus[];
  locale?: string;
  search?: string;
  includeDeleted?: boolean;
  /**
   * Field-level filters to apply to content entry data.
   * All filters are combined with AND logic.
   *
   * @example
   * ```typescript
   * // Filter by exact field value
   * const { page } = await cms.contentEntries.list(ctx, {
   *   contentTypeName: "products",
   *   fieldFilters: [
   *     { field: "category", operator: "eq", value: "electronics" }
   *   ],
   *   paginationOpts: { numItems: 10 },
   * });
   *
   * // Filter by numeric range
   * const { page } = await cms.contentEntries.list(ctx, {
   *   contentTypeName: "products",
   *   fieldFilters: [
   *     { field: "price", operator: "gte", value: 100 },
   *     { field: "price", operator: "lte", value: 500 }
   *   ],
   *   paginationOpts: { numItems: 10 },
   * });
   *
   * // Filter by array contains
   * const { page } = await cms.contentEntries.list(ctx, {
   *   contentTypeName: "blog_posts",
   *   fieldFilters: [
   *     { field: "tags", operator: "contains", value: "featured" }
   *   ],
   *   paginationOpts: { numItems: 10 },
   * });
   * ```
   */
  fieldFilters?: FieldFilter[];
  /**
   * Field to sort results by.
   * Can be a system field (e.g., "_creationTime", "firstPublishedAt") or
   * a custom data field prefixed with "data." (e.g., "data.title", "data.price").
   *
   * @default "_creationTime"
   *
   * @example
   * ```typescript
   * // Sort by publish date
   * sortField: "firstPublishedAt"
   *
   * // Sort by custom field
   * sortField: "data.sortOrder"
   * ```
   */
  sortField?: SortField;
  /**
   * Sort direction for results.
   *
   * @default "desc" (newest first)
   *
   * @example
   * ```typescript
   * sortDirection: "asc"  // Ascending (oldest/lowest first)
   * sortDirection: "desc" // Descending (newest/highest first)
   * ```
   */
  sortDirection?: SortDirection;
  /**
   * Pagination options using standard Convex format.
   * Compatible with usePaginatedQuery hook.
   */
  paginationOpts: PaginationOpts;
}

/**
 * Options for querying media assets.
 */
export interface MediaQueryOptions {
  folderId?: string;
  type?: MediaType;
  mimeType?: string;
  search?: string;
  tags?: string[];
  includeDeleted?: boolean;
  cursor?: string;
  limit?: number;
}

// =============================================================================
// Component API Types
// =============================================================================

/**
 * Represents the API interface for the Convex CMS component.
 *
 * This type is used to provide type-safe access to the component's
 * functions when integrating with a parent application.
 *
 * @example
 * ```typescript
 * // Type-safe component API access
 * import type { ComponentApi } from "@convex-cms/core";
 * import { components } from "./_generated/api";
 *
 * // The components.convexCms object is typed as ComponentApi
 * const cms: ComponentApi = components.convexCms;
 *
 * // Now you get full autocomplete and type checking
 * await ctx.runMutation(cms.contentTypes.create, { ... });
 * ```
 */
export interface ComponentApi {
  /**
   * Content type management functions.
   * Content types define the schema for content entries.
   */
  contentTypes: {
    create: unknown;
    update: unknown;
    delete: unknown;
    get: unknown;
    list: unknown;
  };

  /**
   * Content entry CRUD and workflow functions.
   */
  contentEntries: {
    create: unknown;
    update: unknown;
    delete: unknown;
    get: unknown;
    list: unknown;
    publish: unknown;
    unpublish: unknown;
    schedule: unknown;
  };

  /**
   * Content version history functions.
   */
  versions: {
    list: unknown;
    get: unknown;
    rollback: unknown;
  };

  /**
   * Media asset management functions.
   */
  mediaAssets: {
    create: unknown;
    update: unknown;
    delete: unknown;
    get: unknown;
    list: unknown;
  };

  /**
   * Media folder organization functions.
   */
  mediaFolders: {
    create: unknown;
    update: unknown;
    delete: unknown;
    get: unknown;
    list: unknown;
    move: unknown;
  };
}

/**
 * Base CMS Client interface with configuration and helper methods.
 *
 * @deprecated Use `EnhancedCmsClient` from the wrapper module for typed method access.
 * This interface is kept for backwards compatibility.
 *
 * @see EnhancedCmsClient for the full typed client with method wrappers
 */
export interface CmsClient {
  /**
   * The resolved configuration for this client instance.
   */
  readonly config: Required<ComponentConfig>;

  /**
   * The underlying component API reference.
   */
  readonly api: ComponentApi;

  /**
   * Check if a specific feature is enabled.
   * @param feature - The feature flag to check
   * @returns true if the feature is enabled
   */
  isFeatureEnabled(feature: keyof FeatureFlags): boolean;

  /**
   * Check if a locale is supported by this configuration.
   * @param locale - The locale code to check
   * @returns true if the locale is in the supported locales list
   */
  isLocaleSupported(locale: LocaleCode): boolean;
}
