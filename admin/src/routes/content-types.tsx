/**
 * Content Types Route (CLI)
 *
 * Thin wrapper around the shared ContentTypesPage component.
 * Provides TanStack Router integration and API access.
 */

import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { ContentTypesPage } from "~/pages";
import { useTanStackNavigation } from "~/lib/tanstack-adapter";

export const Route = createFileRoute("/content-types")({
	component: ContentTypesRoute,
});

function ContentTypesRoute() {
	const navigation = useTanStackNavigation();
	return <ContentTypesPage api={api.admin} navigation={navigation} />;
}
