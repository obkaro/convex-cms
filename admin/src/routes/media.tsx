/**
 * Media Route (CLI)
 *
 * Thin wrapper around the shared MediaPage component.
 * Provides TanStack Router integration and API access.
 */

import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { MediaPage } from "~/pages";
import { useTanStackNavigation } from "~/lib/tanstack-adapter";
import { useSettingsConfig } from "~/contexts";

export const Route = createFileRoute("/media")({
	component: MediaRoute,
});

function MediaRoute() {
	const navigation = useTanStackNavigation();
	const { settings } = useSettingsConfig();
	return (
		<MediaPage api={api.admin} navigation={navigation} settings={settings} />
	);
}
