/**
 * RBAC Default Roles Configuration
 *
 * This module defines the default role configurations for the CMS:
 * - admin: Full access to all CMS features
 * - editor: Can manage all content and media, but not settings
 * - author: Can create and manage own content
 * - viewer: Read-only access to published content
 *
 * Roles are exported as constants for easy customization. Developers can
 * extend or override these defaults using the custom roles feature.
 *
 * @example
 * ```typescript
 * import { DEFAULT_ROLES, hasPermission, type RoleName } from '@convex-cms/core';
 *
 * // Check if a role has a specific permission
 * if (hasPermission('editor', { resource: 'contentEntries', action: 'update' })) {
 *   // Allow the action
 * }
 *
 * // Get all permissions for a role
 * const adminPerms = getRolePermissions('admin');
 * ```
 */

import { v } from "convex/values";

// =============================================================================
// Role Name Constants
// =============================================================================

/**
 * All built-in role names in the CMS.
 * Custom roles can be added by developers, but these are always available.
 */
export const roleNames = ["admin", "editor", "author", "viewer"] as const;

/**
 * Type representing a built-in role name.
 * Use `string` for custom roles, or extend this type.
 */
export type RoleName = typeof roleNames[number];

/**
 * Convex validator for role names.
 * Use this in function arguments to validate role input.
 */
export const roleNameValidator = v.union(
	v.literal("admin"),
	v.literal("editor"),
	v.literal("author"),
	v.literal("viewer"),
);

// =============================================================================
// Resource and Action Constants
// =============================================================================

/**
 * All resources that can be protected by RBAC.
 */
export const resources = [
	"contentTypes",
	"contentEntries",
	"mediaItems",
	"settings",
] as const;

export type Resource = typeof resources[number];

/**
 * Convex validator for resources.
 */
export const resourceValidator = v.union(
	v.literal("contentTypes"),
	v.literal("contentEntries"),
	v.literal("mediaItems"),
	v.literal("settings"),
);

/**
 * All actions that can be performed on resources.
 */
export const actions = [
	"create",
	"read",
	"update",
	"delete",
	"publish",
	"unpublish",
	"restore",
	"manage", // Special action for full control (e.g., settings)
	"move", // Move items between folders (media)
] as const;

export type Action = typeof actions[number];

/**
 * Convex validator for actions.
 */
export const actionValidator = v.union(
	v.literal("create"),
	v.literal("read"),
	v.literal("update"),
	v.literal("delete"),
	v.literal("publish"),
	v.literal("unpublish"),
	v.literal("restore"),
	v.literal("manage"),
	v.literal("move"),
);

// =============================================================================
// Permission Types
// =============================================================================

/**
 * Ownership scope for permissions.
 * - "all": Can perform action on any item
 * - "own": Can only perform action on items they created
 */
export type OwnershipScope = "all" | "own";

/**
 * A single permission grant.
 * Defines what action can be performed on which resource, with optional ownership scope.
 */
export interface Permission {
	/** The resource this permission applies to */
	resource: Resource;
	/** The action being granted */
	action: Action;
	/**
	 * Ownership scope (defaults to "all" if not specified).
	 * Only relevant for resources that have ownership (contentEntries, mediaAssets).
	 */
	scope?: OwnershipScope;
}

/**
 * Convex validator for a permission object.
 */
export const permissionValidator = v.object({
	resource: resourceValidator,
	action: actionValidator,
	scope: v.optional(v.union(v.literal("all"), v.literal("own"))),
});

/**
 * Complete role definition including metadata and permissions.
 */
export interface RoleDefinition {
	/** Unique role identifier */
	name: RoleName | string;
	/** Human-readable display name */
	displayName: string;
	/** Description of the role's purpose */
	description: string;
	/** List of permissions granted to this role */
	permissions: Permission[];
	/** Whether this is a system role that cannot be deleted */
	isSystem: boolean;
}

// =============================================================================
// Permission Factory Helpers
// =============================================================================

/**
 * Helper to create a full CRUD permission set for a resource.
 */
function fullCrud(
	resource: Resource,
	scope: OwnershipScope = "all",
): Permission[] {
	return [
		{ resource, action: "create", scope },
		{ resource, action: "read", scope },
		{ resource, action: "update", scope },
		{ resource, action: "delete", scope },
	];
}

/**
 * Helper to create read-only permission for a resource.
 */
function readOnly(
	resource: Resource,
	scope: OwnershipScope = "all",
): Permission[] {
	return [{ resource, action: "read", scope }];
}

/**
 * Helper to create publish permissions for content.
 */
function publishPermissions(scope: OwnershipScope = "all"): Permission[] {
	return [
		{ resource: "contentEntries", action: "publish", scope },
		{ resource: "contentEntries", action: "unpublish", scope },
	];
}

