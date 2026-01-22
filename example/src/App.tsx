import { useState } from "react";
import { ContentTypeList } from "./components/ContentTypeList";
import { EntryList } from "./components/EntryList";
import { EntryDetail } from "./components/EntryDetail";
import { MediaBrowser } from "./components/MediaBrowser";
import { VersionHistory } from "./components/VersionHistory";
import { RoleDemo } from "./components/RoleDemo";

type View =
  | "content-types"
  | "entries"
  | "entry-detail"
  | "media"
  | "versions"
  | "roles";

interface ViewState {
  view: View;
  entryId?: string;
  contentTypeId?: string;
}

function App() {
  const [viewState, setViewState] = useState<ViewState>({
    view: "content-types",
  });

  const navigate = (newState: ViewState) => {
    setViewState(newState);
  };

  const renderView = () => {
    switch (viewState.view) {
      case "content-types":
        return <ContentTypeList onNavigate={navigate} />;
      case "entries":
        return (
          <EntryList
            contentTypeId={viewState.contentTypeId}
            onNavigate={navigate}
          />
        );
      case "entry-detail":
        return (
          <EntryDetail entryId={viewState.entryId!} onNavigate={navigate} />
        );
      case "media":
        return <MediaBrowser />;
      case "versions":
        return (
          <VersionHistory entryId={viewState.entryId} onNavigate={navigate} />
        );
      case "roles":
        return <RoleDemo />;
      default:
        return <ContentTypeList onNavigate={navigate} />;
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 style={{ marginBottom: "1.5rem" }}>CMS Example</h2>
        <nav>
          <button
            className={viewState.view === "content-types" ? "active" : ""}
            onClick={() => navigate({ view: "content-types" })}
          >
            Content Types
          </button>
          <button
            className={viewState.view === "entries" ? "active" : ""}
            onClick={() => navigate({ view: "entries" })}
          >
            All Entries
          </button>
          <button
            className={viewState.view === "media" ? "active" : ""}
            onClick={() => navigate({ view: "media" })}
          >
            Media Library
          </button>
          <button
            className={viewState.view === "versions" ? "active" : ""}
            onClick={() => navigate({ view: "versions" })}
          >
            Version History
          </button>
          <button
            className={viewState.view === "roles" ? "active" : ""}
            onClick={() => navigate({ view: "roles" })}
          >
            RBAC Demo
          </button>
        </nav>
      </aside>
      <main className="main">{renderView()}</main>
    </div>
  );
}

export default App;
