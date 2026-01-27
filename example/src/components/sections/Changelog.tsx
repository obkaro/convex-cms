import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";

type ChangeType = "feature" | "improvement" | "fix" | "breaking";

interface ChangelogEntry {
	_id: string;
	title: string;
	description: string;
	version: string;
	releaseDate: number;
	type: ChangeType[];
	image?: string;
}

const typeConfig: Record<ChangeType, { label: string; className: string }> = {
	feature: { label: "Feature", className: "type-feature" },
	improvement: { label: "Improvement", className: "type-improvement" },
	fix: { label: "Fix", className: "type-fix" },
	breaking: { label: "Breaking", className: "type-breaking" },
};

function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function ChangelogCard({
	entry,
	isLatest,
}: {
	entry: ChangelogEntry;
	isLatest: boolean;
}) {
	return (
		<div className="changelog-entry">
			<Card
				className={
					isLatest ? "border-accent/20 shadow-lg shadow-slate-200/50" : ""
				}
			>
				<CardContent className="p-6">
					<div className="flex flex-wrap items-center gap-3 mb-4">
						<span className="version-mono text-lg">v{entry.version}</span>
						{entry.type.map((t) => {
							const config = typeConfig[t];
							return (
								<span key={t} className={`type-badge ${config.className}`}>
									{config.label}
								</span>
							);
						})}
					</div>

					<h3
						className="text-xl font-medium text-slate-900 mb-2"
						style={{ fontFamily: "var(--font-display)" }}
					>
						{entry.title}
					</h3>

					<div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
						<Calendar className="h-3.5 w-3.5" />
						<span>{formatDate(entry.releaseDate)}</span>
					</div>

					<p className="text-body whitespace-pre-line">{entry.description}</p>
				</CardContent>
			</Card>
		</div>
	);
}

function LoadingSkeleton() {
	return (
		<div className="space-y-8">
			{[1, 2, 3].map((i) => (
				<div key={i} className="changelog-entry">
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center gap-3 mb-4">
								<Skeleton className="h-6 w-16" />
								<Skeleton className="h-5 w-20" />
							</div>
							<Skeleton className="h-6 w-3/4 mb-2" />
							<Skeleton className="h-4 w-24 mb-4" />
							<Skeleton className="h-4 w-full mb-2" />
							<Skeleton className="h-4 w-5/6" />
						</CardContent>
					</Card>
				</div>
			))}
		</div>
	);
}

export function Changelog() {
	const result = useQuery(api.content.getChangelog);

	const entries = result as ChangelogEntry[] | undefined;

	return (
		<section id="changelog" className="section bg-slate-50">
			<div className="container-narrow">
				<div className="mb-12">
					<p className="text-label mb-3">Changelog</p>
					<h2 className="display-lg mb-4">Ship log</h2>
					<p className="text-body max-w-xl">
						A complete record of every release. Features, improvements, and
						fixes, all documented as we ship.
					</p>
				</div>

				{entries === undefined ? (
					<LoadingSkeleton />
				) : entries.length === 0 ? (
					<div className="text-center py-16">
						<p className="text-slate-500">No releases yet.</p>
					</div>
				) : (
					<div className="relative">
						{entries.map((entry, index) => (
							<ChangelogCard
								key={entry._id}
								entry={entry}
								isLatest={index === 0}
							/>
						))}
					</div>
				)}
			</div>
		</section>
	);
}
