# Taxonomies (Categories & Tags)

Taxonomies are classification systems for organizing content. Convex CMS supports two types:

- **Hierarchical taxonomies** — Nested categories (e.g., Electronics > Phones > Smartphones)
- **Flat taxonomies** — Simple tags (e.g., JavaScript, TypeScript, React)

Both content entries and media assets can be tagged with taxonomy terms.

## Quick Start

### Creating a Taxonomy

```typescript
import { cms } from "./cms";

// Create a flat taxonomy for blog tags
const tagsTaxonomy = await cms.taxonomies.create(ctx, {
  name: "blog_tags",
  displayName: "Blog Tags",
  isHierarchical: false,
  description: "Tags for blog posts",
});

// Create a hierarchical taxonomy for product categories
const categoriesTaxonomy = await cms.taxonomies.create(ctx, {
  name: "product_categories",
  displayName: "Product Categories",
  isHierarchical: true,
  description: "Product category hierarchy",
});
```

### Creating Terms

```typescript
// Create flat tags
await cms.taxonomyTerms.create(ctx, {
  taxonomyId: tagsTaxonomy._id,
  name: "JavaScript",
  slug: "javascript",
});

await cms.taxonomyTerms.create(ctx, {
  taxonomyId: tagsTaxonomy._id,
  name: "TypeScript",
  slug: "typescript",
});

// Create hierarchical categories
const electronics = await cms.taxonomyTerms.create(ctx, {
  taxonomyId: categoriesTaxonomy._id,
  name: "Electronics",
  slug: "electronics",
});

// Create child category
await cms.taxonomyTerms.create(ctx, {
  taxonomyId: categoriesTaxonomy._id,
  name: "Phones",
  slug: "phones",
  parentId: electronics._id,
});
```

### Assigning Terms to Content

```typescript
// Add a tag to an entry
await cms.contentEntryTags.addTerm(ctx, {
  entryId: blogPostId,
  termId: javascriptTagId,
  fieldName: "tags",
});

// Set all tags for an entry (replaces existing)
await cms.contentEntryTags.setTerms(ctx, {
  entryId: blogPostId,
  fieldName: "tags",
  termIds: [javascriptTagId, typescriptTagId],
});

// Remove a tag
await cms.contentEntryTags.removeTerm(ctx, {
  entryId: blogPostId,
  termId: javascriptTagId,
  fieldName: "tags",
});
```

## Querying Taxonomies

### List All Taxonomies

```typescript
const taxonomies = await cms.taxonomies.list(ctx, {
  isActive: true,
});
```

### Get Taxonomy by Name

```typescript
const taxonomy = await cms.taxonomies.get(ctx, {
  name: "blog_tags",
});
```

### List Terms in a Taxonomy

```typescript
// All terms in a taxonomy
const tags = await cms.taxonomyTerms.list(ctx, {
  taxonomyId: tagsTaxonomyId,
});

// Only root-level terms (for hierarchical)
const rootCategories = await cms.taxonomyTerms.list(ctx, {
  taxonomyId: categoriesTaxonomyId,
  rootOnly: true,
});

// Children of a specific term
const phoneSubcategories = await cms.taxonomyTerms.list(ctx, {
  taxonomyId: categoriesTaxonomyId,
  parentId: phonesCategoryId,
});

// Sort by popularity
const popularTags = await cms.taxonomyTerms.list(ctx, {
  taxonomyId: tagsTaxonomyId,
  sortBy: "usageCount",
  sortDirection: "desc",
});
```

### Get Hierarchical Tree

For nested category pickers, get the full tree structure:

```typescript
const tree = await cms.taxonomyTerms.getHierarchy(ctx, {
  taxonomyId: categoriesTaxonomyId,
});

// Returns nested structure:
// [
//   {
//     name: "Electronics",
//     children: [
//       { name: "Phones", children: [...] },
//       { name: "Laptops", children: [...] }
//     ]
//   },
//   ...
// ]
```

### Suggest Terms (Autocomplete)

For tag input autocomplete:

```typescript
const suggestions = await cms.taxonomyTerms.suggest(ctx, {
  taxonomyId: tagsTaxonomyId,
  query: "java",
  limit: 5,
  excludeIds: alreadySelectedTagIds,
});
// Returns: [{ name: "JavaScript" }, { name: "Java" }, ...]
```

