import { useState, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { CmsDialog, CmsConfirmDialog } from '~/components/cmsds/CmsDialog'
import { CmsButton } from '~/components/cmsds/CmsButton'
import { CmsEmptyState } from '~/components/cmsds/CmsEmptyState'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, Tags } from 'lucide-react'
import { cn } from '~/lib/cn'

interface Term {
  _id: string
  name: string
  slug: string
  description?: string
  parentId?: string
  color?: string
  icon?: string
  sortOrder: number
  usageCount: number
  children?: Term[]
}

interface TermTreeProps {
  taxonomyId: string
  isHierarchical: boolean
  allowInlineCreation: boolean
}

export function TermTree({
  taxonomyId,
  isHierarchical,
  allowInlineCreation,
}: TermTreeProps) {
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set())
  const [editingTerm, setEditingTerm] = useState<Term | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [parentForNew, setParentForNew] = useState<string | undefined>()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const termsQuery = isHierarchical
    ? useQuery(api.taxonomies.getTermsHierarchy, { taxonomyId })
    : useQuery(api.taxonomies.listTerms, { taxonomyId })

  const deleteTerm = useMutation(api.taxonomies.deleteTerm)

  const terms = (
    isHierarchical ? termsQuery : (termsQuery as { page?: Term[] })?.page
  ) as Term[] | undefined
  const isLoading = terms === undefined

  const toggleExpand = useCallback((termId: string) => {
    setExpandedTerms((prev) => {
      const next = new Set(prev)
      if (next.has(termId)) {
        next.delete(termId)
      } else {
        next.add(termId)
      }
      return next
    })
  }, [])

  const handleCreateTerm = useCallback((parentId?: string) => {
    setParentForNew(parentId)
    setEditingTerm(null)
    setShowCreateModal(true)
  }, [])

  const handleEditTerm = useCallback((term: Term) => {
    setEditingTerm(term)
    setShowCreateModal(true)
  }, [])

  const handleDeleteTerm = useCallback(
    async (termId: string) => {
      setError(null)
      try {
        await deleteTerm({ id: termId, cascade: true })
        setDeleteConfirm(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete term'
        setError(message)
      }
    },
    [deleteTerm]
  )

  const renderTerm = (term: Term, depth = 0) => {
    const hasChildren = term.children && term.children.length > 0
    const isExpanded = expandedTerms.has(term._id)

    return (
      <div key={term._id} className="border-b border-border/50 last:border-0">
        <div
          className={cn(
            'group flex items-center gap-2 py-2 pr-2 transition-colors hover:bg-muted/50',
            depth > 0 && 'border-l-2 border-muted'
          )}
          style={{ paddingLeft: `${depth * 24 + 8}px` }}
        >
          {isHierarchical && (
            <button
              type="button"
              onClick={() => toggleExpand(term._id)}
              disabled={!hasChildren}
              className={cn(
                'flex size-5 items-center justify-center rounded transition-colors',
                hasChildren
                  ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  : 'invisible'
              )}
              aria-expanded={isExpanded}
            >
              {hasChildren &&
                (isExpanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                ))}
            </button>
          )}

          <div className="flex min-w-0 flex-1 items-center gap-2">
            {term.color && (
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: term.color }}
              />
            )}
            {term.icon && (
              <span className="shrink-0 text-sm">{term.icon}</span>
            )}
            <span className="truncate font-medium text-foreground">
              {term.name}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              ({term.slug})
            </span>
            <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {term.usageCount} {term.usageCount === 1 ? 'use' : 'uses'}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {isHierarchical && allowInlineCreation && (
              <CmsButton
                variant="ghost"
                size="sm"
                onClick={() => handleCreateTerm(term._id)}
                title="Add child term"
                className="size-7 p-0"
              >
                <Plus className="size-3.5" />
              </CmsButton>
            )}
            <CmsButton
              variant="ghost"
              size="sm"
              onClick={() => handleEditTerm(term)}
              title="Edit term"
              className="size-7 p-0"
            >
              <Pencil className="size-3.5" />
            </CmsButton>
            <CmsButton
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirm(term._id)}
              title="Delete term"
              className="size-7 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </CmsButton>
          </div>
        </div>

        {isHierarchical && hasChildren && isExpanded && (
          <div>{term.children!.map((child) => renderTerm(child, depth + 1))}</div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Terms</h3>
        <CmsButton variant="secondary" size="sm" onClick={() => handleCreateTerm()}>
          <Plus className="size-3.5" />
          Add Term
        </CmsButton>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        ) : !terms || terms.length === 0 ? (
          <CmsEmptyState
            icon={<Tags className="size-8" />}
            title="No terms yet"
            description="Add your first term to start organizing content."
            action={
              allowInlineCreation && (
                <CmsButton variant="secondary" onClick={() => handleCreateTerm()}>
                  <Plus className="size-4" />
                  Add your first term
                </CmsButton>
              )
            }
          />
        ) : (
          <div className="divide-y divide-border/50">
            {terms.map((term) => renderTerm(term))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <TermEditModal
          taxonomyId={taxonomyId}
          term={editingTerm}
          parentId={parentForNew}
          isHierarchical={isHierarchical}
          onSave={() => {
            setShowCreateModal(false)
            setEditingTerm(null)
            setParentForNew(undefined)
          }}
          onCancel={() => {
            setShowCreateModal(false)
            setEditingTerm(null)
            setParentForNew(undefined)
          }}
        />
      )}

      <CmsConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Term"
        description={
          isHierarchical
            ? 'Are you sure you want to delete this term? All child terms will also be deleted.'
            : 'Are you sure you want to delete this term?'
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteConfirm && handleDeleteTerm(deleteConfirm)}
      />
    </div>
  )
}

