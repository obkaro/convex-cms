import * as React from 'react'
import { Label } from '../ui/label'
import { cn } from '../../lib/cn'

export interface CmsFieldProps {
  label?: string
  description?: string
  error?: string
  required?: boolean
  htmlFor?: string
  className?: string
  children: React.ReactNode
}

export function CmsField({
  label,
  description,
  error,
  required,
  htmlFor,
  className,
  children,
}: CmsFieldProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <Label
          htmlFor={htmlFor}
          className={cn(
            'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
            error && 'text-destructive'
          )}
        >
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      )}
      {children}
      {description && !error && (
        <p className="text-[13px] text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-[13px] font-medium text-destructive">{error}</p>
      )}
    </div>
  )
}
