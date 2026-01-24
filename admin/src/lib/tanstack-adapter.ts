/**
 * TanStack Router Adapter
 *
 * Implements the AdminNavigation interface for TanStack Router,
 * allowing shared page components to work with CLI routes.
 */

import { useNavigate, useLocation, useParams } from "@tanstack/react-router";
import { useMemo, useCallback } from "react";
import type { AdminNavigation } from "./navigation";

export function useTanStackNavigation(): AdminNavigation {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams({ strict: false }) as Record<string, string>;

  const handleNavigate = useCallback(
    (route: string, routeParams?: Record<string, string>) => {
      let path = route;
      if (routeParams) {
        for (const [key, value] of Object.entries(routeParams)) {
          path = path.replace(`:${key}`, value).replace(`$${key}`, value);
        }
      }
      navigate({ to: path as any });
    },
    [navigate]
  );

  const navigateToEntry = useCallback(
    (entryId: string) => {
      navigate({ to: "/entries/$entryId", params: { entryId } });
    },
    [navigate]
  );

  const navigateToContentType = useCallback(
    (contentTypeId: string) => {
      navigate({
        to: "/entries/type/$contentTypeId",
        params: { contentTypeId },
      });
    },
    [navigate]
  );

  const navigateToNewEntry = useCallback(
    (contentTypeId: string) => {
      navigate({
        to: "/entries/new/$contentTypeId",
        params: { contentTypeId },
      });
    },
    [navigate]
  );

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  return useMemo(
    () => ({
      navigate: handleNavigate,
      currentRoute: location.pathname,
      params: params ?? {},
      canGoBack: window.history.length > 1,
      goBack,
      navigateToEntry,
      navigateToContentType,
      navigateToNewEntry,
    }),
    [
      handleNavigate,
      location.pathname,
      params,
      goBack,
      navigateToEntry,
      navigateToContentType,
      navigateToNewEntry,
    ]
  );
}
