import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { useApi } from '~/embed/contexts/ApiContext'
import { FieldWrapper } from './FieldWrapper'
import type { BaseFieldProps } from './types'
import { asTaxonomyId } from '../../types'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import { Checkbox } from '~/components/ui/checkbox'
import { Badge } from '~/components/ui/badge'
import { ScrollArea } from '~/components/ui/scroll-area'
import { cn } from '~/lib/cn'
import { ChevronDown, ChevronRight, X, Check, Tag } from 'lucide-react'

interface CategoryTerm {
  _id: string
  name: string
  slug: string
  color?: string
  icon?: string
  depth: number
  parentId?: string
  children: CategoryTerm[]
}

export interface CategoryFieldProps extends BaseFieldProps<string | string[] | null> {
  placeholder?: string
}

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
  const api = useApi()
  const fieldId = id || `field-${field.name}`
  const taxonomyId = field.options?.taxonomyId
  const allowMultiple = field.options?.allowMultiple ?? false

  const [isOpen, setIsOpen] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  const hierarchyResult = useQuery(
    api.getTermsHierarchy,
    taxonomyId ? { taxonomyId: asTaxonomyId(taxonomyId) } : 'skip'
  )
  const categoryTree = (hierarchyResult ?? []) as CategoryTerm[]

  const flattenTree = useCallback(
    (nodes: CategoryTerm[], result: CategoryTerm[] = []): CategoryTerm[] => {
      for (const node of nodes) {
        result.push(node)
        if (expandedCategories.has(node._id) && node.children.length > 0) {
          flattenTree(node.children, result)
        }
      }
      return result
    },
    [expandedCategories]
  )

  const flatCategories = flattenTree(categoryTree)

  const getSelectedDisplayText = useCallback(() => {
    if (!value) return null

    const ids = Array.isArray(value) ? value : [value]
    if (ids.length === 0) return null

    const names: string[] = []
    for (const categoryId of ids) {
      const cat = flatCategories.find((c) => c._id === categoryId)
      if (cat) {
        names.push(cat.name)
      }
    }

    if (names.length === 0) return 'Loading...'
    if (names.length === 1) return names[0]
    return `${names.length} categories selected`
  }, [value, flatCategories])

  const toggleCategory = useCallback(
    (categoryId: string) => {
      if (disabled || readOnly) return

      if (allowMultiple) {
        const currentIds = Array.isArray(value) ? value : value ? [value] : []
        if (currentIds.includes(categoryId)) {
          onChange(currentIds.filter((catId) => catId !== categoryId))
        } else {
          onChange([...currentIds, categoryId])
        }
      } else {
        onChange(categoryId)
        setIsOpen(false)
      }
    },
    [disabled, readOnly, allowMultiple, value, onChange]
  )

  const toggleExpanded = useCallback((categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }, [])

  const isSelected = useCallback(
    (categoryId: string) => {
      if (!value) return false
      const ids = Array.isArray(value) ? value : [value]
      return ids.includes(categoryId)
    },
    [value]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || readOnly) return

    switch (e.key) {
      case 'Enter':
      case ' ': {
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          if (flatCategories.length > 0) {
            setHighlightedId(flatCategories[0]._id)
          }
        } else if (highlightedId) {
          toggleCategory(highlightedId)
        }
        break
      }
      case 'Escape': {
        setIsOpen(false)
        setHighlightedId(null)
        break
      }
      case 'ArrowDown': {
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          if (flatCategories.length > 0) {
            setHighlightedId(flatCategories[0]._id)
          }
        } else {
          const currentIndex = flatCategories.findIndex((c) => c._id === highlightedId)
          if (currentIndex < flatCategories.length - 1) {
            setHighlightedId(flatCategories[currentIndex + 1]._id)
          }
        }
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        if (isOpen) {
          const currentIndex = flatCategories.findIndex((c) => c._id === highlightedId)
          if (currentIndex > 0) {
            setHighlightedId(flatCategories[currentIndex - 1]._id)
          }
        }
        break
      }
      case 'ArrowRight': {
        e.preventDefault()
        if (highlightedId) {
          const cat = flatCategories.find((c) => c._id === highlightedId)
          if (cat && cat.children.length > 0 && !expandedCategories.has(highlightedId)) {
            setExpandedCategories((prev) => new Set([...prev, highlightedId]))
          }
        }
        break
      }
      case 'ArrowLeft': {
        e.preventDefault()
        if (highlightedId) {
          const cat = flatCategories.find((c) => c._id === highlightedId)
          if (cat) {
            if (expandedCategories.has(highlightedId)) {
              setExpandedCategories((prev) => {
                const next = new Set(prev)
                next.delete(highlightedId)
                return next
              })
            } else if (cat.parentId) {
              setHighlightedId(cat.parentId)
            }
          }
        }
        break
      }
    }
  }

  useEffect(() => {
    if (containerRef.current && highlightedId) {
      const highlighted = containerRef.current.querySelector(
        `[data-category-id="${highlightedId}"]`
      )
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedId])

  const renderCategory = (category: CategoryTerm, depth: number = 0) => {
    const hasChildren = category.children && category.children.length > 0
    const isExpanded = expandedCategories.has(category._id)
    const isHighlighted = highlightedId === category._id
    const selected = isSelected(category._id)

    return (
      <div key={category._id}>
        <div
          data-category-id={category._id}
          className={cn(
            'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            'hover:bg-accent',
            isHighlighted && 'bg-accent',
            selected && 'font-medium'
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => toggleCategory(category._id)}
          onMouseEnter={() => setHighlightedId(category._id)}
          role="option"
          aria-selected={selected}
        >
          {hasChildren ? (
            <button
              type="button"
              className="flex size-4 items-center justify-center rounded hover:bg-muted"
              onClick={(e) => toggleExpanded(category._id, e)}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
            </button>
          ) : (
            <span className="size-4" />
          )}

          {allowMultiple && (
            <Checkbox
              checked={selected}
              className="pointer-events-none size-4"
            />
          )}

          {category.color && (
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: category.color }}
            />
          )}

          <span className="flex-1 truncate">{category.name}</span>

          {!allowMultiple && selected && <Check className="size-4 text-primary" />}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {category.children.map((child) => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(allowMultiple ? [] : null)
  }

  const displayText = getSelectedDisplayText()
  const hasSelection = displayText !== null

  return (
    <FieldWrapper field={field} error={error} className={className} id={fieldId}>
      <div ref={containerRef}>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              id={fieldId}
              className={cn(
                'flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-50',
                error && 'border-destructive',
                !hasSelection && 'text-muted-foreground'
              )}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              data-testid="category-trigger"
            >
              <span className="truncate">{displayText || placeholder}</span>
              <div className="flex items-center gap-1">
                {hasSelection && !disabled && !readOnly && (
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-muted"
                    onClick={handleClear}
                    aria-label="Clear selection"
                  >
                    <X className="size-3" />
                  </button>
                )}
                <ChevronDown
                  className={cn(
                    'size-4 text-muted-foreground transition-transform',
                    isOpen && 'rotate-180'
                  )}
                />
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <ScrollArea className="max-h-[280px]">
              {categoryTree.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Tag className="mb-2 size-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No categories available
                  </p>
                </div>
              ) : (
                <div className="p-1" role="listbox" aria-multiselectable={allowMultiple}>
                  {categoryTree.map((category) => renderCategory(category))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {allowMultiple && Array.isArray(value) && value.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {value.map((catId) => {
              const cat = flatCategories.find((c) => c._id === catId)
              return (
                <Badge
                  key={catId}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {cat?.color && (
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                  )}
                  {cat?.name ?? 'Loading...'}
                  {!disabled && !readOnly && (
                    <button
                      type="button"
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                      onClick={() => toggleCategory(catId)}
                      aria-label={`Remove ${cat?.name}`}
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </Badge>
              )
            })}
          </div>
        )}
      </div>
    </FieldWrapper>
  )
}
