/**
 * Admin Page - Embedded CMS Admin UI
 *
 * This demonstrates using the embedded CmsAdmin component from convex-cms.
 * The component provides a complete admin interface with navigation,
 * content management, media library, and more.
 *
 * SETUP REQUIREMENTS:
 *
 * 1. Tailwind v4 source scanning — add to your CSS entry file:
 *    @source "../node_modules/convex-cms/admin/src/**\/*.{ts,tsx}";
 *    Without this, the admin layout and styles will be broken.
 *
 * 2. Explicit height — pass className="h-screen" for full viewport,
 *    or h-[calc(100vh-64px)] if your app has a header.
 *
 * 3. ConvexProvider — CmsAdmin must be rendered inside a ConvexProvider.
 *
 * For production use, integrate your actual auth provider
 * in the auth config (Clerk, Auth0, Convex Auth, etc.).
 */

import { api } from "@convex/_generated/api";
import { CmsAdmin } from "convex-cms/admin";

export function Admin() {
	return (
		<CmsAdmin
			api={api.admin}
			themeMode="inherit"
			auth={{
				getUser: () => ({
					id: "demo-user",
					name: "Demo User",
					email: "demo@example.com",
				}),
				getUserRole: () => "admin",
				onLogout: () => {
					window.location.href = "/";
				},
			}}
			config={{
				branding: {
					appName: "Tempo CMS",
				},
			}}
			className="h-screen"
		/>
	);
}
