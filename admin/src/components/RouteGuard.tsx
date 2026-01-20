/**
 * Route Guard Component
 *
 * Protects routes by checking authentication and permissions.
 * Shows appropriate UI for loading, unauthenticated, and unauthorized states.
 *
 * @example
 * ```tsx
 * // Protect a route requiring authentication
 * <RouteGuard>
 *   <ProtectedContent />
 * </RouteGuard>
 *
 * // Protect a route requiring specific permissions
 * <RouteGuard
 *   requiredPermission={{ resource: 'settings', action: 'manage' }}
 * >
 *   <SettingsPage />
 * </RouteGuard>
 *
 * // Require a specific role
 * <RouteGuard requiredRole="admin">
 *   <AdminOnlyContent />
 * </RouteGuard>
 * ```
 */

import type { ReactNode } from 'react';
import { useAuth, type PermissionCheck } from '../contexts/AuthContext';
import type { RoleName } from '../../../src/component/roles';

// =============================================================================
// Types
// =============================================================================

export interface RouteGuardProps {
  children: ReactNode;
  /**
   * Permission required to access this route.
   * If not specified, only authentication is required.
   */
  requiredPermission?: PermissionCheck;
  /**
   * Role required to access this route.
   * If not specified, any authenticated user with a role can access.
   */
  requiredRole?: RoleName | string;
  /**
   * Custom loading component.
   */
  loadingComponent?: ReactNode;
  /**
   * Custom unauthenticated component.
   */
  unauthenticatedComponent?: ReactNode;
  /**
   * Custom unauthorized component.
   */
  unauthorizedComponent?: ReactNode;
  /**
   * Callback when user is unauthenticated.
   */
  onUnauthenticated?: () => void;
  /**
   * Callback when user is unauthorized.
   */
  onUnauthorized?: () => void;
}

// =============================================================================
// Default Components
// =============================================================================

function DefaultLoading() {
  return (
    <div className="route-guard route-guard--loading">
      <div className="route-guard-spinner" />
      <p>Loading...</p>
    </div>
  );
}

function DefaultUnauthenticated() {
  return (
    <div className="route-guard route-guard--unauthenticated">
      <div className="route-guard-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h2>Authentication Required</h2>
      <p>Please log in to access the admin panel.</p>
    </div>
  );
}

function DefaultUnauthorized({
  requiredRole,
  requiredPermission,
}: {
  requiredRole?: RoleName | string;
  requiredPermission?: PermissionCheck;
}) {
  return (
    <div className="route-guard route-guard--unauthorized">
      <div className="route-guard-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      </div>
      <h2>Access Denied</h2>
      <p>You don't have permission to access this page.</p>
      {requiredRole && (
        <p className="route-guard-detail">
          Required role: <strong>{requiredRole}</strong>
        </p>
      )}
      {requiredPermission && (
        <p className="route-guard-detail">
          Required permission:{' '}
          <strong>
            {requiredPermission.action} on {requiredPermission.resource}
          </strong>
        </p>
      )}
    </div>
  );
}

function DefaultError({ error }: { error: string }) {
  return (
    <div className="route-guard route-guard--error">
      <div className="route-guard-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2>Authentication Error</h2>
      <p>{error}</p>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Route Guard Component
 *
 * Wraps protected content and handles authentication/authorization checks.
 */
export function RouteGuard({
  children,
  requiredPermission,
  requiredRole,
  loadingComponent,
  unauthenticatedComponent,
  unauthorizedComponent,
  onUnauthenticated,
  onUnauthorized,
}: RouteGuardProps) {
  const { authState, role, checkPermission, error } = useAuth();

  // Show loading state
  if (authState === 'loading') {
    return <>{loadingComponent ?? <DefaultLoading />}</>;
  }

  // Show error state
  if (authState === 'error') {
    return <DefaultError error={error ?? 'An error occurred'} />;
  }

  // Handle unauthenticated state
  if (authState === 'unauthenticated') {
    onUnauthenticated?.();
    return <>{unauthenticatedComponent ?? <DefaultUnauthenticated />}</>;
  }

  // Check if user has any role (must be assigned to CMS)
  if (!role) {
    onUnauthorized?.();
    return (
      <>
        {unauthorizedComponent ?? (
          <DefaultUnauthorized
            requiredRole={requiredRole}
            requiredPermission={requiredPermission}
          />
        )}
      </>
    );
  }

  // Check required role
  if (requiredRole && role !== requiredRole) {
    onUnauthorized?.();
    return (
      <>
        {unauthorizedComponent ?? (
          <DefaultUnauthorized
            requiredRole={requiredRole}
            requiredPermission={requiredPermission}
          />
        )}
      </>
    );
  }

  // Check required permission
  if (requiredPermission && !checkPermission(requiredPermission)) {
    onUnauthorized?.();
    return (
      <>
        {unauthorizedComponent ?? (
          <DefaultUnauthorized
            requiredRole={requiredRole}
            requiredPermission={requiredPermission}
          />
        )}
      </>
    );
  }

  // User is authorized, render children
  return <>{children}</>;
}

export default RouteGuard;
