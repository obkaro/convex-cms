import * as React from 'react'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/cn'

export interface CmsInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const CmsInput = React.forwardRef<HTMLInputElement, CmsInputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        className={cn(
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        aria-invalid={error}
        {...props}
      />
    )
  }
)
CmsInput.displayName = 'CmsInput'
