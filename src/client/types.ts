/** TypeScript type definitions for the Convex CMS component. */

import type { Infer } from "convex/values";
import type {
  MediaVariant as MediaVariantType,
  ContentVersion as ContentVersionType,
  StringifyIds,
} from "../component/documentTypes.js";
import * as validators from "../component/validators.js";
import * as schema from "../component/schema.js";
import type { ContentStatus } from "../component/validators.js";

// --- Component Configuration ---

/** Locale code following IETF BCP 47 format */
export type LocaleCode = string;

/** Feature flags for enabling/disabling CMS capabilities */
export interface FeatureFlags {
  /** @default true */
  versioning?: boolean;
  /** @default true */
  scheduling?: boolean;
  /** @default false */
  localization?: boolean;
  /** @default true */
  mediaManagement?: boolean;
  /** @default true */
  contentLocking?: boolean;
  /** @default true - when disabled, deletions are permanent */
  softDelete?: boolean;
  /** @default true */
  searchIndexing?: boolean;
}

// --- Convex Context Types ---

import type { GenericMutationCtx, GenericDataModel } from "convex/server";

/**
 * Convex context for CMS authorization hooks (Pick pattern per Convex docs).
 * Cast to your app's MutationCtx in hook implementations for full type safety.
 */
export type CmsHookContext = Pick<
  GenericMutationCtx<GenericDataModel>,
  "db" | "auth" | "runMutation" | "runQuery"
>;

// --- User Role Hook Types ---

export interface GetUserRoleContext {
  userId: string;
}

// --- Authorization Hook Types ---

export type CmsOperation =
  | "contentTypes.create" | "contentTypes.update" | "contentTypes.delete" | "contentTypes.read"
  | "contentEntries.create" | "contentEntries.update" | "contentEntries.delete" | "contentEntries.read"
  | "contentEntries.publish" | "contentEntries.unpublish" | "contentEntries.restore" | "contentEntries.schedule"
  | "mediaItems.create" | "mediaItems.update" | "mediaItems.delete" | "mediaItems.read" | "mediaItems.move"
  | "versions.read" | "versions.rollback";

/** Context passed to authorization hooks */
export interface AuthorizationHookContext {
  /** Convex context for database/auth access */
  ctx: CmsHookContext;
  operation: CmsOperation;
  userId?: string;
  role?: string | null;
  resourceId?: string;
  resourceOwnerId?: string;
  contentTypeId?: string;
  contentTypeName?: string;
  operationData?: Record<string, unknown>;
}

export interface AuthorizationHookResult {
  allowed: boolean;
  reason?: string;
  /** Modified data to use instead of original (allows hooks to transform input) */
  modifiedData?: Record<string, unknown>;
}

/** Extends AuthorizationHookContext with the default RBAC decision */
export interface AuthorizeHookContext extends AuthorizationHookContext {
  defaultDecision: {
    allowed: boolean;
    reason?: string;
    /** Possible: 'NO_ROLE', 'UNKNOWN_ROLE', 'PERMISSION_DENIED', 'OWNERSHIP_REQUIRED' */
    code?: string;
    grantedScope?: "all" | "own";
    ownershipVerified?: boolean;
  };
}

/**
 * Hook called AFTER RBAC check. Can override RBAC decisions based on custom logic.
 * Receives context.defaultDecision showing what RBAC decided.
 */
export type AuthorizeHook = (
  context: AuthorizeHookContext
) => Promise<AuthorizationHookResult> | AuthorizationHookResult;

/** Hook for custom permission logic beyond built-in RBAC */
export type AuthorizationHook = (
  context: AuthorizationHookContext
) => Promise<AuthorizationHookResult> | AuthorizationHookResult;

/**
 * Authorization hooks configuration.
 *
 * Hook execution order:
 * 1. beforeRbac (can skip RBAC)
 * 2. RBAC check (if not skipped)
 * 3. authorize (receives RBAC decision, can override)
 * 4. afterRbac (only if authorize allowed)
 * 5. operationHooks (only if afterRbac allowed)
 * 6. onDeny (if any step denied)
 */
