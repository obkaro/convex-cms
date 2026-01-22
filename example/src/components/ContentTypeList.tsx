import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface NavigateState {
  view: string;
  entryId?: string;
  contentTypeId?: string;
}

interface Props {
  onNavigate: (state: NavigateState) => void;
}

export function ContentTypeList({ onNavigate }: Props) {
  const contentTypes = useQuery(api.example.listContentTypes, {});
  const createBlogType = useMutation(api.example.createBlogPostType);
  const createAuthorType = useMutation(api.example.createAuthorType);

  const handleCreateBlogType = async () => {
    try {
      await createBlogType({ userId: "demo@example.com" });
    } catch (error) {
      console.error("Failed to create blog type:", error);
    }
  };

  const handleCreateAuthorType = async () => {
    try {
      await createAuthorType({ userId: "demo@example.com" });
    } catch (error) {
      console.error("Failed to create author type:", error);
    }
  };

  if (contentTypes === undefined) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="card-header">
        <h1>Content Types</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn-primary" onClick={handleCreateBlogType}>
            Create Blog Post Type
          </button>
          <button className="btn-secondary" onClick={handleCreateAuthorType}>
            Create Author Type
          </button>
        </div>
      </div>

      {contentTypes.page?.length === 0 ? (
        <div className="empty-state">
          <h3>No content types yet</h3>
          <p>Create your first content type to get started.</p>
        </div>
      ) : (
        <div className="grid">
          {contentTypes.page?.map((type: any) => (
            <div key={type._id} className="card">
              <h3>{type.displayName || type.name}</h3>
              <p style={{ color: "#6c757d", fontSize: "0.875rem" }}>
                {type.description || "No description"}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "1rem",
                }}
              >
                <span style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                  {type.fields?.length || 0} fields
                </span>
                {type.isSingleton && (
                  <span className="badge badge-draft">Singleton</span>
                )}
              </div>
              <button
                className="btn-secondary"
                style={{ marginTop: "1rem", width: "100%" }}
                onClick={() =>
                  onNavigate({ view: "entries", contentTypeId: type._id })
                }
              >
                View Entries
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: "2rem" }}>
        <h2>Field Types Demonstrated</h2>
        <p style={{ marginBottom: "1rem", color: "#6c757d" }}>
          The Blog Post content type demonstrates all available field types:
        </p>
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Features</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Title</td>
              <td>text</td>
              <td>Required, Localized, Title field</td>
            </tr>
            <tr>
              <td>Slug</td>
              <td>text</td>
              <td>Pattern validation</td>
            </tr>
            <tr>
              <td>Content</td>
              <td>richText</td>
              <td>HTML allowed, Localized</td>
            </tr>
            <tr>
              <td>Featured Image</td>
              <td>media</td>
              <td>Image type filter</td>
            </tr>
            <tr>
              <td>Author</td>
              <td>reference</td>
              <td>References Author type</td>
            </tr>
            <tr>
              <td>Category</td>
              <td>select</td>
              <td>Single choice from list</td>
            </tr>
            <tr>
              <td>Tags</td>
              <td>multiSelect</td>
              <td>Multiple choices</td>
            </tr>
            <tr>
              <td>Publish Date</td>
              <td>datetime</td>
              <td>Date/time picker</td>
            </tr>
            <tr>
              <td>SEO Metadata</td>
              <td>json</td>
              <td>Schema validation</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
