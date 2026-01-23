import { useState, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface Term {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  color?: string;
  icon?: string;
  sortOrder: number;
  usageCount: number;
  children?: Term[];
}

interface TermTreeProps {
  taxonomyId: string;
  isHierarchical: boolean;
  allowInlineCreation: boolean;
}

export function TermTree({
  taxonomyId,
  isHierarchical,
  allowInlineCreation,
}: TermTreeProps) {
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [parentForNew, setParentForNew] = useState<string | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const termsQuery = isHierarchical
    ? useQuery(api.taxonomies.getTermsHierarchy, { taxonomyId })
    : useQuery(api.taxonomies.listTerms, { taxonomyId });

  const createTerm = useMutation(api.taxonomies.createTerm);
  const updateTerm = useMutation(api.taxonomies.updateTerm);
  const deleteTerm = useMutation(api.taxonomies.deleteTerm);

  const terms = (
    isHierarchical ? termsQuery : (termsQuery as { page?: Term[] })?.page
  ) as Term[] | undefined;
  const isLoading = terms === undefined;

  const toggleExpand = useCallback((termId: string) => {
    setExpandedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(termId)) {
        next.delete(termId);
      } else {
        next.add(termId);
      }
      return next;
    });
  }, []);

  const handleCreateTerm = useCallback((parentId?: string) => {
    setParentForNew(parentId);
    setEditingTerm(null);
    setShowCreateModal(true);
  }, []);

  const handleEditTerm = useCallback((term: Term) => {
    setEditingTerm(term);
    setShowCreateModal(true);
  }, []);

  const handleDeleteTerm = useCallback(
    async (termId: string) => {
      setError(null);
      try {
        await deleteTerm({ id: termId, cascade: true });
        setDeleteConfirm(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete term';
        setError(message);
      }
    },
    [deleteTerm]
  );

  const renderTerm = (term: Term, depth = 0) => {
    const hasChildren = term.children && term.children.length > 0;
    const isExpanded = expandedTerms.has(term._id);

    return (
      <div key={term._id} className="term-tree-item" style={{ '--depth': depth } as React.CSSProperties}>
        <div className="term-tree-row">
          {isHierarchical && (
            <button
              type="button"
              className={`term-tree-expand ${hasChildren ? '' : 'term-tree-expand--hidden'}`}
              onClick={() => toggleExpand(term._id)}
              aria-expanded={isExpanded}
              disabled={!hasChildren}
            >
              {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
            </button>
          )}

          <div className="term-tree-content">
            {term.color && (
              <span
                className="term-color-dot"
                style={{ backgroundColor: term.color }}
              />
            )}
            {term.icon && <span className="term-icon">{term.icon}</span>}
            <span className="term-name">{term.name}</span>
            <span className="term-slug">({term.slug})</span>
            <span className="term-usage-count">{term.usageCount} uses</span>
          </div>

          <div className="term-tree-actions">
            {isHierarchical && allowInlineCreation && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => handleCreateTerm(term._id)}
                title="Add child term"
              >
                +
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => handleEditTerm(term)}
              title="Edit term"
            >
              Edit
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost btn-danger"
              onClick={() => setDeleteConfirm(term._id)}
              title="Delete term"
            >
              Delete
            </button>
          </div>
        </div>

        {isHierarchical && hasChildren && isExpanded && (
          <div className="term-tree-children">
            {term.children!.map((child) => renderTerm(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="term-tree">
      <div className="term-tree-header">
        <h3>Terms</h3>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => handleCreateTerm()}
        >
          Add Term
        </button>
      </div>

      {error && (
        <div className="term-tree-error" role="alert">
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
          >
            &times;
          </button>
        </div>
      )}

      <div className="term-tree-content">
        {isLoading ? (
          <div className="term-tree-loading">Loading terms...</div>
        ) : !terms || terms.length === 0 ? (
          <div className="term-tree-empty">
            <p>No terms yet.</p>
            {allowInlineCreation && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleCreateTerm()}
              >
                Add your first term
              </button>
            )}
          </div>
        ) : (
          <div className="term-tree-list">
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
            setShowCreateModal(false);
            setEditingTerm(null);
            setParentForNew(undefined);
          }}
          onCancel={() => {
            setShowCreateModal(false);
            setEditingTerm(null);
            setParentForNew(undefined);
          }}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Term</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setDeleteConfirm(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete this term?
                {isHierarchical && ' All child terms will also be deleted.'}
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleDeleteTerm(deleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TermEditModalProps {
  taxonomyId: string;
  term?: Term | null;
  parentId?: string;
  isHierarchical: boolean;
  onSave: () => void;
  onCancel: () => void;
}

function TermEditModal({
  taxonomyId,
  term,
  parentId,
  isHierarchical,
  onSave,
  onCancel,
}: TermEditModalProps) {
  const isEditing = !!term;

  const [formData, setFormData] = useState({
    name: term?.name ?? '',
    slug: term?.slug ?? '',
    description: term?.description ?? '',
    color: term?.color ?? '',
    icon: term?.icon ?? '',
    sortOrder: term?.sortOrder ?? 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createTerm = useMutation(api.taxonomies.createTerm);
  const updateTerm = useMutation(api.taxonomies.updateTerm);

  const handleChange = useCallback(
    (field: keyof typeof formData, value: string | number) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    },
    []
  );

  const generateSlug = useCallback((name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }, []);

  const handleNameChange = useCallback(
    (value: string) => {
      handleChange('name', value);
      if (!isEditing && !formData.slug) {
        handleChange('slug', generateSlug(value));
      }
    },
    [handleChange, isEditing, formData.slug, generateSlug]
  );

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) return;

      setIsSubmitting(true);
      setSubmitError(null);

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
          });
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
          });
        }
        onSave();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save term';
        setSubmitError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [validate, isEditing, term, formData, taxonomyId, parentId, createTerm, updateTerm, onSave]
  );

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {isEditing ? 'Edit Term' : 'Create Term'}
            {parentId && !isEditing && ' (Child)'}
          </h3>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {submitError && (
              <div className="form-error" role="alert">
                {submitError}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="termName" className="form-label">
                Name <span className="required">*</span>
              </label>
              <input
                id="termName"
                type="text"
                className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Technology"
                disabled={isSubmitting}
              />
              {errors.name && <span className="form-error-text">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="termSlug" className="form-label">
                Slug <span className="required">*</span>
              </label>
              <input
                id="termSlug"
                type="text"
                className={`form-input ${errors.slug ? 'form-input--error' : ''}`}
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value.toLowerCase())}
                placeholder="e.g., technology"
                disabled={isSubmitting}
              />
              {errors.slug && <span className="form-error-text">{errors.slug}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="termDescription" className="form-label">
                Description
              </label>
              <textarea
                id="termDescription"
                className="form-textarea"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Optional description"
                rows={2}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-row">
              <div className="form-group form-group--third">
                <label htmlFor="termColor" className="form-label">
                  Color
                </label>
                <input
                  id="termColor"
                  type="color"
                  className="form-input form-input--color"
                  value={formData.color || '#6b7280'}
                  onChange={(e) => handleChange('color', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group form-group--third">
                <label htmlFor="termIcon" className="form-label">
                  Icon
                </label>
                <input
                  id="termIcon"
                  type="text"
                  className="form-input"
                  value={formData.icon}
                  onChange={(e) => handleChange('icon', e.target.value)}
                  placeholder="e.g., 💻"
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group form-group--third">
                <label htmlFor="termSortOrder" className="form-label">
                  Sort Order
                </label>
                <input
                  id="termSortOrder"
                  type="number"
                  className="form-input"
                  value={formData.sortOrder}
                  onChange={(e) => handleChange('sortOrder', parseInt(e.target.value) || 0)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Term'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
