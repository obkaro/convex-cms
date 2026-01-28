/**
 * Shared Dashboard Page Component
 *
 * Shows CMS overview with quick navigation cards and statistics.
 * Used by both CLI routes and embed pages.
 */

import { useQuery } from "convex/react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { CmsPageHeader, CmsStatCard } from "~/components/cmsds";
import { SchemaDriftWarning } from "~/components/SchemaDriftWarning";
import { FileText, Image, Layers, Settings, TrendingUp } from "lucide-react";
import type { AdminNavigation } from "~/lib/navigation";
import type { CmsAdminApi } from "~/embed/contexts/ApiContext";

interface DashboardPageProps {
	api: CmsAdminApi;
	navigation: AdminNavigation;
}

export function DashboardPage({ api, navigation }: DashboardPageProps) {
	const stats = useQuery(api.getDashboardStats, {});
	const isLoading = stats === undefined;
	const hasError = stats === null;

	return (
		<div className="space-y-8">
			<CmsPageHeader
				title="Dashboard"
				description="Welcome to Convex CMS Admin. Manage your content, media, and publishing workflows."
			/>

			<SchemaDriftWarning api={api} />

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<DashboardCard
					title="Content Entries"
					description="Create and manage your content"
					onClick={() => navigation.navigate("/content")}
					icon={<FileText className="size-5" />}
				/>
				<DashboardCard
					title="Media Library"
					description="Upload and organize media assets"
					onClick={() => navigation.navigate("/media")}
					icon={<Image className="size-5" />}
				/>
				<DashboardCard
					title="Content Types"
					description="Define content schemas and fields"
					onClick={() => navigation.navigate("/content-types")}
					icon={<Layers className="size-5" />}
				/>
				<DashboardCard
					title="Settings"
					description="Configure CMS settings"
					onClick={() => navigation.navigate("/settings")}
					icon={<Settings className="size-5" />}
				/>
			</div>

			<section className="space-y-4">
				<div className="flex items-center gap-2">
					<TrendingUp className="size-5 text-muted-foreground" />
					<h2 className="text-lg font-semibold">Quick Stats</h2>
				</div>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<CmsStatCard
						title="Content Types"
						value={hasError ? "—" : String(stats?.contentTypes ?? 0)}
						isLoading={isLoading}
					/>
					<CmsStatCard
						title="Content Entries"
						value={hasError ? "—" : String(stats?.contentEntries ?? 0)}
						isLoading={isLoading}
					/>
					<CmsStatCard
						title="Media Assets"
						value={hasError ? "—" : String(stats?.mediaAssets ?? 0)}
						isLoading={isLoading}
					/>
					<CmsStatCard
						title="Published"
						value={hasError ? "—" : String(stats?.published ?? 0)}
						isLoading={isLoading}
					/>
				</div>
			</section>
		</div>
	);
}

function DashboardCard({
	title,
	description,
	onClick,
	icon,
}: {
	title: string;
	description: string;
	onClick: () => void;
	icon: React.ReactNode;
}) {
	return (
		<button type="button" onClick={onClick} className="text-left">
			<Card className="h-full transition-colors hover:bg-accent/20 hover:cursor-pointer">
				<CardHeader className="pb-2">
					<div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/5 text-primary">
						{icon}
					</div>
					<CardTitle className="text-base">{title}</CardTitle>
				</CardHeader>
				<CardContent>
					<CardDescription>{description}</CardDescription>
				</CardContent>
			</Card>
		</button>
	);
}
