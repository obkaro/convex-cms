/**
 * Embed Trash Page
 *
 * Thin wrapper around the shared TrashPage component.
 * Provides embed navigation and API access.
 *
 * Note: Requires the trash and bulkOperations namespaces to be exported
 * from defineAdminAPI. This feature is currently in development.
 */

import { useApi } from "../contexts/ApiContext";
import { useEmbedNavigation } from "../navigation";
import { useEmbedAdapter } from "../../lib/embed-adapter";
import { TrashPage, type TrashPageProps } from "../../pages";

export function EmbedTrash() {
	const api = useApi();
	const embedNav = useEmbedNavigation();
	const navigation = useEmbedAdapter(embedNav);

	return <TrashPage api={api as TrashPageProps["api"]} navigation={navigation} />;
}