export interface AuthorizationHooks {
  /** Runs before RBAC. Return {allowed: false} for early rejection, or {allowed: true, skipRbac: true} to bypass RBAC */
  beforeRbac?: AuthorizationHook;
  /** Runs after RBAC passes. Add restrictions (team membership, quotas, etc.) */
  afterRbac?: AuthorizationHook;
  /** Runs after RBAC regardless of outcome. Can override RBAC decisions. */
  authorize?: AuthorizeHook;
  /** Runs when authorization denied. Return {allowed: true} to override denial */
  onDeny?: AuthorizationHook;
  /** Operation-specific hooks run after general hooks */
  operationHooks?: Partial<Record<CmsOperation, AuthorizationHook>>;
}

// --- Rate Limiting Hook Types ---

export type OperationCategory = "read" | "write" | "publish" | "media" | "admin";

export interface RateLimitHookContext {
  operation: CmsOperation;
  operationCategory: OperationCategory;
  userId?: string;
  role?: string | null;
  contentTypeId?: string;
  contentTypeName?: string;
  /** Additional metadata (IP address, session ID, API key, user tier, etc.) */
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAt?: number;
  reason?: string;
  rateLimitInfo?: {
    limitName?: string;
    remaining?: number;
    limit?: number;
    windowMs?: number;
    isSoftLimit?: boolean;
  };
}

export interface RateLimitConsumeResult extends RateLimitCheckResult {
  consumed: boolean;
}

/** Called BEFORE operation to check rate limit (should NOT modify state) */
export type RateLimitCheckHook = (
  context: RateLimitHookContext
) => Promise<RateLimitCheckResult> | RateLimitCheckResult;

/** Called AFTER check passes to record usage */
export type RateLimitConsumeHook = (
  context: RateLimitHookContext
) => Promise<RateLimitConsumeResult> | RateLimitConsumeResult;

/** Dynamic rate limit configuration based on user tier, operation, etc. */
export type RateLimitConfigHook = (
  context: RateLimitHookContext
) => Promise<RateLimitConfigResult> | RateLimitConfigResult;

export interface RateLimitConfigResult {
  enabled: boolean;
  config?: {
    rate: number;
    period: number;
    capacity?: number;
    maxReserved?: number;
  };
  key?: string;
  cost?: number;
}

/**
 * Rate limiting hooks configuration.
 * Hook order: getConfig → check → consume (if check passed)
 */
export interface RateLimitHooks {
  check?: RateLimitCheckHook;
  consume?: RateLimitConsumeHook;
  getConfig?: RateLimitConfigHook;
  /** @default false */
  skipForAdmin?: boolean;
  excludeOperations?: CmsOperation[];
  excludeCategories?: OperationCategory[];
  /** Override global hooks for specific operations */
  operationHooks?: Partial<
    Record<CmsOperation, {
      check?: RateLimitCheckHook;
      consume?: RateLimitConsumeHook;
      getConfig?: RateLimitConfigHook;
    }>
  >;
  onRateLimited?: (context: RateLimitHookContext, result: RateLimitCheckResult) => void | Promise<void>;
}

export type GetUserRoleResult = string | null;

/** Maps user IDs to CMS roles ('admin', 'editor', 'author', 'viewer', or custom) */
export type GetUserRoleHook = (
  ctx: CmsHookContext,
  context: GetUserRoleContext
) => Promise<GetUserRoleResult> | GetUserRoleResult;

// --- Configuration Types ---

/** Minimal CMS configuration - just provide getUserRole hook */
export interface CmsConfig {
  getUserRole: GetUserRoleHook;
  /** @default "en" */
  defaultLocale?: LocaleCode;
}

/** CMS configuration with feature flags */
export interface CmsConfigWithFeatures extends CmsConfig {
  features?: FeatureFlags;
  supportedLocales?: LocaleCode[];
}

