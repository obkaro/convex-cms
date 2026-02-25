# Taxonomies (Categories & Tags)

Taxonomies are classification systems for organizing content. Convex CMS supports two types:

- **Hierarchical taxonomies**: Nested categories (e.g., Electronics > Phones > Smartphones)
- **Flat taxonomies**: Simple tags (e.g., JavaScript, TypeScript, React)

Both content entries and media assets can be tagged with taxonomy terms.

> **Note**: Taxonomy operations are available through the Admin API (`defineAdminAPI`) or by calling component functions directly. The examples below show the API patterns used by the Admin UI backend.

## Quick Start

### Creating a Taxonomy

```typescript
// Create a flat taxonomy for blog tags
const tagsTaxonomy = await ctx.runMutation(
  components.convexCms.taxonomyMutations.createTaxonomy,
  {
    name: "blog_tags",
    displayName: "Blog Tags",
    isHierarchical: false,
    description: "Tags for blog posts",
    createdBy: userId,
  }
);

// Create a hierarchical taxonomy for product categories
const categoriesTaxonomy = await ctx.runMutation(
  components.convexCms.taxonomyMutations.createTaxonomy,
  {
    name: "product_categories",
    displayName: "Product Categories",
    isHierarchical: true,
    description: "Product category hierarchy",
    createdBy: userId,
  }
);
```

### Creating Terms

```typescript
// Create flat tags
await ctx.runMutation(
  components.convexCms.taxonomyMutations.createTerm,
  {
    taxonomyId: tagsTaxonomy._id,
    name: "JavaScript",
    slug: "javascript",
    createdBy: userId,
  }
);

await ctx.runMutation(
  components.convexCms.taxonomyMutations.createTerm,
  {
    taxonomyId: tagsTaxonomy._id,
    name: "TypeScript",
    slug: "typescript",
    createdBy: userId,
  }
);

// Create hierarchical categories
const electronics = await ctx.runMutation(
  components.convexCms.taxonomyMutations.createTerm,
  {
    taxonomyId: categoriesTaxonomy._id,
    name: "Electronics",
    slug: "electronics",
    createdBy: userId,
  }
);

// Create child category
await ctx.runMutation(
  components.convexCms.taxonomyMutations.createTerm,
  {
    taxonomyId: categoriesTaxonomy._id,
    name: "Phones",
    slug: "phones",
    parentId: electronics._id,
    createdBy: userId,
  }
);
```

### Assigning Terms to Content

```typescript
// Add a tag to an entry
await ctx.runMutation(
  components.convexCms.taxonomyMutations.addTermToEntry,
  {
    entryId: blogPostId,
    termId: javascriptTagId,
    fieldName: "tags",
    createdBy: userId,
  }
);

// Set all tags for an entry (replaces existing)
await ctx.runMutation(
  components.convexCms.taxonomyMutations.setEntryTerms,
  {
    entryId: blogPostId,
    fieldName: "tags",
    termIds: [javascriptTagId, typescriptTagId],
    updatedBy: userId,
  }
);

// Remove a tag
await ctx.runMutation(
  components.convexCms.taxonomyMutations.removeTermFromEntry,
  {
    entryId: blogPostId,
    termId: javascriptTagId,
    fieldName: "tags",
    updatedBy: userId,
  }
);
```

## Querying Taxonomies

### List All Taxonomies

```typescript
const taxonomies = await ctx.runQuery(
  components.convexCms.taxonomies.list,
  { isActive: true }
);
```

### Get Taxonomy by Name

```typescript
const taxonomy = await ctx.runQuery(
  components.convexCms.taxonomies.get,
  { name: "blog_tags" }
);
```

### List Terms in a Taxonomy

```typescript
// All terms in a taxonomy
const tags = await ctx.runQuery(
  components.convexCms.taxonomies.listTerms,
  { taxonomyId: tagsTaxonomyId }
);

// Only root-level terms (for hierarchical)
const rootCategories = await ctx.runQuery(
  components.convexCms.taxonomies.listTerms,
  {
    taxonomyId: categoriesTaxonomyId,
    depth: 0,
  }
);

// Children of a specific term
const phoneSubcategories = await ctx.runQuery(
  components.convexCms.taxonomies.listTerms,
  {
    taxonomyId: categoriesTaxonomyId,
    parentId: phonesCategoryId,
  }
);
```

### Get Hierarchical Tree

For nested category pickers, get the full tree structure:

```typescript
const tree = await ctx.runQuery(
  components.convexCms.taxonomies.getTermsHierarchy,
  { taxonomyId: categoriesTaxonomyId }
);

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
const suggestions = await ctx.runQuery(
  components.convexCms.taxonomies.suggestTerms,
  {
    taxonomyId: tagsTaxonomyId,
    query: "java",
    limit: 5,
  }
);
// Returns: [{ name: "JavaScript" }, { name: "Java" }, ...]
```

## Querying Content by Taxonomy

### Get Terms for an Entry

```typescript
// All terms assigned to an entry
const entryTags = await ctx.runQuery(
  components.convexCms.taxonomies.getTermsByEntry,
  { entryId: blogPostId }
);

// Terms from a specific field only
const primaryTags = await ctx.runQuery(
  components.convexCms.taxonomies.getTermsByEntry,
  {
    entryId: blogPostId,
    fieldName: "tags",
  }
);
```

### Get Entries with a Term

```typescript
// Find all entries tagged with "JavaScript"
const jsEntries = await ctx.runQuery(
  components.convexCms.taxonomies.getEntriesByTerm,
  {
    termId: javascriptTagId,
    status: "published",
    paginationOpts: { numItems: 20 },
  }
);
```

## Media Asset Taxonomies

Media assets can also be tagged:

```typescript
// Add a term to a media asset
await ctx.runMutation(
  components.convexCms.taxonomyMutations.addTermToMedia,
  {
    mediaId: imageId,
    termId: landscapeCategoryId,
    createdBy: userId,
  }
);

// Get terms for a media asset
const mediaTags = await ctx.runQuery(
  components.convexCms.taxonomies.getTermsByMedia,
  { mediaId: imageId }
);

// Get media assets with a specific term
const landscapeImages = await ctx.runQuery(
  components.convexCms.taxonomies.getMediaByTerm,
  { termId: landscapeCategoryId }
);
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
const popularTags = await ctx.runQuery(
  components.convexCms.taxonomies.listTerms,
  {
    taxonomyId: tagsTaxonomyId,
    sortBy: "usageCount",
    sortDirection: "desc",
    limit: 10,
  }
);
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
- [Field Types Reference](../api/field-types.md): Tags and category field types
- [Content Modeling Guide](./content-modeling.md)
- [Media Management Guide](./media.md)
