/**
 * Shared Taxonomies Page Component
 *
 * Manages taxonomies and their terms (tags, categories, etc.).
 * Used by both CLI routes and embed pages.
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { TaxonomyEditor } from "~/components/TaxonomyEditor";
import { TermTree } from "~/components/TermTree";
import { CmsPageHeader } from "~/components/cmsds/CmsPageHeader";
import { CmsEmptyState } from "~/components/cmsds/CmsEmptyState";
import { CmsSurface } from "~/components/cmsds/CmsSurface";
import { CmsButton } from "~/components/cmsds/CmsButton";
import { CmsConfirmDialog } from "~/components/cmsds/CmsDialog";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/cn";
import { Plus, Tag, FolderTree, Pencil, Trash2 } from "lucide-react";
import type { AdminNavigation } from "~/lib/navigation";
import { CmsAdminApi } from "~/embed/contexts/ApiContext";

interface Taxonomy {
	_id: string;
	name: string;
	displayName: string;
	description?: string;
	isHierarchical: boolean;
	allowInlineCreation: boolean;
	isActive: boolean;
	icon?: string;
	sortOrder?: number;
	termCount?: number;
}

export interface TaxonomiesPageProps {
	api: CmsAdminApi;
	navigation: AdminNavigation;
}

export function TaxonomiesPage({
	api,
	navigation: _navigation,
}: TaxonomiesPageProps) {
	const [selectedTaxonomy, setSelectedTaxonomy] = useState<Taxonomy | null>(
		null,
	);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [editingTaxonomy, setEditingTaxonomy] = useState<Taxonomy | null>(null);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
		null,
	);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	const taxonomiesQuery = useQuery(api.listTaxonomies, {
		isActive: undefined,
		includeDeleted: false,
	});

	const deleteTaxonomy = useMutation(api.deleteTaxonomy);

	const taxonomies = (taxonomiesQuery?.page ?? []) as Taxonomy[];
	const isLoading = taxonomiesQuery === undefined;

	const handleCreate = useCallback(() => {
		setEditingTaxonomy(null);
		setShowCreateModal(true);
	}, []);

	const handleEdit = useCallback((taxonomy: Taxonomy) => {
		setEditingTaxonomy(taxonomy);
		setShowCreateModal(true);
	}, []);

	const handleDelete = useCallback(
		async (taxonomyId: string) => {
			setDeleteError(null);
			try {
				await deleteTaxonomy({ id: taxonomyId });
				setShowDeleteConfirm(null);
				if (selectedTaxonomy?._id === taxonomyId) {
					setSelectedTaxonomy(null);
				}
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Failed to delete taxonomy";
				setDeleteError(message);
			}
		},
		[deleteTaxonomy, selectedTaxonomy],
	);

	const handleSaveComplete = useCallback(() => {
		setShowCreateModal(false);
		setEditingTaxonomy(null);
	}, []);

	const getTypeIcon = (taxonomy: Taxonomy) => {
		return taxonomy.isHierarchical ? (
			<FolderTree className="size-5" />
		) : (
			<Tag className="size-5" />
		);
	};

	return (
		<div className="flex h-[calc(100vh-4rem)] flex-col p-6">
			<div className="mb-6 flex items-start justify-between">
				<CmsPageHeader
					title="Taxonomies"
					description="Manage tags, categories, and other classification systems"
				/>
				<CmsButton onClick={handleCreate}>
					<Plus className="size-4" />
					Create Taxonomy
				</CmsButton>
			</div>

			<div className="flex min-h-0 flex-1 gap-6">
				<CmsSurface elevation="base" className="w-80 shrink-0 overflow-hidden">
					{isLoading ? (
						<div className="flex flex-col items-center justify-center py-12">
							<div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
							<p className="mt-3 text-sm text-muted-foreground">
								Loading taxonomies...
							</p>
						</div>
					) : taxonomies.length === 0 ? (
						<div className="flex flex-col items-center justify-center p-6 text-center">
							<Tag className="mb-3 size-8 text-muted-foreground" />
							<p className="text-sm text-muted-foreground">
								No taxonomies created yet.
							</p>
							<CmsButton
								variant="secondary"
								className="mt-4"
								onClick={handleCreate}
							>
								Create your first taxonomy
							</CmsButton>
						</div>
					) : (
						<ScrollArea className="h-full">
							<div className="divide-y">
								{taxonomies.map((taxonomy) => (
									<div
										key={taxonomy._id}
										className={cn(
											"group flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-muted/50",
											selectedTaxonomy?._id === taxonomy._id && "bg-primary/5",
											!taxonomy.isActive && "opacity-60",
										)}
										onClick={() => setSelectedTaxonomy(taxonomy)}
									>
										<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
											{getTypeIcon(taxonomy)}
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium text-foreground">
												{taxonomy.displayName}
											</p>
											<p className="truncate text-xs text-muted-foreground">
												{taxonomy.name}
											</p>
										</div>
										<div className="flex shrink-0 items-center gap-2">
											<Badge
												variant="secondary"
												className="text-xs font-normal"
											>
												{taxonomy.isHierarchical ? "Hierarchical" : "Flat"}
											</Badge>
											{!taxonomy.isActive && (
												<Badge
													variant="outline"
													className="text-xs font-normal"
												>
													Inactive
												</Badge>
											)}
										</div>
										<div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
											<CmsButton
												variant="ghost"
												size="icon-sm"
												onClick={(e) => {
													e.stopPropagation();
													handleEdit(taxonomy);
												}}
												title="Edit taxonomy"
											>
												<Pencil className="size-4" />
											</CmsButton>
											<CmsButton
												variant="ghost"
												size="icon-sm"
												onClick={(e) => {
													e.stopPropagation();
													setShowDeleteConfirm(taxonomy._id);
												}}
												title="Delete taxonomy"
												className="text-destructive hover:bg-destructive/10 hover:text-destructive"
											>
												<Trash2 className="size-4" />
											</CmsButton>
										</div>
									</div>
								))}
							</div>
						</ScrollArea>
					)}
				</CmsSurface>

				<CmsSurface elevation="base" className="min-w-0 flex-1 overflow-hidden">
					{selectedTaxonomy ? (
						<div className="flex h-full flex-col">
							<div className="flex items-start justify-between border-b p-4">
								<div className="flex items-center gap-3">
									<div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
										{getTypeIcon(selectedTaxonomy)}
									</div>
									<div>
										<h2 className="text-lg font-semibold text-foreground">
											{selectedTaxonomy.displayName}
										</h2>
										{selectedTaxonomy.description && (
											<p className="text-sm text-muted-foreground">
												{selectedTaxonomy.description}
											</p>
										)}
									</div>
								</div>
								<CmsButton
									variant="secondary"
									onClick={() => handleEdit(selectedTaxonomy)}
								>
									Edit Taxonomy
								</CmsButton>
							</div>

							<div className="flex-1 overflow-auto p-4">
								<TermTree
									taxonomyId={selectedTaxonomy._id}
									isHierarchical={selectedTaxonomy.isHierarchical}
									allowInlineCreation={selectedTaxonomy.allowInlineCreation}
								/>
							</div>
						</div>
					) : (
						<CmsEmptyState
							icon={<Tag className="size-6" />}
							title="Select a taxonomy"
							description="Select a taxonomy to view and manage its terms"
							className="h-full"
						/>
					)}
				</CmsSurface>
			</div>

			{showCreateModal && (
				<TaxonomyEditor
					taxonomy={editingTaxonomy}
					onSave={handleSaveComplete}
					onCancel={() => {
						setShowCreateModal(false);
						setEditingTaxonomy(null);
					}}
				/>
			)}

			<CmsConfirmDialog
				open={showDeleteConfirm !== null}
				onOpenChange={(open) => {
					if (!open) {
						setShowDeleteConfirm(null);
						setDeleteError(null);
					}
				}}
				title="Delete Taxonomy"
				description="Are you sure you want to delete this taxonomy? All associated terms will also be deleted."
				confirmLabel="Delete"
				onConfirm={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
				variant="danger"
				error={deleteError}
			/>
		</div>
	);
}
