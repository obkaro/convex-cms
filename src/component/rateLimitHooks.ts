/**
 * Rate Limit Hooks Execution Module
 *
 * This module provides the infrastructure for executing rate limit hooks
 * that enable custom rate limiting logic for CMS operations.
 *
 * Rate limiting hooks allow parent applications to:
 * - Implement custom rate limiting strategies (token bucket, fixed window, etc.)
 * - Define different limits for different user tiers
 * - Apply limits per operation, category, or globally
 * - Integrate with external rate limiting services
 *
 * Hook execution order:
 * 1. getConfig hook (optional) - Get dynamic rate limit configuration
 * 2. check hook - Check if operation is rate limited
 * 3. consume hook - Record rate limit usage (only if check passed)
 *
 * @example
 * ```typescript
 * import { executeRateLimitHooks, RateLimitedError } from './rateLimitHooks';
 *
 * // In a mutation handler
 * const rateLimitResult = await executeRateLimitHooks({
 *   hooks: config.rateLimitHooks,
 *   context: {
 *     operation: 'contentEntries.create',
 *     operationCategory: 'write',
 *     userId: args.createdBy,
 *     role: userRole,
 *     timestamp: Date.now(),
 *   },
 * });
 *
 * if (!rateLimitResult.allowed) {
 *   throw new RateLimitedError(rateLimitResult.reason ?? 'Rate limit exceeded', {
 *     retryAt: rateLimitResult.retryAt,
 *   });
 * }
 * ```
 */

import type {
  RateLimitHooks,
  RateLimitHookContext,
  RateLimitCheckResult,
  RateLimitConsumeResult,
  RateLimitConfigResult,
  CmsOperation,
  OperationCategory,
} from "../client/types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for executing the rate limit hook chain.
 */
export interface ExecuteRateLimitOptions {
  /**
   * The rate limit hooks configuration from ComponentConfig.
   */
  hooks?: RateLimitHooks;

  /**
   * The context for this rate limit check.
   */
  context: RateLimitHookContext;
}

/**
 * Result from executing the rate limit hook chain.
 */
export interface RateLimitResult {
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
   * The reason for rate limiting (if rate limited).
   */
  reason?: string;

  /**
   * Whether rate limiting was skipped entirely.
   * True if no hooks were configured, operation was excluded, or user was exempt.
   */
  skipped: boolean;

  /**
   * Information about the rate limit state.
   */
  rateLimitInfo?: RateLimitCheckResult["rateLimitInfo"];

  /**
   * The configuration that was used for rate limiting.
   */
  config?: RateLimitConfigResult;
}

/**
 * Error thrown when a rate limit is exceeded.
 */
export class RateLimitedError extends Error {
  readonly code = "RATE_LIMITED";
  readonly retryAt?: number;
  readonly operation?: CmsOperation;
  readonly operationCategory?: OperationCategory;
  readonly rateLimitInfo?: RateLimitCheckResult["rateLimitInfo"];

  constructor(
    message: string,
    options?: {
      retryAt?: number;
      operation?: CmsOperation;
      operationCategory?: OperationCategory;
      rateLimitInfo?: RateLimitCheckResult["rateLimitInfo"];
    }
  ) {
    super(message);
    this.name = "RateLimitedError";
    this.retryAt = options?.retryAt;
    this.operation = options?.operation;
    this.operationCategory = options?.operationCategory;
    this.rateLimitInfo = options?.rateLimitInfo;
  }

