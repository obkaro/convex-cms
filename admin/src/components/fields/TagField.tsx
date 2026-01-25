import { useState, useCallback, useRef, useEffect, useId } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { FieldWrapper } from './FieldWrapper'
import type { BaseFieldProps } from './types'
import { asTaxonomyId, asTaxonomyTermIds } from '../../types'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/cn'
import { X, Plus, Loader2 } from 'lucide-react'

interface TaxonomyTermDisplay {
  _id: string
  name: string
  slug: string
  color?: string
  icon?: string
  usageCount: number
}

export interface TagFieldProps extends BaseFieldProps<string[]> {
  placeholder?: string
}

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
  const generatedId = useId()
  const fieldId = id ?? `field-${field.name}-${generatedId}`
  const taxonomyId = field.options?.taxonomyId
  const allowCreate = field.options?.allowCreate ?? false
  const maxTags = field.options?.maxTags
  const minTags = field.options?.minTags

  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0)
  const [isCreating, setIsCreating] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const suggestionsResult = useQuery(
    api.admin.suggestTerms,
    taxonomyId
      ? {
          taxonomyId: asTaxonomyId(taxonomyId),
          query: inputValue,
          limit: 10,
          excludeIds: asTaxonomyTermIds(value || []),
        }
      : 'skip'
  )
  const suggestions = suggestionsResult ?? []

  const selectedTermsResult = useQuery(
    api.admin.listTerms,
    taxonomyId && value && value.length > 0
      ? {
          taxonomyId: asTaxonomyId(taxonomyId),
          paginationOpts: { numItems: 100, cursor: null },
        }
      : 'skip'
  )

  const selectedTermsMap = new Map<string, TaxonomyTermDisplay>()
  if (selectedTermsResult?.page) {
    for (const term of selectedTermsResult.page) {
      if (value?.includes(term._id)) {
        selectedTermsMap.set(term._id, term as TaxonomyTermDisplay)
      }
    }
  }

  const createTermMutation = useMutation(api.admin.createTerm)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addTag = useCallback(
    (termId: string) => {
      if (!value?.includes(termId)) {
        if (maxTags && (value?.length ?? 0) >= maxTags) return
        onChange([...(value || []), termId])
      }
      setInputValue('')
      setShowSuggestions(false)
      setActiveSuggestionIndex(0)
      inputRef.current?.focus()
    },
    [value, onChange, maxTags]
  )

  const removeTag = useCallback(
    (termId: string) => {
      onChange((value || []).filter((id) => id !== termId))
    },
    [value, onChange]
  )

  const createTag = useCallback(async () => {
    if (!inputValue.trim() || !taxonomyId || !allowCreate) return
    setIsCreating(true)
    try {
      const termId = await createTermMutation({
        taxonomyId: asTaxonomyId(taxonomyId),
        name: inputValue.trim(),
      })
      addTag(termId)
    } catch (err) {
      console.error('Failed to create tag:', err)
    } finally {
      setIsCreating(false)
    }
  }, [inputValue, taxonomyId, allowCreate, createTermMutation, addTag])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setShowSuggestions(true)
    setActiveSuggestionIndex(0)
  }

  const handleInputFocus = () => {
    setShowSuggestions(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || readOnly) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case 'Enter':
        e.preventDefault()
        if (suggestions.length > 0 && activeSuggestionIndex < suggestions.length) {
          addTag(suggestions[activeSuggestionIndex]._id)
        } else if (inputValue.trim() && allowCreate) {
          createTag()
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setActiveSuggestionIndex(0)
        break
      case 'Backspace':
        if (inputValue === '' && value && value.length > 0) {
          removeTag(value[value.length - 1])
        }
        break
      case 'Tab':
        if (showSuggestions && suggestions.length > 0) {
          e.preventDefault()
          addTag(suggestions[activeSuggestionIndex]._id)
        }
        break
    }
  }

  useEffect(() => {
    if (suggestionsRef.current && showSuggestions) {
      const activeElement = suggestionsRef.current.querySelector(
        `[data-index="${activeSuggestionIndex}"]`
      )
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [activeSuggestionIndex, showSuggestions])

  const canAddMore = !maxTags || (value?.length ?? 0) < maxTags
  const filteredSuggestions = suggestions.filter((term) => !value?.includes(term._id))
  const showCreateOption =
    allowCreate &&
    inputValue.trim() &&
    !filteredSuggestions.some(
      (s) => s.name.toLowerCase() === inputValue.trim().toLowerCase()
    )

  return (
    <FieldWrapper field={field} error={error} className={className} id={fieldId}>
      <div
        ref={containerRef}
        className={cn(
          'relative rounded-md border border-input bg-background',
          error && 'border-destructive',
          disabled && 'opacity-50'
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 p-2">
          {(value || []).map((termId) => {
            const term = selectedTermsMap.get(termId)
            const tagName = term?.name ?? 'Loading...'
            const tagColor = term?.color

            return (
              <Badge
                key={termId}
                variant="secondary"
                className="gap-1 pr-1"
                style={tagColor ? { backgroundColor: tagColor, color: '#fff' } : undefined}
              >
                {tagName}
                {!disabled && !readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-4 hover:bg-transparent"
                    onClick={() => removeTag(termId)}
                    aria-label={`Remove ${tagName}`}
                  >
                    <X className="size-3" />
                  </Button>
                )}
              </Badge>
            )
          })}

          {canAddMore && !disabled && !readOnly && (
            <Input
              ref={inputRef}
              type="text"
              id={fieldId}
              className="h-7 min-w-[120px] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              placeholder={value?.length === 0 ? placeholder : ''}
              disabled={disabled || isCreating}
              aria-autocomplete="list"
              aria-controls={`${fieldId}-suggestions`}
              aria-expanded={showSuggestions}
            />
          )}
        </div>

        {showSuggestions && (filteredSuggestions.length > 0 || showCreateOption) && (
          <div
            ref={suggestionsRef}
            id={`${fieldId}-suggestions`}
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover shadow-lg"
            role="listbox"
          >
            {filteredSuggestions.map((term, index) => (
              <div
                key={term._id}
                data-index={index}
                className={cn(
                  'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                  index === activeSuggestionIndex && 'bg-accent'
                )}
                onClick={() => addTag(term._id)}
                role="option"
                aria-selected={index === activeSuggestionIndex}
              >
                {term.color && (
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: term.color }}
                  />
                )}
                <span className="flex-1">{term.name}</span>
                <span className="text-xs text-muted-foreground">{term.usageCount} uses</span>
              </div>
            ))}

            {showCreateOption && (
              <div
                data-index={filteredSuggestions.length}
                className={cn(
                  'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                  filteredSuggestions.length === activeSuggestionIndex && 'bg-accent'
                )}
                onClick={createTag}
                role="option"
                aria-selected={filteredSuggestions.length === activeSuggestionIndex}
              >
                {isCreating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                <span>Create "{inputValue.trim()}"</span>
              </div>
            )}
          </div>
        )}

        <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
          {value?.length ?? 0} tag{(value?.length ?? 0) !== 1 ? 's' : ''}
          {minTags && (value?.length ?? 0) < minTags && (
            <span className="text-amber-600"> (minimum {minTags})</span>
          )}
          {maxTags && <span> / {maxTags} max</span>}
        </div>
      </div>
    </FieldWrapper>
  )
}
