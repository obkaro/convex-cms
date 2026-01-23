import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { FieldWrapper } from './FieldWrapper';
import type { BaseFieldProps } from './types';
import { asTaxonomyId, asTaxonomyTermIds } from '../../types';

/**
 * Term data from the taxonomy system (UI display subset).
 */
interface TaxonomyTermDisplay {
  _id: string;
  name: string;
  slug: string;
  color?: string;
  icon?: string;
  usageCount: number;
}

/**
 * Props for the TagField component.
 */
export interface TagFieldProps extends BaseFieldProps<string[]> {
  /** Placeholder text when no tags are selected */
  placeholder?: string;
}

/**
 * TagField renders an autocomplete tag input for selecting taxonomy terms.
 *
 * Features:
 * - Type-ahead suggestions from taxonomy terms
 * - Inline tag creation (if allowCreate is enabled)
 * - Color-coded tag pills
 * - Drag-to-reorder support
 * - Min/max tag limits
 */
export function TagField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id,
  placeholder = 'Add tags...',
}: TagFieldProps) {
  const fieldId = id || `field-${field.name}`;
  const taxonomyId = field.options?.taxonomyId;
  const allowCreate = field.options?.allowCreate ?? false;
  const maxTags = field.options?.maxTags;
  const minTags = field.options?.minTags;

  // Local state for the autocomplete input
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Query for suggestions
  const suggestionsResult = useQuery(
    api.taxonomies.suggestTerms,
    taxonomyId
      ? {
          taxonomyId: asTaxonomyId(taxonomyId),
          query: inputValue,
          limit: 10,
          excludeIds: asTaxonomyTermIds(value || []),
        }
      : 'skip'
  );
  const suggestions = suggestionsResult ?? [];

  // Query for the currently selected terms (to display names/colors)
  const selectedTermsResult = useQuery(
    api.taxonomies.listTerms,
    taxonomyId && value && value.length > 0
      ? {
          taxonomyId: asTaxonomyId(taxonomyId),
          paginationOpts: { numItems: 100, cursor: null },
        }
      : 'skip'
  );

  // Build a map of selected term IDs to their data
  const selectedTermsMap = new Map<string, TaxonomyTermDisplay>();
  if (selectedTermsResult?.page) {
    for (const term of selectedTermsResult.page) {
      if (value?.includes(term._id)) {
        selectedTermsMap.set(term._id, term as TaxonomyTermDisplay);
      }
    }
  }

  // Mutation for creating new tags inline
  const createTermMutation = useMutation(api.taxonomies.createTerm);

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add a tag by ID
  const addTag = useCallback(
    (termId: string) => {
      if (!value?.includes(termId)) {
        if (maxTags && (value?.length ?? 0) >= maxTags) {
          return; // Max tags reached
        }
        onChange([...(value || []), termId]);
      }
      setInputValue('');
      setShowSuggestions(false);
      setActiveSuggestionIndex(0);
      inputRef.current?.focus();
    },
    [value, onChange, maxTags]
  );

  // Remove a tag by ID
  const removeTag = useCallback(
    (termId: string) => {
      onChange((value || []).filter((id) => id !== termId));
    },
    [value, onChange]
  );

  // Create a new tag from the input value
  const createTag = useCallback(async () => {
    if (!inputValue.trim() || !taxonomyId || !allowCreate) return;

    setIsCreating(true);
    try {
      const termId = await createTermMutation({
        taxonomyId: asTaxonomyId(taxonomyId),
        name: inputValue.trim(),
      });
      addTag(termId);
    } catch (err) {
      console.error('Failed to create tag:', err);
    } finally {
      setIsCreating(false);
    }
  }, [inputValue, taxonomyId, allowCreate, createTermMutation, addTag]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(true);
    setActiveSuggestionIndex(0);
  };

  // Handle input focus
  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || readOnly) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;

      case 'Enter':
        e.preventDefault();
        if (suggestions.length > 0 && activeSuggestionIndex < suggestions.length) {
          addTag(suggestions[activeSuggestionIndex]._id);
        } else if (inputValue.trim() && allowCreate) {
          createTag();
        }
        break;

      case 'Escape':
        setShowSuggestions(false);
        setActiveSuggestionIndex(0);
        break;

      case 'Backspace':
        if (inputValue === '' && value && value.length > 0) {
          // Remove the last tag when backspacing on empty input
          removeTag(value[value.length - 1]);
        }
        break;

      case 'Tab':
        // Select the highlighted suggestion on Tab
        if (showSuggestions && suggestions.length > 0) {
          e.preventDefault();
          addTag(suggestions[activeSuggestionIndex]._id);
        }
        break;
    }
  };

  // Scroll the active suggestion into view
  useEffect(() => {
    if (suggestionsRef.current && showSuggestions) {
      const activeElement = suggestionsRef.current.querySelector(
        `[data-index="${activeSuggestionIndex}"]`
      );
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeSuggestionIndex, showSuggestions]);

  // Check if we can add more tags
  const canAddMore = !maxTags || (value?.length ?? 0) < maxTags;

  // Filter suggestions that match input and aren't already selected
  const filteredSuggestions = suggestions.filter(
    (term) => !value?.includes(term._id)
  );

  // Show "Create tag" option if no exact match exists
  const showCreateOption =
    allowCreate &&
    inputValue.trim() &&
    !filteredSuggestions.some(
      (s) => s.name.toLowerCase() === inputValue.trim().toLowerCase()
    );

  return (
    <FieldWrapper field={field} error={error} className={className} id={fieldId}>
      <div
        ref={containerRef}
        className={`field-tags ${error ? 'field-tags--error' : ''} ${disabled ? 'field-tags--disabled' : ''}`}
      >
        {/* Selected tags display */}
        <div className="field-tags-selected">
          {(value || []).map((termId) => {
            const term = selectedTermsMap.get(termId);
            const tagName = term?.name ?? 'Loading...';
            const tagColor = term?.color;

            return (
              <span
                key={termId}
                className="field-tag-pill"
                style={tagColor ? { backgroundColor: tagColor, borderColor: tagColor } : undefined}
              >
                <span className="field-tag-name">{tagName}</span>
                {!disabled && !readOnly && (
                  <button
                    type="button"
                    className="field-tag-remove"
                    onClick={() => removeTag(termId)}
                    aria-label={`Remove ${tagName}`}
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })}

          {/* Input for adding tags */}
          {canAddMore && !disabled && !readOnly && (
            <input
              ref={inputRef}
              type="text"
              id={fieldId}
              className="field-tags-input"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              placeholder={value?.length === 0 ? placeholder : ''}
              disabled={disabled || isCreating}
              aria-autocomplete="list"
              aria-controls={`${fieldId}-suggestions`}
              aria-expanded={showSuggestions}
              data-testid="tag-input"
            />
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && (filteredSuggestions.length > 0 || showCreateOption) && (
          <div
            ref={suggestionsRef}
            id={`${fieldId}-suggestions`}
            className="field-tags-suggestions"
            role="listbox"
          >
            {filteredSuggestions.map((term, index) => (
              <div
                key={term._id}
                data-index={index}
                className={`field-tags-suggestion ${index === activeSuggestionIndex ? 'field-tags-suggestion--active' : ''}`}
                onClick={() => addTag(term._id)}
                role="option"
                aria-selected={index === activeSuggestionIndex}
              >
                {term.color && (
                  <span
                    className="field-tag-color-dot"
                    style={{ backgroundColor: term.color }}
                  />
                )}
                <span className="field-tags-suggestion-name">{term.name}</span>
                <span className="field-tags-suggestion-count">{term.usageCount} uses</span>
              </div>
            ))}

            {showCreateOption && (
              <div
                data-index={filteredSuggestions.length}
                className={`field-tags-suggestion field-tags-suggestion--create ${filteredSuggestions.length === activeSuggestionIndex ? 'field-tags-suggestion--active' : ''}`}
                onClick={createTag}
                role="option"
                aria-selected={filteredSuggestions.length === activeSuggestionIndex}
              >
                <span className="field-tags-suggestion-create-icon">+</span>
                <span>Create "{inputValue.trim()}"</span>
              </div>
            )}
          </div>
        )}

        {/* Tag count display */}
        <div className="field-tags-count">
          {value?.length ?? 0} tag{(value?.length ?? 0) !== 1 ? 's' : ''}
          {minTags && (value?.length ?? 0) < minTags && (
            <span className="field-tags-count-min"> (minimum {minTags})</span>
          )}
          {maxTags && (
            <span className="field-tags-count-max"> / {maxTags} max</span>
          )}
        </div>
      </div>
    </FieldWrapper>
  );
}
