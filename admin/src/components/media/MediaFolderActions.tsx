import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { CmsButton } from '~/components/cmsds/CmsButton'
import { MoreHorizontal, Pencil, FolderInput, Trash2 } from 'lucide-react'

export interface MediaFolderForActions {
  _id: string
  name: string
}

interface MediaFolderActionsProps {
  folder: MediaFolderForActions
  onEdit?: () => void
  onMove?: () => void
  onDelete?: () => void
}

export function MediaFolderActions({
  folder: _folder,
  onEdit,
  onMove,
  onDelete,
}: MediaFolderActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <CmsButton
          variant="ghost"
          size="icon-sm"
          className="opacity-0 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </CmsButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 size-4" />
            Rename
          </DropdownMenuItem>
        )}
        {onMove && (
          <DropdownMenuItem onClick={onMove}>
            <FolderInput className="mr-2 size-4" />
            Move to...
          </DropdownMenuItem>
        )}
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
  )
}
