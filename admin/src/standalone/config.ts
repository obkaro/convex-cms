import type { AdminConfig } from "../lib/admin-config";

interface CmsConfig {
	convexUrl: string;
	authMode: string;
	adminConfig?: Partial<AdminConfig>;
}

declare global {
	interface Window {
		__CMS_CONFIG__?: CmsConfig;
	}
}

export function getCmsConfig(): CmsConfig {
	if (window.__CMS_CONFIG__) {
		return window.__CMS_CONFIG__;
	}

	return {
		convexUrl: import.meta.env.VITE_CONVEX_URL ?? "",
		authMode: import.meta.env.VITE_AUTH_MODE ?? "demo",
	};
}
