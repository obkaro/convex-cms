/**
 * Embed Taxonomies Page
 *
 * Thin wrapper around the shared TaxonomiesPage component.
 * Provides embed navigation and API access.
 *
 * Note: Requires the taxonomies namespace to be exported from defineAdminAPI.
 * This feature is currently in development.
 */

import { useApi } from "../contexts/ApiContext";
import { useEmbedNavigation } from "../navigation";
import { useEmbedAdapter } from "../../lib/embed-adapter";
import { TaxonomiesPage, type TaxonomiesPageProps } from "../../pages";

export function EmbedTaxonomies() {
	const api = useApi();
	const embedNav = useEmbedNavigation();
	const navigation = useEmbedAdapter(embedNav);

	return <TaxonomiesPage api={api as TaxonomiesPageProps["api"]} navigation={navigation} />;
}
