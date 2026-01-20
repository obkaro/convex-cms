import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/media')({
  component: MediaPage,
})

function MediaPage() {
  return (
    <div className="page media-page">
      <header className="page-header">
        <h1>Media Library</h1>
        <p className="page-description">
          Upload, organize, and manage media assets for your content.
        </p>
      </header>

      <div className="page-toolbar">
        <div className="toolbar-left">
          <select className="folder-filter">
            <option value="">All Folders</option>
          </select>
          <select className="type-filter">
            <option value="">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="document">Documents</option>
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-secondary">
            New Folder
          </button>
          <button className="btn btn-primary">
            Upload Files
          </button>
        </div>
      </div>

      <div className="media-grid empty-state">
        <div className="empty-state-icon" />
        <h3>No media assets yet</h3>
        <p>Upload images, videos, documents, and other files to use in your content.</p>
      </div>
    </div>
  )
}
