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
  type: FieldType;        // One of the types below

  // Optional properties
  required?: boolean;     // Must have value (default: false)
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
  type: "text",
  required: true,
}

// With validation
{
  name: "email",
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
  type: "text",
  options: {
    multiline: true,
    maxLength: 500,
    placeholder: "Enter a brief summary...",
  },
}

// URL field
{
  name: "website",
  type: "text",
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
  maxLength?: number;        // Max characters (excluding HTML tags)
  allowedFormats?: string[]; // Restrict formatting options
  placeholder?: string;      // Placeholder text
}
```

### Allowed Formats

- `bold`, `italic`, `underline`, `strikethrough`
- `heading1`, `heading2`, `heading3`
- `orderedList`, `bulletList`
- `link`, `image`
- `blockquote`, `codeBlock`
- `table`

### Examples

```typescript
// Full rich text
{
  name: "content",
  type: "richText",
  required: true,
}

// Limited formatting
{
  name: "bio",
  type: "richText",
  options: {
    allowedFormats: ["bold", "italic", "link"],
    maxLength: 2000,
  },
}

// Blog content
{
  name: "body",
  type: "richText",
  searchable: true,
  options: {
    allowedFormats: [
      "bold", "italic", "underline",
      "heading1", "heading2", "heading3",
      "orderedList", "bulletList",
      "link", "image", "blockquote", "codeBlock",
    ],
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
  type: "number",
  options: {
    min: 0,
    max: 999,
    step: 1,
  },
}

// Currency
{
  name: "price",
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
  type: "number",
  options: {
    min: 0,
    max: 100,
    suffix: "%",
  },
}

// Rating
{
  name: "rating",
  type: "number",
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
  type: "boolean",
  defaultValue: false,
}

// With labels
{
  name: "isActive",
  type: "boolean",
  defaultValue: true,
  options: {
    trueLabel: "Active",
    falseLabel: "Inactive",
  },
}

// Consent flag
{
  name: "acceptedTerms",
  type: "boolean",
  required: true,  // Must be explicitly set
}
```

---

## date

Date without time component.

### Options

```typescript
interface DateOptions {
  minDate?: string;       // Earliest allowed date (ISO format)
  maxDate?: string;       // Latest allowed date (ISO format)
  format?: string;        // Display format (default: "yyyy-MM-dd")
}
```

### Examples

```typescript
// Simple date
{
  name: "birthDate",
  type: "date",
}

// With constraints
{
  name: "eventDate",
  type: "date",
  required: true,
  options: {
    minDate: "2026-01-01",
    maxDate: "2025-12-31",
  },
}

// Past dates only
{
  name: "foundedDate",
  type: "date",
  options: {
    maxDate: new Date().toISOString().split("T")[0],  // Today
  },
}
```

---

## datetime

Date with time component.

### Options

```typescript
interface DatetimeOptions {
  minDate?: string;       // Earliest allowed (ISO format)
  maxDate?: string;       // Latest allowed (ISO format)
  timezone?: string;      // IANA timezone (e.g., "America/New_York")
  format?: string;        // Display format
}
```

### Examples

```typescript
// Event time
{
  name: "eventTime",
  type: "datetime",
  required: true,
}

// With timezone
{
  name: "meetingTime",
  type: "datetime",
  options: {
    timezone: "America/New_York",
  },
}

// Future only
{
  name: "scheduledPublishAt",
  type: "datetime",
  options: {
    minDate: new Date().toISOString(),
  },
}
```

---

## select

Single selection from predefined options.

### Options

```typescript
interface SelectOptions {
  options: Array<{
    value: string;        // Stored value
    label: string;        // Display label
  }>;
  defaultValue?: string;  // Default selected value
}
```

### Examples

```typescript
// Status field
{
  name: "status",
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
  type: "select",
  options: {
    options: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
      { value: "critical", label: "Critical" },
    ],
    defaultValue: "medium",
  },
}

