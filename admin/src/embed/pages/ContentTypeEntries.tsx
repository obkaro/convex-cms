/**
 * Embed Content Type Entries Page
 *
 * Thin wrapper around the shared ContentTypeEntriesPage component.
 * Provides embed navigation and API access.
 */

import { useApi } from "../contexts/ApiContext";
import { useEmbedNavigation } from "../navigation";
import { useEmbedAdapter } from "../../lib/embed-adapter";
import { ContentTypeEntriesPage } from "../../pages";

export function EmbedContentTypeEntries({ contentTypeId }: { contentTypeId: string }) {
	const api = useApi();
	const embedNav = useEmbedNavigation();
	const navigation = useEmbedAdapter(embedNav);

	return (
		<ContentTypeEntriesPage
			api={api}
			navigation={navigation}
			contentTypeId={contentTypeId}
		/>
	);
}
