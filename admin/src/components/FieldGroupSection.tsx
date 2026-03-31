import { useState } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible'
import { FieldRenderer } from './fields/FieldRenderer'
import type { FieldDefinition, FieldError } from './fields/types'
import { ChevronDown } from 'lucide-react'
import { cn } from '../lib/cn'

export interface FieldGroup {
  name: string
  label: string
  fields: FieldDefinition[]
}

interface FieldGroupSectionProps {
  group: FieldGroup
  formData: Record<string, unknown>
  fieldErrors: Record<string, FieldError | undefined>
  isSubmitting: boolean
  onFieldChange: (fieldName: string, value: unknown) => void
}

/**
 * Determines if a field is "compact" — boolean toggles and simple numbers
 * that can be rendered side-by-side in a 2-column grid.
 */
function isCompactField(field: FieldDefinition): boolean {
  if (field.type === 'boolean') return true
  if (field.type === 'number' && !field.description) return true
  return false
}

/**
 * Groups consecutive compact fields into pairs for grid layout,
 * while keeping non-compact fields full-width.
 */
function layoutFields(
  fields: FieldDefinition[]
): Array<{ type: 'full'; field: FieldDefinition } | { type: 'grid'; fields: FieldDefinition[] }> {
  const layout: Array<
    { type: 'full'; field: FieldDefinition } | { type: 'grid'; fields: FieldDefinition[] }
  > = []

  let compactBatch: FieldDefinition[] = []

  function flushCompactBatch() {
    if (compactBatch.length > 0) {
      layout.push({ type: 'grid', fields: compactBatch })
      compactBatch = []
    }
  }

  for (const field of fields) {
    if (isCompactField(field)) {
      compactBatch.push(field)
    } else {
      flushCompactBatch()
      layout.push({ type: 'full', field })
    }
  }
  flushCompactBatch()

  return layout
}

export function FieldGroupSection({
  group,
  formData,
  fieldErrors,
  isSubmitting,
  onFieldChange,
}: FieldGroupSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  const errorCount = group.fields.filter((f) => fieldErrors[f.name]).length
  const layout = layoutFields(group.fields)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-left transition-colors',
            'bg-muted/40 hover:bg-muted/60',
            errorCount > 0 && 'ring-1 ring-destructive/20'
          )}
        >
          <span className="text-sm font-semibold tracking-tight text-foreground">
            {group.label}
          </span>
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                {errorCount}
              </span>
            )}
            <ChevronDown
              className={cn(
                'size-4 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-4 px-1 pt-4">
          {layout.map((item, i) => {
            if (item.type === 'grid') {
              return (
                <div key={`grid-${i}`} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {item.fields.map((field) => (
                    <FieldRenderer
                      key={field.name}
                      field={field}
                      value={formData[field.name]}
                      onChange={(value) => onFieldChange(field.name, value)}
                      error={fieldErrors[field.name]}
                      disabled={isSubmitting}
                    />
                  ))}
                </div>
              )
            }
            return (
              <FieldRenderer
                key={item.field.name}
                field={item.field}
                value={formData[item.field.name]}
                onChange={(value) => onFieldChange(item.field.name, value)}
                error={fieldErrors[item.field.name]}
                disabled={isSubmitting}
              />
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/**
 * Groups fields by their `group` property.
 * Fields without a group go into a "__default__" group.
 * Groups appear in the order they're first encountered.
 */
export function groupFields(fields: FieldDefinition[]): FieldGroup[] {
  const groups: FieldGroup[] = []
  const map = new Map<string, FieldGroup>()

  for (const field of fields) {
    const key = field.group ?? '__default__'
    if (!map.has(key)) {
      const group: FieldGroup = {
        name: key,
        label:
          key === '__default__'
            ? 'General'
            : key
                .replace(/[_-]/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase()),
        fields: [],
      }
      map.set(key, group)
      groups.push(group)
    }
    map.get(key)!.fields.push(field)
  }

  return groups
}
