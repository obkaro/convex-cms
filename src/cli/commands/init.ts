/**
 * Init Command
 *
 * Sets up Convex CMS in a project with interactive template selection.
 *
 * Usage:
 *   npx convex-cms init                    # Interactive mode
 *   npx convex-cms init --template blog    # Use blog template
 *   npx convex-cms init --force            # Overwrite existing files
 */

import path from "path";
import {
  promptForTemplate,
  showIntro,
  showOutro,
  logStep,
  logSuccess,
  logWarning,
  logError,
  logInfo,
  note,
  type SchemaTemplate,
} from "../utils/prompts.js";
import {
  fileExists,
  writeFile,
  updateConvexConfig,
  type FileWriteResult,
} from "../utils/fileUtils.js";
import { ADMIN_TEMPLATE } from "../templates/admin.js";
import { CMS_CONFIG_TEMPLATE } from "../templates/cmsConfig.js";
import { CMS_CLIENT_TEMPLATE } from "../templates/cmsClient.js";
import { BLOG_SCHEMA_TEMPLATE } from "../templates/schemas/blog.js";
import { DOCS_SCHEMA_TEMPLATE } from "../templates/schemas/docs.js";
import { LANDING_SCHEMA_TEMPLATE } from "../templates/schemas/landing.js";

export interface InitOptions {
  force?: boolean;
  template?: string;
}

const TEMPLATE_DESCRIPTIONS: Record<SchemaTemplate, string> = {
  blog: "Blog content types",
  docs: "Documentation content types",
  landing: "Landing page content types",
  blank: "No schemas",
};

function getSchemaTemplate(template: SchemaTemplate): string | null {
  switch (template) {
    case "blog":
      return BLOG_SCHEMA_TEMPLATE;
    case "docs":
      return DOCS_SCHEMA_TEMPLATE;
    case "landing":
      return LANDING_SCHEMA_TEMPLATE;
    case "blank":
      return null;
    default:
      return null;
  }
}

function validateTemplate(template: string): template is SchemaTemplate {
  return ["blog", "docs", "landing", "blank"].includes(template);
}

export async function initCommand(options: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const convexDir = path.join(cwd, "convex");

  if (!fileExists(convexDir)) {
    console.log("");
    logError("No convex/ directory found.");
    console.log("");
    logInfo("Please run this command from a Convex project root,");
    logInfo("or initialize Convex first with: npx convex dev");
    process.exit(1);
  }

  let template: SchemaTemplate;

  if (options.template) {
    if (!validateTemplate(options.template)) {
      logError(`Invalid template: ${options.template}`);
      logInfo("Valid templates: blog, docs, landing, blank");
      process.exit(1);
    }
    template = options.template;
    showIntro();
    logStep(`Using template: ${template}`);
  } else {
    const result = await promptForTemplate();
    if (result.cancelled) {
      process.exit(0);
    }
    template = result.template;
  }

  const files: Array<{ name: string; path: string; content: string }> = [
    {
      name: "convex/admin.ts",
      path: path.join(convexDir, "admin.ts"),
      content: ADMIN_TEMPLATE,
    },
    {
      name: "convex/cms.config.ts",
      path: path.join(convexDir, "cms.config.ts"),
      content: CMS_CONFIG_TEMPLATE,
    },
    {
      name: "convex/cms.ts",
      path: path.join(convexDir, "cms.ts"),
      content: CMS_CLIENT_TEMPLATE,
    },
  ];

  const schemaContent = getSchemaTemplate(template);
  if (schemaContent) {
    files.push({
      name: "convex/schemas.ts",
      path: path.join(convexDir, "schemas.ts"),
      content: schemaContent,
    });
  }

  console.log("");
  logStep("Creating files...");

  const results: FileWriteResult[] = [];
  const createdFiles: string[] = [];
  const modifiedFiles: string[] = [];
  const skippedFiles: string[] = [];

  for (const file of files) {
    try {
      const result = writeFile(file.path, file.content, {
        force: options.force,
      });
      results.push(result);

      if (result.created) {
        createdFiles.push(file.name);
        logSuccess(`${file.name}`);
      } else if (result.modified) {
        modifiedFiles.push(file.name);
        logSuccess(`${file.name} (updated)`);
      } else if (result.skipped) {
        skippedFiles.push(file.name);
        logWarning(`${file.name} (skipped - already exists)`);
      }
    } catch (error) {
      logError(`Failed to write ${file.name}: ${error}`);
    }
  }

  const configPath = path.join(convexDir, "convex.config.ts");
  const configResult = updateConvexConfig(configPath, { force: options.force });

  console.log("");
  if (configResult.created) {
    logSuccess("convex/convex.config.ts (created)");
  } else if (configResult.modified) {
    logSuccess("convex/convex.config.ts (added CMS component)");
  } else if (configResult.skipped) {
    logInfo("convex/convex.config.ts (CMS already configured)");
  }

  if (skippedFiles.length > 0 && !options.force) {
    console.log("");
    logWarning("Some files were skipped. Use --force to overwrite.");
  }

  const nextSteps = `
1. Start Convex:
   npx convex dev

2. Launch admin UI (development):
   npx convex-cms admin

Documentation: https://github.com/obkaro/convex-cms`;

  note(nextSteps, "Next steps");

  const templateDesc = TEMPLATE_DESCRIPTIONS[template];
  showOutro(`Setup complete! Template: ${templateDesc}`);
}