## Querying Content by Taxonomy

### Get Terms for an Entry

```typescript
// All terms assigned to an entry
const entryTags = await cms.contentEntryTags.getByEntry(ctx, {
  entryId: blogPostId,
});

// Terms from a specific field only
const primaryTags = await cms.contentEntryTags.getByEntry(ctx, {
  entryId: blogPostId,
  fieldName: "tags",
});
```

### Get Entries with a Term

```typescript
// Find all entries tagged with "JavaScript"
const jsEntries = await cms.contentEntryTags.getEntriesByTerm(ctx, {
  termId: javascriptTagId,
  status: "published",
  paginationOpts: { numItems: 20 },
});
```

## Media Asset Taxonomies

Media assets can also be tagged:

```typescript
// Add a term to a media asset
await cms.mediaAssetTags.addTerm(ctx, {
  mediaId: imageId,
  termId: landscapeCategoryId,
});

// Get terms for a media asset
const mediaTags = await cms.mediaAssetTags.getByMedia(ctx, {
  mediaId: imageId,
});

// Get media assets with a specific term
const landscapeImages = await cms.mediaAssetTags.getMediaByTerm(ctx, {
  termId: landscapeCategoryId,
});
```

## Using with Field Types

Content types can include `tags` and `category` field types that integrate with taxonomies:

```typescript
const blogPost = await cms.contentTypes.create(ctx, {
  name: "blog_post",
  displayName: "Blog Post",
  fields: [
    { name: "title", type: "text", required: true },
    { name: "content", type: "richText", required: true },

    // Flat tags field
    {
      name: "tags",
      type: "tags",
      options: {
        taxonomyName: "blog_tags",
        allowInlineCreation: true,  // Allow creating new tags on the fly
        maxTags: 10,
      },
    },

    // Hierarchical category field
    {
      name: "category",
      type: "category",
      required: true,
      options: {
        taxonomyName: "product_categories",
        multiple: false,
        depth: 2,  // Only show top 2 levels in picker
      },
    },
  ],
});
```

## Usage Tracking

Each term tracks its usage count automatically. This is useful for:
- Showing popular tags
- Identifying unused terms for cleanup
- Building tag clouds

```typescript
const popularTags = await cms.taxonomyTerms.list(ctx, {
  taxonomyId: tagsTaxonomyId,
  sortBy: "usageCount",
  sortDirection: "desc",
  paginationOpts: { numItems: 10 },
});
```

## Admin API Functions

The Admin API provides these taxonomy functions:

| Function | Description |
|----------|-------------|
| `listTaxonomies` | List all taxonomies |
| `getTaxonomy` | Get a taxonomy by ID |
| `createTaxonomy` | Create a new taxonomy |
| `updateTaxonomy` | Update a taxonomy |
| `deleteTaxonomy` | Soft delete a taxonomy |
| `restoreTaxonomy` | Restore a deleted taxonomy |
| `listTerms` | List terms in a taxonomy |
| `getTerm` | Get a term by ID |
| `getTermsHierarchy` | Get hierarchical tree |
| `suggestTerms` | Autocomplete suggestions |
| `countTerms` | Count terms in a taxonomy |
| `createTerm` | Create a new term |
| `updateTerm` | Update a term |
| `deleteTerm` | Delete a term |
| `restoreTerm` | Restore a deleted term |
| `getTermsByEntry` | Get terms for an entry |
| `getEntriesByTerm` | Get entries with a term |
| `setEntryTerms` | Set all terms for an entry |
| `addTermToEntry` | Add a term to an entry |
| `removeTermFromEntry` | Remove a term from an entry |
| `getTermsByMedia` | Get terms for a media asset |
| `getMediaByTerm` | Get media with a term |
| `setMediaTerms` | Set all terms for media |
| `addTermToMedia` | Add a term to media |
| `removeTermFromMedia` | Remove a term from media |

---

See also:
- [Field Types Reference](../api/field-types.md) — Tags and category field types
- [Content Modeling Guide](./content-modeling.md)
- [Media Management Guide](./media.md)