// Category (non-hierarchical)
{
  name: "department",
  type: "select",
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
  options: Array<{
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
  type: "multiSelect",
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
  contentTypes?: string[];  // Restrict to specific types (names)
  multiple?: boolean;       // Allow multiple references
  maxItems?: number;        // Max references (if multiple)
}
```

### Examples

```typescript
// Single reference
{
  name: "author",
  type: "reference",
  required: true,
  options: {
    contentTypes: ["author"],
  },
}

// Multiple references
{
  name: "relatedPosts",
  type: "reference",
  options: {
    contentTypes: ["blog_post"],
    multiple: true,
    maxItems: 5,
  },
}

// Any content type
{
  name: "linkedContent",
  type: "reference",
  options: {
    multiple: true,
    maxItems: 10,
  },
}

// Self-referencing (e.g., parent page)
{
  name: "parentPage",
  type: "reference",
  options: {
    contentTypes: ["page"],  // Same type as current
  },
}
```

---

## media

Link to media assets (images, videos, documents).

### Options

```typescript
interface MediaOptions {
  allowedTypes?: string[];  // MIME type patterns (e.g., "image/*")
  maxSize?: number;         // Max file size in bytes
  multiple?: boolean;       // Allow multiple assets
  maxItems?: number;        // Max assets (if multiple)
}
```

### Examples

```typescript
// Single image
{
  name: "featuredImage",
  type: "media",
  options: {
    allowedTypes: ["image/*"],
  },
}

// Image gallery
{
  name: "gallery",
  type: "media",
  options: {
    allowedTypes: ["image/*"],
    multiple: true,
    maxItems: 20,
  },
}

// Document attachment
{
  name: "resume",
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

// Video
{
  name: "video",
  type: "media",
  options: {
    allowedTypes: ["video/*"],
    maxSize: 100 * 1024 * 1024,  // 100MB
  },
}

// Any media
{
  name: "attachment",
  type: "media",
  options: {
    maxSize: 25 * 1024 * 1024,
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
  defaultValue?: object;    // Default JSON structure
}
```

### Examples

```typescript
// Unstructured JSON
{
  name: "metadata",
  type: "json",
}

// With schema
{
  name: "seoSettings",
  type: "json",
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
    defaultValue: {
      title: "",
      description: "",
      keywords: [],
      noIndex: false,
    },
  },
}

// Flexible data
{
  name: "customFields",
  type: "json",
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
  taxonomyName: string;       // Name of the taxonomy
  allowInlineCreation?: boolean;  // Create new tags on the fly
  maxTags?: number;           // Maximum number of tags
}
```

### Examples

```typescript
// Blog tags
{
  name: "tags",
  type: "tags",
  options: {
    taxonomyName: "blog_tags",
    allowInlineCreation: true,
    maxTags: 10,
  },
}

// Predefined tags only
{
  name: "topics",
  type: "tags",
  options: {
    taxonomyName: "topics",
    allowInlineCreation: false,
  },
}
```

---

## category

Hierarchical category field linked to a taxonomy.

### Options

```typescript
interface CategoryOptions {
  taxonomyName: string;       // Name of the hierarchical taxonomy
  multiple?: boolean;         // Allow multiple categories
  maxSelections?: number;     // Max categories (if multiple)
  depth?: number;             // Max depth to show in picker
}
```

### Examples

```typescript
// Single category
{
  name: "category",
  type: "category",
  required: true,
  options: {
    taxonomyName: "product_categories",
  },
}

// Multiple categories
{
  name: "categories",
  type: "category",
  options: {
    taxonomyName: "article_categories",
    multiple: true,
    maxSelections: 3,
  },
}

// Limited depth
{
  name: "primaryCategory",
  type: "category",
  options: {
    taxonomyName: "store_categories",
    depth: 2,  // Only show top 2 levels
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
| date | valid date, minDate, maxDate |
| datetime | valid datetime, minDate, maxDate |
| select | value must be in options |
| multiSelect | values must be in options, min/max selections |
| reference | must be valid entry ID(s) |
| media | must be valid asset ID(s), type/size limits |
| json | JSON schema validation |
| tags | valid term IDs from taxonomy |
| category | valid term IDs from taxonomy |

### Custom Validation

For complex validation, use the `validate` hook:

```typescript
const cms = createCmsClient(components.convexCms, {
  hooks: {
    beforeCreate: async (ctx, { contentType, data }) => {
      // Custom validation
      if (contentType.name === "product") {
        if (data.salePrice && data.salePrice >= data.price) {
          throw new Error("Sale price must be less than regular price");
        }
      }
    },
  },
});
```

---

## Best Practices

### Field Naming

```typescript
// Good: camelCase, descriptive
{ name: "publishedAt", type: "datetime" }
{ name: "featuredImage", type: "media" }
{ name: "relatedPosts", type: "reference" }

// Avoid: inconsistent casing, abbreviations
{ name: "pub_date", type: "datetime" }
{ name: "img", type: "media" }
{ name: "related", type: "reference" }
```

### Descriptions

Add descriptions for complex fields:

```typescript
{
  name: "metaDescription",
  type: "text",
  description: "SEO description shown in search results. Keep under 160 characters.",
  options: { maxLength: 160 },
}
```

### Default Values

Provide sensible defaults:

```typescript
{
  name: "status",
  type: "select",
  defaultValue: "draft",  // New entries start as drafts
  options: { ... },
}
```

### Searchable Fields

Only mark fields that users will search:

```typescript
// Searchable: user-facing content
{ name: "title", type: "text", searchable: true }
{ name: "content", type: "richText", searchable: true }

// Not searchable: internal/metadata
{ name: "slug", type: "text", searchable: false }
{ name: "sortOrder", type: "number", searchable: false }
```

---

See also:
- [Content Modeling Guide](../guides/content-modeling.md)
- [Taxonomies Guide](../guides/taxonomies.md): For tags and category fields
