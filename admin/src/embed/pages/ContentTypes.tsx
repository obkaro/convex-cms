/**
 * Embed Content Types Page
 *
 * Thin wrapper around the shared ContentTypesPage component.
 * Provides embed navigation and API access.
 */

import { useApi } from "../contexts/ApiContext";
import { useEmbedNavigation } from "../navigation";
import { useEmbedAdapter } from "~/lib/embed-adapter";
import { ContentTypesPage } from "~/pages";

export function EmbedContentTypes() {
  const api = useApi();
  const embedNav = useEmbedNavigation();
  const navigation = useEmbedAdapter(embedNav);

  return <ContentTypesPage api={api as any} navigation={navigation} />;
}
