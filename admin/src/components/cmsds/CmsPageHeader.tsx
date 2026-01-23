import * as React from 'react'
import { cn } from '~/lib/cn'

export interface CmsPageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  actions?: React.ReactNode
  breadcrumbs?: React.ReactNode
}

export function CmsPageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
  ...props
}: CmsPageHeaderProps) {
  return (
    <div className={cn('mb-6', className)} {...props}>
      {breadcrumbs && <div className="mb-2">{breadcrumbs}</div>}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
