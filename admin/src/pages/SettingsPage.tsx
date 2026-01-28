/**
 * Shared Settings Page Component
 *
 * Manages CMS settings including appearance, features, and localization.
 * Used by both CLI routes and embed pages.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { RouteGuard } from "~/components";
import { usePermissions } from "~/hooks";
import { useAdminConfig, useTheme } from "~/contexts";
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
import { Check, X, Sun, Moon, Monitor, Lock, Info } from "lucide-react";
import type { AdminNavigation } from "~/lib/navigation";
import { CmsAdminApi } from "~/embed/contexts/ApiContext";

interface FeatureFlags {
	versioning: boolean;
	scheduling: boolean;
	localization: boolean;
	mediaManagement: boolean;
}

interface Settings {
	_id: string | null;
	defaultLocale: string;
	availableLocales: string[];
	features: FeatureFlags;
	updatedBy?: string;
	_creationTime?: number;
}

const DEFAULT_FEATURES: FeatureFlags = {
	versioning: true,
	scheduling: true,
	localization: false,
	mediaManagement: true,
};

const DEFAULT_SETTINGS: Settings = {
	_id: null,
	defaultLocale: "en",
	availableLocales: ["en", "es", "fr", "de"],
	features: DEFAULT_FEATURES,
};

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

const THEME_OPTIONS: {
	value: Theme;
	label: string;
	icon: React.ReactNode;
}[] = [
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
										: "text-muted-foreground hover:text-foreground",
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
	api: CmsAdminApi;
	navigation: AdminNavigation;
}

// Unconfigured settings page (no useQuery needed)
function SettingsPageUnconfigured() {
	return (
		<RouteGuard requiredPermission={{ resource: "settings", action: "manage" }}>
			<div className="space-y-6 p-6">
				<CmsPageHeader
					title="Settings"
					description="Configure your CMS settings and preferences."
				/>

				<div className="space-y-6">
					<AppearanceSection />

					<Alert>
						<Info className="size-4" />
						<AlertDescription>
							<strong>Settings not configured.</strong> To enable CMS settings,
							export{" "}
							<code className="rounded bg-muted px-1 py-0.5 text-xs">
								getSettings
							</code>
							,{" "}
							<code className="rounded bg-muted px-1 py-0.5 text-xs">
								updateSettings
							</code>
							, and{" "}
							<code className="rounded bg-muted px-1 py-0.5 text-xs">
								resetSettings
							</code>{" "}
							from your{" "}
							<code className="rounded bg-muted px-1 py-0.5 text-xs">
								convex/admin.ts
							</code>{" "}
							file.
						</AlertDescription>
					</Alert>

					<CmsSurface elevation="base" className="p-6">
						<div className="mb-4 flex items-center gap-2">
							<h2 className="text-lg font-semibold text-foreground">Features</h2>
							<Badge variant="secondary" className="gap-1">
								<Lock className="size-3" />
								Default values
							</Badge>
						</div>
						<p className="mb-4 text-sm text-muted-foreground">
							Showing default feature flags. Configure settings in your admin
							API to customize.
						</p>
						<div className="space-y-4">
							{(
								[
									"versioning",
									"scheduling",
									"localization",
									"mediaManagement",
								] as const
							).map((feature) => (
								<div
									key={feature}
									className="flex items-center justify-between opacity-75"
								>
									<div>
										<Label className="text-sm font-medium capitalize">
											{feature}
										</Label>
									</div>
									<Switch checked={DEFAULT_FEATURES[feature]} disabled={true} />
								</div>
							))}
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
				</div>
			</div>
		</RouteGuard>
	);
}

// Configured settings page with query
function SettingsPageConfigured({
	api,
}: {
	api: CmsAdminApi & { getSettings: NonNullable<CmsAdminApi["getSettings"]> };
}) {
	const { canManageSettings } = usePermissions();
	const canEdit = canManageSettings();
	const adminConfig = useAdminConfig();

	// Proper skip pattern: valid function ref, args as second param
	const settings = useQuery(api.getSettings, {});

	const updateSettingsMutation = useMutation(
		api.updateSettings ?? ((() => {}) as unknown as typeof api.updateSettings)
	);
	const resetSettingsMutation = useMutation(
		api.resetSettings ?? ((() => {}) as unknown as typeof api.resetSettings)
	);

	const [formData, setFormData] = useState<Settings | null>(null);
	const [isDirty, setIsDirty] = useState(false);
	const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const normalizedSettings = useMemo((): Settings | null => {
		if (!settings) return null;
		return {
			_id: settings._id ?? null,
			defaultLocale: settings.defaultLocale ?? DEFAULT_SETTINGS.defaultLocale,
			availableLocales: settings.availableLocales ?? DEFAULT_SETTINGS.availableLocales,
			features: {
				...DEFAULT_FEATURES,
				...(settings.features ?? {}),
			},
			updatedBy: settings.updatedBy,
			_creationTime: settings._creationTime,
		};
	}, [settings]);

	useEffect(() => {
		if (normalizedSettings && !formData) {
			setFormData(normalizedSettings);
		}
	}, [normalizedSettings, formData]);

	useEffect(() => {
		if (normalizedSettings && !isDirty) {
			setFormData(normalizedSettings);
		}
	}, [normalizedSettings, isDirty]);

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
		[formData],
	);

	const handleSave = useCallback(async () => {
		if (!formData || !isDirty || !api.updateSettings) return;

		setFeedbackStatus("saving");
		setErrorMessage(null);

		try {
			await updateSettingsMutation({
				defaultLocale: formData.defaultLocale,
			});

			setFeedbackStatus("saved");
			setIsDirty(false);

			setTimeout(() => {
				setFeedbackStatus("idle");
			}, 3000);
		} catch (error) {
			setFeedbackStatus("error");
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to save settings",
			);
		}
	}, [formData, isDirty, api.updateSettings, updateSettingsMutation]);

	const handleReset = useCallback(async () => {
		if (!api.resetSettings) return;

		const confirmed = window.confirm(
			"Are you sure you want to reset all settings to their defaults? This action cannot be undone.",
		);

		if (!confirmed) return;

		setFeedbackStatus("saving");
		setErrorMessage(null);

		try {
			const newSettings = await resetSettingsMutation({});
			setFormData({
				...DEFAULT_SETTINGS,
				_id: (newSettings as Settings)?._id ?? null,
				defaultLocale: (newSettings as Settings)?.defaultLocale ?? DEFAULT_SETTINGS.defaultLocale,
				availableLocales: (newSettings as Settings)?.availableLocales ?? DEFAULT_SETTINGS.availableLocales,
				features: {
					...DEFAULT_FEATURES,
					...((newSettings as Settings)?.features ?? {}),
				},
			});
			setFeedbackStatus("saved");
			setIsDirty(false);

			setTimeout(() => {
				setFeedbackStatus("idle");
			}, 3000);
		} catch (error) {
			setFeedbackStatus("error");
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to reset settings",
			);
		}
	}, [api.resetSettings, resetSettingsMutation]);

	const handleDiscard = useCallback(() => {
		if (normalizedSettings) {
			setFormData(normalizedSettings);
			setIsDirty(false);
			setFeedbackStatus("idle");
			setErrorMessage(null);
		}
	}, [normalizedSettings]);

	if (settings === undefined) {
		return (
			<RouteGuard
				requiredPermission={{ resource: "settings", action: "manage" }}
			>
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

	const displayData = formData ?? normalizedSettings ?? DEFAULT_SETTINGS;
	const features = displayData.features ?? DEFAULT_FEATURES;

	return (
		<RouteGuard requiredPermission={{ resource: "settings", action: "manage" }}>
			<div className="space-y-6 p-6">
				<div className="flex items-start justify-between">
					<CmsPageHeader
						title="Settings"
						description="Configure your CMS settings and preferences."
					/>

					{canEdit && api.updateSettings && (
						<div className="flex items-center gap-3">
							{feedbackStatus === "saved" && (
								<Badge
									variant="secondary"
									className="gap-1 bg-diff-added-bg text-diff-added-foreground"
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

					{features.localization && (
						<CmsSurface elevation="base" className="p-6">
							<h2 className="mb-4 text-lg font-semibold text-foreground">
								General
							</h2>
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<div>
										<Label className="text-sm font-medium">
											Default Locale
										</Label>
										<p className="text-sm text-muted-foreground">
											The default language for new content entries.
										</p>
									</div>
									<Select
										value={displayData.defaultLocale}
										onValueChange={handleLocaleChange}
										disabled={!canEdit || feedbackStatus === "saving" || !api.updateSettings}
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
						<div className="mb-4 flex items-center gap-2">
							<h2 className="text-lg font-semibold text-foreground">Features</h2>
							<Badge variant="secondary" className="gap-1">
								<Lock className="size-3" />
								Configured in code
							</Badge>
						</div>
						<p className="mb-4 text-sm text-muted-foreground">
							Feature flags are defined in your Convex configuration and cannot be changed from the UI.
						</p>
						<div className="space-y-4">
							<div className="flex items-center justify-between opacity-75">
								<div>
									<Label className="text-sm font-medium">Versioning</Label>
									<p className="text-sm text-muted-foreground">
										Track content history and enable rollback to previous versions
									</p>
								</div>
								<Switch checked={features.versioning} disabled={true} />
							</div>

							<div className="flex items-center justify-between opacity-75">
								<div>
									<Label className="text-sm font-medium">Scheduling</Label>
									<p className="text-sm text-muted-foreground">
										Schedule content to publish at a future date and time
									</p>
								</div>
								<Switch checked={features.scheduling} disabled={true} />
							</div>

							<div className="flex items-center justify-between opacity-75">
								<div>
									<Label className="text-sm font-medium">Localization</Label>
									<p className="text-sm text-muted-foreground">
										Support multiple languages for content entries
									</p>
								</div>
								<Switch checked={features.localization} disabled={true} />
							</div>

							{adminConfig.navigation.showMedia && (
								<div className="flex items-center justify-between opacity-75">
									<div>
										<Label className="text-sm font-medium">Media Management</Label>
										<p className="text-sm text-muted-foreground">
											Use the built-in media library for image and file uploads
										</p>
									</div>
									<Switch checked={features.mediaManagement} disabled={true} />
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

					{canEdit && api.resetSettings && (
						<CmsSurface
							elevation="base"
							className="border-destructive/50 p-6"
						>
							<h2 className="mb-4 text-lg font-semibold text-destructive">
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

// Main wrapper that decides which component to render
export function SettingsPage({
	api,
	navigation: _navigation,
}: SettingsPageProps) {
	// Check if settings API is configured
	if (api.getSettings) {
		return (
			<SettingsPageConfigured
				api={
					api as CmsAdminApi & {
						getSettings: NonNullable<CmsAdminApi["getSettings"]>;
					}
				}
			/>
		);
	}

	return <SettingsPageUnconfigured />;
}