// =============================================================================
// Default Role Definitions
// =============================================================================

/**
 * Admin role - Full access to all CMS features.
 *
 * Admins can:
 * - Create, read, update, and delete all content types
 * - Manage all content entries regardless of author
 * - Publish and unpublish any content
 * - Manage all media assets and folders
 * - Access and modify CMS settings
 */
export const ADMIN_ROLE: RoleDefinition = {
	name: "admin",
	displayName: "Administrator",
	description:
		"Full access to all CMS features including settings and content type management",
	isSystem: true,
	permissions: [
		// Content types - full management
		...fullCrud("contentTypes"),

		// Content entries - full CRUD + publish
		...fullCrud("contentEntries"),
		...publishPermissions(),
		{ resource: "contentEntries", action: "restore" },

		// Media - full management
		...fullCrud("mediaItems"),

		// Settings - full access
		{ resource: "settings", action: "manage" },
		...readOnly("settings"),
	],
};

/**
 * Editor role - Can manage all content and media, but not settings or content types.
 *
 * Editors can:
 * - Read content type definitions
 * - Create, read, update, and delete all content entries
 * - Publish and unpublish any content
 * - Manage all media assets and folders
 * - Cannot modify CMS settings or content type schemas
 */
export const EDITOR_ROLE: RoleDefinition = {
	name: "editor",
	displayName: "Editor",
	description:
		"Can manage all content and media, but cannot modify settings or content types",
	isSystem: true,
	permissions: [
		// Content types - read only
		...readOnly("contentTypes"),

		// Content entries - full CRUD + publish
		...fullCrud("contentEntries"),
		...publishPermissions(),
		{ resource: "contentEntries", action: "restore" },

		// Media - full management
		...fullCrud("mediaItems"),
	],
};

/**
 * Author role - Can create and manage own content.
 *
 * Authors can:
 * - Read content type definitions
 * - Create content entries
 * - Read, update, and delete their own content entries
 * - Publish and unpublish their own content (subject to workflow settings)
 * - Upload and manage their own media assets
 * - Read all media (for embedding in content)
 * - Cannot manage other users' content or CMS settings
 */
export const AUTHOR_ROLE: RoleDefinition = {
	name: "author",
	displayName: "Author",
	description: "Can create and manage own content and media",
	isSystem: true,
	permissions: [
		// Content types - read only
		...readOnly("contentTypes"),

		// Content entries - own content only
		{ resource: "contentEntries", action: "create" },
		{ resource: "contentEntries", action: "read", scope: "own" },
		{ resource: "contentEntries", action: "update", scope: "own" },
		{ resource: "contentEntries", action: "delete", scope: "own" },
		// Authors can publish/unpublish their own content
		{ resource: "contentEntries", action: "publish", scope: "own" },
		{ resource: "contentEntries", action: "unpublish", scope: "own" },

		// Media - can create and manage own, read all (for embedding)
		{ resource: "mediaItems", action: "create" },
		{ resource: "mediaItems", action: "read", scope: "all" }, // Can read all for embedding
		{ resource: "mediaItems", action: "update", scope: "own" },
		{ resource: "mediaItems", action: "delete", scope: "own" },
	],
};

/**
 * Viewer role - Read-only access to published content.
 *
 * Viewers can:
 * - Read content type definitions
 * - Read published content entries only
 * - View media assets
 * - Cannot create, update, delete, or publish any content
 */
export const VIEWER_ROLE: RoleDefinition = {
	name: "viewer",
	displayName: "Viewer",
	description: "Read-only access to published content and media",
	isSystem: true,
	permissions: [
		// Content types - read only
		...readOnly("contentTypes"),

		// Content entries - read published only (scope: "all" means all published)
		...readOnly("contentEntries"),

		// Media - read only
		...readOnly("mediaItems"),
	],
};

// =============================================================================
// Default Roles Collection
// =============================================================================

/**
 * All default roles indexed by role name.
 * Use this to look up role definitions or iterate over all roles.
 *
 * @example
 * ```typescript
 * // Get the admin role definition
 * const adminDef = DEFAULT_ROLES.admin;
 *
 * // Iterate over all roles
 * for (const [name, role] of Object.entries(DEFAULT_ROLES)) {
 *   console.log(`${name}: ${role.description}`);
 * }
 * ```
 */
export const DEFAULT_ROLES: Record<RoleName, RoleDefinition> = {
	admin: ADMIN_ROLE,
	editor: EDITOR_ROLE,
	author: AUTHOR_ROLE,
	viewer: VIEWER_ROLE,
};

/**
 * Array of all default role definitions.
 * Useful for UI rendering or iterating over roles.
 */
