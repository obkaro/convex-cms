/**
 * usePermissions Hook
 *
 * Provides permission checking utilities for UI components.
 * Enables showing/hiding or enabling/disabling features based on user permissions.
 *
 * @example
 * ```tsx
 * function ContentActions({ entry }) {
 *   const { canEdit, canPublish, canDelete } = usePermissions();
 *
 *   return (
 *     <div>
 *       {canEdit('contentEntries') && <button>Edit</button>}
 *       {canPublish() && <button>Publish</button>}
 *       {canDelete('contentEntries') && <button>Delete</button>}
 *     </div>
 *   );
 * }
 * ```
 */

import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  hasPermission,
  canAccessResource,
  getResourcePermissions,
  type Resource,
  type Action,
  type OwnershipScope,
  type Permission,
} from '../../../src/component/index';

// =============================================================================
// Types
// =============================================================================

export interface UsePermissionsResult {
  /** Current user's role */
  role: string | null;
  /** Whether user is authenticated with a valid role */
  hasRole: boolean;
  /** Check a specific permission */
  check: (
    resource: Resource,
    action: Action,
    scope?: OwnershipScope
  ) => boolean;
  /** Check if user can access a resource at all */
  canAccess: (resource: Resource) => boolean;
  /** Check if user can create resources of a type */
  canCreate: (resource: Resource) => boolean;
  /** Check if user can read resources of a type */
  canRead: (resource: Resource, scope?: OwnershipScope) => boolean;
  /** Check if user can update resources of a type */
  canUpdate: (resource: Resource, scope?: OwnershipScope) => boolean;
  /** Check if user can delete resources of a type */
  canDelete: (resource: Resource, scope?: OwnershipScope) => boolean;
  /** Check if user can publish content */
  canPublish: (scope?: OwnershipScope) => boolean;
  /** Check if user can unpublish content */
  canUnpublish: (scope?: OwnershipScope) => boolean;
  /** Check if user can manage settings */
  canManageSettings: () => boolean;
  /** Check if user can manage content types */
  canManageContentTypes: () => boolean;
  /** Get all permissions for a resource */
  getPermissions: (resource: Resource) => Permission[];
  /** Check if user is an admin */
  isAdmin: boolean;
  /** Check if user is at least an editor */
  isEditor: boolean;
  /** Check if user is at least an author */
  isAuthor: boolean;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for checking user permissions in UI components.
 *
 * Provides convenient methods for common permission checks,
 * enabling permission-based UI rendering.
 */
export function usePermissions(): UsePermissionsResult {
  const { role } = useAuth();

  return useMemo(() => {
    const hasRole = !!role;

    /**
     * Check a specific permission.
     */
    const check = (
      resource: Resource,
      action: Action,
      scope?: OwnershipScope
    ): boolean => {
      if (!role) return false;
      return hasPermission(role, { resource, action, scope });
    };

    /**
     * Check if user can access a resource at all.
     */
    const canAccess = (resource: Resource): boolean => {
      if (!role) return false;
      return canAccessResource(role, resource);
    };

    /**
     * Check if user can create resources.
     */
    const canCreate = (resource: Resource): boolean => {
      return check(resource, 'create');
    };

    /**
     * Check if user can read resources.
     */
    const canRead = (resource: Resource, scope?: OwnershipScope): boolean => {
      return check(resource, 'read', scope);
    };

    /**
     * Check if user can update resources.
     */
    const canUpdate = (resource: Resource, scope?: OwnershipScope): boolean => {
      return check(resource, 'update', scope);
    };

    /**
     * Check if user can delete resources.
     */
    const canDelete = (resource: Resource, scope?: OwnershipScope): boolean => {
      return check(resource, 'delete', scope);
    };

    /**
     * Check if user can publish content.
     */
    const canPublish = (scope?: OwnershipScope): boolean => {
      return check('contentEntries', 'publish', scope);
    };

    /**
     * Check if user can unpublish content.
     */
    const canUnpublish = (scope?: OwnershipScope): boolean => {
      return check('contentEntries', 'unpublish', scope);
    };

    /**
     * Check if user can manage settings.
     */
    const canManageSettings = (): boolean => {
      return check('settings', 'manage');
    };

    /**
     * Check if user can manage content types.
     */
    const canManageContentTypes = (): boolean => {
      // Need create, update, or delete on content types
      return (
        check('contentTypes', 'create') ||
        check('contentTypes', 'update') ||
        check('contentTypes', 'delete')
      );
    };

    /**
     * Get all permissions for a resource.
     */
    const getPermissions = (resource: Resource): Permission[] => {
      if (!role) return [];
      return getResourcePermissions(role, resource);
    };

    /**
     * Role-based checks for convenience.
     */
    const isAdmin = role === 'admin';
    const isEditor = role === 'admin' || role === 'editor';
    const isAuthor = role === 'admin' || role === 'editor' || role === 'author';

    return {
      role,
      hasRole,
      check,
      canAccess,
      canCreate,
      canRead,
      canUpdate,
      canDelete,
      canPublish,
      canUnpublish,
      canManageSettings,
      canManageContentTypes,
      getPermissions,
      isAdmin,
      isEditor,
      isAuthor,
    };
  }, [role]);
}

export default usePermissions;
