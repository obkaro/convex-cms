import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  ArrowLeft,
  FileText,
  Image,
  LayoutDashboard,
  Layers,
  Loader2,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";

type AdminView = "dashboard" | "content" | "content-types" | "media";

interface ContentEntry {
  _id: string;
  slug?: string;
  status: string;
  data: Record<string, unknown>;
  contentTypeId: string;
  updatedAt: number;
}

interface ContentType {
  _id: string;
  name: string;
  displayName: string;
  fields?: Array<{ name: string }>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-amber-100 text-amber-700 border-amber-200",
    published: "bg-green-100 text-green-700 border-green-200",
    scheduled: "bg-blue-100 text-blue-700 border-blue-200",
    archived: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${styles[status] || styles.draft}`}
    >
      {status}
    </span>
  );
}

function Dashboard({ onNavigate }: { onNavigate: (view: AdminView) => void }) {
  // Use api.admin.* paths where the functions are defined via defineAdminAPI
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentTypes = useQuery((api as any).admin.contentTypes.list);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries = useQuery((api as any).admin.entries.list, {
    paginationOpts: { numItems: 5, cursor: null },
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="heading-lg mb-2">Dashboard</h2>
        <p className="text-body">Overview of your content management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => onNavigate("content")}
          className="card-hover text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-tempo-900">
                {entries?.page.length ?? "—"}
              </p>
              <p className="text-sm text-tempo-500">Content Entries</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate("content-types")}
          className="card-hover text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 flex items-center justify-center">
              <Layers className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-tempo-900">
                {contentTypes?.length ?? "—"}
              </p>
              <p className="text-sm text-tempo-500">Content Types</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate("media")}
          className="card-hover text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 flex items-center justify-center">
              <Image className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-tempo-900">—</p>
              <p className="text-sm text-tempo-500">Media Assets</p>
            </div>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="heading-sm">Recent Entries</h3>
            <button
              onClick={() => onNavigate("content")}
              className="text-sm text-tempo-500 hover:text-tempo-700 flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {entries === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-tempo-400 animate-spin" />
            </div>
          ) : entries.page.length > 0 ? (
            <div className="space-y-3">
              {entries.page.slice(0, 5).map((entry: ContentEntry) => {
                const data = entry.data as Record<string, unknown>;
                const title = (data.title as string) || entry.slug || "Untitled";
                return (
                  <div
                    key={entry._id}
                    className="flex items-center justify-between py-2 border-b border-tempo-100 last:border-0"
                  >
                    <span className="font-medium text-tempo-800 truncate">
                      {title}
                    </span>
                    <StatusBadge status={entry.status} />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-tempo-500 py-8">No entries yet</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="heading-sm">Content Types</h3>
            <button
              onClick={() => onNavigate("content-types")}
              className="text-sm text-tempo-500 hover:text-tempo-700 flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {contentTypes === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-tempo-400 animate-spin" />
            </div>
          ) : contentTypes.length > 0 ? (
            <div className="space-y-3">
              {contentTypes.map((type: ContentType) => (
                <div
                  key={type._id}
                  className="flex items-center justify-between py-2 border-b border-tempo-100 last:border-0"
                >
                  <div>
                    <span className="font-medium text-tempo-800">
                      {type.displayName}
                    </span>
                    <span className="ml-2 text-xs text-tempo-400 font-mono">
                      {type.name}
                    </span>
                  </div>
                  <span className="text-sm text-tempo-500">
                    {type.fields?.length || 0} fields
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-tempo-500 py-8">
              No content types yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ContentList() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentTypes = useQuery((api as any).admin.contentTypes.list);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries = useQuery((api as any).admin.entries.list, {
    paginationOpts: { numItems: 50, cursor: null },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const publishEntry = useMutation((api as any).admin.entries.publish);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unpublishEntry = useMutation((api as any).admin.entries.unpublish);

  const [filter, setFilter] = useState<string>("all");

  const filteredEntries = entries?.page.filter((entry: ContentEntry) => {
    if (filter === "all") return true;
    return entry.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="heading-lg mb-2">Content</h2>
          <p className="text-body">Manage all your content entries</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 px-3 border-2 border-tempo-200 bg-white text-sm focus:outline-none focus:border-tempo-400"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </div>

      {entries === undefined ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-tempo-400 animate-spin" />
        </div>
      ) : filteredEntries && filteredEntries.length > 0 ? (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-tempo-200 bg-tempo-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-tempo-700">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-tempo-700">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-tempo-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-tempo-700">
                  Updated
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-tempo-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry: ContentEntry) => {
                const data = entry.data as Record<string, unknown>;
                const title = (data.title as string) || entry.slug || "Untitled";
                const contentType = contentTypes?.find(
                  (ct: ContentType) => ct._id === entry.contentTypeId
                );

                return (
                  <tr
                    key={entry._id}
                    className="border-b border-tempo-100 hover:bg-tempo-50"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-tempo-800">{title}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-tempo-600">
                      {contentType?.displayName || "Unknown"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-tempo-500">
                      {new Date(entry.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {entry.status === "draft" ? (
                          <button
                            onClick={() => publishEntry({ id: entry._id })}
                            className="p-1.5 text-tempo-500 hover:text-green-600 hover:bg-green-50"
                            title="Publish"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        ) : entry.status === "published" ? (
                          <button
                            onClick={() => unpublishEntry({ id: entry._id })}
                            className="p-1.5 text-tempo-500 hover:text-amber-600 hover:bg-amber-50"
                            title="Unpublish"
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 text-tempo-300 mx-auto mb-4" />
          <h3 className="heading-sm mb-2">No content yet</h3>
          <p className="text-muted mb-4">
            Create content entries using the CMS API or seed script.
          </p>
          <pre className="bg-tempo-800 text-tempo-100 px-4 py-2 text-sm font-mono inline-block">
            npm run setup
          </pre>
        </div>
      )}
    </div>
  );
}

function ContentTypesList() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentTypes = useQuery((api as any).admin.contentTypes.list);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="heading-lg mb-2">Content Types</h2>
        <p className="text-body">
          Define the structure of your content. Types are managed via code in{" "}
          <code className="text-sm bg-tempo-100 px-1.5 py-0.5">
            convex/schemas.ts
          </code>
        </p>
      </div>

      {contentTypes === undefined ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-tempo-400 animate-spin" />
        </div>
      ) : contentTypes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contentTypes.map((type: ContentType) => (
            <div key={type._id} className="card-hover">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Layers className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-tempo-800">
                    {type.displayName}
                  </h3>
                  <p className="text-xs text-tempo-400 font-mono mt-0.5">
                    {type.name}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {type.fields?.slice(0, 4).map((field: { name: string }) => (
                      <span
                        key={field.name}
                        className="text-xs bg-tempo-100 text-tempo-600 px-2 py-0.5"
                      >
                        {field.name}
                      </span>
                    ))}
                    {(type.fields?.length || 0) > 4 && (
                      <span className="text-xs text-tempo-400">
                        +{(type.fields?.length || 0) - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Layers className="w-12 h-12 text-tempo-300 mx-auto mb-4" />
          <h3 className="heading-sm mb-2">No content types yet</h3>
          <p className="text-muted mb-4">
            Run the setup script to create content types from code definitions.
          </p>
          <pre className="bg-tempo-800 text-tempo-100 px-4 py-2 text-sm font-mono inline-block">
            npm run setup
          </pre>
        </div>
      )}
    </div>
  );
}

function MediaLibrary() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="heading-lg mb-2">Media Library</h2>
        <p className="text-body">Manage images, documents, and other files</p>
      </div>

      <div className="card text-center py-12">
        <Image className="w-12 h-12 text-tempo-300 mx-auto mb-4" />
        <h3 className="heading-sm mb-2">Media management coming soon</h3>
        <p className="text-muted">
          For full media management, use the standalone admin app.
        </p>
      </div>
    </div>
  );
}

export function Admin() {
  const [view, setView] = useState<AdminView>("dashboard");

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "content", label: "Content", icon: FileText },
    { id: "content-types", label: "Content Types", icon: Layers },
    { id: "media", label: "Media", icon: Image },
  ] as const;

  return (
    <div className="min-h-screen bg-tempo-50 flex">
      <aside className="w-60 bg-white border-r-2 border-tempo-200 flex flex-col">
        <div className="h-16 flex items-center gap-3 px-4 border-b-2 border-tempo-200">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-tempo-800 flex items-center justify-center">
              <div className="w-3 h-4 bg-tempo-100" />
            </div>
            <span className="font-bold text-tempo-900">Tempo</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-tempo-800 text-white"
                    : "text-tempo-600 hover:bg-tempo-100 hover:text-tempo-800"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-tempo-200">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-tempo-500 hover:text-tempo-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to site
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        {view === "dashboard" && <Dashboard onNavigate={setView} />}
        {view === "content" && <ContentList />}
        {view === "content-types" && <ContentTypesList />}
        {view === "media" && <MediaLibrary />}
      </main>
    </div>
  );
}
