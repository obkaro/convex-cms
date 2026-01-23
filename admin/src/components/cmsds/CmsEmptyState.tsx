import * as React from 'react'
import { cn } from '~/lib/cn'
import { CmsButton, type CmsButtonProps } from './CmsButton'

export interface CmsEmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: CmsButtonProps['variant']
  }
}

export function CmsEmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: CmsEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && (
        <CmsButton
          variant={action.variant ?? 'primary'}
          onClick={action.onClick}
          className="mt-4"
        >
          {action.label}
        </CmsButton>
      )}
    </div>
  )
}
