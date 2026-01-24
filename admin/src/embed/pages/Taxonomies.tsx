/**
 * Embed Taxonomies Page
 *
 * Thin wrapper around the shared TaxonomiesPage component.
 * Provides embed navigation and API access.
 */

import { useApi } from "../contexts/ApiContext";
import { useEmbedNavigation } from "../navigation";
import { useEmbedAdapter } from "~/lib/embed-adapter";
import { TaxonomiesPage } from "~/pages";

export function EmbedTaxonomies() {
	const api = useApi();
	const embedNav = useEmbedNavigation();
	const navigation = useEmbedAdapter(embedNav);

	return <TaxonomiesPage api={api} navigation={navigation} />;
}
