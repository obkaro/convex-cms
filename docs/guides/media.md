# Media Management Guide

Convex CMS provides comprehensive media management including uploads, folder organization, and image variants.

## Overview

The media system consists of:
- **Media Assets** - Files stored in Convex File Storage with metadata
- **Media Folders** - Hierarchical organization structure
- **Media Variants** - Derived versions (thumbnails, responsive sizes)

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
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      type: getMediaType(file.type),
    });
  };
  // ...
}

function getMediaType(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "document";
  return "other";
}
```

### 3. Create Asset Record

```typescript
export const createAsset = mutation({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    type: v.union(
      v.literal("image"),
      v.literal("video"),
      v.literal("audio"),
      v.literal("document"),
      v.literal("other")
    ),
    title: v.optional(v.string()),
    altText: v.optional(v.string()),
    folderId: v.optional(v.id("media_folders")),
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
// { _id, filename, url, mimeType, ... }
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

// Filter by folder
const folderAssets = await cms.mediaAssets.list(ctx, {
  folderId: folderId,
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
  name: "2024",
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
//   { _id, name: "2024", path: "/Blog/2024", depth: 1 },
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
  path: "/Blog/2024/March",
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
  folderId: newFolderId,
});
```

### Add Tags

```typescript
await cms.mediaAssets.update(ctx, {
  id: assetId,
  tags: ["blog", "featured", "2024"],
});
```

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
  type: "media",
  options: {
    allowedTypes: ["image/*"],
    maxSize: 5 * 1024 * 1024,  // 5MB
  },
}
```

### Multiple Media (Gallery)

```typescript
{
  name: "gallery",
  type: "media",
  options: {
    allowedTypes: ["image/*"],
    multiple: true,
    maxItems: 10,
  },
}
```

### Document Upload

```typescript
{
  name: "attachment",
  type: "media",
  options: {
    allowedTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxSize: 10 * 1024 * 1024,  // 10MB
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
- [Client API Reference](../api/client-api.md)
- [Content Modeling Guide](./content-modeling.md)

---

Next: [Authorization Guide](./authorization.md)
