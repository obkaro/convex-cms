/**
 * Schema templates index
 */

export {
  BLOG_SCHEMA_TEMPLATE,
  BLOG_SCHEMA_DESCRIPTION,
} from "./blog.js";

export {
  DOCS_SCHEMA_TEMPLATE,
  DOCS_SCHEMA_DESCRIPTION,
} from "./docs.js";

export {
  LANDING_SCHEMA_TEMPLATE,
  LANDING_SCHEMA_DESCRIPTION,
} from "./landing.js";

export type SchemaTemplate = "blog" | "docs" | "landing" | "blank";

export const SCHEMA_TEMPLATE_INFO: Record<
  SchemaTemplate,
  { description: string }
> = {
  blog: { description: "Blog (post, author, category)" },
  docs: { description: "Documentation (page, section, navigation)" },
  landing: { description: "Landing Page (hero, features, testimonials)" },
  blank: { description: "Blank (no schemas)" },
};
