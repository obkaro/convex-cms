import { useState, useCallback, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { useApi } from '~/embed/contexts/ApiContext'
import { CmsDialog } from '~/components/cmsds/CmsDialog'
import { CmsButton } from '~/components/cmsds/CmsButton'
import { CmsField } from '~/components/cmsds/CmsField'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'

export interface MediaFolderForEdit {
  _id: string
  name: string
  description?: string
}

interface MediaFolderEditDialogProps {
  folder: MediaFolderForEdit | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function MediaFolderEditDialog({
  folder,
  open,
  onOpenChange,
  onSaved,
}: MediaFolderEditDialogProps) {
  const api = useApi()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const updateFolder = useMutation(api.updateMediaFolder)

  useEffect(() => {
    if (folder) {
      setName(folder.name)
      setDescription(folder.description || '')
      setError('')
    }
  }, [folder])

  const handleSave = useCallback(async () => {
    if (!folder) return

    if (!name.trim()) {
      setError('Folder name is required')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      await updateFolder({
        id: folder._id,
        name: name.trim(),
        description: description.trim() || undefined,
      })

      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update folder')
    } finally {
      setIsSaving(false)
    }
  }, [folder, name, description, updateFolder, onSaved, onOpenChange])

  if (!folder) return null

  return (
    <CmsDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Folder"
      size="sm"
      footer={
        <>
          <CmsButton
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </CmsButton>
          <CmsButton onClick={handleSave} loading={isSaving}>
            Save Changes
          </CmsButton>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <CmsField label="Folder Name" required htmlFor="folder-name">
          <Input
            id="folder-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter folder name"
          />
        </CmsField>

        <CmsField
          label="Description"
          description="A brief description of the folder contents"
          htmlFor="folder-description"
        >
          <Textarea
            id="folder-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description (optional)"
            rows={3}
          />
        </CmsField>
      </div>
    </CmsDialog>
  )
}