/** Full CMS configuration with hooks, custom roles, and advanced options */
export interface FullCmsConfig extends CmsConfigWithFeatures {
  authorizationHooks?: AuthorizationHooks;
  rateLimitHooks?: RateLimitHooks;
  customRoles?: Array<CustomRoleInput>;
  /** @default false */
  skipRbac?: boolean;
}

/** Development-only config - WARNING: Never use in production! */
export interface CmsDevConfig {
  /** Bypasses all authorization - only for local development */
  permissiveMode: true;
  /** @default "en" */
  defaultLocale?: LocaleCode;
}

export type SimplifiedCmsConfig =
  | CmsConfig
  | CmsConfigWithFeatures
  | FullCmsConfig
  | CmsDevConfig;

/** Full CMS component configuration. For simpler setups, use CmsConfig or CmsConfigWithFeatures. */
export interface ComponentConfig {
  /** @default "en" */
  defaultLocale?: LocaleCode;
  /** @default ["en"] */
  supportedLocales?: LocaleCode[];
  /** Locale fallback chains (e.g., "es-MX": ["es-ES", "en-US"]) */
  localeFallbackChains?: Record<LocaleCode, LocaleCode[]>;
  /** Auto-generate fallback chains from BCP 47 hierarchy. @default true */
  autoGenerateLocaleFallbacks?: boolean;
  features?: FeatureFlags;
  /** @default 50 (0 for unlimited) */
  maxVersionsPerEntry?: number;
  /** @default 300000 (5 minutes) */
  lockDurationMs?: number;
  /** @default 52428800 (50MB) */
  maxMediaFileSize?: number;
  getUserRole?: GetUserRoleHook;
  authorizationHooks?: AuthorizationHooks;
  rateLimitHooks?: RateLimitHooks;
  /** Skip built-in RBAC (use authorizationHooks instead). @default false */
  skipRbac?: boolean;
  /** WARNING: Never enable in production! @default false */
  permissiveMode?: boolean;
  /** Validate hooks at init time instead of runtime */
  requireHooks?: Array<"getUserRole" | "authorizationHooks" | "rateLimitHooks">;
  customRoles?: Array<CustomRoleInput>;
  /** Content type schema for type-safe access */
  schema?: ContentSchemaConfig;
}

export type ContentSchemaConfig = {
  definitions: Record<string, ContentTypeDefinitionBase>;
  getDefinition(name: string): ContentTypeDefinitionBase | undefined;
  getContentTypeNames(): string[];
  hasContentType(name: string): boolean;
};

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

export interface CustomRoleInput {
  name: string;
  displayName: string;
  description: string;
  permissions: CustomPermission[];
  isSystem?: boolean;
  extendsRole?: string;
}

export interface CustomRoleDefinition {
  name: string;
  displayName: string;
  description: string;
  permissions: CustomPermission[];
  isSystem: boolean;
  extendsRole?: string;
}

export interface CustomPermission {
  resource: "contentTypes" | "contentEntries" | "mediaItems" | "settings";
  action: "create" | "read" | "update" | "delete" | "publish" | "unpublish" | "restore" | "manage" | "move";
  scope?: "all" | "own";
  contentTypes?: string[];
  excludeContentTypes?: string[];
}

/** Configuration with all defaults applied */
export type ResolvedComponentConfig = Required<Omit<ComponentConfig, "getUserRole" | "authorizationHooks" | "rateLimitHooks" | "localeFallbackChains" | "customRoles" | "requireHooks" | "schema">> & {
  getUserRole?: GetUserRoleHook;
  authorizationHooks?: AuthorizationHooks;
  rateLimitHooks?: RateLimitHooks;
  localeFallbackChains: Record<LocaleCode, LocaleCode[]>;
  customRoles: Record<string, CustomRoleDefinition>;
  requireHooks: Array<"getUserRole" | "authorizationHooks" | "rateLimitHooks">;
  schema?: ContentSchemaConfig;
};

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

export type RequiredHookName = "getUserRole" | "authorizationHooks" | "rateLimitHooks";

