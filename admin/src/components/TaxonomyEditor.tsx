import { useState, useCallback, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { CmsDialog } from '~/components/cmsds/CmsDialog'
import { CmsButton } from '~/components/cmsds/CmsButton'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Checkbox } from '~/components/ui/checkbox'

interface Taxonomy {
  _id: string
  name: string
  displayName: string
  description?: string
  isHierarchical: boolean
  allowInlineCreation: boolean
  isActive: boolean
  icon?: string
  sortOrder?: number
}

interface TaxonomyEditorProps {
  taxonomy?: Taxonomy | null
  onSave: () => void
  onCancel: () => void
}

export function TaxonomyEditor({
  taxonomy,
  onSave,
  onCancel,
}: TaxonomyEditorProps) {
  const isEditing = !!taxonomy

  const [formData, setFormData] = useState({
    name: taxonomy?.name ?? '',
    displayName: taxonomy?.displayName ?? '',
    description: taxonomy?.description ?? '',
    isHierarchical: taxonomy?.isHierarchical ?? false,
    allowInlineCreation: taxonomy?.allowInlineCreation ?? true,
    isActive: taxonomy?.isActive ?? true,
    icon: taxonomy?.icon ?? '',
    sortOrder: taxonomy?.sortOrder ?? 0,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const createTaxonomy = useMutation(api.taxonomies.createTaxonomy)
  const updateTaxonomy = useMutation(api.taxonomies.updateTaxonomy)

  useEffect(() => {
    if (taxonomy) {
      setFormData({
        name: taxonomy.name,
        displayName: taxonomy.displayName,
        description: taxonomy.description ?? '',
        isHierarchical: taxonomy.isHierarchical,
        allowInlineCreation: taxonomy.allowInlineCreation,
        isActive: taxonomy.isActive,
        icon: taxonomy.icon ?? '',
        sortOrder: taxonomy.sortOrder ?? 0,
      })
    }
  }, [taxonomy])

  const handleChange = useCallback(
    (field: keyof typeof formData, value: string | boolean | number) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      setErrors((prev) => {
        const { [field]: _, ...rest } = prev
        return rest
      })
    },
    []
  )

  const generateSlug = useCallback((name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }, [])

  const handleDisplayNameChange = useCallback(
    (value: string) => {
      handleChange('displayName', value)
      if (!isEditing && !formData.name) {
        handleChange('name', generateSlug(value))
      }
    },
    [handleChange, isEditing, formData.name, generateSlug]
  )

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Slug is required'
    } else if (!/^[a-z][a-z0-9-]*$/.test(formData.name)) {
      newErrors.name =
        'Slug must start with a letter and contain only lowercase letters, numbers, and hyphens'
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!validate()) return

      setIsSubmitting(true)
      setSubmitError(null)

      try {
        if (isEditing && taxonomy) {
          await updateTaxonomy({
            id: taxonomy._id,
            displayName: formData.displayName,
            description: formData.description || undefined,
            allowInlineCreation: formData.allowInlineCreation,
            icon: formData.icon || undefined,
            sortOrder: formData.sortOrder,
            isActive: formData.isActive,
          })
        } else {
          await createTaxonomy({
            name: formData.name,
            displayName: formData.displayName,
            description: formData.description || undefined,
            isHierarchical: formData.isHierarchical,
            allowInlineCreation: formData.allowInlineCreation,
            icon: formData.icon || undefined,
            sortOrder: formData.sortOrder,
          })
        }
        onSave()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to save taxonomy'
        setSubmitError(message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      validate,
      isEditing,
      taxonomy,
      formData,
      createTaxonomy,
      updateTaxonomy,
      onSave,
    ]
  )

  return (
    <CmsDialog
      open={true}
      onOpenChange={(open) => !open && !isSubmitting && onCancel()}
      title={isEditing ? 'Edit Taxonomy' : 'Create Taxonomy'}
      size="lg"
      footer={
        <>
          <CmsButton variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </CmsButton>
          <CmsButton
            variant="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
          >
            {isEditing ? 'Save Changes' : 'Create Taxonomy'}
          </CmsButton>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {submitError}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="displayName">
            Display Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="displayName"
            value={formData.displayName}
            onChange={(e) => handleDisplayNameChange(e.target.value)}
            placeholder="e.g., Categories, Tags"
            disabled={isSubmitting}
            className={errors.displayName ? 'border-destructive' : ''}
          />
          {errors.displayName && (
            <p className="text-xs text-destructive">{errors.displayName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">
            Slug <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value.toLowerCase())}
            placeholder="e.g., categories, tags"
            disabled={isSubmitting || isEditing}
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
          {isEditing && (
            <p className="text-xs text-muted-foreground">
              Slug cannot be changed after creation
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Optional description"
            rows={2}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="icon">Icon</Label>
            <Input
              id="icon"
              value={formData.icon}
              onChange={(e) => handleChange('icon', e.target.value)}
              placeholder="e.g., 🏷️ or folder"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">Emoji or icon name</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input
              id="sortOrder"
              type="number"
              value={formData.sortOrder}
              onChange={(e) =>
                handleChange('sortOrder', parseInt(e.target.value) || 0)
              }
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-start gap-3">
            <Checkbox
              id="isHierarchical"
              checked={formData.isHierarchical}
              onCheckedChange={(checked) =>
                handleChange('isHierarchical', checked as boolean)
              }
              disabled={isSubmitting || isEditing}
            />
            <div className="space-y-0.5">
              <Label
                htmlFor="isHierarchical"
                className="cursor-pointer font-medium"
              >
                Hierarchical
              </Label>
              <p className="text-xs text-muted-foreground">
                Terms can have parent-child relationships (like categories)
              </p>
              {isEditing && (
                <p className="text-xs text-amber-600">
                  Hierarchy type cannot be changed after creation
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="allowInlineCreation"
              checked={formData.allowInlineCreation}
              onCheckedChange={(checked) =>
                handleChange('allowInlineCreation', checked as boolean)
              }
              disabled={isSubmitting}
            />
            <div className="space-y-0.5">
              <Label
                htmlFor="allowInlineCreation"
                className="cursor-pointer font-medium"
              >
                Allow inline creation
              </Label>
              <p className="text-xs text-muted-foreground">
                Users can create new terms while editing content
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                handleChange('isActive', checked as boolean)
              }
              disabled={isSubmitting}
            />
            <div className="space-y-0.5">
              <Label htmlFor="isActive" className="cursor-pointer font-medium">
                Active
              </Label>
              <p className="text-xs text-muted-foreground">
                Inactive taxonomies are hidden from content editors
              </p>
            </div>
          </div>
        </div>
      </form>
    </CmsDialog>
  )
}
