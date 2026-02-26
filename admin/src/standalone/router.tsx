import {
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	Link,
	useNavigate,
	useParams,
} from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
	DashboardPage,
	ContentPage,
	ContentTypesPage,
	MediaPage,
	SettingsPage,
	TaxonomiesPage,
	TrashPage,
} from "~/pages";
import { ContentEntryEditor } from "~/components/ContentEntryEditor";
import type {
	ContentType,
	ContentEntry,
} from "~/components/ContentEntryEditor";
import { usePermissions, useBreadcrumbLabel } from "~/hooks";
import { CmsPageHeader } from "~/components/cmsds/CmsPageHeader";
import { CmsToolbar } from "~/components/cmsds/CmsToolbar";
import { CmsButton } from "~/components/cmsds/CmsButton";
import { CmsStatusBadge } from "~/components/cmsds/CmsStatusBadge";
import { CmsEmptyState } from "~/components/cmsds/CmsEmptyState";
import { CmsConfirmDialog } from "~/components/cmsds/CmsDialog";
import { TaxonomyFilter } from "~/components/filters/TaxonomyFilter";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import {
	Search,
	Plus,
	FileText,
	ChevronUp,
	ChevronDown,
	ArrowUpDown,
} from "lucide-react";
import { useSettingsConfig } from "~/contexts";
import { adminApi } from "~/lib/adminApi";
import { useTanStackNavigation } from "~/lib/tanstack-adapter";

// --- Root ---

const rootRoute = createRootRoute({
	component: () => <Outlet />,
});

// --- Thin wrapper routes ---

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: () => {
		const navigation = useTanStackNavigation();
		return <DashboardPage api={adminApi} navigation={navigation} />;
	},
});

const contentRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/content",
	component: () => {
		const navigation = useTanStackNavigation();
		return <ContentPage api={adminApi} navigation={navigation} />;
	},
});

const contentTypesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/content-types",
	component: () => {
		const navigation = useTanStackNavigation();
		return <ContentTypesPage api={adminApi} navigation={navigation} />;
	},
});

const mediaRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/media",
	component: () => {
		const navigation = useTanStackNavigation();
		const { settings } = useSettingsConfig();
		return (
			<MediaPage
				api={adminApi}
				navigation={navigation}
				settings={settings}
			/>
		);
	},
});

const settingsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/settings",
	component: () => {
		const navigation = useTanStackNavigation();
		return <SettingsPage api={adminApi} navigation={navigation} />;
	},
});

const taxonomiesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/taxonomies",
	component: () => {
		const navigation = useTanStackNavigation();
		return <TaxonomiesPage api={adminApi} navigation={navigation} />;
	},
});

const trashRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/trash",
	component: () => {
		const navigation = useTanStackNavigation();
		return <TrashPage api={adminApi} navigation={navigation} />;
	},
});

// --- Entry routes with inline logic ---

function EditEntryPage() {
	const { entryId } = useParams({ from: "/entries/$entryId" });
	const navigate = useNavigate();
	const { canDelete } = usePermissions();

	const entry = useQuery(adminApi.getEntry, { id: entryId });
	const contentType = useQuery(
		adminApi.getContentType,
		entry ? { name: entry.contentTypeName } : "skip",
	);

	const getEntryTitle = () => {
		if (!entry || !contentType) return undefined;
		const titleField = contentType.titleField ?? "title";
		const title = entry.data[titleField];
		return typeof title === "string" && title ? title : "Untitled";
	};

	useBreadcrumbLabel(`/entries/${entryId}`, getEntryTitle());

	if (entry === undefined || (entry && contentType === undefined)) {
		return (
			<div className="space-y-6 p-6">
				<div className="flex flex-col items-center justify-center py-12">
					<div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
					<p className="mt-4 text-sm text-muted-foreground">
						Loading entry...
					</p>
				</div>
			</div>
		);
	}

	if (entry === null) {
		return (
			<div className="space-y-6 p-6">
				<CmsEmptyState
					icon={<FileText className="size-6" />}
					title="Entry Not Found"
					description="The content entry you're looking for doesn't exist or has been deleted."
					action={{
						label: "Back to Content",
						onClick: () => navigate({ to: "/content-types" }),
					}}
				/>
			</div>
		);
	}

	if (contentType === null) {
		return (
			<div className="space-y-6 p-6">
				<CmsEmptyState
					icon={<FileText className="size-6" />}
					title="Content Type Not Found"
					description="The content type for this entry doesn't exist or has been deleted."
					action={{
						label: "Back to Content",
						onClick: () => navigate({ to: "/content-types" }),
					}}
				/>
			</div>
		);
	}

	const handleSave = (_savedEntry: ContentEntry) => {};
	const handleCancel = () => navigate({ to: "/content" });
	const handleDelete = () => navigate({ to: "/content" });

	return (
		<div className="space-y-6 p-6">
			<ContentEntryEditor
				contentType={contentType as ContentType}
				entry={entry as ContentEntry}
				onSave={handleSave}
				onCancel={handleCancel}
				onDelete={handleDelete}
				canDelete={canDelete("contentEntries")}
			/>
		</div>
	);
}

const entryRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/entries/$entryId",
	component: EditEntryPage,
});

function NewEntryPage() {
	const { contentTypeId } = useParams({
		from: "/entries/new/$contentTypeId",
	});
	const navigate = useNavigate();

	const contentType = useQuery(adminApi.getContentType, {
		id: contentTypeId,
	});

	useBreadcrumbLabel(
		`/entries/new/${contentTypeId}`,
		contentType ? `New ${contentType.displayName}` : undefined,
	);

	if (contentType === undefined) {
		return (
			<div className="space-y-6 p-6">
				<div className="flex flex-col items-center justify-center py-12">
					<div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
					<p className="mt-4 text-sm text-muted-foreground">
						Loading content type...
					</p>
				</div>
			</div>
		);
	}

	if (contentType === null) {
		return (
			<div className="space-y-6 p-6">
				<CmsEmptyState
					icon={<FileText className="size-6" />}
					title="Content Type Not Found"
					description="The content type you're looking for doesn't exist or has been deleted."
					action={{
						label: "Back to Content Types",
						onClick: () => navigate({ to: "/content-types" }),
					}}
				/>
			</div>
		);
	}

	const handleSave = (entry: ContentEntry) => {
		navigate({
			to: "/entries/$entryId",
			params: { entryId: entry._id },
		});
	};

	const handleCancel = () => {
		navigate({
			to: "/entries/type/$contentTypeId",
			params: { contentTypeId },
		});
	};

	return (
		<div className="space-y-6 p-6">
			<ContentEntryEditor
				contentType={contentType as ContentType}
				onSave={handleSave}
				onCancel={handleCancel}
			/>
		</div>
	);
}

const newEntryRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/entries/new/$contentTypeId",
	component: NewEntryPage,
});

// --- Content type entries (inline with taxonomy filtering) ---

type ContentStatus = "draft" | "published" | "scheduled" | "archived";
type SortField = "title" | "status" | "updatedAt" | "createdAt";
type SortDirection = "asc" | "desc";