export const DEFAULT_ROLES_LIST: RoleDefinition[] = Object.values(
	DEFAULT_ROLES,
);

// =============================================================================
// Permission Check Utilities
// =============================================================================

/**
 * Check if a permission matches a requested permission.
 * Handles scope matching (own scope only matches if requested scope is also own).
 *
 * @param granted - The permission that was granted to the role
 * @param requested - The permission being requested
 * @returns True if the granted permission satisfies the requested permission
 */
export function permissionMatches(
	granted: Permission,
	requested: { resource: Resource; action: Action; scope?: OwnershipScope },
): boolean {
	// Resource and action must match
	if (
		granted.resource !== requested.resource ||
		granted.action !== requested.action
	) {
		return false;
	}

	// Scope matching:
	// - If granted scope is "all" (or undefined), it covers both "all" and "own" requests
	// - If granted scope is "own", it only covers "own" requests
	const grantedScope = granted.scope ?? "all";
	const requestedScope = requested.scope ?? "all";

	if (grantedScope === "all") {
		return true; // "all" scope covers everything
	}

	// "own" scope only matches "own" requests
	return requestedScope === "own";
}

/**
 * Check if a role has a specific permission.
 *
 * @param roleName - The name of the role to check
 * @param permission - The permission to check for (resource + action + optional scope)
 * @param customRoles - Optional custom roles to check in addition to defaults
 * @returns True if the role has the permission
 *
 * @example
 * ```typescript
 * // Check if editor can update content entries
 * hasPermission('editor', { resource: 'contentEntries', action: 'update' }); // true
 *
 * // Check if author can publish their own content
 * hasPermission('author', { resource: 'contentEntries', action: 'publish', scope: 'own' }); // true
 *
 * // Check if viewer can update content
 * hasPermission('viewer', { resource: 'contentEntries', action: 'update' }); // false
 * ```
 */
export function hasPermission(
	roleName: RoleName | string,
	permission: { resource: Resource; action: Action; scope?: OwnershipScope },
	customRoles?: Record<string, RoleDefinition>,
): boolean {
	// Look up role in default roles first, then custom roles
	const role = DEFAULT_ROLES[roleName as RoleName] ?? customRoles?.[roleName];

	if (!role) {
		return false; // Unknown role has no permissions
	}

	// Check if any granted permission matches the requested permission
	return role.permissions.some((p) => permissionMatches(p, permission));
}

/**
 * Get all permissions for a role.
 *
 * @param roleName - The name of the role
 * @param customRoles - Optional custom roles to check in addition to defaults
 * @returns Array of permissions, or empty array if role not found
 *
 * @example
 * ```typescript
 * const editorPerms = getRolePermissions('editor');
 * console.log(editorPerms.length); // Number of permissions
 * ```
 */
export function getRolePermissions(
	roleName: RoleName | string,
	customRoles?: Record<string, RoleDefinition>,
): Permission[] {
	const role = DEFAULT_ROLES[roleName as RoleName] ?? customRoles?.[roleName];

	return role?.permissions ?? [];
}

/**
 * Get the role definition for a role name.
 *
 * @param roleName - The name of the role
 * @param customRoles - Optional custom roles to check in addition to defaults
 * @returns The role definition, or undefined if not found
 */
export function getRole(
	roleName: RoleName | string,
	customRoles?: Record<string, RoleDefinition>,
): RoleDefinition | undefined {
	return DEFAULT_ROLES[roleName as RoleName] ?? customRoles?.[roleName];
}

/**
 * Check if a role name is a valid built-in role.
 *
 * @param name - The role name to check
 * @returns True if it's a valid built-in role name
 */
export function isBuiltInRole(name: string): name is RoleName {
	return roleNames.includes(name as RoleName);
}

/**
 * Get all permissions for a specific resource across a role.
 *
 * @param roleName - The name of the role
 * @param resource - The resource to filter by
 * @param customRoles - Optional custom roles to check in addition to defaults
 * @returns Array of permissions for the specified resource
 *
 * @example
 * ```typescript
 * // Get all content entry permissions for editor
 * const contentPerms = getResourcePermissions('editor', 'contentEntries');
 * ```
 */
export function getResourcePermissions(
	roleName: RoleName | string,
	resource: Resource,
	customRoles?: Record<string, RoleDefinition>,
): Permission[] {
	return getRolePermissions(roleName, customRoles).filter(
		(p) => p.resource === resource,
	);
}

/**
 * Check if a role can perform any action on a resource.
 *
 * @param roleName - The name of the role
 * @param resource - The resource to check
 * @param customRoles - Optional custom roles to check in addition to defaults
 * @returns True if the role h permission on the resource
 */
