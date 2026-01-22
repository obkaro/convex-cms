import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

type MediaType = "image" | "video" | "audio" | "document" | "other";

export function MediaBrowser() {
  const [typeFilter, setTypeFilter] = useState<MediaType | undefined>(undefined);
  const [currentFolder, setCurrentFolder] = useState<string | undefined>(
    undefined
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const assets = useQuery(api.example.listMediaAssets, {
    folderId: currentFolder,
    type: typeFilter,
    limit: 24,
  });

  const folders = useQuery(api.example.listMediaFolders, {
    parentId: currentFolder,
  });

  const generateUploadUrl = useMutation(api.example.generateUploadUrl);
  const createMediaAsset = useMutation(api.example.createMediaAsset);
  const createFolder = useMutation(api.example.createMediaFolder);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        // Get upload URL
        const uploadUrl = await generateUploadUrl({});

        // Upload file
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const { storageId } = await response.json();

        // Determine media type from MIME type
        let mediaType: MediaType = "other";
        if (file.type.startsWith("image/")) mediaType = "image";
        else if (file.type.startsWith("video/")) mediaType = "video";
        else if (file.type.startsWith("audio/")) mediaType = "audio";
        else if (
          file.type.includes("pdf") ||
          file.type.includes("document") ||
          file.type.includes("text/")
        ) {
          mediaType = "document";
        }

        // Create asset record
        await createMediaAsset({
          storageId,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          type: mediaType,
          folderId: currentFolder,
          userId: "demo@example.com",
        });
      } catch (error) {
        console.error("Upload failed:", error);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateFolder = async () => {
    const name = window.prompt("Enter folder name:");
    if (name) {
      try {
        await createFolder({
          name,
          parentId: currentFolder,
          userId: "demo@example.com",
        });
      } catch (error) {
        console.error("Failed to create folder:", error);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case "image":
        return "\u{1F5BC}";
      case "video":
        return "\u{1F3AC}";
      case "audio":
        return "\u{1F3B5}";
      case "document":
        return "\u{1F4C4}";
      default:
        return "\u{1F4CE}";
    }
  };

  return (
    <div>
      <div className="card-header">
        <h1>Media Library</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
          <button
            className="btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Files
          </button>
          <button className="btn-secondary" onClick={handleCreateFolder}>
            New Folder
          </button>
        </div>
      </div>

      {/* Filters and view toggle */}
      <div
        className="card"
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {currentFolder && (
            <button
              className="btn-secondary"
              onClick={() => setCurrentFolder(undefined)}
            >
              Back to Root
            </button>
          )}
          <div>
            <label>Type</label>
            <select
              value={typeFilter || ""}
              onChange={(e) =>
                setTypeFilter((e.target.value as MediaType) || undefined)
              }
              style={{ width: "auto" }}
            >
              <option value="">All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="audio">Audio</option>
              <option value="document">Documents</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: "none" }}>
          <button
            className={`tab ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            Grid
          </button>
          <button
            className={`tab ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
          >
            List
          </button>
        </div>
      </div>

      {/* Folders */}
      {folders && folders.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <h3>Folders</h3>
          <div className="grid">
            {folders.map((folder: any) => (
              <div
                key={folder._id}
                className="card"
                style={{ cursor: "pointer" }}
                onClick={() => setCurrentFolder(folder._id)}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                  {"\u{1F4C1}"}
                </div>
                <strong>{folder.name}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assets */}
      {assets === undefined ? (
        <div className="loading">
          <div className="spinner" />
        </div>
      ) : assets.page?.length === 0 ? (
        <div className="empty-state">
          <h3>No media assets</h3>
          <p>Upload files to get started.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="media-grid">
          {assets.page?.map((asset: any) => (
            <div key={asset._id} className="media-item" title={asset.filename}>
              {asset.type === "image" ? (
                <img src={asset.url} alt={asset.alt || asset.filename} />
              ) : (
                <div className="media-item-placeholder">
                  {getMediaIcon(asset.type)}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="list">
          {assets.page?.map((asset: any) => (
            <div key={asset._id} className="list-item">
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "1.5rem" }}>
                  {getMediaIcon(asset.type)}
                </span>
                <div>
                  <strong>{asset.filename}</strong>
                  <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                    {asset.mimeType} | {formatFileSize(asset.size)}
                  </div>
                </div>
              </div>
              <span className="badge badge-draft">{asset.type}</span>
            </div>
          ))}
        </div>
      )}

      {/* Upload dropzone hint */}
      <div
        className="card"
        style={{
          marginTop: "2rem",
          textAlign: "center",
          border: "2px dashed #dee2e6",
          background: "transparent",
        }}
      >
        <p style={{ color: "#6c757d" }}>
          Drag and drop files here or click Upload Files button
        </p>
      </div>
    </div>
  );
}
