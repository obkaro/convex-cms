# Query Builder

The Query Builder provides a fluent, chainable API for constructing complex content queries. It supports filtering, sorting, pagination, and full-text search.

## Quick Start

```typescript
import { cms } from "./cms";

// Simple query
const posts = await cms.contentEntries
  .query()
  .contentType("blog_post")
  .status("published")
  .limit(10)
  .execute(ctx);

// Complex query with multiple filters
const featured = await cms.contentEntries
  .query()
  .contentType("blog_post")
  .published()
  .where("category", "eq", "technology")
  .where("featured", "eq", true)
  .orderBy("_creationTime", "desc")
  .limit(5)
  .execute(ctx);
```

## Chain Methods

### Content Type Filtering

```typescript
// Filter by content type name
.contentType("blog_post")
```

### Status Filtering

```typescript
// Single status
.status("published")

// Multiple statuses (OR logic)
.statusIn(["draft", "published", "scheduled"])

// Shortcuts
.published()   // same as .status("published")
.drafts()      // same as .status("draft")
.archived()    // same as .status("archived")
.scheduled()   // same as .status("scheduled")
```

### Locale Filtering

```typescript
.locale("en-US")
.locale("es-ES")
```

### Soft Delete Filtering

```typescript
// Include soft-deleted entries
.includeDeleted()
.includeDeleted(true)

// Exclude deleted (default)
.includeDeleted(false)

// Only return deleted entries
.onlyDeleted()
```

### Full-Text Search

```typescript
// Search across all indexed fields
.search("typescript tutorial")
```

### Field Filters

The query builder supports various comparison operators:

```typescript
// Basic comparison
.where("category", "eq", "technology")    // equals
.where("views", "ne", 0)                  // not equals
.where("price", "gt", 100)                // greater than
.where("price", "gte", 100)               // greater than or equal
.where("stock", "lt", 10)                 // less than
.where("stock", "lte", 10)                // less than or equal

// String operators
.where("title", "contains", "guide")
.where("slug", "startsWith", "2024-")
.where("email", "endsWith", "@example.com")

// Array operators
.where("status", "in", ["draft", "published"])
.where("category", "notIn", ["archived", "deleted"])

// Shorthand methods
.whereEquals("featured", true)
.whereNotEquals("status", "archived")
.whereGreaterThan("price", 100)
.whereGreaterThanOrEquals("price", 100)
.whereLessThan("stock", 10)
.whereLessThanOrEquals("stock", 10)
.whereBetween("price", 50, 150)
.whereIn("category", ["tech", "science"])
.whereNotIn("status", ["archived"])
.whereContains("tags", "featured")
.whereStartsWith("slug", "2024-")
.whereEndsWith("email", "@company.com")
```

Multiple filters are combined with AND logic:

```typescript
const results = await cms.contentEntries
  .query()
  .contentType("product")
  .where("category", "eq", "electronics")
  .where("price", "gte", 100)
  .where("price", "lte", 500)
  .where("inStock", "eq", true)
  .execute(ctx);
```

### Sorting

```typescript
// By system field
.orderBy("_creationTime", "desc")
.orderBy("_creationTime", "asc")
.orderBy("_id", "asc")

// By publish date
.orderBy("firstPublishedAt", "desc")
.orderBy("lastPublishedAt", "desc")

// By custom data field
.orderBy("data.price", "asc")
.orderBy("data.sortOrder", "asc")

// Convenience methods
.orderByField("price", "asc")    // same as .orderBy("data.price", "asc")
.byPublishDate("desc")           // sort by firstPublishedAt
.byLastPublishDate("desc")       // sort by lastPublishedAt
.newestFirst()                   // orderBy("_creationTime", "desc")
.oldestFirst()                   // orderBy("_creationTime", "asc")
```

### Pagination

```typescript
// Set page size (1-250, default 50)
.limit(20)

// Use cursor for next page
.cursor(previousResult.continueCursor)

// Alternative syntax
.after(previousResult.continueCursor)
```

## Terminal Methods

Terminal methods execute the query and return results:

### execute()

Returns paginated results:

```typescript
const result = await cms.contentEntries
  .query()
  .contentType("blog_post")
  .published()
  .limit(10)
  .execute(ctx);

console.log(result.page);           // Array of entries
console.log(result.isDone);         // true if no more results
console.log(result.continueCursor); // Cursor for next page
console.log(result.hasMore);        // Convenience: !isDone
```

### first()

Returns the first matching entry or null:

```typescript
const latest = await cms.contentEntries
  .query()
  .contentType("blog_post")
  .published()
  .newestFirst()
  .first(ctx);

if (latest) {
  console.log(latest.data.title);
}
```

### exists()

Checks if any results exist:

```typescript
const hasPublished = await cms.contentEntries
  .query()
  .contentType("blog_post")
  .published()
  .exists(ctx);

if (!hasPublished) {
  console.log("No published posts yet");
}
```

### all()

Fetches all matching results (use with caution on large datasets):

```typescript
// Fetches up to 10 pages by default
const allPosts = await cms.contentEntries
  .query()
  .contentType("blog_post")
  .published()
  .all(ctx);

// Custom page limit
const allPosts = await cms.contentEntries
  .query()
  .contentType("blog_post")
  .all(ctx, 5);  // max 5 pages
```

## Pagination Example

```typescript
// First page
const page1 = await cms.contentEntries
  .query()
  .contentType("blog_post")
  .published()
  .limit(20)
  .execute(ctx);

// Check for more pages
if (!page1.isDone) {
  // Fetch next page using cursor
  const page2 = await cms.contentEntries
    .query()
    .contentType("blog_post")
    .published()
    .limit(20)
    .cursor(page1.continueCursor)
    .execute(ctx);
}
```

## Utility Methods

### clone()

Create a copy of the query builder for variations:

```typescript
const baseQuery = cms.contentEntries
  .query()
  .contentType("blog_post");

const published = await baseQuery.clone()
  .published()
  .execute(ctx);

const drafts = await baseQuery.clone()
  .drafts()
  .execute(ctx);
```

### reset()

Reset the query builder to initial state:

```typescript
query.reset();
```

### toOptions()

Get the compiled query options (useful for debugging):

```typescript
const options = cms.contentEntries
  .query()
  .contentType("blog_post")
  .published()
  .orderBy("data.price", "asc")
  .toOptions();

console.log(options);
// {
//   contentTypeName: "blog_post",
//   status: "published",
//   sortField: "data.price",
//   sortDirection: "asc",
//   fieldFilters: [],
//   paginationOpts: { numItems: 50, cursor: null }
// }
```

## Complete Example

```typescript
// Build a product listing query
const products = await cms.contentEntries
  .query()
  .contentType("product")
  .published()
  .locale("en-US")
  .where("category", "eq", "electronics")
  .whereBetween("price", 100, 500)
  .whereEquals("inStock", true)
  .orderByField("price", "asc")
  .limit(20)
  .execute(ctx);

// Display results
for (const product of products.page) {
  console.log(`${product.data.name}: $${product.data.price}`);
}

// Load more if available
if (products.hasMore) {
  const moreProducts = await cms.contentEntries
    .query()
    .contentType("product")
    .published()
    // ... same filters ...
    .cursor(products.continueCursor)
    .execute(ctx);
}
```

---

See also:
- [Client API Reference](../api/client-api.md)
- [Getting Started Guide](./getting-started.md)
- [Content Modeling Guide](./content-modeling.md)
