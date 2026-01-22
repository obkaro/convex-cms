import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface NavigateState {
  view: string;
  entryId?: string;
  contentTypeId?: string;
}

interface Props {
  entryId: string;
  onNavigate: (state: NavigateState) => void;
}

export function EntryDetail({ entryId, onNavigate }: Props) {
  const [locale, setLocale] = useState("en-US");

  const entry = useQuery(api.example.getEntry, {
    id: entryId,
    locale,
  });

  const localeConfig = useQuery(api.example.getLocaleConfig, {});
  const publishEntry = useMutation(api.example.publishEntry);
  const unpublishEntry = useMutation(api.example.unpublishEntry);
  const deleteEntry = useMutation(api.example.deleteEntry);

  const handlePublish = async () => {
    try {
      await publishEntry({ id: entryId, userId: "demo@example.com" });
    } catch (error) {
      console.error("Failed to publish:", error);
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishEntry({ id: entryId, userId: "demo@example.com" });
    } catch (error) {
      console.error("Failed to unpublish:", error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      try {
        await deleteEntry({
          id: entryId,
          userId: "demo@example.com",
          permanent: false,
        });
        onNavigate({ view: "entries" });
      } catch (error) {
        console.error("Failed to delete:", error);
      }
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

  if (entry === undefined) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (entry === null) {
    return (
      <div className="empty-state">
        <h3>Entry not found</h3>
        <button
          className="btn-secondary"
          onClick={() => onNavigate({ view: "entries" })}
        >
          Back to Entries
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="card-header">
        <div>
          <button
            className="btn-secondary"
            onClick={() => onNavigate({ view: "entries" })}
            style={{ marginBottom: "0.5rem" }}
          >
            Back to Entries
          </button>
          <h1>
            {entry.data?.title ||
              entry.data?.name ||
              `Entry ${entryId.slice(-6)}`}
          </h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {entry.status === "draft" && (
            <button className="btn-primary" onClick={handlePublish}>
              Publish
            </button>
          )}
          {entry.status === "published" && (
            <button className="btn-secondary" onClick={handleUnpublish}>
              Unpublish
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={() => onNavigate({ view: "versions", entryId })}
          >
            View History
          </button>
          <button className="btn-danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      {/* Status and metadata */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "1rem",
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: "0.25rem" }}>
              Status
            </label>
            <span className={getStatusBadgeClass(entry.status)}>
              {entry.status}
            </span>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.25rem" }}>
              Version
            </label>
            <span>{entry.currentVersion}</span>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.25rem" }}>
              Locale
            </label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              style={{ width: "auto", marginBottom: 0 }}
            >
              {localeConfig?.supportedLocales?.map((loc: string) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.25rem" }}>
              Created
            </label>
            <span>
              {new Date(entry._creationTime).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Entry data */}
      <div className="card">
        <h2>Content Data</h2>
        <div
          style={{
            background: "#f8f9fa",
            padding: "1rem",
            borderRadius: "6px",
            fontFamily: "monospace",
            fontSize: "0.875rem",
            whiteSpace: "pre-wrap",
            overflow: "auto",
          }}
        >
          {JSON.stringify(entry.data, null, 2)}
        </div>
      </div>

      {/* Raw entry object */}
      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Full Entry Object</h2>
        <details>
          <summary style={{ cursor: "pointer", marginBottom: "0.5rem" }}>
            Click to expand
          </summary>
          <div
            style={{
              background: "#f8f9fa",
              padding: "1rem",
              borderRadius: "6px",
              fontFamily: "monospace",
              fontSize: "0.75rem",
              whiteSpace: "pre-wrap",
              overflow: "auto",
            }}
          >
            {JSON.stringify(entry, null, 2)}
          </div>
        </details>
      </div>
    </div>
  );
}
