import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/content')({
  component: ContentPage,
})

function ContentPage() {
  return (
    <div className="page content-page">
      <header className="page-header">
        <h1>Content</h1>
        <p className="page-description">
          Browse and manage content entries across all content types.
        </p>
      </header>

      <div className="page-toolbar">
        <div className="toolbar-left">
          <select className="content-type-filter">
            <option value="">All Content Types</option>
          </select>
          <select className="status-filter">
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary">
            Create Entry
          </button>
        </div>
      </div>

      <div className="content-list empty-state">
        <div className="empty-state-icon" />
        <h3>No content entries yet</h3>
        <p>Create a content type first, then start adding content entries.</p>
      </div>
    </div>
  )
}
