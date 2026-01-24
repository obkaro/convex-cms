/**
 * Admin Page - Embedded CMS Admin UI
 *
 * This demonstrates using the embedded CmsAdmin component from convex-cms.
 * The component provides a complete admin interface with navigation,
 * content management, media library, and more.
 *
 * For production use, you would integrate your actual auth provider
 * in the auth config (Clerk, Auth0, Convex Auth, etc.).
 */

import { api } from "../../convex/_generated/api";
import { CmsAdmin } from "convex-cms/admin";

export function Admin() {
	return (
		<CmsAdmin
			api={api.admin}
			convexUrl={import.meta.env.VITE_CONVEX_URL!}
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
					// logoUrl: "/tempo.svg",
				},
			}}
		/>
	);
}
