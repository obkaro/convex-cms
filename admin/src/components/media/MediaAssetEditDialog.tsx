import { useState, useCallback, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { CmsDialog } from '~/components/cmsds/CmsDialog'
import { CmsButton } from '~/components/cmsds/CmsButton'
import { CmsField } from '~/components/cmsds/CmsField'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { MediaTaxonomyPicker } from './MediaTaxonomyPicker'

export interface MediaAssetForEdit {
  _id: string
  name: string
  title?: string
  description?: string
  altText?: string
  tags?: string[]
}

interface MediaAssetEditDialogProps {
  asset: MediaAssetForEdit | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function MediaAssetEditDialog({
  asset,
  open,
  onOpenChange,
  onSaved,
}: MediaAssetEditDialogProps) {
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [altText, setAltText] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const updateAsset = useMutation(api.admin.updateMediaAsset)

  const taxonomiesResult = useQuery(api.admin.listTaxonomies, {
    isActive: true,
    paginationOpts: { numItems: 50, cursor: null },
  })
  const taxonomies = taxonomiesResult?.page ?? []

  useEffect(() => {
    if (asset) {
      setName(asset.name)
      setTitle(asset.title || '')
      setDescription(asset.description || '')
      setAltText(asset.altText || '')
      setTagsInput(asset.tags?.join(', ') || '')
      setError('')
    }
  }, [asset])

  const handleSave = useCallback(async () => {
    if (!asset) return

    if (!name.trim()) {
      setError('Filename is required')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      await updateAsset({
        id: asset._id,
        name: name.trim(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        altText: altText.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      })

      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update asset')
    } finally {
      setIsSaving(false)
    }
  }, [
    asset,
    name,
    title,
    description,
    altText,
    tagsInput,
    updateAsset,
    onSaved,
    onOpenChange,
  ])

  if (!asset) return null

  return (
    <CmsDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit File"
      size="md"
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

        <CmsField label="Filename" required htmlFor="asset-name">
          <Input
            id="asset-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter filename"
          />
        </CmsField>

        <CmsField
          label="Title"
          description="A human-readable title for the file"
          htmlFor="asset-title"
        >
          <Input
            id="asset-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title (optional)"
          />
        </CmsField>

        <CmsField
          label="Description"
          description="A brief description of the file"
          htmlFor="asset-description"
        >
          <Textarea
            id="asset-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description (optional)"
            rows={3}
          />
        </CmsField>

        <CmsField
          label="Alt Text"
          description="Alternative text for accessibility (important for images)"
          htmlFor="asset-alt"
        >
          <Input
            id="asset-alt"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Describe the image content"
          />
        </CmsField>

        <CmsField
          label="Quick Tags"
          description="Comma-separated tags for simple organization"
          htmlFor="asset-tags"
        >
          <Input
            id="asset-tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g., hero, blog, product"
          />
        </CmsField>

        {taxonomies.length > 0 && asset && (
          <div className="space-y-4 pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Organize with taxonomy terms
            </p>
            {taxonomies.map((taxonomy) => (
              <MediaTaxonomyPicker
                key={taxonomy._id}
                mediaId={asset._id}
                taxonomyId={taxonomy._id}
                taxonomyName={taxonomy.displayName}
                allowCreate={taxonomy.allowInlineCreation}
                disabled={isSaving}
              />
            ))}
          </div>
        )}
      </div>
    </CmsDialog>
  )
}
