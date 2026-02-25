/**
 * CMS templates index
 *
 * Each template is a complete cms.ts file with content types + typed helpers.
 */

export {
  CMS_BLOG_TEMPLATE,
  BLOG_SCHEMA_DESCRIPTION,
} from "./blog.js";

export {
  CMS_DOCS_TEMPLATE,
  DOCS_SCHEMA_DESCRIPTION,
} from "./docs.js";

export {
  CMS_LANDING_TEMPLATE,
  LANDING_SCHEMA_DESCRIPTION,
} from "./landing.js";

export {
  CMS_ECOMMERCE_TEMPLATE,
  ECOMMERCE_SCHEMA_DESCRIPTION,
} from "./ecommerce.js";

export type SchemaTemplate = "blog" | "docs" | "landing" | "ecommerce" | "blank";

export const SCHEMA_TEMPLATE_INFO: Record<
  SchemaTemplate,
  { description: string }
> = {
  blog: { description: "Blog (post, author, category)" },
  docs: { description: "Documentation (page, section, navigation)" },
  landing: { description: "Landing Page (hero, features, testimonials, FAQ)" },
  ecommerce: { description: "E-commerce (product, category, FAQ)" },
  blank: { description: "Blank (starter blog post)" },
};
