import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface NavigateState {
  view: string;
  entryId?: string;
  contentTypeId?: string;
}

interface Props {
  contentTypeId?: string;
  onNavigate: (state: NavigateState) => void;
}

export function EntryList({ contentTypeId, onNavigate }: Props) {
  const [statusFilter, setStatusFilter] = useState<
    "draft" | "published" | "archived" | undefined
  >(undefined);
  const [locale, setLocale] = useState("en-US");

  const entries = useQuery(api.example.listEntries, {
    contentTypeId,
    status: statusFilter,
    locale,
    limit: 20,
  });

  const localeConfig = useQuery(api.example.getLocaleConfig, {});
  const publishEntry = useMutation(api.example.publishEntry);
  const unpublishEntry = useMutation(api.example.unpublishEntry);

  const handlePublish = async (entryId: string) => {
    try {
      await publishEntry({ id: entryId, userId: "demo@example.com" });
    } catch (error) {
      console.error("Failed to publish:", error);
    }
  };

  const handleUnpublish = async (entryId: string) => {
    try {
      await unpublishEntry({ id: entryId, userId: "demo@example.com" });
    } catch (error) {
      console.error("Failed to unpublish:", error);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "published":
        return "badge badge-published";
      case "scheduled":
        return "badge badge-scheduled";
      case "archived":
        return "badge badge-archived";
      default:
        return "badge badge-draft";
    }
  };

  if (entries === undefined) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="card-header">
        <h1>Content Entries</h1>
      </div>

      {/* Filters */}
      <div
        className="card"
        style={{ display: "flex", gap: "1rem", alignItems: "center" }}
      >
        <div>
          <label>Status</label>
          <select
            value={statusFilter || ""}
            onChange={(e) =>
              setStatusFilter(
                (e.target.value as "draft" | "published" | "archived") ||
                  undefined
              )
            }
            style={{ width: "auto" }}
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div>
          <label>Locale</label>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            style={{ width: "auto" }}
          >
            {localeConfig?.supportedLocales?.map((loc: string) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Entry List */}
      {entries.page?.length === 0 ? (
        <div className="empty-state">
          <h3>No entries found</h3>
          <p>Create content entries using the API or create mutations.</p>
        </div>
      ) : (
        <div className="list">
          {entries.page?.map((entry: any) => (
            <div key={entry._id} className="list-item">
              <div>
                <strong>
                  {entry.data?.title ||
                    entry.data?.name ||
                    `Entry ${entry._id.slice(-6)}`}
                </strong>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#6c757d",
                    marginTop: "0.25rem",
                  }}
                >
                  Version {entry.currentVersion} | {entry.locale || "en-US"}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span className={getStatusBadgeClass(entry.status)}>
                  {entry.status}
                </span>
                {entry.status === "draft" && (
                  <button
                    className="btn-primary"
                    onClick={() => handlePublish(entry._id)}
                  >
                    Publish
                  </button>
                )}
                {entry.status === "published" && (
                  <button
                    className="btn-secondary"
                    onClick={() => handleUnpublish(entry._id)}
                  >
                    Unpublish
                  </button>
                )}
                <button
                  className="btn-secondary"
                  onClick={() =>
                    onNavigate({ view: "entry-detail", entryId: entry._id })
                  }
                >
                  View
                </button>
                <button
                  className="btn-secondary"
                  onClick={() =>
                    onNavigate({ view: "versions", entryId: entry._id })
                  }
                >
                  History
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination info */}
      {entries.continueCursor && (
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <button className="btn-secondary">Load More</button>
        </div>
      )}
    </div>
  );
}
