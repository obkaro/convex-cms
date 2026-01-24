/**
 * Embed Trash Page
 *
 * Thin wrapper around the shared TrashPage component.
 * Provides embed navigation and API access.
 */

import { useApi } from "../contexts/ApiContext";
import { useEmbedNavigation } from "../navigation";
import { useEmbedAdapter } from "~/lib/embed-adapter";
import { TrashPage } from "~/pages";

export function EmbedTrash() {
	const api = useApi();
	const embedNav = useEmbedNavigation();
	const navigation = useEmbedAdapter(embedNav);

	return <TrashPage api={api} navigation={navigation} />;
}
