import { useId, type ChangeEvent } from 'react'
import { FieldWrapper } from './FieldWrapper'
import type { NumberFieldProps } from './types'
import { Input } from '../ui/input'
import { cn } from '../../lib/cn'

export function NumberField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id: providedId,
  placeholder,
}: NumberFieldProps) {
  const generatedId = useId()
  const id = providedId ?? `field-${field.name}-${generatedId}`

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    if (inputValue === '') {
      onChange(null)
      return
    }

    const numValue = parseFloat(inputValue)

    if (!isNaN(numValue)) {
      const { precision } = field.options ?? {}
      if (precision !== undefined && precision >= 0) {
        const factor = Math.pow(10, precision)
        onChange(Math.round(numValue * factor) / factor)
      } else {
        onChange(numValue)
      }
    }
  }

  const { min, max, step, precision, prefix, suffix } = (field.options ?? {}) as {
    min?: number
    max?: number
    step?: number
    precision?: number
    prefix?: string
    suffix?: string
  }
  const computedStep = step ?? (precision !== undefined ? Math.pow(10, -precision) : 'any')

  const input = (
    <Input
      type="number"
      id={id}
      name={field.name}
      value={value ?? ''}
      onChange={handleChange}
      disabled={disabled}
      readOnly={readOnly}
      required={field.required}
      min={min}
      max={max}
      step={computedStep}
      placeholder={placeholder}
      className={cn(
        prefix && 'pl-8',
        suffix && 'pr-12',
        error && 'border-destructive focus-visible:ring-destructive'
      )}
      aria-invalid={!!error}
      aria-describedby={
        error ? `${id}-error` : field.description ? `${id}-description` : undefined
      }
    />
  )

  return (
    <FieldWrapper field={field} error={error} className={className} id={id}>
      {prefix || suffix ? (
        <div className="relative">
          {prefix && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {prefix}
            </span>
          )}
          {input}
          {suffix && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>
      ) : (
        input
      )}
      {(min !== undefined || max !== undefined) && (
        <span className="mt-1 block text-xs text-muted-foreground">
          {min !== undefined && max !== undefined
            ? `Range: ${min} - ${max}`
            : min !== undefined
              ? `Min: ${min}`
              : `Max: ${max}`}
        </span>
      )}
    </FieldWrapper>
  )
}
