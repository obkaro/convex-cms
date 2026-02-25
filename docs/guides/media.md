# Media Management Guide

Convex CMS provides comprehensive media management including uploads, folder organization, and image variants.

## Overview

The media system uses a **unified `mediaItems` table** — both assets and folders live in the same table, distinguished by a `kind` field (`"asset"` or `"folder"`). Folders are simply `mediaItems` rows with `kind: "folder"`, and assets reference their parent folder via `parentId` (which points to another `mediaItems` row).

The system consists of:
- **Media Assets** (`kind: "asset"`) - Files stored in Convex File Storage with metadata (`storageId`, `mimeType`, `width`, `height`, `duration`, `altText`, `name`, `title`, `description`, `parentId`, `path`, `tags`, `size`, `metadata`)
- **Media Folders** (`kind: "folder"`) - Hierarchical organization structure (`name`, `title`, `description`, `parentId`, `path`, `sortOrder`)
- **Media Variants** - Derived versions (thumbnails, responsive sizes) stored in a separate `mediaVariants` table

---

## Uploading Media

### 1. Generate Upload URL

```typescript
import { mutation } from "./_generated/server";
import { cms } from "../cms";

export const getUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await cms.mediaAssets.generateUploadUrl(ctx);
  },
});
```

### 2. Upload from Client

```typescript
// React component
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function MediaUploader() {
  const getUploadUrl = useMutation(api.media.getUploadUrl);
  const createAsset = useMutation(api.media.createAsset);

  const handleUpload = async (file: File) => {
    // Get upload URL
    const { uploadUrl, storageId } = await getUploadUrl();

    // Upload directly to Convex storage
    await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });

    // Create asset record
    return await createAsset({
      storageId,
      name: file.name,
      mimeType: file.type,
      size: file.size,
    });
  };
  // ...
}

```

### 3. Create Asset Record

```typescript
export const createAsset = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    mimeType: v.string(),
    size: v.optional(v.number()),
    title: v.optional(v.string()),
    altText: v.optional(v.string()),
    parentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await cms.mediaAssets.create(ctx, args);
  },
});
```

---

## Querying Media

### Get Single Asset

```typescript
const asset = await cms.mediaAssets.get(ctx, assetId);
// Returns asset with resolved URL:
// { _id, name, url, mimeType, ... }
```

### List Assets

```typescript
// All assets
const result = await cms.mediaAssets.list(ctx, { limit: 20 });

// Filter by type
const images = await cms.mediaAssets.list(ctx, {
  type: "image",
  limit: 20,
});

// Filter by parent folder
const folderAssets = await cms.mediaAssets.list(ctx, {
  parentId: parentId,
});

// Search
const results = await cms.mediaAssets.list(ctx, {
  search: "logo",
});
```

---

## Folders

### Create Folder

```typescript
const folder = await cms.mediaFolders.create(ctx, {
  name: "Blog Images",
  parentId: null,  // Root level
  description: "Images used in blog posts",
});

// Nested folder
const subfolder = await cms.mediaFolders.create(ctx, {
  name: "2026",
  parentId: folder._id,
});
```

### List Folders

```typescript
// Root folders
const rootFolders = await cms.mediaFolders.list(ctx, { parentId: null });

// Subfolders
const subfolders = await cms.mediaFolders.list(ctx, { parentId: parentFolderId });
```

### Get Folder Tree

```typescript
const tree = await cms.mediaFolders.getFolderTree(ctx);
// Returns flat list with path info:
// [
//   { _id, name: "Blog", path: "/Blog", depth: 0 },
//   { _id, name: "2026", path: "/Blog/2026", depth: 1 },
// ]
```

### Move Folder

```typescript
await cms.mediaFolders.move(ctx, {
  id: folderId,
  parentId: newParentId,  // or null for root
});
```

### Get Folder by Path

```typescript
const folder = await cms.mediaFolders.getByPath(ctx, {
  path: "/Blog/2026/March",
});
```

---

## Media Variants

Variants are optimized versions of images (thumbnails, responsive sizes).

### Request Variant Generation

```typescript
// Request a thumbnail
await cms.mediaVariants.requestGeneration(ctx, {
  assetId,
  variantType: "thumbnail",
  width: 200,
  height: 200,
  format: "webp",
});

// Request responsive size
await cms.mediaVariants.requestGeneration(ctx, {
  assetId,
  variantType: "responsive",
  width: 800,
  format: "webp",
});
```

### Using Presets

```typescript
await cms.mediaVariants.generateFromPresets(ctx, {
  assetId,
  presets: ["thumbnail", "medium", "large"],
});
```

Built-in presets:
- `thumbnail` - 200x200, WebP
- `small` - 400px width, WebP
- `medium` - 800px width, WebP
- `large` - 1200px width, WebP
- `xl` - 1920px width, WebP

### Get Best Variant

```typescript
const variant = await cms.mediaVariants.getBestVariant(ctx, {
  assetId,
  targetWidth: 600,
  targetHeight: 400,
});
```

### Get Responsive Srcset

For `<img srcset>`:

```typescript
const { src, srcset } = await cms.mediaVariants.getResponsiveSrcset(ctx, {
  assetId,
  format: "webp",
  sizes: [400, 800, 1200, 1600],
});

// Returns:
// {
//   src: "https://...original.jpg",
//   srcset: "https://...400w.webp 400w, https://...800w.webp 800w, ..."
// }
```

### List Variants

```typescript
const variants = await cms.mediaVariants.list(ctx, { assetId });

// Filter by format
const webpVariants = await cms.mediaVariants.list(ctx, {
  assetId,
  format: "webp",
});
```

---

## Updating Media

### Update Metadata

```typescript
await cms.mediaAssets.update(ctx, {
  id: assetId,
  title: "New Title",
  description: "Updated description",
  altText: "Alt text for accessibility",
  parentId: newParentId,
});
```

### Add Tags (Simple)

```typescript
await cms.mediaAssets.update(ctx, {
  id: assetId,
  tags: ["blog", "featured", "2026"],
});
```

### Taxonomy-Based Tagging

For more structured organization, use taxonomies:

```typescript
// Add a term to a media asset
await cms.mediaAssetTags.addTerm(ctx, {
  mediaId: assetId,
  termId: landscapeCategoryId,
});

// Get all terms for a media asset
const terms = await cms.mediaAssetTags.getByMedia(ctx, {
  mediaId: assetId,
});

// Find media with a specific term
const landscapeImages = await cms.mediaAssetTags.getMediaByTerm(ctx, {
  termId: landscapeCategoryId,
});
```

See [Taxonomies Guide](./taxonomies.md) for creating taxonomies and managing terms.

---

## Deleting Media

### Soft Delete

```typescript
await cms.mediaAssets.delete(ctx, { id: assetId });
// Can be restored from trash
```

### Hard Delete

```typescript
await cms.mediaAssets.delete(ctx, {
  id: assetId,
  hardDelete: true,
});
// Permanently removed
```

### Restore

```typescript
await cms.mediaAssets.restore(ctx, { id: assetId });
```

---

## Finding References

Check where a media asset is used:

```typescript
const refs = await cms.mediaAssets.findReferences(ctx, { assetId });
// Returns:
// [
//   { entryId, entryTitle: "Blog Post", fieldName: "featuredImage" },
//   { entryId, entryTitle: "Product", fieldName: "gallery" },
// ]
```

---

## Media Fields in Content Types

### Single Media Field

```typescript
{
  name: "featuredImage",
  label: "Featured Image",
  type: "media",
  required: true,
  options: {
    allowedMimeTypes: ["image/*"],
    maxFileSize: 5 * 1024 * 1024,  // 5MB
  },
}
```

### Multiple Media (Gallery)

```typescript
{
  name: "gallery",
  label: "Gallery",
  type: "media",
  required: false,
  options: {
    allowedMimeTypes: ["image/*"],
    multiple: true,
    maxItems: 10,
  },
}
```

### Document Upload

```typescript
{
  name: "attachment",
  label: "Attachment",
  type: "media",
  required: false,
  options: {
    allowedMimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxFileSize: 10 * 1024 * 1024,  // 10MB
  },
}
```

---

## React Components

### Responsive Image

```tsx
function ResponsiveImage({ assetId, alt, sizes }) {
  const srcset = useQuery(api.media.getResponsiveSrcset, {
    assetId,
    format: "webp",
  });

  if (!srcset) return null;

  return (
    <img
      src={srcset.src}
      srcSet={srcset.srcset}
      sizes={sizes}
      alt={alt}
      loading="lazy"
    />
  );
}

// Usage
<ResponsiveImage
  assetId={post.featuredImage}
  alt={post.title}
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

---

## Best Practices

### Always Set Alt Text

For accessibility:

```typescript
await cms.mediaAssets.update(ctx, {
  id: assetId,
  altText: "A developer typing on a laptop",
});
```

### Use Variants for Performance

```typescript
// Bad: always use original
<img src={asset.url} />

// Good: use appropriate variant
const variant = await cms.mediaVariants.getBestVariant(ctx, {
  assetId: asset._id,
  targetWidth: 400,
});
<img src={variant.url} />
```

### Check References Before Delete

```typescript
const refs = await cms.mediaAssets.findReferences(ctx, { assetId });
if (refs.length > 0) {
  throw new Error(`Cannot delete: used in ${refs.length} entries`);
}
await cms.mediaAssets.delete(ctx, { id: assetId, hardDelete: true });
```

### Organize with Folders

```typescript
// Create a consistent structure
const folders = {
  blog: await cms.mediaFolders.create(ctx, { name: "Blog" }),
  products: await cms.mediaFolders.create(ctx, { name: "Products" }),
  uploads: await cms.mediaFolders.create(ctx, { name: "User Uploads" }),
};
```

---

See also:
- [Taxonomies Guide](./taxonomies.md): Organize media with categories and tags
- [Client API Reference](../api/client-api.md)
- [Content Modeling Guide](./content-modeling.md)

---

Next: [Authorization Guide](./authorization.md)
