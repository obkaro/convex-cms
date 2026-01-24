/**
 * Dashboard Route (CLI)
 *
 * Thin wrapper around the shared DashboardPage component.
 * Provides TanStack Router integration and API access.
 */

import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { DashboardPage } from "~/pages";
import { useTanStackNavigation } from "~/lib/tanstack-adapter";

export const Route = createFileRoute("/")({
	component: DashboardRoute,
});

function DashboardRoute() {
	const navigation = useTanStackNavigation();
	return <DashboardPage api={api.admin} navigation={navigation} />;
}
