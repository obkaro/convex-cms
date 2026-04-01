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
  showUsers: z.boolean().default(true),
  showSettings: z.boolean().default(true),
  customItems: z.array(navItemSchema).default([]),
});

const roleSchema = z.object({
  value: z.string(),
  label: z.string(),
  description: z.string().optional(),
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
  /**
   * Custom roles for the Users page role dropdown.
   * By default, these are appended to the built-in roles (admin/editor/author/viewer).
   * Set `overrideBuiltInRoles: true` to replace the built-in roles entirely.
   */
  customRoles: z.array(roleSchema).default([]),
  overrideBuiltInRoles: z.boolean().default(false),
});

export type AdminConfig = z.infer<typeof adminConfigSchema>;

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    path: "/",
    label: "Dashboard",
    icon: "LayoutDashboard",
    section: "main",
    exact: true,
  },
  { id: "content", path: "/content", label: "Content", icon: "FileText", section: "main" },
  { id: "media", path: "/media", label: "Media", icon: "Image", section: "main" },
  { id: "taxonomies", path: "/taxonomies", label: "Taxonomies", icon: "Tags", section: "main" },
  {
    id: "content-types",
    path: "/content-types",
    label: "Content Types",
    icon: "Layers",
    section: "config",
  },
  { id: "trash", path: "/trash", label: "Trash", icon: "Trash2", section: "config" },
  { id: "users", path: "/users", label: "Users", icon: "Users", section: "config" },
  { id: "settings", path: "/settings", label: "Settings", icon: "Settings", section: "config" },
];

export function resolveAdminConfig(input?: Partial<AdminConfig>): AdminConfig {
  return adminConfigSchema.parse(input ?? {});
}

export function getVisibleNavItems(config: AdminConfig): { main: NavItem[]; config: NavItem[] } {
  const visibilityMap: Record<string, boolean> = {
    dashboard: config.navigation.showDashboard,
    content: config.navigation.showContent,
    media: config.navigation.showMedia,
    taxonomies: config.navigation.showTaxonomies,
    "content-types": config.navigation.showContentTypes,
    trash: config.navigation.showTrash,
    users: config.navigation.showUsers,
    settings: config.navigation.showSettings,
  };

  const filtered = DEFAULT_NAV_ITEMS.filter((item) => visibilityMap[item.id] !== false);
  const allItems = [...filtered, ...config.navigation.customItems.filter((i) => i.visible !== false)];

  return {
    main: allItems.filter((i) => i.section === "main"),
    config: allItems.filter((i) => i.section === "config"),
  };
}

export function defineAdminConfig(config: Partial<AdminConfig>): Partial<AdminConfig> {
  return config;
}