export function canAccessResource(
	roleName: RoleName | string,
	resource: Resource,
	customRoles?: Record<string, RoleDefinition>,
): boolean {
	return getResourcePermissions(roleName, resource, customRoles).length > 0;
}

// =============================================================================
// Custom Role Types and Interfaces
// =============================================================================

/**
 * Extended permission with optional content-type-specific restrictions.
 * Allows for fine-grained control over which content types a permission applies to.
 *
 * @example
 * ```typescript
 * // Permission that only applies to blog_post and news content types
 * const permission: ContentTypePermission = {
 *   resource: "contentEntries",
 *   action: "create",
 *   contentTypes: ["blog_post", "news"],
 * };
 *
 * // Permission that applies to all content types except legal
 * const restrictedPerm: ContentTypePermission = {
 *   resource: "contentEntries",
 *   action: "publish",
 *   excludeContentTypes: ["legal_document"],
 * };
 * ```
 */
export interface ContentTypePermission extends Permission {
	/**
	 * Whitelist of content type names this permission applies to.
	 * If specified, permission only grants access to these content types.
	 * Cannot be used with excludeContentTypes.
	 */
	contentTypes?: string[];

	/**
	 * Blacklist of content type names this permission does NOT apply to.
	 * If specified, permission grants access to all content types except these.
	 * Cannot be used with contentTypes.
	 */
	excludeContentTypes?: string[];
}

/**
 * Configuration for creating a custom role.
 *
 * @example
 * ```typescript
 * // Create a new role from scratch
 * const blogAuthor: CustomRoleConfig = {
 *   name: "blog-author",
 *   displayName: "Blog Author",
 *   description: "Can create and manage blog posts only",
 *   permissions: [
 *     { resource: "contentTypes", action: "read" },
 *     { resource: "contentEntries", action: "create", contentTypes: ["blog_post"] },
 *     { resource: "contentEntries", action: "read", scope: "own", contentTypes: ["blog_post"] },
 *     { resource: "contentEntries", action: "update", scope: "own", contentTypes: ["blog_post"] },
 *   ],
 * };
 * ```
 */
export interface CustomRoleConfig {
	/** Unique identifier for the custom role */
	name: string;
	/** Human-readable display name */
	displayName: string;
	/** Description of the role's purpose */
	description: string;
	/** Permissions granted to this role */
	permissions: ContentTypePermission[];
	/** Whether this role should be treated as a system role (cannot be deleted) */
	isSystem?: boolean;
}

/**
 * Configuration for extending an existing role.
 *
 * @example
 * ```typescript
 * // Extend the author role with additional permissions
 * const seniorAuthor: ExtendRoleConfig = {
 *   name: "senior-author",
 *   displayName: "Senior Author",
 *   description: "Author with additional publishing rights",
 *   extends: "author",
 *   addPermissions: [
 *     { resource: "contentEntries", action: "publish" },
 *   ],
 * };
 *
 * // Extend editor but restrict to certain content types
 * const blogEditor: ExtendRoleConfig = {
 *   name: "blog-editor",
 *   displayName: "Blog Editor",
 *   description: "Editor for blog content only",
 *   extends: "editor",
 *   addPermissions: [],
 *   removePermissions: [
 *     { resource: "contentEntries", action: "create" },
 *   ],
 *   restrictToContentTypes: ["blog_post", "blog_category"],
 * };
 * ```
 */
export interface ExtendRoleConfig {
	/** Unique identifier for the extended role */
	name: string;
	/** Human-readable display name */
	displayName: string;
	/** Description of the role's purpose */
	description: string;
	/** Name of the role to extend (can be built-in or custom) */
	extends: RoleName | string;
	/** Additional permissions to add to the extended role */
	addPermissions?: ContentTypePermission[];
	/**
	 * Permissions to remove from the extended role.
	 * Matching is done by resource + action (scope is ignored for removal).
	 */
	removePermissions?: Array<{ resource: Resource; action: Action }>;
	/**
	 * Restrict all contentEntries permissions to these content types.
	 * If specified, all contentEntries permissions are limited to only these types.
	 */
	restrictToContentTypes?: string[];
	/** Whether this role should be treated as a system role */
	isSystem?: boolean;
}

/**
 * Extended role definition that supports content-type-specific permissions.
 * This is the runtime representation of a role that may have per-content-type restrictions.
 */
export interface ExtendedRoleDefinition {
	/** Unique role identifier */
	name: string;
	/** Human-readable display name */
	displayName: string;
	/** Description of the role's purpose */
	description: string;
	/** List of permissions granted to this role (may include content-type restrictions) */
	permissions: ContentTypePermission[];
	/** Whether this is a system role that cannot be deleted */
	isSystem: boolean;
	/** If this role was extended from another, the source role name */
	extendsRole?: string;
}

