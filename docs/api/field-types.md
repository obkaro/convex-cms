# Field Types Reference

This document provides a complete reference for all field types available in Convex CMS.

## Overview

Convex CMS supports 13 field types, each with specific options and validation rules.

| Type | Description | Use Case |
|------|-------------|----------|
| `text` | Plain text | Titles, names, short text |
| `richText` | HTML formatted text | Body content, descriptions |
| `number` | Numeric values | Prices, quantities, ratings |
| `boolean` | True/false | Toggles, flags |
| `date` | Date without time | Birth dates, deadlines |
| `datetime` | Date with time | Events, timestamps |
| `select` | Single choice | Status, category |
| `multiSelect` | Multiple choices | Tags, features |
| `reference` | Link to other entries | Author, related content |
| `media` | Media assets | Images, documents |
| `json` | Arbitrary JSON | Metadata, custom structures |
| `tags` | Taxonomy-linked tags | Blog tags, keywords |
| `category` | Hierarchical categories | Product categories |

## Common Field Properties

All field types share these properties:

```typescript
interface FieldDefinition {
  name: string;           // Unique identifier (camelCase recommended)
  label: string;          // Human-readable label
  type: FieldType;        // One of the types below
  required: boolean;      // Must have value
  searchable?: boolean;   // Include in search index (default: false)
  localized?: boolean;    // Per-locale values (default: false)
  description?: string;   // Help text for editors
  defaultValue?: any;     // Default value for new entries
  options?: object;       // Type-specific options
}
```

---

## text

Plain text input for short to medium-length text.

### Options

```typescript
interface TextOptions {
  minLength?: number;        // Minimum character count
  maxLength?: number;        // Maximum character count
  pattern?: string;          // Regex pattern for validation
  patternMessage?: string;   // Error message for pattern mismatch
  placeholder?: string;      // Placeholder text in editor
  multiline?: boolean;       // Allow multiple lines (textarea)
}
```

### Examples

```typescript
// Simple text
{
  name: "title",
  label: "Title",
  type: "text",
  required: true,
}

// With validation
{
  name: "email",
  label: "Email Address",
  type: "text",
  required: true,
  options: {
    pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$",
    patternMessage: "Please enter a valid email address",
  },
}

// Multiline
{
  name: "excerpt",
  label: "Excerpt",
  type: "text",
  required: false,
  options: {
    multiline: true,
    maxLength: 500,
    placeholder: "Enter a brief summary...",
  },
}

// URL field
{
  name: "website",
  label: "Website",
  type: "text",
  required: false,
  options: {
    pattern: "^https?://.*",
    patternMessage: "Must be a valid URL starting with http:// or https://",
  },
}
```

---

## richText

HTML-formatted rich text with WYSIWYG editing.

### Options

```typescript
interface RichTextOptions {
  allowedBlocks?: string[];  // Restrict block types
  allowedMarks?: string[];   // Restrict inline formatting
  maxLength?: number;        // Max characters (excluding HTML tags)
  placeholder?: string;      // Placeholder text
}
```

### Examples

```typescript
// Full rich text
{
  name: "content",
  label: "Content",
  type: "richText",
  required: true,
}

// Limited formatting
{
  name: "bio",
  label: "Biography",
  type: "richText",
  required: false,
  options: {
    allowedMarks: ["bold", "italic"],
    allowedBlocks: ["paragraph", "link"],
    maxLength: 2000,
  },
}

// Blog content
{
  name: "body",
  label: "Body",
  type: "richText",
  required: true,
  searchable: true,
  options: {
    allowedBlocks: [
      "paragraph", "heading1", "heading2", "heading3",
      "orderedList", "bulletList",
      "blockquote", "codeBlock", "image",
    ],
    allowedMarks: ["bold", "italic", "underline", "link"],
  },
}
```

---

## number

Numeric values (integers or decimals).

### Options

```typescript
interface NumberOptions {
  min?: number;           // Minimum value
  max?: number;           // Maximum value
  step?: number;          // Increment step (e.g., 0.01 for currency)
  precision?: number;     // Decimal places to display
  prefix?: string;        // Display prefix (e.g., "$")
  suffix?: string;        // Display suffix (e.g., "%")
}
```

### Examples

