/**
 * Shared Content Types Page Component
 *
 * Manages content type definitions with create/edit capabilities.
 * Used by both CLI routes and embed pages.
 */

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { ContentTypeFormModal } from "~/components/ContentTypeFormModal";

interface ContentTypeField {
	name: string;
	label: string;
	type: string;
}

interface ContentTypeWithCount {
	_id: string;
	name: string;
	displayName: string;
	description?: string;
	fields: ContentTypeField[];
	isActive: boolean;
	singleton?: boolean;
	entryCount?: number;
	_creationTime: number;
	source?: "code" | "database";
}
import { CmsPageHeader } from "~/components/cmsds/CmsPageHeader";
import { CmsToolbar } from "~/components/cmsds/CmsToolbar";
import { CmsEmptyState } from "~/components/cmsds/CmsEmptyState";
import { CmsButton } from "~/components/cmsds/CmsButton";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/cn";
import {
	Search,
	Grid3X3,
	List,
	Plus,
	FileType,
	Hash,
	ToggleLeft,
	Calendar,
	Link2,
	Image,
	Braces,
	ChevronDown,
	Tag,
	FolderOpen,
	AlignLeft,
	Pencil,
	Code2,
	Eye,
} from "lucide-react";
import type { AdminNavigation } from "~/lib/navigation";
import { CmsAdminApi } from "~/embed/contexts/ApiContext";

type ViewMode = "grid" | "list";

const FIELD_ICONS: Record<string, React.ReactNode> = {
	text: <AlignLeft className="size-3" />,
	richText: <FileType className="size-3" />,
	number: <Hash className="size-3" />,
	boolean: <ToggleLeft className="size-3" />,
	date: <Calendar className="size-3" />,
	datetime: <Calendar className="size-3" />,
	reference: <Link2 className="size-3" />,
	media: <Image className="size-3" />,
	json: <Braces className="size-3" />,
	select: <ChevronDown className="size-3" />,
	multiSelect: <List className="size-3" />,
	tags: <Tag className="size-3" />,
	category: <FolderOpen className="size-3" />,
};

export interface ContentTypesPageProps {
	api: CmsAdminApi;
	navigation: AdminNavigation;
}