// =============================================================================
// Custom Role Factory Functions
// =============================================================================

/**
 * Creates a new custom role from configuration.
 *
 * @param config - The custom role configuration
 * @returns A role definition ready to use with the RBAC system
 *
 * @example
 * ```typescript
 * const blogAuthor = createCustomRole({
 *   name: "blog-author",
 *   displayName: "Blog Author",
 *   description: "Can create and manage blog posts",
 *   permissions: [
 *     { resource: "contentTypes", action: "read" },
 *     { resource: "contentEntries", action: "create", contentTypes: ["blog_post"] },
 *     { resource: "contentEntries", action: "read", scope: "own", contentTypes: ["blog_post"] },
 *     { resource: "contentEntries", action: "update", scope: "own", contentTypes: ["blog_post"] },
 *     { resource: "contentEntries", action: "delete", scope: "own", contentTypes: ["blog_post"] },
 *     { resource: "mediaItems", action: "create" },
 *     { resource: "mediaItems", action: "read" },
 *   ],
 * });
 * ```
 */
export function createCustomRole(
	config: CustomRoleConfig,
): ExtendedRoleDefinition {
	// Validate the configuration
	if (!config.name || config.name.trim() === "") {
		throw new Error("Custom role name is required");
	}

	if (isBuiltInRole(config.name)) {
		throw new Error(
			`Cannot create custom role with built-in role name '${config.name}'. ` +
				"Use extendRole() to extend a built-in role, or choose a different name.",
		);
	}

	return {
		name: config.name,
		displayName: config.displayName,
		description: config.description,
		permissions: config.permissions,
		isSystem: config.isSystem ?? false,
	};
}

/**
 * Extends an existing role with additional or removed permissions.
 *
 * This function creates a new role based on an existing one, allowing you to:
 * - Add new permissions
 * - Remove existing permissions
 * - Restrict all contentEntries permissions to specific content types
 *
 * @param config - The extend role configuration
 * @param customRoles - Optional existing custom roles to look up the base role from
 * @returns A new role definition with the modified permissions
 *
 * @example
 * ```typescript
 * // Create a senior author who can publish their own content
 * const seniorAuthor = extendRole({
 *   name: "senior-author",
 *   displayName: "Senior Author",
 *   description: "Author with publishing rights",
 *   extends: "author",
 *   addPermissions: [
 *     { resource: "contentEntries", action: "publish", scope: "own" },
 *     { resource: "contentEntries", action: "unpublish", scope: "own" },
 *   ],
 * });
 *
 * // Create a blog-only editor
 * const blogEditor = extendRole({
 *   name: "blog-editor",
 *   displayName: "Blog Editor",
 *   description: "Can only edit blog content",
 *   extends: "editor",
 *   restrictToContentTypes: ["blog_post", "blog_category"],
 * });
 * ```
 */
export function extendRole(
	config: ExtendRoleConfig,
	customRoles?: Record<string, RoleDefinition | ExtendedRoleDefinition>,
): ExtendedRoleDefinition {
	// Validate the configuration
	if (!config.name || config.name.trim() === "") {
		throw new Error("Extended role name is required");
	}

	if (config.name === config.extends) {
		throw new Error(
			"Extended role name must be different from the base role name",
		);
	}

	// Get the base role
	const baseRole = getRole(config.extends, customRoles);
	if (!baseRole) {
		throw new Error(
			`Cannot extend unknown role '${config.extends}'. ` +
				"Ensure the role exists as a built-in role or is defined in customRoles.",
		);
	}

	// Start with base permissions
	let permissions: ContentTypePermission[] = [...baseRole.permissions];

	// Remove specified permissions
	if (config.removePermissions && config.removePermissions.length > 0) {
		permissions = permissions.filter((p) => {
			return !config.removePermissions!.some(
				(r) => r.resource === p.resource && r.action === p.action,
			);
		});
	}

	// Add new permissions
	if (config.addPermissions && config.addPermissions.length > 0) {
		permissions = [...permissions, ...config.addPermissions];
	}

	// Apply content type restrictions to all contentEntries permissions
	if (
		config.restrictToContentTypes &&
		config.restrictToContentTypes.length > 0
	) {
		permissions = permissions.map((p) => {
			if (p.resource === "contentEntries") {
				return {
					...p,
					contentTypes: config.restrictToContentTypes,
				};
			}
			return p;
		});
	}

	return {
		name: config.name,
		displayName: config.displayName,
		description: config.description,
		permissions,
		isSystem: config.isSystem ?? false,
		extendsRole: config.extends,
	};
}

