import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo, type ReactNode } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { RouteGuard } from "../components";
import {
	AuthProvider,
	BreadcrumbProvider,
	SettingsConfigProvider,
	ThemeProvider,
	type GetUserHook,
	type GetUserRoleHook,
	type LogoutHook,
} from "../contexts";
import { ApiProvider } from "../embed/contexts/ApiContext";
import type { AdminConfig } from "../lib/admin-config";
import { resolveAdminConfig } from "../lib/admin-config";
import { adminApi } from "../lib/adminApi";
import { getCmsConfig } from "./config";
import { router } from "./router";

const mockGetUser: GetUserHook = () => ({
	id: "mock_user_123",
	name: "Demo Admin",
	email: "admin@example.com",
});

const mockGetUserRole: GetUserRoleHook = () => "admin";
const mockLogout: LogoutHook = () => {
	console.log("Logout called (mock mode)");
};

const noAuthGetUser: GetUserHook = () => null;
const noAuthGetUserRole: GetUserRoleHook = () => null;
const noAuthLogout: LogoutHook = () => {};

function getAuthConfig(authMode: string): {
	getUser: GetUserHook;
	getUserRole: GetUserRoleHook;
	onLogout: LogoutHook;
} {
	switch (authMode) {
		case "mock":
		case "demo":
			return {
				getUser: mockGetUser,
				getUserRole: mockGetUserRole,
				onLogout: mockLogout,
			};
		case "none":
		case "disabled":
			return {
				getUser: noAuthGetUser,
				getUserRole: noAuthGetUserRole,
				onLogout: noAuthLogout,
			};
		default:
			return {
				getUser: mockGetUser,
				getUserRole: mockGetUserRole,
				onLogout: mockLogout,
			};
	}
}

export function App() {
	const config = getCmsConfig();
	const authConfig = useMemo(
		() => getAuthConfig(config.authMode),
		[config.authMode],
	);
	const adminConfig = useMemo(
		() => resolveAdminConfig(config.adminConfig),
		[config.adminConfig],
	);

	return (
		<ThemeProvider>
			<BreadcrumbProvider>
				<ConvexProviderWrapper
					convexUrl={config.convexUrl}
					adminConfig={adminConfig}
				>
					<AuthProvider
						getUser={authConfig.getUser}
						getUserRole={authConfig.getUserRole}
						onLogout={authConfig.onLogout}
					>
						<RouteGuard>
							<RouterProvider router={router} />
						</RouteGuard>
					</AuthProvider>
				</ConvexProviderWrapper>
			</BreadcrumbProvider>
		</ThemeProvider>
	);
}

function ConvexProviderWrapper({
	children,
	convexUrl,
	adminConfig,
}: {
	children: ReactNode;
	convexUrl: string;
	adminConfig: AdminConfig;
}) {
	const convex = useMemo(() => {
		if (!convexUrl) return null;
		return new ConvexReactClient(convexUrl);
	}, [convexUrl]);

	if (!convex) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-6">
				<div className="diff-modified max-w-lg space-y-4 rounded-lg border p-6 text-center">
					<h2 className="text-xl font-semibold text-diff-modified">
						Convex Configuration Required
					</h2>
					<p className="text-sm text-diff-modified-foreground">
						Please provide a Convex deployment URL to connect to your backend.
					</p>
					<div className="space-y-2 text-left text-sm text-diff-modified-foreground">
						<p className="font-medium">Options:</p>
						<ul className="list-inside list-disc space-y-1">
							<li>
								Run with URL:{" "}
								<code className="rounded bg-diff-modified-bg/50 px-1">
									npx convex-cms admin --url YOUR_URL
								</code>
							</li>
							<li>
								Set environment variable:{" "}
								<code className="rounded bg-diff-modified-bg/50 px-1">
									CONVEX_URL=YOUR_URL
								</code>
							</li>
						</ul>
					</div>
				</div>
			</div>
		);
	}

	return (
		<ConvexProvider client={convex}>
			<ApiProvider api={adminApi}>
				<SettingsConfigProvider
					baseConfig={adminConfig}
					api={{ getSettings: adminApi.getSettings }}
				>
					{children}
				</SettingsConfigProvider>
			</ApiProvider>
		</ConvexProvider>
	);
}
