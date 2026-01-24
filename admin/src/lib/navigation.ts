/**
 * Unified Navigation Interface
 *
 * Provides router-agnostic navigation that works with both TanStack Router (CLI)
 * and the custom embed navigation system.
 */

export const ROUTES = {
  DASHBOARD: "/",
  CONTENT: "/content",
  CONTENT_TYPES: "/content-types",
  MEDIA: "/media",
  SETTINGS: "/settings",
  TRASH: "/trash",
  TAXONOMIES: "/taxonomies",
  ENTRY: "/entries/:entryId",
  ENTRIES_BY_TYPE: "/entries/type/:contentTypeId",
  NEW_ENTRY: "/entries/new/:contentTypeId",
} as const;

export type RouteKey = keyof typeof ROUTES;

export interface AdminNavigation {
  navigate: (route: string, params?: Record<string, string>) => void;
  currentRoute: string;
  params: Record<string, string>;
  canGoBack: boolean;
  goBack: () => void;
  navigateToEntry: (entryId: string) => void;
  navigateToContentType: (contentTypeId: string) => void;
  navigateToNewEntry: (contentTypeId: string) => void;
}

export function buildRoute(
  template: string,
  params: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, value);
  }
  return result;
}
