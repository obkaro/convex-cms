# Convex CMS Example App

A comprehensive example demonstrating all features of `convex-cms`.

## Getting Started

### Prerequisites

- Node.js 20+
- A Convex account (free at [convex.dev](https://convex.dev))

### Installation

```bash
# From the root of convex-cms
cd example
npm install
```

### Running the Example

```bash
# Start Convex backend and Vite frontend
npm run dev
```

This starts:
- Convex development server (backend)
- Vite development server at http://localhost:5174 (frontend)

On first run, Convex will prompt you to create or link a project.

## Project Structure

```
example/
├── convex/                    # Backend code
│   ├── convex.config.ts       # Component installation
│   ├── schema.ts              # App schema (users table)
│   ├── cms.ts                 # CMS client configuration
│   ├── example.ts             # Wrapper functions
│   ├── http.ts                # HTTP routes
│   └── example.test.ts        # Integration tests
├── src/                       # Frontend code
│   ├── main.tsx               # App entry with ConvexProvider
│   ├── App.tsx                # Main layout and navigation
│   ├── index.css              # Styling
│   └── components/            # Feature showcase components
│       ├── ContentTypeList.tsx
│       ├── EntryList.tsx
│       ├── EntryDetail.tsx
│       ├── MediaBrowser.tsx
│       ├── VersionHistory.tsx
│       └── RoleDemo.tsx
├── index.html                 # HTML entry
├── vite.config.ts             # Vite configuration
└── package.json               # Dependencies
```

## Features Demonstrated

### 1. Content Type Management

Create content types with various field types:

- **text**: Basic text fields with validation
- **richText**: HTML/markdown content
- **media**: File references with type filtering
- **reference**: Links to other content entries
- **select**: Single choice from options
- **multiSelect**: Multiple choices
- **datetime**: Date/time values
- **json**: Structured JSON data

```typescript
// See: convex/example.ts - createBlogPostType
await cms.contentTypes.create(ctx, {
  name: "blog_post",
  displayName: "Blog Post",
  fields: [
    { name: "title", type: "text", required: true, localized: true },
    { name: "content", type: "richText", localized: true },
    { name: "author", type: "reference", options: { contentType: "author" } },
    // ... more fields
  ],
});
```

### 2. Content Entry CRUD

Full lifecycle management:

```typescript
// Create
const entry = await cms.contentEntries.create(ctx, {
  contentTypeId,
  data: { title: "My Post" },
  userId: "user@example.com",
});

// Read with locale
const entry = await cms.contentEntries.get(ctx, {
  id: entryId,
  locale: "es-ES",
});

// Update
await cms.contentEntries.update(ctx, {
  id: entryId,
  data: { title: "Updated Title" },
  userId: "user@example.com",
});

// Delete (soft delete if enabled)
await cms.contentEntries.delete(ctx, {
  id: entryId,
  userId: "user@example.com",
});
```

### 3. Publishing Workflow

Draft → Published → Scheduled states:

```typescript
// Publish immediately
await cms.contentEntries.publish(ctx, {
  id: entryId,
  userId: "editor@example.com",
});

// Schedule for future publication
await cms.contentEntries.schedule(ctx, {
  id: entryId,
  publishAt: Date.now() + 24 * 60 * 60 * 1000, // Tomorrow
  userId: "editor@example.com",
});

// Unpublish
await cms.contentEntries.unpublish(ctx, {
  id: entryId,
  userId: "editor@example.com",
});
```

### 4. Version Management

Automatic versioning with comparison and rollback:

```typescript
// Get version history
const versions = await cms.versions.list(ctx, {
  contentEntryId: entryId,
});

// Compare versions
const diff = await cms.versions.compare(ctx, {
  contentEntryId: entryId,
  versionA: 1,
  versionB: 3,
});

// Rollback to previous version
await cms.versions.restore(ctx, {
  contentEntryId: entryId,
  versionNumber: 2,
  userId: "editor@example.com",
});
```

### 5. Media Management

Upload, organize, and reference media:

```typescript
// Generate upload URL
const uploadUrl = await ctx.storage.generateUploadUrl();

// Create asset after upload
await cms.mediaAssets.create(ctx, {
  storageId,
  filename: "hero.jpg",
  mimeType: "image/jpeg",
  size: 1024000,
  type: "image",
  folderId: "marketing",
  userId: "user@example.com",
});

// List with filters
const images = await cms.mediaAssets.list(ctx, {
  type: "image",
  folderId: "marketing",
});
```

### 6. Localization

Multi-locale content with fallback chains:

```typescript
// Configure in cms.ts
const cms = createCmsClient(components.convexCms, {
  defaultLocale: "en-US",
  supportedLocales: ["en-US", "es-ES", "es-MX", "fr-FR"],
  localeFallbackChains: {
    "es-MX": ["es-ES", "en-US"], // Mexican Spanish → Spain Spanish → English
  },
});

// Get fallback chain
const chain = cms.locale.getFallbackChain("es-MX");
// ["es-ES", "en-US"]

// Create localized content
await cms.contentEntries.create(ctx, {
  contentTypeId,
  data: { title: "Hola Mundo" },
  locale: "es-ES",
  userId: "user@example.com",
});
```

### 7. RBAC (Role-Based Access Control)

Built-in roles with customization:

```typescript
// Built-in roles: admin, editor, author, viewer

// Check permission
const result = await cms.hasPermissionForUser(ctx, "user@example.com", {
  resource: "contentEntries",
  action: "publish",
});

if (!result.allowed) {
  throw new Error(`User with role '${result.role}' cannot publish`);
}

// Custom roles (defined in cms.ts)
const moderatorRole = extendRole(EDITOR_ROLE, {
  name: "moderator",
  permissions: [
    { resource: "contentEntries", action: "publish", scope: "all" },
  ],
  contentTypePermissions: {
    blog_post: { allowed: ["publish"], scopes: { publish: "all" } },
  },
});
```

### 8. Authorization Hooks

Custom business logic for access control:

```typescript
// In cms.ts
authorizationHooks: {
  // Bypass RBAC for service accounts
  beforeRbac: async (context) => {
    if (context.userId === "system-service-account") {
      return { allowed: true, skipRbac: true };
    }
    return { allowed: true, skipRbac: false };
  },

  // Add restrictions after RBAC passes
  afterRbac: async (context, rbacResult) => {
    if (maintenanceMode && context.operation.includes("publish")) {
      return { allowed: false, reason: "Publishing disabled" };
    }
    return { allowed: true };
  },

  // Log denied operations
  onDeny: async (context, result) => {
    console.log("Operation denied:", context.operation, result.reason);
  },
}
```

## Configuration Reference

### CMS Client Options

```typescript
createCmsClient(components.convexCms, {
  // Locale settings
  defaultLocale: "en-US",
  supportedLocales: ["en-US", "es-ES", "fr-FR"],
  localeFallbackChains: { "es-MX": ["es-ES", "en-US"] },
  autoGenerateLocaleFallbacks: true,

  // Feature flags
  features: {
    versioning: true,      // Enable version history
    localization: true,    // Enable multi-locale
    scheduling: true,      // Enable scheduled publishing
    softDelete: true,      // Enable trash/restore
  },

  // Versioning
  maxVersionsPerEntry: 50,

  // Custom roles
  customRoles: {
    moderator: moderatorRole,
  },

  // User role mapping
  getUserRole: async (ctx, { userId }) => {
    const user = await ctx.db.query("users").filter(...).first();
    return user?.cmsRole ?? null;
  },

  // Authorization hooks
  authorizationHooks: {
    beforeRbac: async (context) => { ... },
    afterRbac: async (context, rbacResult) => { ... },
    onDeny: async (context, result) => { ... },
  },
});
```

## Testing

Run integration tests:

```bash
npm test
```

Tests demonstrate:
- User creation with CMS roles
- Role mapping via getUserRole hook
- Permission checking
- Locale configuration access

## Frontend Components

### ContentTypeList

Browse content types, see field configurations, create new types.

### EntryList

Paginated list with status filters (draft/published/scheduled), locale switcher, publish/unpublish actions.

### EntryDetail

View entry data, metadata, version info. Publish/unpublish/delete actions.

### MediaBrowser

Upload files, create folders, grid/list views, type filtering.

### VersionHistory

List versions, compare two versions side-by-side, rollback to previous versions.

### RoleDemo

Interactive permission checker, permissions matrix, create test users with different roles.

## Learn More

- [Convex CMS Documentation](../docs/)
- [Convex Documentation](https://docs.convex.dev)
- [Component Authoring Guide](https://docs.convex.dev/components)
