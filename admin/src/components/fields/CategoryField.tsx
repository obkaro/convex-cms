import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { FieldWrapper } from './FieldWrapper';
import type { BaseFieldProps } from './types';
import { asTaxonomyId } from '../../types';

/**
 * Category term with children for hierarchical display.
 */
interface CategoryTerm {
  _id: string;
  name: string;
  slug: string;
  color?: string;
  icon?: string;
  depth: number;
  parentId?: string;
  children: CategoryTerm[];
}

/**
 * Props for the CategoryField component.
 */
export interface CategoryFieldProps extends BaseFieldProps<string | string[] | null> {
  /** Placeholder text when no category is selected */
  placeholder?: string;
}

/**
 * CategoryField renders a hierarchical category selector.
 *
 * Features:
 * - Tree view of hierarchical categories
 * - Single or multiple selection support
 * - Collapsible category branches
 * - Visual depth indicators
 * - Keyboard navigation
 */
export function CategoryField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id,
  placeholder = 'Select category...',
}: CategoryFieldProps) {
  const fieldId = id || `field-${field.name}`;
  const taxonomyId = field.options?.taxonomyId;
  const allowMultiple = field.options?.allowMultiple ?? false;

  // Local state
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch hierarchical categories
  const hierarchyResult = useQuery(
    api.taxonomies.getTermsHierarchy,
    taxonomyId
      ? { taxonomyId: asTaxonomyId(taxonomyId) }
      : 'skip'
  );
  const categoryTree = hierarchyResult ?? [];

  // Flatten the tree for keyboard navigation
  const flattenTree = useCallback((
    nodes: CategoryTerm[],
    result: CategoryTerm[] = []
  ): CategoryTerm[] => {
    for (const node of nodes) {
      result.push(node);
      if (expandedCategories.has(node._id) && node.children.length > 0) {
        flattenTree(node.children, result);
      }
    }
    return result;
  }, [expandedCategories]);

  const flatCategories = flattenTree(categoryTree as CategoryTerm[]);

  // Get selected category names for display
  const getSelectedDisplayText = useCallback(() => {
    if (!value) return null;

    const ids = Array.isArray(value) ? value : [value];
    if (ids.length === 0) return null;

    // Find category names from the flat list
    const names: string[] = [];
    for (const id of ids) {
      const cat = flatCategories.find((c) => c._id === id);
      if (cat) {
        names.push(cat.name);
      }
    }

    if (names.length === 0) return 'Loading...';
    if (names.length === 1) return names[0];
    return `${names.length} categories selected`;
  }, [value, flatCategories]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle a category selection
  const toggleCategory = useCallback(
    (categoryId: string) => {
      if (disabled || readOnly) return;

      if (allowMultiple) {
        const currentIds = Array.isArray(value) ? value : value ? [value] : [];
        if (currentIds.includes(categoryId)) {
          onChange(currentIds.filter((id) => id !== categoryId));
        } else {
          onChange([...currentIds, categoryId]);
        }
      } else {
        // Single selection - close dropdown after selection
        onChange(categoryId);
        setIsOpen(false);
      }
    },
    [disabled, readOnly, allowMultiple, value, onChange]
  );

  // Toggle expanded state of a category branch
  const toggleExpanded = useCallback((categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  // Check if a category is selected
  const isSelected = useCallback(
    (categoryId: string) => {
      if (!value) return false;
      const ids = Array.isArray(value) ? value : [value];
      return ids.includes(categoryId);
    },
    [value]
  );

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || readOnly) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          if (flatCategories.length > 0) {
            setHighlightedId(flatCategories[0]._id);
          }
        } else if (highlightedId) {
          toggleCategory(highlightedId);
        }
        break;

      case 'Escape':
        setIsOpen(false);
        setHighlightedId(null);
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          if (flatCategories.length > 0) {
            setHighlightedId(flatCategories[0]._id);
          }
        } else {
          const currentIndex = flatCategories.findIndex((c) => c._id === highlightedId);
          if (currentIndex < flatCategories.length - 1) {
            setHighlightedId(flatCategories[currentIndex + 1]._id);
          }
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          const currentIndex = flatCategories.findIndex((c) => c._id === highlightedId);
          if (currentIndex > 0) {
            setHighlightedId(flatCategories[currentIndex - 1]._id);
          }
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (highlightedId) {
          const cat = flatCategories.find((c) => c._id === highlightedId);
          if (cat && cat.children.length > 0 && !expandedCategories.has(highlightedId)) {
            setExpandedCategories((prev) => new Set([...prev, highlightedId]));
          }
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (highlightedId) {
          const cat = flatCategories.find((c) => c._id === highlightedId);
          if (cat) {
            if (expandedCategories.has(highlightedId)) {
              // Collapse current category
              setExpandedCategories((prev) => {
                const next = new Set(prev);
                next.delete(highlightedId);
                return next;
              });
            } else if (cat.parentId) {
              // Move to parent category
              setHighlightedId(cat.parentId);
            }
          }
        }
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (dropdownRef.current && highlightedId) {
      const highlighted = dropdownRef.current.querySelector(
        `[data-category-id="${highlightedId}"]`
      );
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedId]);

  // Render a category item recursively
  const renderCategory = (category: CategoryTerm, depth: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category._id);
    const isHighlighted = highlightedId === category._id;
    const selected = isSelected(category._id);

    return (
      <div key={category._id} className="field-category-tree-branch">
        <div
          data-category-id={category._id}
          className={`field-category-item ${selected ? 'field-category-item--selected' : ''} ${isHighlighted ? 'field-category-item--highlighted' : ''}`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => toggleCategory(category._id)}
          onMouseEnter={() => setHighlightedId(category._id)}
          role="option"
          aria-selected={selected}
        >
          {/* Expand/collapse toggle */}
          {hasChildren && (
            <button
              type="button"
              className={`field-category-toggle ${isExpanded ? 'field-category-toggle--expanded' : ''}`}
              onClick={(e) => toggleExpanded(category._id, e)}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg viewBox="0 0 20 20" width="16" height="16">
                <path
                  fill="currentColor"
                  d={isExpanded ? 'M5 8l5 5 5-5z' : 'M8 5l5 5-5 5z'}
                />
              </svg>
            </button>
          )}
          {!hasChildren && <span className="field-category-toggle-spacer" />}

          {/* Checkbox for multi-select */}
          {allowMultiple && (
            <span className={`field-category-checkbox ${selected ? 'field-category-checkbox--checked' : ''}`}>
              {selected && (
                <svg viewBox="0 0 20 20" width="14" height="14">
                  <path
                    fill="currentColor"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  />
                </svg>
              )}
            </span>
          )}

          {/* Color indicator */}
          {category.color && (
            <span
              className="field-category-color"
              style={{ backgroundColor: category.color }}
            />
          )}

          {/* Category name */}
          <span className="field-category-name">{category.name}</span>

          {/* Selection indicator for single-select */}
          {!allowMultiple && selected && (
            <span className="field-category-selected-indicator">✓</span>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="field-category-children">
            {category.children.map((child) => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(allowMultiple ? [] : null);
  };

  const displayText = getSelectedDisplayText();
  const hasSelection = displayText !== null;

  return (
    <FieldWrapper field={field} error={error} className={className} id={fieldId}>
      <div
        ref={containerRef}
        className={`field-category ${error ? 'field-category--error' : ''} ${disabled ? 'field-category--disabled' : ''} ${isOpen ? 'field-category--open' : ''}`}
      >
        {/* Dropdown trigger */}
        <button
          type="button"
          id={fieldId}
          className="field-category-trigger"
          onClick={() => !disabled && !readOnly && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          data-testid="category-trigger"
        >
          <span className={`field-category-value ${!hasSelection ? 'field-category-value--placeholder' : ''}`}>
            {displayText || placeholder}
          </span>

          <div className="field-category-actions">
            {hasSelection && !disabled && !readOnly && (
              <button
                type="button"
                className="field-category-clear"
                onClick={handleClear}
                aria-label="Clear selection"
              >
                ×
              </button>
            )}
            <span className="field-category-arrow">
              <svg viewBox="0 0 20 20" width="16" height="16">
                <path
                  fill="currentColor"
                  d={isOpen ? 'M15 12l-5-5-5 5z' : 'M5 8l5 5 5-5z'}
                />
              </svg>
            </span>
          </div>
        </button>

        {/* Dropdown content */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="field-category-dropdown"
            role="listbox"
            aria-multiselectable={allowMultiple}
          >
            {categoryTree.length === 0 ? (
              <div className="field-category-empty">
                No categories available
              </div>
            ) : (
              <div className="field-category-tree">
                {(categoryTree as CategoryTerm[]).map((category) =>
                  renderCategory(category)
                )}
              </div>
            )}
          </div>
        )}

        {/* Multi-select selected items display */}
        {allowMultiple && Array.isArray(value) && value.length > 0 && (
          <div className="field-category-selected-list">
            {value.map((catId) => {
              const cat = flatCategories.find((c) => c._id === catId);
              return (
                <span key={catId} className="field-category-pill">
                  {cat?.name ?? 'Loading...'}
                  {!disabled && !readOnly && (
                    <button
                      type="button"
                      className="field-category-pill-remove"
                      onClick={() => toggleCategory(catId)}
                      aria-label={`Remove ${cat?.name}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </FieldWrapper>
  );
}
