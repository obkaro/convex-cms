/**
 * Embed Media Page
 *
 * Thin wrapper around the shared MediaPage component.
 * Provides embed navigation and API access.
 */

import { useApi } from "../contexts/ApiContext";
import { useEmbedNavigation } from "../navigation";
import { useEmbedAdapter } from "../../lib/embed-adapter";
import { MediaPage } from "../../pages";

export function EmbedMedia() {
	const api = useApi();
	const embedNav = useEmbedNavigation();
	const navigation = useEmbedAdapter(embedNav);

	return <MediaPage api={api} navigation={navigation} />;
}