interface TermEditModalProps {
  taxonomyId: string
  term?: Term | null
  parentId?: string
  isHierarchical: boolean
  onSave: () => void
  onCancel: () => void
}

function TermEditModal({
  taxonomyId,
  term,
  parentId,
  isHierarchical,
  onSave,
  onCancel,
}: TermEditModalProps) {
  const isEditing = !!term

  const [formData, setFormData] = useState({
    name: term?.name ?? '',
    slug: term?.slug ?? '',
    description: term?.description ?? '',
    color: term?.color ?? '',
    icon: term?.icon ?? '',
    sortOrder: term?.sortOrder ?? 0,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const createTerm = useMutation(api.taxonomies.createTerm)
  const updateTerm = useMutation(api.taxonomies.updateTerm)

  const handleChange = useCallback(
    (field: keyof typeof formData, value: string | number) => {
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

  const handleNameChange = useCallback(
    (value: string) => {
      handleChange('name', value)
      if (!isEditing && !slugManuallyEdited) {
        handleChange('slug', generateSlug(value))
      }
    },
    [handleChange, isEditing, slugManuallyEdited, generateSlug]
  )

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required'
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug =
        'Slug must contain only lowercase letters, numbers, and hyphens'
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
        if (isEditing && term) {
          await updateTerm({
            id: term._id,
            name: formData.name,
            slug: formData.slug,
            description: formData.description || undefined,
            color: formData.color || undefined,
            icon: formData.icon || undefined,
            sortOrder: formData.sortOrder,
          })
        } else {
          await createTerm({
            taxonomyId,
            name: formData.name,
            slug: formData.slug,
            description: formData.description || undefined,
            parentId: parentId,
            color: formData.color || undefined,
            icon: formData.icon || undefined,
            sortOrder: formData.sortOrder,
          })
        }
        onSave()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to save term'
        setSubmitError(message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      validate,
      isEditing,
      term,
      formData,
      taxonomyId,
      parentId,
      createTerm,
      updateTerm,
      onSave,
    ]
  )

  const title = isEditing
    ? 'Edit Term'
    : parentId
      ? 'Create Child Term'
      : 'Create Term'

  return (
    <CmsDialog
      open={true}
      onOpenChange={(open) => !open && !isSubmitting && onCancel()}
      title={title}
      size="md"
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
            {isEditing ? 'Save Changes' : 'Create Term'}
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
          <Label htmlFor="termName">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="termName"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g., Technology"
            disabled={isSubmitting}
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="termSlug">
            Slug <span className="text-destructive">*</span>
          </Label>
          <Input
            id="termSlug"
            value={formData.slug}
            onChange={(e) => {
              handleChange('slug', e.target.value.toLowerCase())
              setSlugManuallyEdited(true)
            }}
            placeholder="e.g., technology"
            disabled={isSubmitting}
            className={errors.slug ? 'border-destructive' : ''}
          />
          {errors.slug && (
            <p className="text-xs text-destructive">{errors.slug}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="termDescription">Description</Label>
          <Textarea
            id="termDescription"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Optional description"
            rows={2}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="termColor">Color</Label>
            <Input
              id="termColor"
              type="color"
              value={formData.color || '#6b7280'}
              onChange={(e) => handleChange('color', e.target.value)}
              disabled={isSubmitting}
              className="h-9 p-1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="termIcon">Icon</Label>
            <Input
              id="termIcon"
              value={formData.icon}
              onChange={(e) => handleChange('icon', e.target.value)}
              placeholder="e.g., 💻"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="termSortOrder">Sort Order</Label>
            <Input
              id="termSortOrder"
              type="number"
              value={formData.sortOrder}
              onChange={(e) =>
                handleChange('sortOrder', parseInt(e.target.value) || 0)
              }
              disabled={isSubmitting}
            />
          </div>
        </div>
      </form>
    </CmsDialog>
  )
}