```typescript
// Integer
{
  name: "quantity",
  label: "Quantity",
  type: "number",
  required: false,
  options: {
    min: 0,
    max: 999,
    step: 1,
  },
}

// Currency
{
  name: "price",
  label: "Price",
  type: "number",
  required: true,
  options: {
    min: 0,
    step: 0.01,
    precision: 2,
    prefix: "$",
  },
}

// Percentage
{
  name: "discount",
  label: "Discount",
  type: "number",
  required: false,
  options: {
    min: 0,
    max: 100,
    suffix: "%",
  },
}

// Rating
{
  name: "rating",
  label: "Rating",
  type: "number",
  required: false,
  options: {
    min: 1,
    max: 5,
    step: 0.5,
  },
}
```

---

## boolean

True/false toggle.

### Options

```typescript
interface BooleanOptions {
  trueLabel?: string;     // Label when true (e.g., "Active")
  falseLabel?: string;    // Label when false (e.g., "Inactive")
}
```

### Examples

```typescript
// Simple toggle
{
  name: "featured",
  label: "Featured",
  type: "boolean",
  required: false,
  defaultValue: false,
}

// With labels
{
  name: "isActive",
  label: "Active Status",
  type: "boolean",
  required: false,
  defaultValue: true,
  options: {
    trueLabel: "Active",
    falseLabel: "Inactive",
  },
}

// Consent flag
{
  name: "acceptedTerms",
  label: "Accepted Terms",
  type: "boolean",
  required: true,
}
```

---

## date

Date without time component.

### Options

```typescript
interface DateOptions {
  min?: number;           // Earliest allowed (timestamp ms)
  max?: number;           // Latest allowed (timestamp ms)
  format?: string;        // Display format
}
```

### Examples

```typescript
// Simple date
{
  name: "birthDate",
  label: "Birth Date",
  type: "date",
  required: false,
}

// With constraints
{
  name: "eventDate",
  label: "Event Date",
  type: "date",
  required: true,
  options: {
    min: 1704067200000,  // 2024-01-01
    max: 1767139200000,  // 2025-12-31
  },
}

// Past dates only
{
  name: "foundedDate",
  label: "Founded Date",
  type: "date",
  required: false,
  options: {
    max: Date.now(),
  },
}
```

---

## datetime

Date with time component.

### Options

```typescript
interface DatetimeOptions {
  min?: number;           // Earliest allowed (timestamp ms)
  max?: number;           // Latest allowed (timestamp ms)
  timezone?: string;      // IANA timezone (e.g., "America/New_York")
  format?: string;        // Display format
}
```

### Examples

```typescript
// Event time
{
  name: "eventTime",
  label: "Event Time",
  type: "datetime",
  required: true,
}

// With timezone
{
  name: "meetingTime",
  label: "Meeting Time",
  type: "datetime",
  required: false,
  options: {
    timezone: "America/New_York",
  },
}

// Future only
{
  name: "scheduledPublishAt",
  label: "Scheduled Publish",
  type: "datetime",
  required: false,
  options: {
    min: Date.now(),
  },
}
```

---

## select

Single selection from predefined options.

### Options

```typescript
interface SelectOptions {
  options?: Array<{
    value: string;        // Stored value
    label: string;        // Display label
  }>;
}
```

### Examples

```typescript
// Status field
{
  name: "status",
  label: "Status",
  type: "select",
  required: true,
  defaultValue: "draft",
  options: {
    options: [
      { value: "draft", label: "Draft" },
      { value: "review", label: "In Review" },
      { value: "approved", label: "Approved" },
      { value: "archived", label: "Archived" },
    ],
  },
}

// Priority
{
  name: "priority",
  label: "Priority",
  type: "select",
  required: false,
  options: {
    options: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
      { value: "critical", label: "Critical" },
    ],
  },
}

// Category (non-hierarchical)
{
  name: "department",
  label: "Department",
  type: "select",
  required: false,
  options: {
    options: [
      { value: "engineering", label: "Engineering" },
      { value: "design", label: "Design" },
      { value: "marketing", label: "Marketing" },
      { value: "sales", label: "Sales" },
    ],
  },
}
```

---

## multiSelect

Multiple selections from predefined options.

### Options

```typescript
interface MultiSelectOptions {
  options?: Array<{
    value: string;
    label: string;
  }>;
  minSelections?: number;   // Minimum required selections
  maxSelections?: number;   // Maximum allowed selections
}
```

