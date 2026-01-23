import { useId, type ChangeEvent } from 'react'
import { FieldWrapper } from './FieldWrapper'
import type { DateFieldProps } from './types'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/cn'
import { X } from 'lucide-react'

export function DateField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id: providedId,
  includeTime = false,
  placeholder,
}: DateFieldProps) {
  const generatedId = useId()
  const id = providedId ?? `field-${field.name}-${generatedId}`
  const showTime = includeTime || field.type === 'datetime'

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    onChange(inputValue || null)
  }

  const formatValue = (val: string | null): string => {
    if (!val) return ''
    if (!showTime && val.includes('T')) return val.split('T')[0]
    if (showTime && !val.includes('T')) return `${val}T00:00`
    return val
  }

  const formatDisplayValue = (val: string | null): string | null => {
    if (!val) return null
    try {
      const date = new Date(val)
      if (isNaN(date.getTime())) return null
      if (showTime) {
        return date.toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      }
      return date.toLocaleDateString(undefined, { dateStyle: 'medium' })
    } catch {
      return null
    }
  }

  const displayValue = formatDisplayValue(value)

  return (
    <FieldWrapper field={field} error={error} className={className} id={id}>
      <div className="relative">
        <Input
          type={showTime ? 'datetime-local' : 'date'}
          id={id}
          name={field.name}
          value={formatValue(value)}
          onChange={handleChange}
          disabled={disabled}
          readOnly={readOnly}
          required={field.required}
          placeholder={placeholder}
          className={cn(
            'pr-8',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${id}-error` : field.description ? `${id}-description` : undefined
          }
        />
        {value && !readOnly && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 size-6 -translate-y-1/2"
            onClick={() => onChange(null)}
            aria-label="Clear date"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      {value && displayValue && (
        <span className="mt-1 block text-xs text-muted-foreground">
          {displayValue}
        </span>
      )}
    </FieldWrapper>
  )
}
