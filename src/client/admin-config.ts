/**
 * Admin UI Configuration Re-exports
 *
 * These utilities allow users to define admin UI configuration
 * in a code-first, type-safe manner.
 *
 * @example
 * // cms-admin.config.ts
 * import { defineAdminConfig } from "@convex-cms/core";
 *
 * export default defineAdminConfig({
 *   branding: {
 *     appName: "My Blog CMS",
 *     logo: "/logo.svg",
 *   },
 *   navigation: {
 *     showTaxonomies: false,
 *     customItems: [
 *       {
 *         id: "analytics",
 *         path: "/analytics",
 *         label: "Analytics",
 *         icon: "BarChart",
 *         section: "main",
 *       },
 *     ],
 *   },
 *   theme: {
 *     mode: "dark",
 *   },
 * });
 */

import { z } from "zod";

export interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: string;
  visible?: boolean;
  section: "main" | "config";
  badge?: string;
  exact?: boolean;
}

const navItemSchema = z.object({
  id: z.string(),
  path: z.string(),
  label: z.string(),
  icon: z.string(),
  visible: z.boolean().default(true),
  section: z.enum(["main", "config"]).default("main"),
  badge: z.string().optional(),
  exact: z.boolean().optional(),
}) satisfies z.ZodType<NavItem>;

const brandingSchema = z.object({
  appName: z.string().default("Convex CMS"),
  logo: z.string().optional(),
  favicon: z.string().optional(),
});

const layoutSchema = z.object({
  sidebarWidth: z.number().min(200).max(400).default(256),
  sidebarCollapsible: z.boolean().default(false),
});

const navigationSchema = z.object({
  showDashboard: z.boolean().default(true),
  showContent: z.boolean().default(true),
  showMedia: z.boolean().default(true),
  showTaxonomies: z.boolean().default(true),
  showContentTypes: z.boolean().default(true),
  showTrash: z.boolean().default(true),
  showSettings: z.boolean().default(true),
  customItems: z.array(navItemSchema).default([]),
});

const themeSchema = z.object({
  mode: z.enum(["light", "dark", "system"]).default("system"),
  allowModeSwitch: z.boolean().default(true),
  tokens: z.record(z.string(), z.string()).optional(),
});

export const adminConfigSchema = z.object({
  branding: brandingSchema.default(() => brandingSchema.parse({})),
  layout: layoutSchema.default(() => layoutSchema.parse({})),
  navigation: navigationSchema.default(() => navigationSchema.parse({})),
  theme: themeSchema.default(() => themeSchema.parse({})),
});

export type AdminConfig = z.infer<typeof adminConfigSchema>;

/**
 * Define admin UI configuration for your CMS.
 *
 * Use this function in a cms-admin.config.ts file at your project root,
 * or pass the config directly to the <CmsAdmin /> component for embedded mode.
 *
 * @param config - Partial admin configuration (uses sensible defaults)
 * @returns The configuration object (unchanged, for type inference)
 *
 * @example
 * // Code-first config file approach (cms-admin.config.ts)
 * import { defineAdminConfig } from "@convex-cms/core";
 *
 * export default defineAdminConfig({
 *   branding: { appName: "My CMS" },
 *   navigation: { showTaxonomies: false },
 * });
 *
 * @example
 * // Embedded admin approach
 * import { CmsAdmin, defineAdminConfig } from "@convex-cms/admin/embed";
 *
 * const config = defineAdminConfig({
 *   branding: { appName: "My CMS" },
 * });
 *
 * function App() {
 *   return <CmsAdmin config={config} ... />;
 * }
 */
export function defineAdminConfig(config: Partial<AdminConfig>): Partial<AdminConfig> {
  return config;
}

/**
 * Resolve partial admin config with defaults.
 *
 * @param input - Partial configuration
 * @returns Full configuration with all defaults applied
 */
export function resolveAdminConfig(input?: Partial<AdminConfig>): AdminConfig {
  return adminConfigSchema.parse(input ?? {});
}
