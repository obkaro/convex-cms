# Agent Tools Integration

Convex CMS provides 23 pre-built tools for AI agent integration via `@convex-dev/agent`. Each tool includes a Zod schema for structured LLM output and clear descriptions for agent understanding.

## Quick Start

```typescript
import { Agent } from "@convex-dev/agent";
import { createCmsTools } from "convex-cms";
import { components } from "./_generated/api";

// Create all CMS tools
const cmsTools = createCmsTools(components.convexCms);

// Use with an agent
const contentAgent = new Agent(components.agent, {
  name: "Content Manager",
  languageModel: openai.chat("gpt-4o"),
  tools: cmsTools,
});
```

## Available Tools

### Content Type Tools (4)

| Tool | Description |
|------|-------------|
| `createContentType` | Create a new content type with field definitions |
| `updateContentType` | Update an existing content type's properties or fields |
| `listContentTypes` | List all content types defined in the CMS |
| `getContentType` | Get a single content type by ID or name |

### Content Entry Tools (10)

| Tool | Description |
|------|-------------|
| `createContentEntry` | Create a new content entry (starts as draft) |
| `updateContentEntry` | Update an entry's data, status, or slug |
| `publishEntry` | Publish a draft entry, creating a version snapshot |
| `unpublishEntry` | Revert a published entry to draft status |
| `scheduleEntry` | Schedule an entry for future publishing |
| `deleteContentEntry` | Delete an entry (soft delete by default) |
| `duplicateContentEntry` | Create a copy of an entry with new slug |
| `listContentEntries` | List entries with filtering and pagination |
| `getContentEntry` | Get an entry by ID or slug |
| `restoreContentEntry` | Restore a soft-deleted entry from trash |

### Media Asset Tools (5)

| Tool | Description |
|------|-------------|
| `createMediaAsset` | Create a media asset record after upload |
| `updateMediaAsset` | Update media metadata (title, description, alt text) |
| `listMediaAssets` | List media assets with filtering |
| `getMediaAsset` | Get a single media asset by ID |
| `deleteMediaAsset` | Delete a media asset (soft delete by default) |

### Bulk Operations (3)

| Tool | Description |
|------|-------------|
| `bulkPublish` | Publish multiple entries at once |
| `bulkUnpublish` | Unpublish multiple entries at once |
| `bulkDelete` | Delete multiple entries at once |

### Search (1)

| Tool | Description |
|------|-------------|
| `searchContent` | Search entries by text query across searchable fields |

## Using Selected Tools

For specialized agents, use only the tools they need:

```typescript
// Research agent - read-only tools
const { listContentEntries, searchContent, getContentEntry, getContentType } =
  createCmsTools(components.convexCms);

const researchAgent = new Agent(components.agent, {
  name: "Content Researcher",
  tools: { listContentEntries, searchContent, getContentEntry, getContentType },
});
```

```typescript
// Publishing agent - focused on workflow
const { publishEntry, unpublishEntry, scheduleEntry, bulkPublish } =
  createCmsTools(components.convexCms);

const publishingAgent = new Agent(components.agent, {
  name: "Publishing Workflow",
  tools: { publishEntry, unpublishEntry, scheduleEntry, bulkPublish },
});
```

## Zod Schemas

All tools include Zod schemas for type-safe structured output. These can be used directly for LLM structured output:

```typescript
import {
  createContentEntryArgsSchema,
  contentStatusSchema,
  fieldTypeSchema,
} from "convex-cms";

// Available schemas
contentStatusSchema;    // z.enum(["draft", "published", "archived", "scheduled"])
fieldTypeSchema;        // z.enum(["text", "richText", "number", ...])
mediaTypeSchema;        // z.enum(["image", "video", "audio", "document", "other"])
filterOperatorSchema;   // z.enum(["eq", "ne", "gt", "gte", "lt", "lte", ...])

// Argument schemas for each tool
createContentTypeArgsSchema;
updateContentTypeArgsSchema;
createContentEntryArgsSchema;
updateContentEntryArgsSchema;
publishEntryArgsSchema;
// ... etc
```

## Configuration Options

```typescript
const cmsTools = createCmsTools(components.convexCms, {
  // Optional: Set a default user ID for all operations
  defaultUserId: "agent-user-id",
});
```

When `defaultUserId` is set, all tools automatically use it for `createdBy`, `updatedBy`, and `deletedBy` fields unless explicitly overridden.

## Example: Content Creation Flow

Here's how an agent might use these tools to create and publish content:

```typescript
// 1. Check if content type exists
const blogType = await getContentType.handler(ctx, { name: "blog_post" });

// 2. Create a new entry
const entry = await createContentEntry.handler(ctx, {
  contentTypeName: "blog_post",
  data: {
    title: "AI-Generated Article",
    slug: "ai-generated-article",
    content: "<p>Article content here...</p>",
  },
});

// 3. Publish the entry
await publishEntry.handler(ctx, {
  id: entry._id,
  changeDescription: "Initial publication",
});
```

## Best Practices

1. **Use specific tools**: Give agents only the tools they need for their role
2. **Set defaultUserId**: Track which operations were performed by agents
3. **Prefer soft delete**: Use `hardDelete: false` (default) to allow recovery
4. **Use searchContent**: More efficient than listing and filtering
5. **Handle pagination**: For large datasets, use `cursor` for subsequent pages

## Tool Descriptions for LLMs

Each tool includes a detailed description that helps LLMs understand when and how to use it. For example:

```
createContentEntry:
"Create a new content entry for a specific content type.
Entries start as drafts by default. Provide field values
in the 'data' object matching the content type's field definitions."
```

These descriptions are optimized for LLM comprehension and include:
- What the tool does
- Default behaviors
- Required parameters
- Expected data structure

---

See also:
- [Client API Reference](../api/client-api.md)
- [Query Builder Guide](./query-builder.md)
- [Content Modeling Guide](./content-modeling.md)