export function ContentTypesPage({ api, navigation }: ContentTypesPageProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [showActiveOnly, setShowActiveOnly] = useState(true);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [
		editingContentType,
		setEditingContentType,
	] = useState<ContentTypeWithCount | null>(null);

	const handleContentTypeCreated = useCallback(() => {
		setShowCreateModal(false);
	}, []);

	const handleContentTypeUpdated = useCallback(() => {
		setEditingContentType(null);
	}, []);

	const contentTypesResult = useQuery(api.listContentTypes, {
		isActive: showActiveOnly ? true : undefined,
		includeEntryCounts: true,
	});

	const contentTypes = (contentTypesResult?.page ??
		[]) as ContentTypeWithCount[];
	const isLoading = contentTypesResult === undefined;

	const filteredContentTypes = useMemo(() => {
		if (!searchQuery.trim()) {
			return contentTypes;
		}

		const query = searchQuery.toLowerCase();
		return contentTypes.filter(
			(type) =>
				type.name.toLowerCase().includes(query) ||
				type.displayName.toLowerCase().includes(query),
		);
	}, [contentTypes, searchQuery]);

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const getRelativeTime = (timestamp: number) => {
		const now = Date.now();
		const diff = now - timestamp;
		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 30) {
			return formatDate(timestamp);
		} else if (days > 0) {
			return `${days}d ago`;
		} else if (hours > 0) {
			return `${hours}h ago`;
		} else if (minutes > 0) {
			return `${minutes}m ago`;
		} else {
			return "Just now";
		}
	};

	return (
		<div className="space-y-6 p-6">
			<CmsPageHeader
				title="Content Types"
				description="Define the structure of your content with custom fields and validation rules."
			/>

			<CmsToolbar
				left={
					<div className="flex items-center gap-3">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								type="search"
								placeholder="Search content types..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-64 pl-9"
							/>
						</div>
						<label className="flex cursor-pointer items-center gap-2 text-sm">
							<Checkbox
								checked={showActiveOnly}
								onCheckedChange={(checked) =>
									setShowActiveOnly(checked as boolean)
								}
							/>
							Active only
						</label>
					</div>
				}
				right={
					<div className="flex items-center gap-2">
						<div className="flex rounded-md border bg-muted/30">
							<button
								className={cn(
									"rounded-l-md p-2 transition-colors",
									viewMode === "grid"
										? "bg-background shadow-sm"
										: "hover:bg-muted/50",
								)}
								onClick={() => setViewMode("grid")}
								title="Grid view"
								aria-label="Grid view"
							>
								<Grid3X3 className="size-4" />
							</button>
							<button
								className={cn(
									"rounded-r-md p-2 transition-colors",
									viewMode === "list"
										? "bg-background shadow-sm"
										: "hover:bg-muted/50",
								)}
								onClick={() => setViewMode("list")}
								title="List view"
								aria-label="List view"
							>
								<List className="size-4" />
							</button>
						</div>
						<CmsButton
							onClick={() => setShowCreateModal(true)}
							data-testid="create-content-type-button"
						>
							<Plus className="size-4" />
							Create Content Type
						</CmsButton>
					</div>
				}
			/>

			{isLoading ? (
				<div className="flex flex-col items-center justify-center py-12">
					<div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
					<p className="mt-4 text-sm text-muted-foreground">
						Loading content types...
					</p>
				</div>
			) : filteredContentTypes.length === 0 ? (
				<CmsEmptyState
					icon={<FileType className="size-6" />}
					title={
						searchQuery
							? "No content types match your search"
							: "No content types defined"
					}
					description={
						searchQuery
							? "Try adjusting your search query or filters."
							: "Content types define the schema for your content. Create one to get started."
					}
				/>
			) : viewMode === "grid" ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{filteredContentTypes.map((contentType) => (
						<div
							key={contentType._id}
							className="group flex flex-col rounded-lg border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
						>
							<div className="mb-3 flex items-center justify-between">
								<div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
									<FileType className="size-5" />
								</div>
								<div className="flex items-center gap-1.5">
									{contentType.source === "code" && (
										<Badge
											variant="secondary"
											className="border-violet-200 bg-violet-50 text-xs font-normal text-violet-700"
											title="Managed by code - edit in your codebase"
										>
											<Code2 className="mr-1 size-3" />
											Code
										</Badge>
									)}
									{!contentType.isActive && (
										<Badge variant="secondary" className="text-xs font-normal">
											Inactive
										</Badge>
									)}
									{contentType.singleton && (
										<Badge
											variant="secondary"
											className="border-diff-modified-border bg-diff-modified-bg text-xs font-normal text-diff-modified-foreground"
										>
											Singleton
										</Badge>
									)}
									{contentType.source === "code" ? (
										<button
											className="rounded p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
											title="View content type (managed by code)"
											aria-label="View content type"
											onClick={() => setEditingContentType(contentType)}
										>
											<Eye className="size-4" />
										</button>
									) : (
										<button
											onClick={() => setEditingContentType(contentType)}
											className="rounded p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
											title="Edit content type"
											aria-label="Edit content type"
										>
											<Pencil className="size-4" />
										</button>
									)}
								</div>
							</div>

							<button
								type="button"
								onClick={() =>
									navigation.navigateToContentType(contentType._id)
								}
								className="flex flex-1 flex-col text-left"
							>
								<h3 className="text-base font-semibold text-foreground">
									{contentType.displayName}
								</h3>
								<p className="mt-0.5 text-xs text-muted-foreground">
									{contentType.name}
								</p>

								<div className="mt-3 flex items-center gap-4">
									<div className="text-center">
										<p className="text-lg font-semibold text-foreground">
											{contentType.fields.length}
										</p>
										<p className="text-xs text-muted-foreground">
											{contentType.fields.length === 1 ? "Field" : "Fields"}
										</p>
									</div>
									<div className="text-center">
										<p className="text-lg font-semibold text-foreground">
											{contentType.entryCount ?? 0}
										</p>
										<p className="text-xs text-muted-foreground">
											{contentType.entryCount === 1 ? "Entry" : "Entries"}
										</p>
									</div>
								</div>

								<div className="mt-3 flex flex-wrap gap-1.5">
									{contentType.fields.slice(0, 4).map((field) => (
										<span
											key={field.name}
											className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
											title={field.label}
										>
											{FIELD_ICONS[field.type] || (
												<AlignLeft className="size-3" />
											)}
											<span className="truncate">{field.label}</span>
										</span>
									))}
									{contentType.fields.length > 4 && (
										<span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
											+{contentType.fields.length - 4} more
										</span>
									)}
								</div>

								<p className="mt-auto pt-3 text-xs text-muted-foreground">
									Updated {getRelativeTime(contentType._creationTime)}
								</p>
							</button>
						</div>
					))}
				</div>
			) : (
				<div className="rounded-lg border bg-card">
					<table className="w-full">
						<thead>
							<tr className="border-b">
								<th className="p-3 text-left text-sm font-medium text-muted-foreground">
									Name
								</th>
								<th className="p-3 text-left text-sm font-medium text-muted-foreground">
									Fields
								</th>
								<th className="p-3 text-left text-sm font-medium text-muted-foreground">
									Entries
								</th>
								<th className="p-3 text-left text-sm font-medium text-muted-foreground">
									Status
								</th>
								<th className="p-3 text-left text-sm font-medium text-muted-foreground">
									Last Updated
								</th>
								<th className="p-3 text-left text-sm font-medium text-muted-foreground">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredContentTypes.map((contentType) => (
								<tr
									key={contentType._id}
									className="border-b last:border-0 transition-colors hover:bg-muted/50"
								>
									<td className="p-3">
										<p className="font-medium text-foreground">
											{contentType.displayName}
										</p>
										<p className="text-xs text-muted-foreground">
											{contentType.name}
										</p>
									</td>
									<td className="p-3 text-sm text-muted-foreground">
										{contentType.fields.length}
									</td>
									<td className="p-3 text-sm text-muted-foreground">
										{contentType.entryCount ?? 0}
									</td>
									<td className="p-3">
										<div className="flex items-center gap-1.5">
											{contentType.source === "code" && (
												<Badge
													variant="secondary"
													className="border-violet-200 bg-violet-50 text-xs font-normal text-violet-700"
													title="Managed by code"
												>
													<Code2 className="mr-1 size-3" />
													Code
												</Badge>
											)}
											<Badge
												variant={contentType.isActive ? "default" : "secondary"}
												className={cn(
													"text-xs font-normal",
													contentType.isActive &&
														"border-diff-added-border bg-diff-added-bg text-diff-added-foreground",
												)}
											>
												{contentType.isActive ? "Active" : "Inactive"}
											</Badge>
											{contentType.singleton && (
												<Badge
													variant="secondary"
													className="border-diff-modified-border bg-diff-modified-bg text-xs font-normal text-diff-modified-foreground"
												>
													Singleton
												</Badge>
											)}
										</div>
									</td>
									<td className="p-3 text-sm text-muted-foreground">
										{formatDate(contentType._creationTime)}
									</td>
									<td className="p-3">
										<div className="flex items-center gap-2">
											{contentType.source === "code" ? (
												<CmsButton
													variant="outline"
													size="sm"
													onClick={() => setEditingContentType(contentType)}
													title="View content type (managed by code)"
												>
													<Eye className="size-3.5" />
													View
												</CmsButton>
											) : (
												<CmsButton
													variant="outline"
													size="sm"
													onClick={() => setEditingContentType(contentType)}
												>
													<Pencil className="size-3.5" />
													Edit
												</CmsButton>
											)}
											<CmsButton
												variant="outline"
												size="sm"
												onClick={() =>
													navigation.navigateToContentType(contentType._id)
												}
											>
												View Entries
											</CmsButton>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{!isLoading && filteredContentTypes.length > 0 && (
				<p className="text-center text-sm text-muted-foreground">
					Showing {filteredContentTypes.length} of {contentTypes.length} content
					type
					{contentTypes.length !== 1 ? "s" : ""}
				</p>
			)}

			<ContentTypeFormModal
				isOpen={showCreateModal || !!editingContentType}
				onClose={() => {
					setShowCreateModal(false);
					setEditingContentType(null);
				}}
				contentType={editingContentType as any}
				onCreated={handleContentTypeCreated}
				onUpdated={handleContentTypeUpdated}
			/>
		</div>
	);
}