/**
 * Merges custom roles with the default roles.
 *
 * Creates a combined role registry that includes both default and custom roles.
 * Custom roles do NOT override default roles - they exist alongside them.
 *
 * @param customRoles - Array of custom role definitions
 * @returns A record of all roles (default + custom)
 *
 * @example
 * ```typescript
 * const blogAuthor = createCustomRole({...});
 * const seniorAuthor = extendRole({...});
 *
 * const allRoles = mergeRolesWithDefaults([blogAuthor, seniorAuthor]);
 * // allRoles contains: admin, editor, author, viewer, blog-author, senior-author
 * ```
 */
export function mergeRolesWithDefaults(
	customRoles: Array<RoleDefinition | ExtendedRoleDefinition>,
): Record<string, RoleDefinition | ExtendedRoleDefinition> {
	const result: Record<string, RoleDefinition | ExtendedRoleDefinition> = {
		...DEFAULT_ROLES,
	};

	for (const role of customRoles) {
		if (isBuiltInRole(role.name)) {
			console.warn(
				`Warning: Custom role '${role.name}' has the same name as a built-in role. ` +
					"The built-in role will take precedence.",
			);
			continue;
		}
		result[role.name] = role;
	}

	return result;
}

/**
 * Creates a custom roles record from an array of role definitions.
 * Use this to pass custom roles to permission checking functions.
 *
 * @param roles - Array of custom role definitions
 * @returns A record indexed by role name
 *
 * @example
 * ```typescript
 * const customRoles = buildCustomRolesRecord([blogAuthor, seniorAuthor]);
 * hasPermission("blog-author", { resource: "contentEntries", action: "create" }, customRoles);
 * ```
 */
export function buildCustomRolesRecord(
	roles: Array<RoleDefinition | ExtendedRoleDefinition>,
): Record<string, RoleDefinition | ExtendedRoleDefinition> {
	const result: Record<string, RoleDefinition | ExtendedRoleDefinition> = {};
	for (const role of roles) {
		result[role.name] = role;
	}
	return result;
}

// =============================================================================
// Content-Type-Aware Permission Checking
// =============================================================================

/**
 * Options for checking permissions with content-type awareness.
 */
export interface ContentTypePermissionCheckOptions {
	/**
	 * Custom roles to include when checking permissions.
	 */
	customRoles?: Record<string, RoleDefinition | ExtendedRoleDefinition>;

	/**
	 * The content type name to check permissions for.
	 * Required when the permission may have content-type restrictions.
	 */
	contentTypeName?: string;
}

/**
 * Checks if a permission applies to a specific content type.
 *
 * @param permission - The permission to check
 * @param contentTypeName - The content type name to check against
 * @returns True if the permission applies to this content type
 */
function permissionAppliesToContentType(
	permission: ContentTypePermission,
	contentTypeName?: string,
): boolean {
	// If no content type specified, the permission applies
	if (!contentTypeName) {
		return true;
	}

	// If permission has a whitelist, check if content type is in it
	if (permission.contentTypes && permission.contentTypes.length > 0) {
		return permission.contentTypes.includes(contentTypeName);
	}

	// If permission has a blacklist, check if content type is NOT in it
	if (
		permission.excludeContentTypes &&
		permission.excludeContentTypes.length > 0
	) {
		return !permission.excludeContentTypes.includes(contentTypeName);
	}

	// No restrictions, permission applies
	return true;
}

/**
 * Extended permission check that includes content-type-specific restrictions.
 *
 * Use this function when you need to check if a role can perform an action
 * on a specific content type.
 *
 * @param roleName - The name of the role to check
 * @param permission - The permission to check (resource + action + optional scope)
 * @param options - Additional options including custom roles and content type
 * @returns True if the role has the permission for the specified content type
 *
 * @example
 * ```typescript
 * // Check if blog-author can create blog posts
 * hasContentTypePermission("blog-author", {
 *   resource: "contentEntries",
 *   action: "create",
 * }, {
 *   customRoles: allRoles,
 *   contentTypeName: "blog_post",
 * }); // true
 *
 * // Check if blog-author can create legal documents
 * hasContentTypePermission("blog-author", {
 *   resource: "contentEntries",
 *   action: "create",
 * }, {
 *   customRoles: allRoles,
 *   contentTypeName: "legal_document",
 * }); // false (restricted to blog_post only)
 * ```
 */