  /**
   * Returns a human-readable message with retry information.
   */
  toUserMessage(): string {
    if (this.retryAt) {
      const retryInMs = this.retryAt - Date.now();
      if (retryInMs > 0) {
        const retryInSeconds = Math.ceil(retryInMs / 1000);
        return `${this.message}. Please retry in ${retryInSeconds} second${retryInSeconds !== 1 ? "s" : ""}.`;
      }
    }
    return this.message;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Maps a CMS operation to its category.
 */
export function operationToCategory(operation: CmsOperation): OperationCategory {
  // Read operations
  if (operation.endsWith(".read") || operation === "versions.read") {
    return "read";
  }

  // Publish operations
  if (
    operation === "contentEntries.publish" ||
    operation === "contentEntries.unpublish" ||
    operation === "contentEntries.schedule"
  ) {
    return "publish";
  }

  // Media operations
  if (
    operation.startsWith("mediaAssets.") ||
    operation.startsWith("mediaFolders.")
  ) {
    return "media";
  }

  // Admin operations (content type management)
  if (operation.startsWith("contentTypes.")) {
    return "admin";
  }

  // Write operations (default for mutations)
  return "write";
}

/**
 * Creates a rate limit context for a CMS operation.
 */
export function createRateLimitContext(
  operation: CmsOperation,
  options: {
    userId?: string;
    role?: string | null;
    contentTypeId?: string;
    contentTypeName?: string;
    metadata?: Record<string, unknown>;
  }
): RateLimitHookContext {
  return {
    operation,
    operationCategory: operationToCategory(operation),
    userId: options.userId,
    role: options.role,
    contentTypeId: options.contentTypeId,
    contentTypeName: options.contentTypeName,
    metadata: options.metadata,
    timestamp: Date.now(),
  };
}

/**
 * Execute a single rate limit hook safely.
 * Catches errors and converts them to allowed results to avoid blocking operations.
 */
async function executeCheckHook(
  hook: ((context: RateLimitHookContext) => Promise<RateLimitCheckResult> | RateLimitCheckResult) | undefined,
  context: RateLimitHookContext
): Promise<RateLimitCheckResult> {
  if (!hook) {
    return { allowed: true };
  }

  try {
    return await hook(context);
  } catch (error) {
    // Hook threw an error - log and allow operation to proceed
    // This prevents rate limit hook errors from blocking legitimate operations
    console.error("Rate limit check hook error:", error);
    return { allowed: true };
  }
}

/**
 * Execute the consume hook safely.
 */
async function executeConsumeHook(
  hook: ((context: RateLimitHookContext) => Promise<RateLimitConsumeResult> | RateLimitConsumeResult) | undefined,
  context: RateLimitHookContext
): Promise<RateLimitConsumeResult> {
  if (!hook) {
    return { allowed: true, consumed: false };
  }

  try {
    return await hook(context);
  } catch (error) {
    // Hook threw an error - log and allow operation to proceed
    console.error("Rate limit consume hook error:", error);
    return { allowed: true, consumed: false };
  }
}

/**
 * Execute the config hook safely.
 */
async function executeConfigHook(
  hook: ((context: RateLimitHookContext) => Promise<RateLimitConfigResult> | RateLimitConfigResult) | undefined,
  context: RateLimitHookContext
): Promise<RateLimitConfigResult | undefined> {
  if (!hook) {
    return undefined;
  }

  try {
    return await hook(context);
  } catch (error) {
    console.error("Rate limit config hook error:", error);
    return undefined;
  }
}

// =============================================================================
// Main Rate Limit Execution Function
// =============================================================================

/**
 * Execute the full rate limit hook chain for an operation.
 *
 * This function orchestrates the execution of rate limit hooks in the correct order:
 *
 * 1. Check if rate limiting should be skipped (no hooks, excluded operation/category, admin bypass)
 * 2. Get configuration from getConfig hook (if provided)
 * 3. Execute check hook (or operation-specific override)
 * 4. Execute consume hook if check passed (or operation-specific override)
 * 5. Call onRateLimited callback if operation was denied
 *
 * @param options - Configuration for the rate limit execution
 * @returns RateLimitResult indicating if the operation is allowed
 *
 * @example
 * ```typescript
 * const result = await executeRateLimitHooks({
 *   hooks: config.rateLimitHooks,
 *   context: {
 *     operation: 'contentEntries.create',
 *     operationCategory: 'write',
 *     userId: 'user123',
 *     role: 'editor',
 *     timestamp: Date.now(),
 *   },
 * });
 *
 * if (!result.allowed) {
 *   throw new RateLimitedError(result.reason ?? 'Rate limit exceeded', {
 *     retryAt: result.retryAt,
 *   });
 * }
 * ```
 */
export async function executeRateLimitHooks(
  options: ExecuteRateLimitOptions
): Promise<RateLimitResult> {
  const { hooks, context } = options;

  // -------------------------------------------------------------------------
  // Step 1: Check if rate limiting should be skipped
  // -------------------------------------------------------------------------

  // No hooks configured - skip rate limiting
  if (!hooks || (!hooks.check && !hooks.consume && !hooks.operationHooks)) {
    return {
      allowed: true,
      skipped: true,
    };
  }

  // Check if operation is excluded
  if (hooks.excludeOperations?.includes(context.operation)) {
    return {
      allowed: true,
      skipped: true,
    };
  }

  // Check if category is excluded
  if (hooks.excludeCategories?.includes(context.operationCategory)) {
    return {
      allowed: true,
      skipped: true,
    };
  }

  // Check if admin users should be exempted
  if (hooks.skipForAdmin && context.role === "admin") {
    return {
      allowed: true,
      skipped: true,
    };
  }

  // -------------------------------------------------------------------------
  // Step 2: Get operation-specific hooks or use global hooks
  // -------------------------------------------------------------------------
  const operationHooks = hooks.operationHooks?.[context.operation];
  const checkHook = operationHooks?.check ?? hooks.check;
  const consumeHook = operationHooks?.consume ?? hooks.consume;
  const configHook = operationHooks?.getConfig ?? hooks.getConfig;

  // No check hook configured - skip rate limiting
  if (!checkHook) {
    return {
      allowed: true,
      skipped: true,
    };
  }

  // -------------------------------------------------------------------------
  // Step 3: Get configuration (optional)
  // -------------------------------------------------------------------------
  const configResult = await executeConfigHook(configHook, context);

  // Config hook says rate limiting is disabled
  if (configResult && !configResult.enabled) {
    return {
      allowed: true,
      skipped: true,
      config: configResult,
    };
  }

  // -------------------------------------------------------------------------
  // Step 4: Execute check hook
  // -------------------------------------------------------------------------
  const checkResult = await executeCheckHook(checkHook, context);

  if (!checkResult.allowed) {
    // Rate limit exceeded - call onRateLimited callback
    if (hooks.onRateLimited) {
      try {
        await hooks.onRateLimited(context, checkResult);
      } catch (error) {
        // Don't let callback errors affect the result
        console.error("onRateLimited callback error:", error);
      }
    }

    return {
      allowed: false,
      retryAt: checkResult.retryAt,
      reason: checkResult.reason ?? "Rate limit exceeded",
      skipped: false,
      rateLimitInfo: checkResult.rateLimitInfo,
      config: configResult,
    };
  }

  // -------------------------------------------------------------------------
  // Step 5: Execute consume hook (if provided)
  // -------------------------------------------------------------------------
  // If no separate consume hook, the check hook is assumed to have consumed
  if (consumeHook) {
    const consumeResult = await executeConsumeHook(consumeHook, context);

    if (!consumeResult.allowed) {
      // Consume failed (another request beat us to the limit)
      if (hooks.onRateLimited) {
        try {
          await hooks.onRateLimited(context, consumeResult);
        } catch (error) {
          console.error("onRateLimited callback error:", error);
        }
      }

      return {
        allowed: false,
        retryAt: consumeResult.retryAt,
        reason: consumeResult.reason ?? "Rate limit exceeded",
        skipped: false,
        rateLimitInfo: consumeResult.rateLimitInfo,
        config: configResult,
      };
    }
  }

  // -------------------------------------------------------------------------
  // All checks passed
  // -------------------------------------------------------------------------
  return {
    allowed: true,
    skipped: false,
    rateLimitInfo: checkResult.rateLimitInfo,
    config: configResult,
  };
}

/**
 * Execute rate limit hooks and throw RateLimitedError if rate limited.
 *
 * This is a convenience wrapper that executes hooks and throws
 * RateLimitedError if the operation is rate limited.
 *
 * @param options - Rate limit execution options
 * @throws RateLimitedError if the operation is rate limited
 * @returns The rate limit result (if allowed)
 */
export async function requireRateLimit(
  options: ExecuteRateLimitOptions
): Promise<RateLimitResult> {
  const result = await executeRateLimitHooks(options);

  if (!result.allowed) {
    throw new RateLimitedError(result.reason ?? "Rate limit exceeded", {
      retryAt: result.retryAt,
      operation: options.context.operation,
      operationCategory: options.context.operationCategory,
      rateLimitInfo: result.rateLimitInfo,
    });
  }

  return result;
}

// =============================================================================
// Utility Functions for Building Rate Limit Hooks
// =============================================================================

/**
 * Creates a simple rate limit key from context.
 * Default format: `{userId}:{operationCategory}`
 */
export function createRateLimitKey(
  context: RateLimitHookContext,
  options?: {
    /** Include operation in key (more granular limiting) */
    includeOperation?: boolean;
    /** Include content type in key */
    includeContentType?: boolean;
    /** Custom prefix */
    prefix?: string;
  }
): string {
  const parts: string[] = [];

  if (options?.prefix) {
    parts.push(options.prefix);
  }

  if (context.userId) {
    parts.push(context.userId);
  } else {
    parts.push("anonymous");
  }

  if (options?.includeOperation) {
    parts.push(context.operation);
  } else {
    parts.push(context.operationCategory);
  }

  if (options?.includeContentType && context.contentTypeName) {
    parts.push(context.contentTypeName);
  }

  return parts.join(":");
}

/**
 * Creates a rate limit name from operation category.
 * Useful for mapping to named rate limits in convex-helpers.
 */
export function createRateLimitName(
  context: RateLimitHookContext,
  prefix = "cms"
): string {
  return `${prefix}.${context.operationCategory}`;
}

/**
 * Default tier-based rate limit configurations.
 * Can be used as a starting point for custom configurations.
 */
export const DEFAULT_TIER_LIMITS = {
  free: {
    read: { rate: 100, period: 60000 }, // 100 reads per minute
    write: { rate: 10, period: 60000 }, // 10 writes per minute
    publish: { rate: 5, period: 60000 }, // 5 publishes per minute
    media: { rate: 10, period: 60000 }, // 10 media ops per minute
    admin: { rate: 5, period: 60000 }, // 5 admin ops per minute
  },
  pro: {
    read: { rate: 500, period: 60000 },
    write: { rate: 50, period: 60000 },
    publish: { rate: 20, period: 60000 },
    media: { rate: 50, period: 60000 },
    admin: { rate: 20, period: 60000 },
  },
  enterprise: {
    read: { rate: 2000, period: 60000 },
    write: { rate: 200, period: 60000 },
    publish: { rate: 100, period: 60000 },
    media: { rate: 200, period: 60000 },
    admin: { rate: 100, period: 60000 },
  },
} as const;

/**
 * Type for user tiers.
 */
export type UserTier = keyof typeof DEFAULT_TIER_LIMITS;

/**
 * Get rate limit configuration for a user tier and operation category.
 */
export function getTierLimit(
  tier: UserTier,
  category: OperationCategory
): { rate: number; period: number } {
  return DEFAULT_TIER_LIMITS[tier][category];
}
