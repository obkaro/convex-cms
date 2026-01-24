/**
 * Shared Settings Page Component
 *
 * Manages CMS settings including appearance, features, and localization.
 * Used by both CLI routes and embed pages.
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { RouteGuard } from "~/components";
import { usePermissions } from "~/hooks";
import { useSettingsConfig, useTheme } from "~/contexts";
import { CmsPageHeader } from "~/components/cmsds/CmsPageHeader";
import { CmsSurface } from "~/components/cmsds/CmsSurface";
import { CmsButton } from "~/components/cmsds/CmsButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { cn } from "~/lib/cn";
import { AlertTriangle, Check, X, Sun, Moon, Monitor } from "lucide-react";
import type { AdminNavigation } from "~/lib/navigation";

interface Settings {
  _id: string | null;
  defaultLocale: string;
  availableLocales: string[];
  features: {
    versioning: boolean;
    scheduling: boolean;
    localization: boolean;
    mediaManagement: boolean;
  };
  updatedBy?: string;
  _creationTime?: number;
}

const LOCALE_OPTIONS = [
  { value: "en", label: "English (en)" },
  { value: "es", label: "Spanish (es)" },
  { value: "fr", label: "French (fr)" },
  { value: "de", label: "German (de)" },
  { value: "it", label: "Italian (it)" },
  { value: "pt", label: "Portuguese (pt)" },
  { value: "zh", label: "Chinese (zh)" },
  { value: "ja", label: "Japanese (ja)" },
];

type FeedbackStatus = "idle" | "saving" | "saved" | "error";
type Theme = "light" | "dark" | "system";

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] =
  [
    { value: "light", label: "Light", icon: <Sun className="size-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="size-4" /> },
    { value: "system", label: "System", icon: <Monitor className="size-4" /> },
  ];

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <CmsSurface elevation="base" className="p-6">
      <h2 className="mb-4 text-lg font-semibold text-foreground">Appearance</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Theme</Label>
            <p className="text-sm text-muted-foreground">
              Choose your preferred color theme for the admin interface.
            </p>
          </div>
          <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  theme === option.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </CmsSurface>
  );
}

export interface SettingsPageProps {
  api: {
    settings: { get: any; update: any; reset: any };
  };
  navigation: AdminNavigation;
}

export function SettingsPage({ api, navigation: _navigation }: SettingsPageProps) {
  const { canManageSettings } = usePermissions();
  const canEdit = canManageSettings();
  const { baseConfig } = useSettingsConfig();

  const settings = useQuery(api.settings.get);
  const updateSettings = useMutation(api.settings.update);
  const resetSettings = useMutation(api.settings.reset);

  const [formData, setFormData] = useState<Settings | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settings && !formData) {
      setFormData(settings as Settings);
    }
  }, [settings, formData]);

  useEffect(() => {
    if (settings && !isDirty) {
      setFormData(settings as Settings);
    }
  }, [settings, isDirty]);

  const handleLocaleChange = useCallback(
    (value: string) => {
      if (!formData) return;

      setFormData({
        ...formData,
        defaultLocale: value,
      });
      setIsDirty(true);
      setFeedbackStatus("idle");
    },
    [formData]
  );

  const handleFeatureChange = useCallback(
    (feature: keyof Settings["features"]) => {
      if (!formData) return;

      setFormData({
        ...formData,
        features: {
          ...formData.features,
          [feature]: !formData.features[feature],
        },
      });
      setIsDirty(true);
      setFeedbackStatus("idle");
    },
    [formData]
  );

  const handleSave = useCallback(async () => {
    if (!formData || !isDirty) return;

    setFeedbackStatus("saving");
    setErrorMessage(null);

    try {
      await updateSettings({
        defaultLocale: formData.defaultLocale,
        features: formData.features,
      });

      setFeedbackStatus("saved");
      setIsDirty(false);

      setTimeout(() => {
        setFeedbackStatus("idle");
      }, 3000);
    } catch (error) {
      setFeedbackStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save settings"
      );
    }
  }, [formData, isDirty, updateSettings]);

  const handleReset = useCallback(async () => {
    const confirmed = window.confirm(
      "Are you sure you want to reset all settings to their defaults? This action cannot be undone."
    );

    if (!confirmed) return;

    setFeedbackStatus("saving");
    setErrorMessage(null);

    try {
      const newSettings = await resetSettings({});
      setFormData(newSettings as Settings);
      setFeedbackStatus("saved");
      setIsDirty(false);

      setTimeout(() => {
        setFeedbackStatus("idle");
      }, 3000);
    } catch (error) {
      setFeedbackStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to reset settings"
      );
    }
  }, [resetSettings]);

  const handleDiscard = useCallback(() => {
    if (settings) {
      setFormData(settings as Settings);
      setIsDirty(false);
      setFeedbackStatus("idle");
      setErrorMessage(null);
    }
  }, [settings]);

  if (settings === undefined) {
    return (
      <RouteGuard requiredPermission={{ resource: "settings", action: "manage" }}>
        <div className="space-y-6 p-6">
          <CmsPageHeader
            title="Settings"
            description="Configure your CMS settings and preferences."
          />
          <div className="flex flex-col items-center justify-center py-12">
            <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Loading settings...
            </p>
          </div>
        </div>
      </RouteGuard>
    );
  }

  if (settings === null && !formData) {
    return (
      <RouteGuard requiredPermission={{ resource: "settings", action: "manage" }}>
        <div className="space-y-6 p-6">
          <CmsPageHeader
            title="Settings"
            description="Configure your CMS settings and preferences."
          />
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              Failed to load settings. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requiredPermission={{ resource: "settings", action: "manage" }}>
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between">
          <CmsPageHeader
            title="Settings"
            description="Configure your CMS settings and preferences."
          />

          {canEdit && (
            <div className="flex items-center gap-3">
              {feedbackStatus === "saved" && (
                <Badge
                  variant="secondary"
                  className="gap-1 bg-emerald-100 text-emerald-700"
                >
                  <Check className="size-3" />
                  Settings saved successfully
                </Badge>
              )}
              {feedbackStatus === "error" && (
                <Badge variant="destructive" className="gap-1">
                  <X className="size-3" />
                  {errorMessage || "An error occurred"}
                </Badge>
              )}

              {isDirty && (
                <CmsButton
                  variant="secondary"
                  onClick={handleDiscard}
                  disabled={feedbackStatus === "saving"}
                >
                  Discard Changes
                </CmsButton>
              )}

              <CmsButton
                onClick={handleSave}
                disabled={!isDirty}
                loading={feedbackStatus === "saving"}
              >
                Save Changes
              </CmsButton>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <AppearanceSection />

          {formData?.features.localization && (
            <CmsSurface elevation="base" className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">
                General
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Default Locale</Label>
                    <p className="text-sm text-muted-foreground">
                      The default language for new content entries.
                    </p>
                  </div>
                  <Select
                    value={formData?.defaultLocale || "en"}
                    onValueChange={handleLocaleChange}
                    disabled={!canEdit || feedbackStatus === "saving"}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCALE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CmsSurface>
          )}

          <CmsSurface elevation="base" className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Features
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    Enable Versioning
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Track content history and enable rollback to previous
                    versions
                  </p>
                </div>
                <Switch
                  checked={formData?.features.versioning ?? true}
                  onCheckedChange={() => handleFeatureChange("versioning")}
                  disabled={!canEdit || feedbackStatus === "saving"}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    Enable Scheduling
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Schedule content to publish at a future date and time
                  </p>
                </div>
                <Switch
                  checked={formData?.features.scheduling ?? true}
                  onCheckedChange={() => handleFeatureChange("scheduling")}
                  disabled={!canEdit || feedbackStatus === "saving"}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    Enable Localization
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Support multiple languages for content entries
                  </p>
                </div>
                <Switch
                  checked={formData?.features.localization ?? false}
                  onCheckedChange={() => handleFeatureChange("localization")}
                  disabled={!canEdit || feedbackStatus === "saving"}
                />
              </div>

              {baseConfig.navigation.showMedia && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">
                      Enable Media Management
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Use the built-in media library for image and file uploads
                    </p>
                  </div>
                  <Switch
                    checked={formData?.features.mediaManagement ?? true}
                    onCheckedChange={() =>
                      handleFeatureChange("mediaManagement")
                    }
                    disabled={!canEdit || feedbackStatus === "saving"}
                  />
                </div>
              )}
            </div>
          </CmsSurface>

          <CmsSurface elevation="base" className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">API</h2>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">
                  Convex Deployment URL
                </Label>
                <code className="mt-1 block rounded-md bg-muted px-3 py-2 text-sm">
                  {import.meta.env.VITE_CONVEX_URL || "Not configured"}
                </code>
              </div>
            </div>
          </CmsSurface>

          {canEdit && (
            <CmsSurface
              elevation="base"
              className="border-red-200 p-6 dark:border-red-900"
            >
              <h2 className="mb-4 text-lg font-semibold text-red-600">
                Danger Zone
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    Reset to Defaults
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Reset all settings to their default values. This cannot be
                    undone.
                  </p>
                </div>
                <CmsButton
                  variant="danger"
                  onClick={handleReset}
                  disabled={feedbackStatus === "saving"}
                >
                  Reset Settings
                </CmsButton>
              </div>
            </CmsSurface>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}
