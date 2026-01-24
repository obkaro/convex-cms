/**
 * Embed Navigation Adapter
 *
 * Implements the AdminNavigation interface for the embed navigation system,
 * allowing shared page components to work with embedded CMS.
 */

import { useMemo, useCallback } from "react";
import type { AdminNavigation } from "./navigation";
import type { EmbedNavigationContextValue, EmbedRoute } from "../embed/navigation";

function pathToRoute(path: string): { route: EmbedRoute; params: Record<string, string> } {
  if (path === "/" || path === "") {
    return { route: "dashboard", params: {} };
  }
  if (path === "/content") {
    return { route: "content", params: {} };
  }
  if (path === "/content-types") {
    return { route: "content-types", params: {} };
  }
  if (path === "/media") {
    return { route: "media", params: {} };
  }
  if (path === "/taxonomies") {
    return { route: "taxonomies", params: {} };
  }
  if (path === "/settings") {
    return { route: "settings", params: {} };
  }
  if (path === "/trash") {
    return { route: "trash", params: {} };
  }

  const entryMatch = path.match(/^\/entries\/([^/]+)$/);
  if (entryMatch) {
    return { route: "entries", params: { entryId: entryMatch[1] } };
  }

  const typeMatch = path.match(/^\/entries\/type\/([^/]+)$/);
  if (typeMatch) {
    return { route: "entries", params: { contentTypeId: typeMatch[1] } };
  }

  const newEntryMatch = path.match(/^\/entries\/new\/([^/]+)$/);
  if (newEntryMatch) {
    return { route: "entries", params: { contentTypeId: newEntryMatch[1], action: "new" } };
  }

  return { route: "dashboard", params: {} };
}

export function useEmbedAdapter(
  embedNav: EmbedNavigationContextValue
): AdminNavigation {
  const handleNavigate = useCallback(
    (path: string, params?: Record<string, string>) => {
      const resolved = pathToRoute(path);
      const mergedParams = { ...resolved.params, ...params };
      embedNav.navigate(resolved.route, mergedParams);
    },
    [embedNav]
  );

  return useMemo(
    () => ({
      navigate: handleNavigate,
      currentRoute: embedNav.currentPath,
      params: embedNav.currentRoute.params,
      canGoBack: embedNav.canGoBack,
      goBack: embedNav.goBack,
      navigateToEntry: embedNav.navigateToEntry,
      navigateToContentType: embedNav.navigateToContentType,
      navigateToNewEntry: (contentTypeId: string) => {
        embedNav.navigate("entries", { contentTypeId, action: "new" });
      },
    }),
    [handleNavigate, embedNav]
  );
}