### Examples

```typescript
// Features list
{
  name: "features",
  label: "Features",
  type: "multiSelect",
  required: false,
  options: {
    options: [
      { value: "wifi", label: "WiFi" },
      { value: "parking", label: "Parking" },
      { value: "pool", label: "Pool" },
      { value: "gym", label: "Gym" },
      { value: "spa", label: "Spa" },
    ],
  },
}

// With constraints
{
  name: "skills",
  label: "Skills",
  type: "multiSelect",
  required: true,
  options: {
    options: [
      { value: "js", label: "JavaScript" },
      { value: "ts", label: "TypeScript" },
      { value: "react", label: "React" },
      { value: "node", label: "Node.js" },
      { value: "python", label: "Python" },
    ],
    minSelections: 1,
    maxSelections: 5,
  },
}
```

---

## reference

Link to other content entries.

### Options

```typescript
interface ReferenceOptions {
  allowedContentTypes?: string[];  // Restrict to specific types (names)
  multiple?: boolean;              // Allow multiple references
  minItems?: number;               // Min references (if multiple)
  maxItems?: number;               // Max references (if multiple)
}
```

### Examples

```typescript
// Single reference
{
  name: "author",
  label: "Author",
  type: "reference",
  required: true,
  options: {
    allowedContentTypes: ["author"],
  },
}

// Multiple references
{
  name: "relatedPosts",
  label: "Related Posts",
  type: "reference",
  required: false,
  options: {
    allowedContentTypes: ["blog_post"],
    multiple: true,
    maxItems: 5,
  },
}

// Any content type
{
  name: "linkedContent",
  label: "Linked Content",
  type: "reference",
  required: false,
  options: {
    multiple: true,
    maxItems: 10,
  },
}

// Self-referencing (e.g., parent page)
{
  name: "parentPage",
  label: "Parent Page",
  type: "reference",
  required: false,
  options: {
    allowedContentTypes: ["page"],
  },
}
```

---

## media

Link to media assets (images, videos, documents).

### Options

```typescript
interface MediaOptions {
  mediaType?: "image" | "video" | "audio" | "document" | "other";
  allowedMimeTypes?: string[];   // MIME type patterns (e.g., "image/*")
  maxFileSize?: number;          // Max file size in bytes
  multiple?: boolean;            // Allow multiple assets
  maxItems?: number;             // Max assets (if multiple)
}
```

### Examples

```typescript
// Single image
{
  name: "featuredImage",
  label: "Featured Image",
  type: "media",
  required: false,
  options: {
    mediaType: "image",
  },
}

// Image gallery
{
  name: "gallery",
  label: "Gallery",
  type: "media",
  required: false,
  options: {
    mediaType: "image",
    multiple: true,
    maxItems: 20,
  },
}

// Document attachment
{
  name: "resume",
  label: "Resume",
  type: "media",
  required: false,
  options: {
    mediaType: "document",
    allowedMimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxFileSize: 10 * 1024 * 1024,  // 10MB
  },
}

// Video
{
  name: "video",
  label: "Video",
  type: "media",
  required: false,
  options: {
    mediaType: "video",
    maxFileSize: 100 * 1024 * 1024,  // 100MB
  },
}

// Any media
{
  name: "attachment",
  label: "Attachment",
  type: "media",
  required: false,
  options: {
    maxFileSize: 25 * 1024 * 1024,
  },
}
```

---

## json

Arbitrary JSON data structures.

### Options

```typescript
interface JsonOptions {
  schema?: object;          // JSON Schema for validation
}
```

### Examples

```typescript
// Unstructured JSON
{
  name: "metadata",
  label: "Metadata",
  type: "json",
  required: false,
}

// With schema
{
  name: "seoSettings",
  label: "SEO Settings",
  type: "json",
  required: false,
  options: {
    schema: {
      type: "object",
      properties: {
        title: { type: "string", maxLength: 60 },
        description: { type: "string", maxLength: 160 },
        keywords: { type: "array", items: { type: "string" } },
        noIndex: { type: "boolean" },
      },
      required: ["title"],
    },
  },
}

// Flexible data
{
  name: "customFields",
  label: "Custom Fields",
  type: "json",
  required: false,
  options: {
    schema: {
      type: "object",
      additionalProperties: true,
    },
  },
}
```

