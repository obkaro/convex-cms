/**
 * File utilities for CLI
 */

import fs from "fs";
import path from "path";

export interface FileWriteResult {
  path: string;
  created: boolean;
  modified: boolean;
  skipped: boolean;
  reason?: string;
}

export function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

export function writeFile(
  filePath: string,
  content: string,
  options: { force?: boolean } = {}
): FileWriteResult {
  const exists = fileExists(filePath);

  if (exists && !options.force) {
    return {
      path: filePath,
      created: false,
      modified: false,
      skipped: true,
      reason: "File already exists",
    };
  }

  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf-8");

  return {
    path: filePath,
    created: !exists,
    modified: exists,
    skipped: false,
  };
}

export function updateConvexConfig(
  configPath: string,
  options: { force?: boolean } = {}
): FileWriteResult {
  if (!fileExists(configPath)) {
    const newContent = `import { defineApp } from "convex/server";
import convexCms from "convex-cms/convex.config";

const app = defineApp();
app.use(convexCms);

export default app;
`;
    return writeFile(configPath, newContent, options);
  }

  const content = readFile(configPath);

  if (content.includes("convexCms") || content.includes("convex-cms")) {
    return {
      path: configPath,
      created: false,
      modified: false,
      skipped: true,
      reason: "CMS component already configured",
    };
  }

  const importStatement = 'import convexCms from "convex-cms/convex.config";';
  const useStatement = "app.use(convexCms);";

  let updatedContent = content;

  const lastImportMatch = content.match(/^import .+ from .+;?\s*$/gm);
  if (lastImportMatch) {
    const lastImport = lastImportMatch[lastImportMatch.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertPos = lastImportIndex + lastImport.length;
    updatedContent =
      content.slice(0, insertPos) +
      "\n" +
      importStatement +
      content.slice(insertPos);
  } else {
    updatedContent = importStatement + "\n\n" + content;
  }

  const exportMatch = updatedContent.match(/export default app;?/);
  if (exportMatch && exportMatch.index !== undefined) {
    updatedContent =
      updatedContent.slice(0, exportMatch.index) +
      useStatement +
      "\n\n" +
      updatedContent.slice(exportMatch.index);
  }

  fs.writeFileSync(configPath, updatedContent, "utf-8");

  return {
    path: configPath,
    created: false,
    modified: true,
    skipped: false,
  };
}

export function getRelativePath(from: string, to: string): string {
  return path.relative(from, to);
}