/** Thrown when requireHooks validation fails at init time */
export class MissingHookError extends Error {
  readonly hookName: RequiredHookName;
  readonly suggestion: string;
  readonly affectedMethods: string[];

  constructor(hookName: RequiredHookName) {
    const hookInfo = HOOK_INFO[hookName];
    super(`Missing required hook: ${hookName}. ${hookInfo.suggestion}`);
    this.name = "MissingHookError";
    this.hookName = hookName;
    this.suggestion = hookInfo.suggestion;
    this.affectedMethods = hookInfo.affectedMethods;
    Object.setPrototypeOf(this, MissingHookError.prototype);
  }
}

/** Thrown when mutation attempted without getUserRole configured (and not in permissiveMode) */
export class AuthorizationNotConfiguredError extends Error {
  readonly operation: string;
  readonly suggestion: string;

  constructor(operation: string) {
    super(
      `Authorization not configured for operation "${operation}". ` +
      "Configure a getUserRole hook in createCmsClient options, or set permissiveMode: true for development."
    );
    this.name = "AuthorizationNotConfiguredError";
    this.operation = operation;
    this.suggestion =
      "Add getUserRole hook: createCmsClient(api, { getUserRole: async (ctx, { userId }) => getUserRoleFromDb(userId) })";
    Object.setPrototypeOf(this, AuthorizationNotConfiguredError.prototype);
  }
}

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

/** @throws MissingHookError if a required hook is not configured */
export function validateRequiredHooks(config?: ComponentConfig): void {
  const requireHooks = config?.requireHooks ?? [];

  for (const hookName of requireHooks) {
    switch (hookName) {
      case "getUserRole":
        if (!config?.getUserRole) {
          throw new MissingHookError("getUserRole");
        }
        break;

      case "authorizationHooks": {
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
      }

      case "rateLimitHooks":
        if (!config?.rateLimitHooks?.check) {
          throw new MissingHookError("rateLimitHooks");
        }
        break;
    }
  }
}

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

// --- Field Types ---

export type { FieldType } from "../component/validators.js";

export type FieldOptions = StringifyIds<
  | Infer<typeof schema.textFieldDefinitionValidator>["options"]
  | Infer<typeof schema.numberFieldDefinitionValidator>["options"]
  | Infer<typeof schema.booleanFieldDefinitionValidator>["options"]
  | Infer<typeof schema.richTextFieldDefinitionValidator>["options"]
  | Infer<typeof schema.mediaFieldDefinitionValidator>["options"]
  | Infer<typeof schema.selectFieldDefinitionValidator>["options"]
  | Infer<typeof schema.tagsFieldDefinitionValidator>["options"]
  | Infer<typeof schema.categoryFieldDefinitionValidator>["options"]
  | Infer<typeof schema.jsonFieldDefinitionValidator>["options"]
  | Infer<typeof schema.referenceFieldDefinitionValidator>["options"]
  | Infer<typeof schema.multiSelectFieldDefinitionValidator>["options"]
  | Infer<typeof schema.dateFieldDefinitionValidator>["options"]
  | Infer<typeof schema.datetimeFieldDefinitionValidator>["options"]
>;

// --- Sort Types ---

export type SortDirection = "asc" | "desc";

export type SystemSortField =
  | "_creationTime" | "_id" | "firstPublishedAt" | "lastPublishedAt" | "scheduledPublishAt" | "version";

/** System field or custom data field (prefix with "data.") */
export type SortField = SystemSortField | `data.${string}` | string;

export interface SortOptions {
  sortField: SortField;
  sortDirection: SortDirection;
}

// --- Field Filter Types ---

export type FilterOperator =
  | "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains" | "startsWith" | "endsWith" | "in" | "notIn";

export interface FieldFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

// --- Reference Field Types ---

export type SingleReference = string;
export type MultipleReferences = string[];
export type ReferenceValue = SingleReference | MultipleReferences;

