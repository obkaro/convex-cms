import { useId } from 'react'
import type { BooleanFieldProps } from './types'
import { Switch } from '../ui/switch'
import { Field, FieldLabel, FieldDescription, FieldError } from '../ui/field'

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
    <Field
      orientation="horizontal"
      data-invalid={hasError || undefined}
      className={className}
    >
      <FieldLabel htmlFor={id}>
        {field.label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </FieldLabel>

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

      {field.description && !hasError && (
        <FieldDescription id={`${id}-description`}>
          {field.description}
        </FieldDescription>
      )}

      {hasError && (
        <FieldError id={`${id}-error`}>
          {error.message}
        </FieldError>
      )}
    </Field>
  )
}
