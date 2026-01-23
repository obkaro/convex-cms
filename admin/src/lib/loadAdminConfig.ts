/**
 * Admin Config File Loader
 *
 * Loads admin configuration from a config file in the user's project directory.
 * Similar to how Vite loads vite.config.ts, this enables code-first configuration
 * that can be committed to git and reviewed in PRs.
 *
 * Supported file names (in order of precedence):
 * - cms-admin.config.ts
 * - cms-admin.config.js
 * - cms-admin.config.mjs
 *
 * @example
 * // cms-admin.config.ts
 * import { defineAdminConfig } from "@convex-cms/core";
 *
 * export default defineAdminConfig({
 *   branding: { appName: "My CMS" },
 *   navigation: { showTaxonomies: false },
 * });
 */

import { pathToFileURL } from "url";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import type { AdminConfig } from "./admin-config";

const CONFIG_FILE_NAMES = [
  "cms-admin.config.ts",
  "cms-admin.config.js",
  "cms-admin.config.mjs",
];

let cachedConfig: Partial<AdminConfig> | null = null;
let cachedConfigPath: string | null = null;

function findProjectRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== dirname(dir)) {
    if (existsSync(resolve(dir, "package.json"))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return startDir;
}

export async function loadAdminConfig(
  cwd?: string
): Promise<Partial<AdminConfig>> {
  const projectRoot = cwd ?? findProjectRoot(process.cwd());

  for (const fileName of CONFIG_FILE_NAMES) {
    const configPath = resolve(projectRoot, fileName);
    if (existsSync(configPath)) {
      if (cachedConfig && cachedConfigPath === configPath) {
        return cachedConfig;
      }

      try {
        const configUrl = pathToFileURL(configPath).href;
        let loadedConfig: Partial<AdminConfig>;

        if (configPath.endsWith(".ts")) {
          const importPath = `${configUrl}?ts=${Date.now()}`;
          const configModule = await import(importPath);
          loadedConfig = configModule.default ?? configModule;
        } else {
          const configModule = await import(configUrl);
          loadedConfig = configModule.default ?? configModule;
        }

        cachedConfig = loadedConfig;
        cachedConfigPath = configPath;
        return loadedConfig;
      } catch (error) {
        console.warn(`Failed to load ${fileName}:`, error);
      }
    }
  }

  return {};
}

export function clearConfigCache(): void {
  cachedConfig = null;
  cachedConfigPath = null;
}

export function getConfigPath(): string | null {
  return cachedConfigPath;
}
