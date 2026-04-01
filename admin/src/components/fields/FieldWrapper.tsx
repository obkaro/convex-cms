import type { ReactNode } from 'react'
import type { FieldDefinition, FieldError } from './types'
import { Field, FieldLabel, FieldDescription, FieldError as FieldErrorDisplay } from '../ui/field'

interface FieldWrapperProps {
  field: FieldDefinition
  children: ReactNode
  error?: FieldError
  className?: string
  id: string
  customLabel?: ReactNode
}

export function FieldWrapper({
  field,
  children,
  error,
  className = '',
  id,
  customLabel,
}: FieldWrapperProps) {
  return (
    <Field data-invalid={!!error || undefined} className={className}>
      <FieldLabel htmlFor={id}>
        {customLabel ?? field.label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </FieldLabel>

      {children}

      {field.description && !error && (
        <FieldDescription id={`${id}-description`}>
          {field.description}
        </FieldDescription>
      )}

      {error && (
        <FieldErrorDisplay id={`${id}-error`}>
          {error.message}
        </FieldErrorDisplay>
      )}
    </Field>
  )
}
