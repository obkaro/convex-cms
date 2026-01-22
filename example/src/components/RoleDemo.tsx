import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

type Resource =
  | "contentTypes"
  | "contentEntries"
  | "mediaAssets"
  | "mediaFolders"
  | "versions";

type Action =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "publish"
  | "unpublish"
  | "schedule"
  | "restore";

const RESOURCES: Resource[] = [
  "contentTypes",
  "contentEntries",
  "mediaAssets",
  "mediaFolders",
  "versions",
];

const ACTIONS: Action[] = [
  "create",
  "read",
  "update",
  "delete",
  "publish",
  "unpublish",
  "schedule",
  "restore",
];

export function RoleDemo() {
  const [selectedUser, setSelectedUser] = useState<string>("admin@example.com");
  const [testResource, setTestResource] = useState<Resource>("contentEntries");
  const [testAction, setTestAction] = useState<Action>("publish");

  const roles = useQuery(api.example.getAllRoles, {});
  const users = useQuery(api.example.listUsers, {});
  const userRole = useQuery(api.example.getUserRole, { userId: selectedUser });
  const permissionCheck = useQuery(api.example.checkPermission, {
    userId: selectedUser,
    resource: testResource,
    action: testAction,
  });

  const createUser = useMutation(api.example.createUser);

  const handleCreateTestUsers = async () => {
    const testUsers = [
      { name: "Admin User", email: "admin@example.com", cmsRole: "admin" as const },
      { name: "Editor User", email: "editor@example.com", cmsRole: "editor" as const },
      { name: "Author User", email: "author@example.com", cmsRole: "author" as const },
      { name: "Viewer User", email: "viewer@example.com", cmsRole: "viewer" as const },
    ];

    for (const user of testUsers) {
      try {
        await createUser(user);
      } catch (error) {
        // User might already exist
        console.log(`User ${user.email} might already exist`);
      }
    }
  };

  if (roles === undefined) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="card-header">
        <h1>RBAC Demo</h1>
        <button className="btn-primary" onClick={handleCreateTestUsers}>
          Create Test Users
        </button>
      </div>

      {/* User selector */}
      <div className="card">
        <h2>Test User</h2>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <label>Select User</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              {users?.map((user: any) => (
                <option key={user._id} value={user.email}>
                  {user.name} ({user.email}) -{" "}
                  {user.cmsRole || "no role"}
                </option>
              ))}
              <option value="unknown@example.com">Unknown User</option>
            </select>
          </div>
          <div>
            <label>Current Role</label>
            <div
              style={{
                padding: "0.5rem 1rem",
                background: userRole ? "#e7f5ff" : "#f8d7da",
                borderRadius: "6px",
                fontWeight: 600,
              }}
            >
              {userRole || "No Role"}
            </div>
          </div>
        </div>
      </div>

      {/* Permission tester */}
      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Permission Checker</h2>
        <div style={{ display: "flex", gap: "1rem", alignItems: "end" }}>
          <div>
            <label>Resource</label>
            <select
              value={testResource}
              onChange={(e) => setTestResource(e.target.value as Resource)}
              style={{ width: "auto" }}
            >
              {RESOURCES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Action</label>
            <select
              value={testAction}
              onChange={(e) => setTestAction(e.target.value as Action)}
              style={{ width: "auto" }}
            >
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Result</label>
            <div
              style={{
                padding: "0.5rem 1rem",
                background: permissionCheck?.allowed ? "#d4edda" : "#f8d7da",
                color: permissionCheck?.allowed ? "#155724" : "#721c24",
                borderRadius: "6px",
                fontWeight: 600,
              }}
            >
              {permissionCheck?.allowed ? "ALLOWED" : "DENIED"}
            </div>
          </div>
        </div>
      </div>

      {/* Permissions matrix */}
      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Permissions Matrix</h2>
        <p style={{ color: "#6c757d", marginBottom: "1rem" }}>
          This shows which roles have which permissions by default.
        </p>
        <div className="permissions-matrix">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                {ACTIONS.map((action) => (
                  <th key={action}>{action}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(roles).map(([roleName, role]: [string, any]) => (
                <tr key={roleName}>
                  <td>
                    <strong>{roleName}</strong>
                  </td>
                  {ACTIONS.map((action) => {
                    const hasPermission = role.permissions?.some(
                      (p: any) =>
                        p.resource === "contentEntries" && p.action === action
                    );
                    return (
                      <td
                        key={action}
                        className={
                          hasPermission ? "permission-yes" : "permission-no"
                        }
                      >
                        {hasPermission ? "\u2713" : "\u2717"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role details */}
      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Available Roles</h2>
        <div className="grid">
          {Object.entries(roles).map(([roleName, role]: [string, any]) => (
            <div
              key={roleName}
              className="card"
              style={{ border: "1px solid #e9ecef" }}
            >
              <h3>{roleName}</h3>
              <p style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                {role.description || "No description"}
              </p>
              <details style={{ marginTop: "0.5rem" }}>
                <summary
                  style={{ cursor: "pointer", fontSize: "0.875rem" }}
                >
                  View permissions ({role.permissions?.length || 0})
                </summary>
                <ul
                  style={{
                    fontSize: "0.75rem",
                    marginTop: "0.5rem",
                    paddingLeft: "1.25rem",
                  }}
                >
                  {role.permissions?.map((p: any, i: number) => (
                    <li key={i}>
                      {p.resource}.{p.action}
                      {p.scope && ` (${p.scope})`}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          ))}
        </div>
      </div>

      {/* RBAC Features */}
      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>RBAC Features</h2>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Built-in Roles</td>
              <td>admin, editor, author, viewer with predefined permissions</td>
            </tr>
            <tr>
              <td>Custom Roles</td>
              <td>
                Create new roles or extend existing ones (e.g., "moderator")
              </td>
            </tr>
            <tr>
              <td>Resource-based</td>
              <td>
                Permissions scoped to resources: contentTypes, contentEntries,
                media, etc.
              </td>
            </tr>
            <tr>
              <td>Action-based</td>
              <td>
                Fine-grained actions: create, read, update, delete, publish,
                etc.
              </td>
            </tr>
            <tr>
              <td>Ownership Scopes</td>
              <td>
                "all" for full access or "own" to restrict to owned content
              </td>
            </tr>
            <tr>
              <td>Content Type Restrictions</td>
              <td>
                Limit role permissions to specific content types
              </td>
            </tr>
            <tr>
              <td>Authorization Hooks</td>
              <td>
                beforeRbac, afterRbac, onDeny for custom business logic
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