export function hasContentTypePermission(
	roleName: RoleName | string,
	permission: { resource: Resource; action: Action; scope?: OwnershipScope },
	options?: ContentTypePermissionCheckOptions,
): boolean {
	// Get the role definition
	const role = getRole(roleName, options?.customRoles);

	if (!role) {
		return false;
	}

	// Check if any granted permission matches
	return role.permissions.some((p) => {
		// Check basic permission match (resource, action, scope)
		if (!permissionMatches(p, permission)) {
			return false;
		}

		// Check content type restrictions
		const extendedPerm = p as ContentTypePermission;
		return permissionAppliesToContentType(
			extendedPerm,
			options?.contentTypeName,
		);
	});
}

/**
 * Gets all content types that a role can perform an action on.
 *
 * @param roleName - The name of the role
 * @param action - The action to check
 * @param options - Additional options
 * @returns Array of content type names, or ["*"] if unrestricted, or [] if no permission
 *
 * @example
 * ```typescript
 * // Get content types the blog-author can create
 * getPermittedContentTypes("blog-author", "create", { customRoles });
 * // Returns: ["blog_post"]
 *
 * // Get content types the editor can update
 * getPermittedContentTypes("editor", "update", { customRoles });
 * // Returns: ["*"] (unrestricted)
 * ```
 */
export function getPermittedContentTypes(
	roleName: RoleName | string,
	action: Action,
	options?: {
		customRoles?: Record<string, RoleDefinition | ExtendedRoleDefinition>;
	},
): string[] {
	const role = getRole(roleName, options?.customRoles);

	if (!role) {
		return [];
	}

	// Find all contentEntries permissions for this action
	const contentPerms = role.permissions.filter(
		(p) => p.resource === "contentEntries" && p.action === action,
	) as ContentTypePermission[];

	if (contentPerms.length === 0) {
		return [];
	}

	// Check if any permission is unrestricted
	const hasUnrestricted = contentPerms.some(
		(p) =>
			(!p.contentTypes || p.contentTypes.length === 0) &&
			(!p.excludeContentTypes || p.excludeContentTypes.length === 0),
	);

	if (hasUnrestricted) {
		return ["*"]; // Unrestricted access
	}

	// Collect all permitted content types
	const permitted = new Set<string>();
	for (const perm of contentPerms) {
		if (perm.contentTypes) {
			perm.contentTypes.forEach((ct) => permitted.add(ct));
		}
	}

	return Array.from(permitted);
}

/**
 * Gets all content types that a role is excluded from for an action.
 *
 * @param roleName - The name of the role
 * @param action - The action to check
 * @param options - Additional options
 * @returns Array of excluded content type names, or [] if none
 */
export function getExcludedContentTypes(
	roleName: RoleName | string,
	action: Action,
	options?: {
		customRoles?: Record<string, RoleDefinition | ExtendedRoleDefinition>;
	},
): string[] {
	const role = getRole(roleName, options?.customRoles);

	if (!role) {
		return [];
	}

	// Find all contentEntries permissions for this action
	const contentPerms = role.permissions.filter(
		(p) => p.resource === "contentEntries" && p.action === action,
	) as ContentTypePermission[];

	// Collect all excluded content types
	const excluded = new Set<string>();
	for (const perm of contentPerms) {
		if (perm.excludeContentTypes) {
			perm.excludeContentTypes.forEach((ct) => excluded.add(ct));
		}
	}

	return Array.from(excluded);
}

// =============================================================================
// Permission Factory Helpers for Custom Roles
// =============================================================================

/**
 * Helper to create a full CRUD permission set for a resource with optional content type restriction.
 *
 * @param resource - The resource to grant permissions on
 * @param options - Optional scope and content type restrictions
 * @returns Array of permissions
 *
 * @example
 * ```typescript
 * // Full CRUD on contentEntries for blog_post only
 * fullCrudForContentType("contentEntries", {
 *   contentTypes: ["blog_post"],
 *   scope: "own",
 * });
 * ```
 */
export function fullCrudForContentType(
	resource: Resource,
	options?: {
		scope?: OwnershipScope;
		contentTypes?: string[];
		excludeContentTypes?: string[];
	},
): ContentTypePermission[] {
	const scope = options?.scope ?? "all";
	const base = {
		scope,
		contentTypes: options?.contentTypes,
		excludeContentTypes: options?.excludeContentTypes,
	};

	return [
		{ resource, action: "create", ...base },
		{ resource, action: "read", ...base },
		{ resource, action: "update", ...base },
		{ resource, action: "delete", ...base },
	];
}

/**
 * Helper to create publish permissions with optional content type restriction.
 *
 * @param options - Optional scope and content type restrictions
 * @returns Array of publish/unpublish permissions
 */
export function publishPermissionsForContentType(options?: {
	scope?: OwnershipScope;
	contentTypes?: string[];
	excludeContentTypes?: string[];
}): ContentTypePermission[] {
	const scope = options?.scope ?? "all";
	const base = {
		scope,
		contentTypes: options?.contentTypes,
		excludeContentTypes: options?.excludeContentTypes,
	};

	return [
		{ resource: "contentEntries", action: "publish", ...base },
		{ resource: "contentEntries", action: "unpublish", ...base },
	];
}

