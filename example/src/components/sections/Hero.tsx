import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, Circle, Loader2, CheckCircle2 } from "lucide-react";
import { changelogEntry } from "../../../convex/cms";
import { useCmsQuery } from "convex-cms/react";

export function Hero() {
	const roadmap = useQuery(api.content.getRoadmapByStatus);
	const changelog = useCmsQuery(api.admin, changelogEntry, {
		paginationOpts: { numItems: 50, cursor: null },
		status: "published",
	});

	const latestVersion = changelog?.page[0]?.data.version;

	return (
		<section className="section bg-slate-50 overflow-hidden">
			<div className="container-wide">
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
					{/* Left: Headline */}
					<div className="lg:col-span-7 animate-fade-up">
						<p className="text-label mb-6">Building Tempo</p>

						<h1 className="display-xl mb-8">
							Async work
							<br />
							<span className="text-slate-400">tracked to your rhythm.</span>
						</h1>

						<p className="text-body-lg max-w-lg mb-10">
							See what we're building and where we're headed. Our roadmap is
							shaped by how teams actually work, not how they're forced to.
						</p>

						<div className="flex flex-col sm:flex-row gap-4">
							<Button
								asChild
								size="lg"
								className="bg-accent hover:bg-accent-light text-white"
							>
								<a href="#roadmap">
									View Roadmap
									<ArrowDown className="ml-2 h-4 w-4" />
								</a>
							</Button>
							{latestVersion && (
								<Button asChild variant="ghost" size="lg">
									<a href="#changelog">Latest: v{latestVersion}</a>
								</Button>
							)}
						</div>
					</div>

					{/* Right: Stats Card */}
					<div className="lg:col-span-5 animate-fade-up delay-200">
						<Card className="border-slate-200 shadow-lg shadow-slate-200/50">
							<CardContent className="p-8">
								<p className="text-label mb-6">Roadmap status</p>

								<div className="space-y-6">
									<StatRow
										icon={
											<Circle className="h-3 w-3 fill-slate-300 text-slate-300" />
										}
										label="Planned"
										count={roadmap?.planned.length}
										color="text-slate-600"
									/>
									<StatRow
										icon={
											<Loader2 className="h-3 w-3 text-sky-600 animate-spin" />
										}
										label="In Progress"
										count={roadmap?.in_progress.length}
										color="text-sky-600"
									/>
									<StatRow
										icon={
											<CheckCircle2 className="h-3 w-3 fill-emerald-600 text-emerald-600" />
										}
										label="Shipped"
										count={roadmap?.completed.length}
										color="text-emerald-600"
									/>
								</div>

								<div className="mt-8 pt-6 border-t border-slate-100">
									<p className="text-small">
										{changelog?.page.map((entry) => entry.data.version)
											.length || 0}{" "}
										releases shipped
									</p>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</section>
	);
}

function StatRow({
	icon,
	label,
	count,
	color,
}: {
	icon: React.ReactNode;
	label: string;
	count: number | undefined;
	color: string;
}) {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-3">
				{icon}
				<span className="text-sm text-slate-600">{label}</span>
			</div>
			<span
				className={`text-2xl font-medium ${color}`}
				style={{ fontFamily: "var(--font-display)" }}
			>
				{count ?? "—"}
			</span>
		</div>
	);
}
