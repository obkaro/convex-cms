import { useId, useRef, useCallback } from 'react'
import { FieldWrapper } from './FieldWrapper'
import { FieldRenderer } from './FieldRenderer'
import type { ArrayObjectFieldProps, FieldDefinition } from './types'
import { Button } from '../ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible'
import { ChevronDown, ChevronUp, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useState } from 'react'

/**
 * Interpolate an item label template with field values.
 * "{name}" → item.name, "{name} - {price}" → "Chicken - 500"
 */
function interpolateLabel(
  template: string | undefined,
  item: Record<string, unknown>
): string {
  if (!template) return ''
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = item[key]
    if (val === null || val === undefined) return ''
    if (typeof val === 'object') return JSON.stringify(val)
    return String(val)
  })
}

/**
 * Create a default value for a new array item based on sub-field types.
 */
function createDefaultItem(subFields: FieldDefinition[]): Record<string, unknown> {
  const item: Record<string, unknown> = {}
  for (const field of subFields) {
    switch (field.type) {
      case 'text':
      case 'richText':
      case 'select':
        item[field.name] = ''
        break
      case 'number':
        item[field.name] = 0
        break
      case 'boolean':
        item[field.name] = false
        break
      case 'money':
        item[field.name] = { amount: 0, currency: 'CAD' }
        break
      case 'arrayObject':
        item[field.name] = []
        break
      default:
        item[field.name] = null
        break
    }
  }
  return item
}

interface ItemWithKey {
  key: number
  data: Record<string, unknown>
}

export function ArrayObjectField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id: providedId,
}: ArrayObjectFieldProps) {
  const generatedId = useId()
  const id = providedId ?? `field-${field.name}-${generatedId}`

  const subFields = (field.options?.subFields as FieldDefinition[] | undefined) ?? []
  const itemLabel = field.options?.itemLabel as string | undefined
  const maxItems = field.options?.maxItems as number | undefined

  // Stable key counter for React reconciliation
  const keyCounter = useRef(0)

  // Initialize items with stable keys
  const [items, setItems] = useState<ItemWithKey[]>(() => {
    const arr = value ?? []
    return arr.map((data) => ({ key: keyCounter.current++, data }))
  })

  // Track which items are expanded
  const [expandedKeys, setExpandedKeys] = useState<Set<number>>(() => {
    // Start all expanded if <= 3 items, otherwise only the first
    const keys = new Set<number>()
    const arr = value ?? []
    if (arr.length <= 3) {
      items.forEach((item) => keys.add(item.key))
    } else if (items.length > 0) {
      keys.add(items[0].key)
    }
    return keys
  })

  const emitChange = useCallback(
    (newItems: ItemWithKey[]) => {
      setItems(newItems)
      onChange(newItems.map((item) => item.data))
    },
    [onChange]
  )

  const handleSubFieldChange = useCallback(
    (itemKey: number, fieldName: string, fieldValue: unknown) => {
      setItems((prev) => {
        const next = prev.map((item) =>
          item.key === itemKey
            ? { ...item, data: { ...item.data, [fieldName]: fieldValue } }
            : item
        )
        // Emit change in a microtask to avoid setState-during-render
        Promise.resolve().then(() =>
          onChange(next.map((item) => item.data))
        )
        return next
      })
    },
    [onChange]
  )

  const addItem = useCallback(() => {
    const newKey = keyCounter.current++
    const newItem: ItemWithKey = { key: newKey, data: createDefaultItem(subFields) }
    const newItems = [...items, newItem]
    setExpandedKeys((prev) => new Set([...prev, newKey]))
    emitChange(newItems)
  }, [items, subFields, emitChange])

  const removeItem = useCallback(
    (itemKey: number) => {
      emitChange(items.filter((item) => item.key !== itemKey))
      setExpandedKeys((prev) => {
        const next = new Set(prev)
        next.delete(itemKey)
        return next
      })
    },
    [items, emitChange]
  )

  const moveItem = useCallback(
    (itemKey: number, direction: -1 | 1) => {
      const idx = items.findIndex((item) => item.key === itemKey)
      if (idx < 0) return
      const newIdx = idx + direction
      if (newIdx < 0 || newIdx >= items.length) return
      const newItems = [...items]
      ;[newItems[idx], newItems[newIdx]] = [newItems[newIdx], newItems[idx]]
      emitChange(newItems)
    },
    [items, emitChange]
  )

  const toggleExpanded = useCallback((itemKey: number) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(itemKey)) {
        next.delete(itemKey)
      } else {
        next.add(itemKey)
      }
      return next
    })
  }, [])

  const canAdd = maxItems === undefined || items.length < maxItems
  const isNested = subFields.some((f) => f.type === 'arrayObject')

  return (
    <FieldWrapper field={field} error={error} className={className} id={id}>
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No items yet
          </p>
        )}

        {items.map((item, index) => {
          const isExpanded = expandedKeys.has(item.key)
          const label =
            interpolateLabel(itemLabel, item.data) || `Item ${index + 1}`

          return (
            <div
              key={item.key}
              className={cn(
                'rounded-lg border border-border bg-card',
                isNested ? 'border-dashed' : ''
              )}
            >
              <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(item.key)}>
                {/* Card header */}
                <div className="flex items-center gap-1 px-3 py-2">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex flex-1 items-center gap-2 text-left text-sm font-medium text-foreground hover:text-foreground/80"
                      disabled={disabled}
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">{label}</span>
                    </button>
                  </CollapsibleTrigger>

                  {!readOnly && !disabled && (
                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => moveItem(item.key, -1)}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => moveItem(item.key, 1)}
                        disabled={index === items.length - 1}
                        aria-label="Move down"
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.key)}
                        aria-label="Remove item"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Card content */}
                <CollapsibleContent>
                  <div className="space-y-4 border-t border-border px-3 py-3">
                    {subFields.map((subField) => (
                      <FieldRenderer
                        key={subField.name}
                        field={subField}
                        value={item.data[subField.name]}
                        onChange={(val) =>
                          handleSubFieldChange(item.key, subField.name, val)
                        }
                        disabled={disabled}
                        readOnly={readOnly}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )
        })}

        {/* Add button */}
        {!readOnly && !disabled && canAdd && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={addItem}
          >
            <Plus className="mr-1.5 size-3.5" />
            Add {field.label ? field.label.replace(/s$/, '') : 'Item'}
          </Button>
        )}

        {maxItems !== undefined && (
          <p className="text-xs text-muted-foreground">
            {items.length}/{maxItems} items
          </p>
        )}
      </div>
    </FieldWrapper>
  )
}