function ContentTypeEntriesRoute() {
	const { contentTypeId } = useParams({
		from: "/entries/type/$contentTypeId",
	});
	const navigate = useNavigate();

	const [selectedStatus, setSelectedStatus] = useState<
		ContentStatus | "all"
	>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [sortField, setSortField] = useState<SortField>("updatedAt");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
	const [currentPage, setCurrentPage] = useState(0);
	const [selectedTermIds, setSelectedTermIds] = useState<string[]>([]);
	const pageSize = 25;

	const { canCreate, canUpdate, canDelete } = usePermissions();
	const deleteEntry = useMutation(adminApi.deleteEntry);

	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [entryToDelete, setEntryToDelete] = useState<{
		_id: string;
		title: string;
	} | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery);
			setCurrentPage(0);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const contentType = useQuery(adminApi.getContentType, {
		id: contentTypeId,
	});

	useBreadcrumbLabel(
		`/entries/type/${contentTypeId}`,
		contentType?.displayName,
	);

	const entriesResult = useQuery(adminApi.listEntries, {
		contentTypeName: contentType?.name,
		status: selectedStatus === "all" ? undefined : selectedStatus,
		search: debouncedSearch || undefined,
		paginationOpts: { numItems: 250, cursor: null },
	});
	const allEntries = entriesResult?.page ?? [];

	const entriesByTermResult0 = useQuery(
		adminApi.getEntriesByTerm,
		selectedTermIds[0] ? { termId: selectedTermIds[0] } : "skip",
	);
	const entriesByTermResult1 = useQuery(
		adminApi.getEntriesByTerm,
		selectedTermIds[1] ? { termId: selectedTermIds[1] } : "skip",
	);
	const entriesByTermResult2 = useQuery(
		adminApi.getEntriesByTerm,
		selectedTermIds[2] ? { termId: selectedTermIds[2] } : "skip",
	);

	const termFilteredEntryIds = useMemo(() => {
		if (selectedTermIds.length === 0) return null;
		const ids = new Set<string>();
		const results = [
			entriesByTermResult0,
			entriesByTermResult1,
			entriesByTermResult2,
		];
		for (let i = 0; i < selectedTermIds.length && i < 3; i++) {
			const result = results[i];
			if (result?.page) {
				for (const entryId of result.page) {
					ids.add(entryId);
				}
			}
		}
		return ids;
	}, [
		selectedTermIds,
		entriesByTermResult0,
		entriesByTermResult1,
		entriesByTermResult2,
	]);

	const getEntryTitle = useCallback(
		(entry: { data: Record<string, unknown> }) => {
			const titleField = contentType?.titleField ?? "title";
			const title = entry.data[titleField];
			return typeof title === "string" && title ? title : "Untitled";
		},
		[contentType?.titleField],
	);

	const sortedEntries = useMemo(() => {
		let entries = [...allEntries];

		if (termFilteredEntryIds !== null) {
			entries = entries.filter((e) => termFilteredEntryIds.has(e._id));
		}

		entries.sort((a, b) => {
			let comparison = 0;
			switch (sortField) {
				case "title": {
					const titleA = getEntryTitle(a).toLowerCase();
					const titleB = getEntryTitle(b).toLowerCase();
					comparison = titleA.localeCompare(titleB);
					break;
				}
				case "status":
					comparison = a.status.localeCompare(b.status);
					break;
				case "updatedAt": {
					const updatedA =
						a.lastPublishedAt ?? a._creationTime ?? 0;
					const updatedB =
						b.lastPublishedAt ?? b._creationTime ?? 0;
					comparison = updatedA - updatedB;
					break;
				}
				case "createdAt":
					comparison =
						(a._creationTime ?? 0) - (b._creationTime ?? 0);
					break;
				default:
					comparison = 0;
			}
			return sortDirection === "desc" ? -comparison : comparison;
		});

		return entries;
	}, [allEntries, sortField, sortDirection, getEntryTitle, termFilteredEntryIds]);

	const paginatedEntries = useMemo(() => {
		const start = currentPage * pageSize;
		return sortedEntries.slice(start, start + pageSize);
	}, [sortedEntries, currentPage, pageSize]);

	const totalPages = Math.ceil(sortedEntries.length / pageSize);

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("desc");
		}
	};

	const getSortIcon = (field: SortField) => {
		if (sortField !== field) {
			return (
				<ArrowUpDown className="size-3.5 text-muted-foreground/50" />
			);
		}
		return sortDirection === "asc" ? (
			<ChevronUp className="size-3.5" />
		) : (
			<ChevronDown className="size-3.5" />
		);
	};

	const handleDeleteClick = useCallback(
		(entry: { _id: string; data: Record<string, unknown> }) => {
			const title = getEntryTitle(entry);
			setEntryToDelete({ _id: entry._id, title });
			setDeleteError(null);
			setDeleteModalOpen(true);
		},
		[getEntryTitle],
	);

	const handleDeleteConfirm = useCallback(async () => {
		if (!entryToDelete) return;

		setIsDeleting(true);
		setDeleteError(null);

		try {
			await deleteEntry({
				id: entryToDelete._id,
				hardDelete: false,
			});
			setDeleteModalOpen(false);
			setEntryToDelete(null);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to delete entry";
			setDeleteError(message);
		} finally {
			setIsDeleting(false);
		}
	}, [entryToDelete, deleteEntry]);

	const handleDeleteModalClose = useCallback(
		(open: boolean) => {
			if (!open && !isDeleting) {
				setDeleteModalOpen(false);
				setEntryToDelete(null);
				setDeleteError(null);
			}
		},
		[isDeleting],
	);

	const clearFilters = useCallback(() => {
		setSearchQuery("");
		setDebouncedSearch("");
		setSelectedStatus("all");
		setSelectedTermIds([]);
		setCurrentPage(0);
	}, []);

	if (contentType === undefined || entriesResult === undefined) {
		return (
			<div className="space-y-6 p-6">
				<div className="flex flex-col items-center justify-center py-12">
					<div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
					<p className="mt-4 text-sm text-muted-foreground">
						Loading entries...
					</p>
				</div>
			</div>
		);
	}

	if (contentType === null) {
		return (
			<div className="space-y-6 p-6">
				<CmsEmptyState
					icon={<FileText className="size-6" />}
					title="Content Type Not Found"
					description="The content type you're looking for doesn't exist or has been deleted."
					action={{
						label: "Back to Content Types",
						onClick: () => navigate({ to: "/content-types" }),
					}}
				/>
			</div>
		);
	}

	const hasFilters =
		searchQuery || selectedStatus !== "all" || selectedTermIds.length > 0;

	return (
		<div className="space-y-6 p-6">
			<CmsPageHeader
				title={contentType.displayName}
				description={contentType.description}
				actions={
					canCreate("contentEntries") && (
						<CmsButton asChild>
							<Link
								to="/entries/new/$contentTypeId"
								params={{ contentTypeId }}
							>
								<Plus className="size-4" />
								Create {contentType.displayName}
							</Link>
						</CmsButton>
					)
				}
			/>

			<CmsToolbar
				left={
					<div className="flex items-center gap-3">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								type="search"
								placeholder="Search entries..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-64 pl-9"
							/>
						</div>
						<Select
							value={selectedStatus}
							onValueChange={(value) => {
								setSelectedStatus(
									value as ContentStatus | "all",
								);
								setCurrentPage(0);
							}}
						>
							<SelectTrigger className="w-36">
								<SelectValue placeholder="All Statuses" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">
									All Statuses
								</SelectItem>
								<SelectItem value="draft">Draft</SelectItem>
								<SelectItem value="published">
									Published
								</SelectItem>
								<SelectItem value="scheduled">
									Scheduled
								</SelectItem>
								<SelectItem value="archived">
									Archived
								</SelectItem>
							</SelectContent>
						</Select>
						<TaxonomyFilter
							selectedTermIds={selectedTermIds}
							onChange={(termIds) => {
								setSelectedTermIds(termIds);
								setCurrentPage(0);
							}}
							placeholder="Tags"
						/>
					</div>
				}
				right={
					<span className="text-sm text-muted-foreground">
						{sortedEntries.length}{" "}
						{sortedEntries.length === 1 ? "entry" : "entries"}
					</span>
				}
			/>

			{sortedEntries.length === 0 ? (
				<CmsEmptyState
					icon={<FileText className="size-6" />}
					title={
						hasFilters
							? "No matching entries"
							: `No ${contentType.displayName} entries yet`
					}
					description={
						hasFilters
							? "Try adjusting your search or filter criteria."
							: `Click "Create ${contentType.displayName}" to add your first entry.`
					}
					action={
						hasFilters
							? {
									label: "Clear Filters",
									onClick: clearFilters,
									variant: "secondary",
								}
							: undefined
					}
				/>
			) : (
				<>
					<div className="rounded-lg border bg-card">
						<table className="w-full">
							<thead>
								<tr className="border-b">
									<th className="p-3 text-left">
										<button
											className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
											onClick={() =>
												handleSort("title")
											}
										>
											Title
											{getSortIcon("title")}
										</button>
									</th>
									<th className="p-3 text-left">
										<button
											className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
											onClick={() =>
												handleSort("status")
											}
										>
											Status
											{getSortIcon("status")}
										</button>
									</th>
									<th className="p-3 text-left">
										<button
											className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
											onClick={() =>
												handleSort("updatedAt")
											}
										>
											Updated
											{getSortIcon("updatedAt")}
										</button>
									</th>
									<th className="p-3 text-left text-sm font-medium text-muted-foreground">
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{paginatedEntries.map((entry) => (
									<tr
										key={entry._id}
										className="border-b last:border-0 transition-colors hover:bg-muted/50"
									>
										<td className="p-3">
											<Link
												to="/entries/$entryId"
												params={{
													entryId: entry._id,
												}}
												className="font-medium text-foreground hover:text-primary hover:underline"
											>
												{getEntryTitle(entry)}
											</Link>
											<p className="text-xs text-muted-foreground">
												{entry.slug}
											</p>
										</td>
										<td className="p-3">
											<CmsStatusBadge
												status={entry.status}
											/>
										</td>
										<td className="p-3 text-sm text-muted-foreground">
											{formatDate(
												entry.lastPublishedAt ??
													entry._creationTime,
											)}
										</td>
										<td className="p-3">
											<div className="flex items-center gap-2">
												<CmsButton
													variant="outline"
													size="sm"
													asChild
												>
													<Link
														to="/entries/$entryId"
														params={{
															entryId:
																entry._id,
														}}
													>
														{canUpdate(
															"contentEntries",
														)
															? "Edit"
															: "View"}
													</Link>
												</CmsButton>
												{canDelete(
													"contentEntries",
												) && (
													<CmsButton
														variant="danger"
														size="sm"
														onClick={() =>
															handleDeleteClick(
																entry,
															)
														}
														data-testid={`delete-entry-${entry._id}`}
													>
														Delete
													</CmsButton>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{totalPages > 1 && (
						<div className="flex items-center justify-center gap-2">
							<CmsButton
								variant="outline"
								size="sm"
								onClick={() => setCurrentPage(0)}
								disabled={currentPage === 0}
							>
								First
							</CmsButton>
							<CmsButton
								variant="outline"
								size="sm"
								onClick={() =>
									setCurrentPage((p) => Math.max(0, p - 1))
								}
								disabled={currentPage === 0}
							>
								Previous
							</CmsButton>
							<span className="px-3 text-sm text-muted-foreground">
								Page {currentPage + 1} of {totalPages}
							</span>
							<CmsButton
								variant="outline"
								size="sm"
								onClick={() =>
									setCurrentPage((p) =>
										Math.min(totalPages - 1, p + 1),
									)
								}
								disabled={currentPage >= totalPages - 1}
							>
								Next
							</CmsButton>
							<CmsButton
								variant="outline"
								size="sm"
								onClick={() =>
									setCurrentPage(totalPages - 1)
								}
								disabled={currentPage >= totalPages - 1}
							>
								Last
							</CmsButton>
						</div>
					)}
				</>
			)}

			{sortedEntries.length > 0 && (
				<p className="text-center text-sm text-muted-foreground">
					Showing {paginatedEntries.length} of{" "}
					{sortedEntries.length}{" "}
					{sortedEntries.length === 1 ? "entry" : "entries"}
				</p>
			)}

			<CmsConfirmDialog
				open={deleteModalOpen}
				onOpenChange={handleDeleteModalClose}
				title="Delete Entry"
				description={
					entryToDelete
						? `Are you sure you want to delete "${entryToDelete.title}"? It will be moved to the trash and can be restored within the retention period.`
						: "Are you sure you want to delete this entry?"
				}
				confirmLabel="Delete"
				variant="danger"
				onConfirm={handleDeleteConfirm}
				isLoading={isDeleting}
				error={deleteError}
			/>
		</div>
	);
}

const contentTypeEntriesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/entries/type/$contentTypeId",
	component: ContentTypeEntriesRoute,
});

// --- Route tree & Router ---

const routeTree = rootRoute.addChildren([
	indexRoute,
	contentRoute,
	contentTypesRoute,
	mediaRoute,
	settingsRoute,
	taxonomiesRoute,
	trashRoute,
	entryRoute,
	newEntryRoute,
	contentTypeEntriesRoute,
]);

export const router = createRouter({
	routeTree,
	defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