/**
 * Helper to create read-only permission with optional content type restriction.
 *
 * @param resource - The resource to grant read permission on
 * @param options - Optional scope and content type restrictions
 * @returns Array with single read permission
 */
export function readOnlyForContentType(
	resource: Resource,
	options?: {
		scope?: OwnershipScope;
		contentTypes?: string[];
		excludeContentTypes?: string[];
	},
): ContentTypePermission[] {
	return [
		{
			resource,
			action: "read",
			scope: options?.scope ?? "all",
			contentTypes: options?.contentTypes,
			excludeContentTypes: options?.excludeContentTypes,
		},
	];
}

// =============================================================================
// Role Validation Utilities
// =============================================================================

/**
 * Validates a custom role configuration.
 *
 * @param config - The custom role configuration to validate
 * @returns An object with isValid boolean and optional error messages
 */
export function validateCustomRoleConfig(
	config: CustomRoleConfig,
): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Check required fields
	if (!config.name || config.name.trim() === "") {
		errors.push("Role name is required");
	}

	if (!config.displayName || config.displayName.trim() === "") {
		errors.push("Display name is required");
	}

	if (!config.description || config.description.trim() === "") {
		errors.push("Description is required");
	}

	// Check for built-in name conflict
	if (config.name && isBuiltInRole(config.name)) {
		errors.push(`Role name '${config.name}' conflicts with a built-in role`);
	}

	// Validate permissions
	if (!config.permissions || !Array.isArray(config.permissions)) {
		errors.push("Permissions must be an array");
	} else {
		for (let i = 0; i < config.permissions.length; i++) {
			const perm = config.permissions[i];

			if (!resources.includes(perm.resource)) {
				errors.push(`Permission ${i}: Invalid resource '${perm.resource}'`);
			}

			if (!actions.includes(perm.action)) {
				errors.push(`Permission ${i}: Invalid action '${perm.action}'`);
			}

			if (perm.scope && perm.scope !== "all" && perm.scope !== "own") {
				errors.push(`Permission ${i}: Invalid scope '${perm.scope}'`);
			}

			// Check for conflicting content type restrictions
			if (perm.contentTypes && perm.excludeContentTypes) {
				if (
					perm.contentTypes.length > 0 &&
					perm.excludeContentTypes.length > 0
				) {
					errors.push(
						`Permission ${i}: Cannot specify both contentTypes and excludeContentTypes`,
					);
				}
			}
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Validates an extend role configuration.
 *
 * @param config - The extend role configuration to validate
 * @param customRoles - Optional custom roles to check the base role in
 * @returns An object with isValid boolean and optional error messages
 */
export function validateExtendRoleConfig(
	config: ExtendRoleConfig,
	customRoles?: Record<string, RoleDefinition | ExtendedRoleDefinition>,
): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Check required fields
	if (!config.name || config.name.trim() === "") {
		errors.push("Role name is required");
	}

	if (!config.displayName || config.displayName.trim() === "") {
		errors.push("Display name is required");
	}

	if (!config.description || config.description.trim() === "") {
		errors.push("Description is required");
	}

	if (!config.extends || config.extends.trim() === "") {
		errors.push("Base role name (extends) is required");
	}

	// Check for self-reference
	if (config.name === config.extends) {
		errors.push("Cannot extend a role with itself");
	}

	// Check if base role exists
	if (config.extends) {
		const baseRole = getRole(config.extends, customRoles);
		if (!baseRole) {
			errors.push(`Base role '${config.extends}' does not exist`);
		}
	}

	// Validate addPermissions if provided
	if (config.addPermissions) {
		for (let i = 0; i < config.addPermissions.length; i++) {
			const perm = config.addPermissions[i];

			if (!resources.includes(perm.resource)) {
				errors.push(
					`addPermissions[${i}]: Invalid resource '${perm.resource}'`,
				);
			}

			if (!actions.includes(perm.action)) {
				errors.push(`addPermissions[${i}]: Invalid action '${perm.action}'`);
			}
		}
	}

	// Validate removePermissions if provided
	if (config.removePermissions) {
		for (let i = 0; i < config.removePermissions.length; i++) {
			const perm = config.removePermissions[i];

			if (!resources.includes(perm.resource)) {
				errors.push(
					`removePermissions[${i}]: Invalid resource '${perm.resource}'`,
				);
			}

			if (!actions.includes(perm.action)) {
				errors.push(`removePermissions[${i}]: Invalid action '${perm.action}'`);
			}
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}
