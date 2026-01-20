/**
 * Authentication Context Provider
 *
 * This module provides authentication state management for the admin UI.
 * It integrates with the parent app's auth system via configurable hooks,
 * allowing the CMS to work with any authentication provider.
 *
 * The context provides:
 * - Current user information (id, name, email, role)
 * - Authentication state (loading, authenticated, error)
 * - Permission checking utilities
 *
 * @example
 * ```tsx
 * // In app setup, provide auth hooks
 * <AuthProvider
 *   getUser={async () => ({ id: 'user_123', name: 'John', email: 'john@example.com' })}
 *   getUserRole={async ({ userId }) => 'editor'}
 * >
 *   <App />
 * </AuthProvider>
 *
 * // In components, use the auth context
 * const { user, role, isAuthenticated, isLoading } = useAuth();
 * ```
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  hasPermission,
  type RoleName,
  type Resource,
  type Action,
  type OwnershipScope,
} from '../../../src/component/roles';

// =============================================================================
// Types
// =============================================================================

/**
 * User information from the parent app's auth system.
 */
export interface AuthUser {
  /** Unique user identifier */
  id: string;
  /** Display name */
  name?: string;
  /** Email address */
  email?: string;
  /** Avatar URL */
  avatarUrl?: string;
}

/**
 * Context for getting a user's role.
 */
export interface GetUserRoleContext {
  userId: string;
}

/**
 * Hook to get the current authenticated user.
 * Returns null if not authenticated.
 */
export type GetUserHook = () => Promise<AuthUser | null> | AuthUser | null;

/**
 * Hook to get a user's role from the parent app.
 * Should return the role name (e.g., 'admin', 'editor') or null if no role.
 */
export type GetUserRoleHook = (
  context: GetUserRoleContext
) => Promise<string | null> | string | null;

/**
 * Hook to handle logout.
 */
export type LogoutHook = () => Promise<void> | void;

/**
 * Authentication state.
 */
export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

/**
 * Permission check parameters.
 */
export interface PermissionCheck {
  resource: Resource;
  action: Action;
  scope?: OwnershipScope;
}

/**
 * Auth context value provided to consumers.
 */
export interface AuthContextValue {
  /** Current authenticated user, or null if not authenticated */
  user: AuthUser | null;
  /** Current user's role in the CMS, or null if no role assigned */
  role: RoleName | string | null;
  /** Current authentication state */
  authState: AuthState;
  /** Whether authentication is still loading */
  isLoading: boolean;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Error message if authentication failed */
  error: string | null;
  /** Check if the current user has a specific permission */
  checkPermission: (permission: PermissionCheck) => boolean;
  /** Logout the current user */
  logout: () => Promise<void>;
  /** Refresh authentication state */
  refresh: () => Promise<void>;
}

/**
 * Props for the AuthProvider component.
 */
export interface AuthProviderProps {
  children: ReactNode;
  /**
   * Hook to get the current authenticated user.
   * This should integrate with your auth provider (Clerk, Auth0, etc.).
   */
  getUser: GetUserHook;
  /**
   * Hook to get a user's CMS role.
   * This maps the authenticated user to a CMS role.
   */
  getUserRole: GetUserRoleHook;
  /**
   * Hook to handle logout.
   * Optional - if not provided, logout will just clear local state.
   */
  onLogout?: LogoutHook;
  /**
   * Whether to automatically redirect to login when unauthenticated.
   * Defaults to false.
   */
  autoRedirectToLogin?: boolean;
  /**
   * URL to redirect to for login.
   * Only used if autoRedirectToLogin is true.
   */
  loginUrl?: string;
}

// =============================================================================
// Context
// =============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Authentication Provider Component
 *
 * Wraps the application and provides authentication state to all children.
 * Integrates with the parent app's auth system via hooks.
 */
export function AuthProvider({
  children,
  getUser,
  getUserRole,
  onLogout,
  autoRedirectToLogin = false,
  loginUrl = '/login',
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<RoleName | string | null>(null);
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [error, setError] = useState<string | null>(null);

  /**
   * Load authentication state.
   */
  const loadAuth = useCallback(async () => {
    setAuthState('loading');
    setError(null);

    try {
      // Get the current user from the parent app's auth system
      const currentUser = await getUser();

      if (!currentUser) {
        setUser(null);
        setRole(null);
        setAuthState('unauthenticated');

        // Optionally redirect to login
        if (autoRedirectToLogin && typeof window !== 'undefined') {
          window.location.href = loginUrl;
        }
        return;
      }

      // Get the user's CMS role
      const userRole = await getUserRole({ userId: currentUser.id });

      setUser(currentUser);
      setRole(userRole);
      setAuthState('authenticated');
    } catch (err) {
      console.error('Authentication error:', err);
      setUser(null);
      setRole(null);
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setAuthState('error');
    }
  }, [getUser, getUserRole, autoRedirectToLogin, loginUrl]);

  /**
   * Load auth on mount.
   */
  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  /**
   * Check if the current user has a specific permission.
   */
  const checkPermission = useCallback(
    (permission: PermissionCheck): boolean => {
      if (!role) {
        return false;
      }
      return hasPermission(role, permission);
    },
    [role]
  );

  /**
   * Logout the current user.
   */
  const logout = useCallback(async () => {
    try {
      if (onLogout) {
        await onLogout();
      }
      setUser(null);
      setRole(null);
      setAuthState('unauthenticated');

      if (autoRedirectToLogin && typeof window !== 'undefined') {
        window.location.href = loginUrl;
      }
    } catch (err) {
      console.error('Logout error:', err);
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  }, [onLogout, autoRedirectToLogin, loginUrl]);

  /**
   * Refresh authentication state.
   */
  const refresh = useCallback(async () => {
    await loadAuth();
  }, [loadAuth]);

  const value: AuthContextValue = {
    user,
    role,
    authState,
    isLoading: authState === 'loading',
    isAuthenticated: authState === 'authenticated',
    error,
    checkPermission,
    logout,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access authentication state.
 *
 * @throws Error if used outside of AuthProvider
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { user, role, isAuthenticated, logout } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <LoginPrompt />;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user.name}!</p>
 *       <p>Role: {role}</p>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// =============================================================================
// Default Export
// =============================================================================

export default AuthProvider;
