import type { ReactNode } from 'react'
import type { FieldDefinition, FieldError } from './types'
import { Label } from '~/components/ui/label'
import { cn } from '~/lib/cn'

interface FieldWrapperProps {
  field: FieldDefinition
  children: ReactNode
  error?: FieldError
  className?: string
  id: string
}

export function FieldWrapper({
  field,
  children,
  error,
  className = '',
  id,
}: FieldWrapperProps) {
  const hasError = !!error

  return (
    <div className={cn('space-y-2', className)}>
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

      <div className="relative">{children}</div>

      {field.description && !hasError && (
        <p id={`${id}-description`} className="text-[13px] text-muted-foreground">
          {field.description}
        </p>
      )}

      {hasError && (
        <p
          id={`${id}-error`}
          className="text-[13px] font-medium text-destructive"
          role="alert"
        >
          {error.message}
        </p>
      )}
    </div>
  )
}
