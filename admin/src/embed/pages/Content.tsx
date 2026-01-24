/**
 * Embed Content Page
 *
 * Thin wrapper around the shared ContentPage component.
 * Provides embed navigation and API access.
 */

import { useApi } from "../contexts/ApiContext";
import { useEmbedNavigation } from "../navigation";
import { useEmbedAdapter } from "~/lib/embed-adapter";
import { ContentPage } from "~/pages";

export function EmbedContent() {
	const api = useApi();
	const embedNav = useEmbedNavigation();
	const navigation = useEmbedAdapter(embedNav);

	return <ContentPage api={api} navigation={navigation} />;
}
