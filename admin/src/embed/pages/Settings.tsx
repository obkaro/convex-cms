/**
 * Embed Settings Page
 *
 * Thin wrapper around the shared SettingsPage component.
 * Provides embed navigation and API access.
 */

import { useApi } from "../contexts/ApiContext";
import { useEmbedNavigation } from "../navigation";
import { useEmbedAdapter } from "~/lib/embed-adapter";
import { SettingsPage } from "~/pages";

export function EmbedSettings() {
	const api = useApi();
	const embedNav = useEmbedNavigation();
	const navigation = useEmbedAdapter(embedNav);

	return <SettingsPage api={api} navigation={navigation} />;
}
