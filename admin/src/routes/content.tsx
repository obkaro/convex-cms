/**
 * Content Route (CLI)
 *
 * Thin wrapper around the shared ContentPage component.
 * Provides TanStack Router integration and API access.
 */

import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { ContentPage } from "~/pages";
import { useTanStackNavigation } from "~/lib/tanstack-adapter";

export const Route = createFileRoute("/content")({
  component: ContentRoute,
});

function ContentRoute() {
  const navigation = useTanStackNavigation();
  return <ContentPage api={api} navigation={navigation} />;
}
