import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/cn'
import { X, Plus, Loader2, Tag } from 'lucide-react'

interface TaxonomyTermDisplay {
  _id: string
  name: string
  slug: string
  color?: string
  usageCount: number
}

interface MediaTaxonomyPickerProps {
  mediaId: string
  taxonomyId: string
  taxonomyName?: string
  allowCreate?: boolean
  disabled?: boolean
  className?: string
}

export function MediaTaxonomyPicker({
  mediaId,
  taxonomyId,
  taxonomyName = 'Tags',
  allowCreate = true,
  disabled = false,
  className = '',
}: MediaTaxonomyPickerProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentTerms = useQuery(api.admin.getTermsByMedia, {
    mediaId,
    taxonomyId,
  })

  const selectedTermIds = currentTerms?.map((t: TaxonomyTermDisplay) => t._id) ?? []

  const suggestionsResult = useQuery(api.admin.suggestTerms, {
    taxonomyId,
    query: inputValue,
    limit: 10,
    excludeIds: selectedTermIds,
  })
  const suggestions = (suggestionsResult ?? []) as TaxonomyTermDisplay[]

  const setMediaTermsMutation = useMutation(api.admin.setMediaTerms)
  const createTermMutation = useMutation(api.admin.createTermAndAddToMedia)

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
    async (termId: string) => {
      if (selectedTermIds.includes(termId)) return
      setIsSaving(true)
      try {
        await setMediaTermsMutation({
          mediaId,
          taxonomyId,
          termIds: [...selectedTermIds, termId],
        })
      } catch (err) {
        console.error('Failed to add tag:', err)
      } finally {
        setIsSaving(false)
        setInputValue('')
        setShowSuggestions(false)
        setActiveSuggestionIndex(0)
        inputRef.current?.focus()
      }
    },
    [mediaId, taxonomyId, selectedTermIds, setMediaTermsMutation]
  )

  const removeTag = useCallback(
    async (termId: string) => {
      setIsSaving(true)
      try {
        await setMediaTermsMutation({
          mediaId,
          taxonomyId,
          termIds: selectedTermIds.filter((id: string) => id !== termId),
        })
      } catch (err) {
        console.error('Failed to remove tag:', err)
      } finally {
        setIsSaving(false)
      }
    },
    [mediaId, taxonomyId, selectedTermIds, setMediaTermsMutation]
  )

  const createTag = useCallback(async () => {
    if (!inputValue.trim() || !allowCreate) return
    setIsCreating(true)
    try {
      await createTermMutation({
        taxonomyId,
        name: inputValue.trim(),
        mediaId,
      })
      setInputValue('')
      setShowSuggestions(false)
      setActiveSuggestionIndex(0)
    } catch (err) {
      console.error('Failed to create tag:', err)
    } finally {
      setIsCreating(false)
    }
  }, [inputValue, allowCreate, taxonomyId, mediaId, createTermMutation])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

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
        break
      case 'Backspace':
        if (inputValue === '' && selectedTermIds.length > 0) {
          removeTag(selectedTermIds[selectedTermIds.length - 1])
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

  const filteredSuggestions = suggestions.filter(
    (term) => !selectedTermIds.includes(term._id)
  )
  const showCreateOption =
    allowCreate &&
    inputValue.trim() &&
    !filteredSuggestions.some(
      (s) => s.name.toLowerCase() === inputValue.trim().toLowerCase()
    )

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Tag className="size-4" />
        {taxonomyName}
      </div>

      <div
        ref={containerRef}
        className={cn(
          'relative rounded-md border border-input bg-background',
          disabled && 'opacity-50'
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 p-2">
          {(currentTerms ?? []).map((term: TaxonomyTermDisplay) => (
            <Badge
              key={term._id}
              variant="secondary"
              className="gap-1 pr-1"
              style={term.color ? { backgroundColor: term.color, color: '#fff' } : undefined}
            >
              {term.name}
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-4 hover:bg-transparent"
                  onClick={() => removeTag(term._id)}
                  disabled={isSaving}
                  aria-label={`Remove ${term.name}`}
                >
                  <X className="size-3" />
                </Button>
              )}
            </Badge>
          ))}

          {!disabled && (
            <Input
              ref={inputRef}
              type="text"
              className="h-7 min-w-[120px] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                setShowSuggestions(true)
                setActiveSuggestionIndex(0)
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder={selectedTermIds.length === 0 ? 'Add tags...' : ''}
              disabled={disabled || isCreating || isSaving}
            />
          )}
        </div>

        {showSuggestions && (filteredSuggestions.length > 0 || showCreateOption) && (
          <div
            ref={suggestionsRef}
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-md border bg-popover shadow-lg"
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

        {(isSaving || isCreating) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <Loader2 className="size-4 animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
