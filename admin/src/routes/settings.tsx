/**
 * Settings Route (CLI)
 *
 * Thin wrapper around the shared SettingsPage component.
 * Provides TanStack Router integration and API access.
 */

import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { SettingsPage } from "~/pages";
import { useTanStackNavigation } from "~/lib/tanstack-adapter";

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  const navigation = useTanStackNavigation();
  return <SettingsPage api={api} navigation={navigation} />;
}
