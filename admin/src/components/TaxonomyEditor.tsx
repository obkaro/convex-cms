import { useState, useCallback, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

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
}

interface TaxonomyEditorProps {
  taxonomy?: Taxonomy | null;
  onSave: () => void;
  onCancel: () => void;
}

export function TaxonomyEditor({ taxonomy, onSave, onCancel }: TaxonomyEditorProps) {
  const isEditing = !!taxonomy;

  const [formData, setFormData] = useState({
    name: taxonomy?.name ?? '',
    displayName: taxonomy?.displayName ?? '',
    description: taxonomy?.description ?? '',
    isHierarchical: taxonomy?.isHierarchical ?? false,
    allowInlineCreation: taxonomy?.allowInlineCreation ?? true,
    isActive: taxonomy?.isActive ?? true,
    icon: taxonomy?.icon ?? '',
    sortOrder: taxonomy?.sortOrder ?? 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createTaxonomy = useMutation(api.taxonomies.createTaxonomy);
  const updateTaxonomy = useMutation(api.taxonomies.updateTaxonomy);

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
      });
    }
  }, [taxonomy]);

  const handleChange = useCallback(
    (field: keyof typeof formData, value: string | boolean | number) => {
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

  const handleDisplayNameChange = useCallback(
    (value: string) => {
      handleChange('displayName', value);
      if (!isEditing && !formData.name) {
        handleChange('name', generateSlug(value));
      }
    },
    [handleChange, isEditing, formData.name, generateSlug]
  );

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Slug is required';
    } else if (!/^[a-z][a-z0-9-]*$/.test(formData.name)) {
      newErrors.name = 'Slug must start with a letter and contain only lowercase letters, numbers, and hyphens';
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
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
        if (isEditing && taxonomy) {
          await updateTaxonomy({
            id: taxonomy._id,
            displayName: formData.displayName,
            description: formData.description || undefined,
            allowInlineCreation: formData.allowInlineCreation,
            icon: formData.icon || undefined,
            sortOrder: formData.sortOrder,
            isActive: formData.isActive,
          });
        } else {
          await createTaxonomy({
            name: formData.name,
            displayName: formData.displayName,
            description: formData.description || undefined,
            isHierarchical: formData.isHierarchical,
            allowInlineCreation: formData.allowInlineCreation,
            icon: formData.icon || undefined,
            sortOrder: formData.sortOrder,
          });
        }
        onSave();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save taxonomy';
        setSubmitError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [validate, isEditing, taxonomy, formData, createTaxonomy, updateTaxonomy, onSave]
  );

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'Edit Taxonomy' : 'Create Taxonomy'}</h3>
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
              <label htmlFor="displayName" className="form-label">
                Display Name <span className="required">*</span>
              </label>
              <input
                id="displayName"
                type="text"
                className={`form-input ${errors.displayName ? 'form-input--error' : ''}`}
                value={formData.displayName}
                onChange={(e) => handleDisplayNameChange(e.target.value)}
                placeholder="e.g., Categories, Tags"
                disabled={isSubmitting}
              />
              {errors.displayName && (
                <span className="form-error-text">{errors.displayName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Slug <span className="required">*</span>
              </label>
              <input
                id="name"
                type="text"
                className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value.toLowerCase())}
                placeholder="e.g., categories, tags"
                disabled={isSubmitting || isEditing}
              />
              {errors.name && <span className="form-error-text">{errors.name}</span>}
              {isEditing && (
                <span className="form-help-text">Slug cannot be changed after creation</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                Description
              </label>
              <textarea
                id="description"
                className="form-textarea"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Optional description"
                rows={2}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-row">
              <div className="form-group form-group--half">
                <label htmlFor="icon" className="form-label">
                  Icon
                </label>
                <input
                  id="icon"
                  type="text"
                  className="form-input"
                  value={formData.icon}
                  onChange={(e) => handleChange('icon', e.target.value)}
                  placeholder="e.g., 🏷️ or folder"
                  disabled={isSubmitting}
                />
                <span className="form-help-text">Emoji or icon name</span>
              </div>

              <div className="form-group form-group--half">
                <label htmlFor="sortOrder" className="form-label">
                  Sort Order
                </label>
                <input
                  id="sortOrder"
                  type="number"
                  className="form-input"
                  value={formData.sortOrder}
                  onChange={(e) => handleChange('sortOrder', parseInt(e.target.value) || 0)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-group">
              <div className="form-checkbox">
                <input
                  id="isHierarchical"
                  type="checkbox"
                  checked={formData.isHierarchical}
                  onChange={(e) => handleChange('isHierarchical', e.target.checked)}
                  disabled={isSubmitting || isEditing}
                />
                <label htmlFor="isHierarchical">
                  <strong>Hierarchical</strong>
                  <span>Terms can have parent-child relationships (like categories)</span>
                </label>
              </div>
              {isEditing && (
                <span className="form-help-text">
                  Hierarchy type cannot be changed after creation
                </span>
              )}
            </div>

            <div className="form-group">
              <div className="form-checkbox">
                <input
                  id="allowInlineCreation"
                  type="checkbox"
                  checked={formData.allowInlineCreation}
                  onChange={(e) => handleChange('allowInlineCreation', e.target.checked)}
                  disabled={isSubmitting}
                />
                <label htmlFor="allowInlineCreation">
                  <strong>Allow inline creation</strong>
                  <span>Users can create new terms while editing content</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <div className="form-checkbox">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                  disabled={isSubmitting}
                />
                <label htmlFor="isActive">
                  <strong>Active</strong>
                  <span>Inactive taxonomies are hidden from content editors</span>
                </label>
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
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Taxonomy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