---

## tags

Tag field linked to a taxonomy (flat structure).

### Options

```typescript
interface TagsOptions {
  taxonomyId?: string;          // ID of the taxonomy
  allowCreate?: boolean;        // Allow creating new tags on the fly
  maxTags?: number;             // Maximum number of tags
  minTags?: number;             // Minimum number of tags
}
```

### Examples

```typescript
// Blog tags
{
  name: "tags",
  label: "Tags",
  type: "tags",
  required: false,
  options: {
    taxonomyId: "your_taxonomy_id",
    allowCreate: true,
    maxTags: 10,
  },
}

// Predefined tags only
{
  name: "topics",
  label: "Topics",
  type: "tags",
  required: false,
  options: {
    taxonomyId: "your_taxonomy_id",
    allowCreate: false,
  },
}
```

---

## category

Hierarchical category field linked to a taxonomy.

### Options

```typescript
interface CategoryOptions {
  taxonomyName?: string;        // Name of the hierarchical taxonomy
  allowMultiple?: boolean;      // Allow multiple categories
  maxSelections?: number;       // Max categories (if allowMultiple)
  depth?: number;               // Max depth to show in picker
}
```

### Examples

```typescript
// Single category
{
  name: "category",
  label: "Category",
  type: "category",
  required: true,
  options: {
    taxonomyName: "product_categories",
  },
}

// Multiple categories
{
  name: "categories",
  label: "Categories",
  type: "category",
  required: false,
  options: {
    taxonomyName: "article_categories",
    allowMultiple: true,
    maxSelections: 3,
  },
}

// Limited depth
{
  name: "primaryCategory",
  label: "Primary Category",
  type: "category",
  required: false,
  options: {
    taxonomyName: "store_categories",
    depth: 2,
  },
}
```

---

## Validation

### Built-in Validation

Each field type has automatic validation:

| Type | Validations |
|------|-------------|
| text | minLength, maxLength, pattern |
| richText | maxLength (text content) |
| number | min, max, step |
| boolean | must be true/false |
| date | valid date, min, max |
| datetime | valid datetime, min, max |
| select | value must be in options |
| multiSelect | values must be in options, min/max selections |
| reference | must be valid entry ID(s) |
| media | must be valid asset ID(s), type/size limits |
| json | JSON schema validation |
| tags | valid term IDs from taxonomy |
| category | valid term IDs from taxonomy |

### Custom Validation

For custom validation logic, use `authorizationHooks.operationHooks` when configuring the CMS client. Operation hooks run before mutations and can reject invalid data by throwing errors.

---

## Best Practices

### Field Naming

```typescript
// Good: camelCase, descriptive
{ name: "publishedAt", label: "Published At", type: "datetime", required: false }
{ name: "featuredImage", label: "Featured Image", type: "media", required: false }
{ name: "relatedPosts", label: "Related Posts", type: "reference", required: false }

// Avoid: inconsistent casing, abbreviations
{ name: "pub_date", label: "Pub Date", type: "datetime", required: false }
{ name: "img", label: "Image", type: "media", required: false }
{ name: "related", label: "Related", type: "reference", required: false }
```

### Descriptions

Add descriptions for complex fields:

```typescript
{
  name: "metaDescription",
  label: "Meta Description",
  type: "text",
  required: false,
  description: "SEO description shown in search results. Keep under 160 characters.",
  options: { maxLength: 160 },
}
```

### Default Values

Provide sensible defaults:

```typescript
{
  name: "status",
  label: "Status",
  type: "select",
  required: true,
  defaultValue: "draft",
  options: { ... },
}
```

### Searchable Fields

Only mark fields that users will search:

```typescript
// Searchable: user-facing content
{ name: "title", label: "Title", type: "text", required: true, searchable: true }
{ name: "content", label: "Content", type: "richText", required: true, searchable: true }

// Not searchable: internal/metadata
{ name: "slug", label: "Slug", type: "text", required: true, searchable: false }
{ name: "sortOrder", label: "Sort Order", type: "number", required: false, searchable: false }
```

---

See also:
- [Content Modeling Guide](../guides/content-modeling.md)
- [Taxonomies Guide](../guides/taxonomies.md): For tags and category fields
