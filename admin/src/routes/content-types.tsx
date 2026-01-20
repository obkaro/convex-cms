import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/content-types')({
  component: ContentTypesPage,
})

function ContentTypesPage() {
  return (
    <div className="page content-types-page">
      <header className="page-header">
        <h1>Content Types</h1>
        <p className="page-description">
          Define the structure of your content with custom fields and validation rules.
        </p>
      </header>

      <div className="page-toolbar">
        <div className="toolbar-left">
          <input
            type="search"
            placeholder="Search content types..."
            className="search-input"
          />
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary">
            Create Content Type
          </button>
        </div>
      </div>

      <div className="content-types-list empty-state">
        <div className="empty-state-icon" />
        <h3>No content types defined</h3>
        <p>Content types define the schema for your content. Create one to get started.</p>
      </div>
    </div>
  )
}
