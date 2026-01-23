import { useId } from 'react'
import type { BooleanFieldProps } from './types'
import { Switch } from '~/components/ui/switch'
import { Label } from '~/components/ui/label'
import { cn } from '~/lib/cn'

export function BooleanField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id: providedId,
  trueLabel = 'Yes',
  falseLabel = 'No',
}: BooleanFieldProps) {
  const generatedId = useId()
  const id = providedId ?? `field-${field.name}-${generatedId}`

  const handleChange = (checked: boolean) => {
    if (!readOnly) {
      onChange(checked)
    }
  }

  const hasError = !!error

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label
          htmlFor={id}
          className={cn(
            'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
            hasError && 'text-destructive'
          )}
        >
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </Label>

        <div className="flex items-center gap-2">
          <Switch
            id={id}
            checked={value ?? false}
            onCheckedChange={handleChange}
            disabled={disabled || readOnly}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${id}-error` : field.description ? `${id}-description` : undefined
            }
          />
          <span className="text-sm text-muted-foreground">
            {value ? trueLabel : falseLabel}
          </span>
        </div>
      </div>

      {field.description && !hasError && (
        <p id={`${id}-description`} className="text-[13px] text-muted-foreground">
          {field.description}
        </p>
      )}

      {hasError && (
        <p id={`${id}-error`} className="text-[13px] font-medium text-destructive" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}
