/**
 * Taxonomies Route (CLI)
 *
 * Thin wrapper around the shared TaxonomiesPage component.
 * Provides TanStack Router integration and API access.
 */

import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { TaxonomiesPage } from "~/pages";
import { useTanStackNavigation } from "~/lib/tanstack-adapter";

export const Route = createFileRoute("/taxonomies")({
	component: TaxonomiesRoute,
});

function TaxonomiesRoute() {
	const navigation = useTanStackNavigation();
	return <TaxonomiesPage api={api.admin} navigation={navigation} />;
}
