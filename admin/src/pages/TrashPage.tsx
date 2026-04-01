/**
 * Shared Trash Page Component
 *
 * Displays deleted items and allows restoration or permanent deletion.
 * Used by both CLI routes and embed pages.
 */

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import {
	CmsPageHeader,
	CmsEmptyState,
	CmsSurface,
	CmsButton,
	CmsConfirmDialog,
	CmsFilterBar,
	CmsTable,
	type CmsTableColumn,
} from "../components/cmsds";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Trash2, RotateCcw, AlertTriangle, X } from "lucide-react";
import type { AdminNavigation } from "../lib/navigation";
import type { CmsAdminApi } from "../embed/contexts/ApiContext";

interface TrashItem {
	_id: string;
	contentTypeId?: string;
	contentTypeName?: string;
	slug?: string;
	name?: string;
	title?: string;
	status?: string;
	deletedAt: number;
	deletedBy?: string;
	data?: Record<string, unknown>;
}

export interface TrashPageProps {
	api: CmsAdminApi;
	navigation: AdminNavigation;
}

export function TrashPage({ api, navigation: _navigation }: TrashPageProps) {
	const [selectedContentType, setSelectedContentType] = useState<string>("");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
	const [restoreError, setRestoreError] = useState<string | null>(null);
	const [isRestoring, setIsRestoring] = useState(false);
	const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
	const [isEmptying, setIsEmptying] = useState(false);
	const [emptyError, setEmptyError] = useState<string | null>(null);

	const trashQuery = useQuery(api.listTrash, {
		contentTypeId: selectedContentType || undefined,
		search: searchQuery || undefined,
		paginationOpts: { numItems: 50, cursor: null },
	});

	const configQuery = useQuery(api.getTrashConfig, {});
	const statsQuery = useQuery(api.getTrashStats, {});
	const contentTypesQuery = useQuery(api.listContentTypes, {});

	const contentTypes = contentTypesQuery?.page ?? [];

	const restoreMutation = useMutation(api.bulkRestore);
	const emptyMutation = useMutation(api.emptyTrash);

	const trashItems = (trashQuery?.page ?? []) as TrashItem[];
	const isLoading = trashQuery === undefined;
	const config = configQuery;
	const stats = statsQuery;

	const handleRestore = useCallback(
		async (ids: string[]) => {
			setIsRestoring(true);
			setRestoreError(null);

			try {
				await restoreMutation({ ids });
				setSelectedItems((prev) => {
					const next = new Set(prev);
					ids.forEach((id) => next.delete(id));
					return next;
				});
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Failed to restore";
				setRestoreError(message);
			} finally {
				setIsRestoring(false);
			}
		},
		[restoreMutation],
	);

	const handleEmptyTrash = useCallback(async () => {
		setIsEmptying(true);
		setEmptyError(null);

		try {
			await emptyMutation({});
			setShowEmptyConfirm(false);
			setSelectedItems(new Set());
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to empty trash";
			setEmptyError(message);
		} finally {
			setIsEmptying(false);
		}
	}, [emptyMutation]);

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getDaysUntilDeletion = (deletedAt: number) => {
		if (!config?.retentionDays) return null;
		const expiresAt = deletedAt + config.retentionDays * 24 * 60 * 60 * 1000;
		const daysLeft = Math.ceil(
			(expiresAt - Date.now()) / (24 * 60 * 60 * 1000),
		);
		return Math.max(0, daysLeft);
	};

	const getItemTitle = (item: TrashItem) => {
		if (item.title) return item.title;
		if (item.name) return item.name;
		if (item.data) {
			const titleField = item.data.title || item.data.name;
			if (titleField && typeof titleField === "string") return titleField;
		}
		return item.slug || item._id;
	};

	const trashColumns: CmsTableColumn<TrashItem>[] = useMemo(
		() => [
			{
				key: "name",
				header: "Name",
				cell: (item) => (
					<>
						<span className="font-medium text-foreground">{getItemTitle(item)}</span>
						{item.slug && (
							<span className="block text-xs text-muted-foreground">{item.slug}</span>
						)}
					</>
				),
			},
			{
				key: "type",
				header: "Type",
				cell: (item) => (
					<span className="text-sm text-muted-foreground">
						{item.contentTypeName || "Unknown"}
					</span>
				),
			},
			{
				key: "deleted",
				header: "Deleted",
				cell: (item) => (
					<>
						<span className="text-sm text-muted-foreground">
							{formatDate(item.deletedAt)}
						</span>
						{item.deletedBy && (
							<span className="block text-xs text-muted-foreground">
								by {item.deletedBy}
							</span>
						)}
					</>
				),
			},
			{
				key: "expires",
				header: "Expires In",
				cell: (item) => {
					const daysLeft = getDaysUntilDeletion(item.deletedAt);
					return daysLeft !== null ? (
						<Badge
							variant={daysLeft <= 3 ? "destructive" : "secondary"}
							className="font-normal"
						>
							{daysLeft} {daysLeft === 1 ? "day" : "days"}
						</Badge>
					) : null;
				},
			},
			{
				key: "actions",
				header: "Actions",
				cell: (item) => (
					<CmsButton
						variant="outline"
						size="sm"
						onClick={() => handleRestore([item._id])}
						loading={isRestoring}
					>
						<RotateCcw className="size-4" />
						Restore
					</CmsButton>
				),
			},
		],
		[isRestoring, handleRestore, config?.retentionDays]
	);

	return (
		<div className="flex flex-col gap-4 md:gap-6">
			<div className="flex items-start justify-between">
				<CmsPageHeader
					title="Trash"
					description={`Deleted items are kept for ${
						config?.retentionDays ?? 30
					} days before permanent deletion`}
				/>
				{trashItems.length > 0 && (
					<CmsButton variant="danger" onClick={() => setShowEmptyConfirm(true)}>
						<Trash2 className="size-4" />
						Empty Trash
					</CmsButton>
				)}
			</div>

			{stats && (
				<div className="grid gap-4 sm:grid-cols-2">
					<CmsSurface elevation="base" className="p-4">
						<p className="text-2xl font-semibold text-foreground">
							{stats.totalCount ?? 0}
						</p>
						<p className="text-sm text-muted-foreground">Items in Trash</p>
					</CmsSurface>
					<CmsSurface elevation="base" className="p-4">
						<p className="text-2xl font-semibold text-foreground">
							{stats.expiredCount ?? 0}
						</p>
						<p className="text-sm text-muted-foreground">Expired</p>
					</CmsSurface>
				</div>
			)}

			<CmsFilterBar
				search={{
					value: searchQuery,
					onChange: setSearchQuery,
					placeholder: "Search deleted items...",
					className: "w-full md:w-64",
				}}
				filters={[
					{
						key: "contentType",
						value: selectedContentType || "all",
						onChange: (v) => setSelectedContentType(v === "all" ? "" : v),
						options: [
							{ value: "all", label: "All Content Types" },
							...contentTypes.map((type: { _id: string; displayName: string }) => ({
								value: type._id,
								label: type.displayName,
							})),
						],
						className: "w-full sm:w-48",
					},
				]}
			/>

			{restoreError && (
				<Alert variant="destructive">
					<AlertTriangle className="size-4" />
					<AlertDescription className="flex items-center justify-between">
						{restoreError}
						<CmsButton
							variant="ghost"
							size="icon-sm"
							onClick={() => setRestoreError(null)}
						>
							<X className="size-4" />
						</CmsButton>
					</AlertDescription>
				</Alert>
			)}

			{emptyError && (
				<Alert variant="destructive">
					<AlertTriangle className="size-4" />
					<AlertDescription className="flex items-center justify-between">
						{emptyError}
						<CmsButton
							variant="ghost"
							size="icon-sm"
							onClick={() => setEmptyError(null)}
						>
							<X className="size-4" />
						</CmsButton>
					</AlertDescription>
				</Alert>
			)}

			{selectedItems.size > 0 && (
				<div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
					<span className="text-sm font-medium">
						{selectedItems.size} {selectedItems.size === 1 ? "item" : "items"}{" "}
						selected
					</span>
					<CmsButton
						variant="primary"
						size="sm"
						onClick={() => handleRestore(Array.from(selectedItems))}
						loading={isRestoring}
					>
						<RotateCcw className="size-4" />
						Restore Selected
					</CmsButton>
					<CmsButton
						variant="secondary"
						size="sm"
						onClick={() => setSelectedItems(new Set())}
					>
						Clear Selection
					</CmsButton>
				</div>
			)}

			{isLoading ? (
				<div className="flex flex-col items-center justify-center py-12">
					<div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
					<p className="mt-4 text-sm text-muted-foreground">Loading trash...</p>
				</div>
			) : trashItems.length === 0 ? (
				<CmsEmptyState
					icon={<Trash2 className="size-6" />}
					title="Trash is empty"
					description="Deleted items will appear here"
				/>
			) : (
				<CmsTable
					columns={trashColumns}
					data={trashItems}
					getRowId={(item) => item._id}
					selectable
					selectedIds={selectedItems}
					onSelectionChange={setSelectedItems}
					emptyMessage="No items in trash"
				/>
			)}

			<CmsConfirmDialog
				open={showEmptyConfirm}
				onOpenChange={setShowEmptyConfirm}
				title="Empty Trash"
				description="This will permanently delete all items in the trash. This action cannot be undone."
				confirmLabel={isEmptying ? "Deleting..." : "Empty Trash"}
				onConfirm={handleEmptyTrash}
				variant="danger"
				loading={isEmptying}
			/>
		</div>
	);
}
