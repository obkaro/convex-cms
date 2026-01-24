/**
 * Embed Dashboard Page
 *
 * Thin wrapper around the shared DashboardPage component.
 * Provides embed navigation and API access.
 */

import { useApi } from "../contexts/ApiContext";
import { useEmbedNavigation } from "../navigation";
import { useEmbedAdapter } from "~/lib/embed-adapter";
import { DashboardPage } from "~/pages";

export function EmbedDashboard() {
  const api = useApi();
  const embedNav = useEmbedNavigation();
  const navigation = useEmbedAdapter(embedNav);

  return <DashboardPage api={api as any} navigation={navigation} />;
}
