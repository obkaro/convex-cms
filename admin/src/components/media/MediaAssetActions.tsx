import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { CmsButton } from "../cmsds/CmsButton";
import {
	Eye,
	Pencil,
	FolderInput,
	Download,
	Link2,
	Trash2,
	MoreVertical,
} from "lucide-react";

export interface MediaAssetForActions {
	_id: string;
	name: string;
	url: string | null;
}

interface MediaAssetActionsProps {
	asset: MediaAssetForActions;
	onView?: () => void;
	onEdit?: () => void;
	onMove?: () => void;
	onDelete?: () => void;
}

export function MediaAssetActions({
	asset,
	onView,
	onEdit,
	onMove,
	onDelete,
}: MediaAssetActionsProps) {
	const handleDownload = () => {
		if (!asset.url) return;
		const link = document.createElement("a");
		link.href = asset.url;
		link.download = asset.name;
		link.target = "_blank";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handleCopyUrl = async () => {
		if (!asset.url) return;
		await navigator.clipboard.writeText(asset.url);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<CmsButton
					variant="ghost"
					size="icon-sm"
					className="opacity-0 group-hover:opacity-100"
					onClick={(e) => e.stopPropagation()}
				>
					<MoreVertical className="size-4" />
				</CmsButton>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				// align="start"
				side="bottom"
				onClick={(e) => e.stopPropagation()}
			>
				{onView && (
					<DropdownMenuItem onClick={onView}>
						<Eye className="mr-2 size-4" />
						View Details
					</DropdownMenuItem>
				)}
				{onEdit && (
					<DropdownMenuItem onClick={onEdit}>
						<Pencil className="mr-2 size-4" />
						Edit
					</DropdownMenuItem>
				)}
				{onMove && (
					<DropdownMenuItem onClick={onMove}>
						<FolderInput className="mr-2 size-4" />
						Move to...
					</DropdownMenuItem>
				)}
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleDownload} disabled={!asset.url}>
					<Download className="mr-2 size-4" />
					Download
				</DropdownMenuItem>
				<DropdownMenuItem onClick={handleCopyUrl} disabled={!asset.url}>
					<Link2 className="mr-2 size-4" />
					Copy URL
				</DropdownMenuItem>
				{onDelete && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={onDelete}
							className="text-destructive focus:text-destructive"
						>
							<Trash2 className="mr-2 size-4" />
							Delete
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