export interface ResolvedReference {
  id: string;
  contentTypeName: string;
  contentTypeDisplayName: string;
  slug: string;
  status: ContentStatus;
  data: Record<string, unknown>;
  exists: boolean;
}

// --- Deep Reference Resolution Types ---

export interface DeepResolveOptions {
  /** @default 1 (0=no resolve, 1=immediate refs, 2+=nested) */
  maxDepth?: number;
  /** @default true */
  resolveMedia?: boolean;
  /** @default true */
  resolveContent?: boolean;
  /** @default false */
  publishedOnly?: boolean;
  /** @default false */
  includeDeleted?: boolean;
  fields?: string[];
  onlyFields?: string[];
  excludeFields?: string[];
  /** @default false - adds _originalId field when true */
  preserveOriginalIds?: boolean;
}

export interface ResolvedContentEntry {
  id: string;
  contentTypeName: string;
  contentTypeDisplayName: string;
  slug: string;
  status: ContentStatus;
  data: Record<string, unknown>;
  exists: boolean;
  locale?: string;
  version?: number;
  _circularReferences?: string[];
  _unresolvedReferences?: Record<string, string[]>;
  _originalId?: string;
}

export interface BatchResolveResult {
  resolved: ResolvedContentEntry[];
  unresolved: string[];
  circularReferencesDetected: number;
}

export type { FieldDefinition } from "../component/documentTypes.js";

// --- Content Status ---

export type { ContentStatus } from "../component/validators.js";

// --- Media Types ---

export type { MediaType, VariantType, VariantStatus } from "../component/validators.js";
export type MediaVariant = MediaVariantType;
export type MediaVariantWithUrl = MediaVariant & { url: string | null };

// --- Document Types ---

export type {
  ContentType,
  ContentEntry,
  ContentVersion,
  MediaAsset,
  MediaFolder,
  MediaVariant as MediaVariantDoc,
  Taxonomy,
  TaxonomyTerm,
} from "../component/documentTypes.js";

// --- Version Comparison Types ---

export type FieldChangeType = "added" | "removed" | "modified" | "unchanged";

export interface FieldChange {
  field: string;
  changeType: FieldChangeType;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface VersionComparison {
  fromVersion: ContentVersionType;
  toVersion: ContentVersionType;
  changes: FieldChange[];
  slugChanged: boolean;
  statusChanged: boolean;
  summary: {
    fieldsAdded: number;
    fieldsRemoved: number;
    fieldsModified: number;
    totalChanges: number;
  };
}

export interface VersionHistoryOptions {
  entryId: string;
  publishedOnly?: boolean;
  paginationOpts: PaginationOpts;
}

// --- Pagination ---

/** Standard Convex pagination result (compatible with usePaginatedQuery) */
export interface PaginationResult<T> {
  page: T[];
  continueCursor: string | null;
  isDone: boolean;
}

export interface PaginationOpts {
  numItems: number;
  /** Pass null for first page */
  cursor: string | null;
}

// --- Query Options ---

type ContentQueryArgsBase = StringifyIds<Infer<typeof validators.contentQueryArgs>>;

/** Options for querying content entries with pagination */
export interface ContentQueryOptions extends Omit<ContentQueryArgsBase, 'cursor' | 'limit'> {
  fieldFilters?: FieldFilter[];
  sortField?: SortField;
  sortDirection?: SortDirection;
  paginationOpts: PaginationOpts;
}

export type MediaQueryOptions = StringifyIds<Infer<typeof validators.mediaQueryArgs>>;

// --- Component API Types ---

export interface ComponentApi {
  contentTypes: { create: unknown; update: unknown; delete: unknown; get: unknown; list: unknown };
  contentEntries: { create: unknown; update: unknown; delete: unknown; get: unknown; list: unknown; publish: unknown; unpublish: unknown; schedule: unknown };
  versions: { list: unknown; get: unknown; rollback: unknown };
  mediaItems: { create: unknown; update: unknown; delete: unknown; get: unknown; list: unknown; move: unknown };
}

