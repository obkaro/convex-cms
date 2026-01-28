/**
 * Admin Page - Embedded CMS Admin UI
 *
 * This demonstrates using the embedded CmsAdmin component from convex-cms.
 * The component provides a complete admin interface with navigation,
 * content management, media library, and more.
 *
 * IMPORTANT: The parent container must have explicit height for the admin
 * to render correctly. Use h-screen for full viewport or calculate height
 * if you have a header (e.g., h-[calc(100vh-64px)]).
 *
 * For production use, you would integrate your actual auth provider
 * in the auth config (Clerk, Auth0, Convex Auth, etc.).
 */

import { api } from "@convex/_generated/api";
import { CmsAdmin } from "convex-cms/admin";

export function Admin() {
	return (
		<CmsAdmin
			api={api.admin}
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
