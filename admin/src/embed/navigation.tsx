/**
 * Embed Navigation Context
 *
 * Provides router-agnostic navigation for the embedded CMS admin.
 * This allows the embed to manage its own routing state without
 * depending on TanStack Router or any specific router implementation.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type EmbedRoute =
  | "dashboard"
  | "content"
  | "content-types"
  | "media"
  | "taxonomies"
  | "users"
  | "settings"
  | "trash"
  | "entries";

export interface EmbedRouteState {
  route: EmbedRoute;
  params: Record<string, string>;
}

export interface EmbedNavigationContextValue {
  currentRoute: EmbedRouteState;
  currentPath: string;
  navigate: (route: EmbedRoute, params?: Record<string, string>) => void;
  navigateToEntry: (entryId: string) => void;
  navigateToContentType: (contentTypeId: string) => void;
  navigateToNewEntry: (contentTypeId: string) => void;
  goBack: () => void;
  canGoBack: boolean;
}

const EmbedNavigationContext = createContext<EmbedNavigationContextValue | null>(
  null
);

function routeToPath(route: EmbedRoute, params: Record<string, string>): string {
  switch (route) {
    case "dashboard":
      return "/";
    case "content":
      return "/content";
    case "content-types":
      return "/content-types";
    case "media":
      return "/media";
    case "taxonomies":
      return "/taxonomies";
    case "users":
      return "/users";
    case "settings":
      return "/settings";
    case "trash":
      return "/trash";
    case "entries": {
      if (params.entryId) return `/entries/${params.entryId}`;
      if (params.contentTypeId) return `/entries/type/${params.contentTypeId}`;
      return "/content";
    }
    default:
      return "/";
  }
}

export interface EmbedNavigationProviderProps {
  children: ReactNode;
  initialRoute?: EmbedRoute;
  basePath?: string;
  onNavigate?: (path: string, params: Record<string, string>) => void;
}

export function EmbedNavigationProvider({
  children,
  initialRoute = "dashboard",
  basePath = "/admin",
  onNavigate,
}: EmbedNavigationProviderProps) {
  const [history, setHistory] = useState<EmbedRouteState[]>([
    { route: initialRoute, params: {} },
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentRoute = history[currentIndex];
  const currentPath = basePath + routeToPath(currentRoute.route, currentRoute.params);

  const navigate = useCallback(
    (route: EmbedRoute, params: Record<string, string> = {}) => {
      const newState = { route, params };
      const newHistory = [...history.slice(0, currentIndex + 1), newState];
      setHistory(newHistory);
      setCurrentIndex(newHistory.length - 1);

      if (onNavigate) {
        onNavigate(routeToPath(route, params), params);
      }
    },
    [history, currentIndex, onNavigate]
  );

  const navigateToEntry = useCallback(
    (entryId: string) => {
      navigate("entries", { entryId });
    },
    [navigate]
  );

  const navigateToContentType = useCallback(
    (contentTypeId: string) => {
      navigate("entries", { contentTypeId });
    },
    [navigate]
  );

  const navigateToNewEntry = useCallback(
    (contentTypeId: string) => {
      navigate("entries", { contentTypeId, action: "new" });
    },
    [navigate]
  );

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const value: EmbedNavigationContextValue = {
    currentRoute,
    currentPath,
    navigate,
    navigateToEntry,
    navigateToContentType,
    navigateToNewEntry,
    goBack,
    canGoBack: currentIndex > 0,
  };

  return (
    <EmbedNavigationContext.Provider value={value}>
      {children}
    </EmbedNavigationContext.Provider>
  );
}

export function useEmbedNavigation(): EmbedNavigationContextValue {
  const context = useContext(EmbedNavigationContext);
  if (!context) {
    throw new Error(
      "useEmbedNavigation must be used within EmbedNavigationProvider"
    );
  }
  return context;
}

export function useEmbedParams(): Record<string, string> {
  const { currentRoute } = useEmbedNavigation();
  return currentRoute.params;
}

export function useEmbedRoute(): EmbedRoute {
  const { currentRoute } = useEmbedNavigation();
  return currentRoute.route;
}

export interface EmbedLinkProps {
  to: EmbedRoute;
  params?: Record<string, string>;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
}

export function EmbedLink({
  to,
  params = {},
  children,
  className = "",
  activeClassName = "",
}: EmbedLinkProps) {
  const { navigate, currentRoute } = useEmbedNavigation();

  const isActive = currentRoute.route === to;
  const finalClassName = `${className} ${isActive ? activeClassName : ""}`.trim();

  return (
    <button
      type="button"
      onClick={() => navigate(to, params)}
      className={finalClassName}
    >
      {children}
    </button>
  );
}
