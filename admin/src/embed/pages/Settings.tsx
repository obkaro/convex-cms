/**
 * Embed Settings Page
 *
 * Thin wrapper around the shared SettingsPage component.
 * Provides embed navigation and API access.
 *
 * Note: Requires the settings namespace to be exported from defineAdminAPI.
 * This feature is currently in development.
 */

import { useApi } from "../contexts/ApiContext";
import { useEmbedNavigation } from "../navigation";
import { useEmbedAdapter } from "../../lib/embed-adapter";
import { SettingsPage, type SettingsPageProps } from "../../pages";

export function EmbedSettings() {
	const api = useApi();
	const embedNav = useEmbedNavigation();
	const navigation = useEmbedAdapter(embedNav);

	return <SettingsPage api={api as SettingsPageProps["api"]} navigation={navigation} />;
}
