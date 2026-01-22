import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface NavigateState {
  view: string;
  entryId?: string;
  contentTypeId?: string;
}

interface Props {
  entryId?: string;
  onNavigate: (state: NavigateState) => void;
}

export function VersionHistory({ entryId, onNavigate }: Props) {
  const [selectedVersionA, setSelectedVersionA] = useState<number | null>(null);
  const [selectedVersionB, setSelectedVersionB] = useState<number | null>(null);

  const versions = useQuery(
    api.example.getVersionHistory,
    entryId ? { entryId, limit: 20 } : "skip"
  );

  const comparison = useQuery(
    api.example.compareVersions,
    entryId && selectedVersionA !== null && selectedVersionB !== null
      ? { entryId, versionA: selectedVersionA, versionB: selectedVersionB }
      : "skip"
  );

  const rollback = useMutation(api.example.rollbackToVersion);

  const handleRollback = async (versionNumber: number) => {
    if (!entryId) return;
    if (
      window.confirm(
        `Are you sure you want to rollback to version ${versionNumber}?`
      )
    ) {
      try {
        await rollback({
          entryId,
          versionNumber,
          userId: "demo@example.com",
        });
      } catch (error) {
        console.error("Rollback failed:", error);
      }
    }
  };

  const handleCompare = (versionNumber: number) => {
    if (selectedVersionA === null) {
      setSelectedVersionA(versionNumber);
    } else if (selectedVersionB === null) {
      setSelectedVersionB(versionNumber);
    } else {
      // Reset and start new comparison
      setSelectedVersionA(versionNumber);
      setSelectedVersionB(null);
    }
  };

  if (!entryId) {
    return (
      <div>
        <h1>Version History</h1>
        <div className="empty-state">
          <h3>No entry selected</h3>
          <p>Select an entry from the list to view its version history.</p>
          <button
            className="btn-secondary"
            onClick={() => onNavigate({ view: "entries" })}
          >
            Browse Entries
          </button>
        </div>
      </div>
    );
  }

  if (versions === undefined) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="card-header">
        <div>
          <button
            className="btn-secondary"
            onClick={() => onNavigate({ view: "entry-detail", entryId })}
            style={{ marginBottom: "0.5rem" }}
          >
            Back to Entry
          </button>
          <h1>Version History</h1>
        </div>
        {(selectedVersionA !== null || selectedVersionB !== null) && (
          <button
            className="btn-secondary"
            onClick={() => {
              setSelectedVersionA(null);
              setSelectedVersionB(null);
            }}
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Version comparison */}
      {selectedVersionA !== null && selectedVersionB !== null && comparison && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h2>
            Comparing Version {selectedVersionA} vs Version {selectedVersionB}
          </h2>
          <div className="version-diff">
            {comparison.changes?.map((change: any, index: number) => (
              <div
                key={index}
                className={
                  change.type === "added"
                    ? "diff-added"
                    : change.type === "removed"
                    ? "diff-removed"
                    : ""
                }
                style={{ padding: "0.25rem 0.5rem", marginBottom: "0.25rem" }}
              >
                <strong>{change.field}:</strong>{" "}
                {change.type === "added"
                  ? `+ ${JSON.stringify(change.newValue)}`
                  : change.type === "removed"
                  ? `- ${JSON.stringify(change.oldValue)}`
                  : `${JSON.stringify(change.oldValue)} -> ${JSON.stringify(
                      change.newValue
                    )}`}
              </div>
            ))}
            {(!comparison.changes || comparison.changes.length === 0) && (
              <p style={{ color: "#6c757d" }}>No changes between versions</p>
            )}
          </div>
        </div>
      )}

      {/* Selection hint */}
      {selectedVersionA !== null && selectedVersionB === null && (
        <div className="card" style={{ marginBottom: "1rem", background: "#e7f5ff" }}>
          <p>
            Selected version {selectedVersionA}. Click another version to
            compare.
          </p>
        </div>
      )}

      {/* Version list */}
      {versions.page?.length === 0 ? (
        <div className="empty-state">
          <h3>No versions found</h3>
          <p>This entry has no version history yet.</p>
        </div>
      ) : (
        <div className="list">
          {versions.page?.map((version: any) => (
            <div
              key={version._id}
              className="list-item"
              style={{
                background:
                  selectedVersionA === version.versionNumber ||
                  selectedVersionB === version.versionNumber
                    ? "#e7f5ff"
                    : undefined,
              }}
            >
              <div>
                <strong>Version {version.versionNumber}</strong>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#6c757d",
                    marginTop: "0.25rem",
                  }}
                >
                  {new Date(version.createdAt || version._creationTime).toLocaleString()}
                  {version.createdBy && ` by ${version.createdBy}`}
                </div>
                {version.changeNote && (
                  <div
                    style={{
                      fontSize: "0.875rem",
                      fontStyle: "italic",
                      marginTop: "0.25rem",
                    }}
                  >
                    "{version.changeNote}"
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className={
                    selectedVersionA === version.versionNumber ||
                    selectedVersionB === version.versionNumber
                      ? "btn-primary"
                      : "btn-secondary"
                  }
                  onClick={() => handleCompare(version.versionNumber)}
                >
                  Compare
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleRollback(version.versionNumber)}
                >
                  Rollback
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feature explanation */}
      <div className="card" style={{ marginTop: "2rem" }}>
        <h2>Version Management Features</h2>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Auto-versioning</td>
              <td>
                Every content update creates a new version automatically
              </td>
            </tr>
            <tr>
              <td>Compare</td>
              <td>
                Select two versions to see a diff of changes between them
              </td>
            </tr>
            <tr>
              <td>Rollback</td>
              <td>
                Restore content to any previous version with one click
              </td>
            </tr>
            <tr>
              <td>Version limit</td>
              <td>
                Configured max versions (50 by default), oldest auto-pruned
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
