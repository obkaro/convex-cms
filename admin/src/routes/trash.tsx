/**
 * Trash Route (CLI)
 *
 * Thin wrapper around the shared TrashPage component.
 * Provides TanStack Router integration and API access.
 */

import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { TrashPage } from "~/pages";
import { useTanStackNavigation } from "~/lib/tanstack-adapter";

export const Route = createFileRoute("/trash")({
	component: TrashRoute,
});

function TrashRoute() {
	const navigation = useTanStackNavigation();
	return <TrashPage api={api.admin} navigation={navigation} />;
}
