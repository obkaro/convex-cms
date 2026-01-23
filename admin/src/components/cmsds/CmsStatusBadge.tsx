import * as React from 'react'
import { Badge } from '~/components/ui/badge'
import { cn } from '~/lib/cn'

export type ContentStatus = 'draft' | 'published' | 'scheduled' | 'archived'

export interface CmsStatusBadgeProps
  extends Omit<React.ComponentProps<typeof Badge>, 'variant'> {
  status: ContentStatus
}

const statusConfig = {
  draft: {
    label: 'Draft',
    className: 'status-draft',
    icon: (
      <svg className="size-3" fill="currentColor" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="3" />
      </svg>
    ),
  },
  published: {
    label: 'Published',
    className: 'status-published',
    icon: (
      <svg className="size-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  scheduled: {
    label: 'Scheduled',
    className: 'status-scheduled',
    icon: (
      <svg className="size-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" d="M12 6v6l4 2" />
      </svg>
    ),
  },
  archived: {
    label: 'Archived',
    className: 'status-archived',
    icon: (
      <svg className="size-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
} as const

export function CmsStatusBadge({ status, className, ...props }: CmsStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge
      variant="secondary"
      className={cn(
        'gap-1.5 px-2 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
      {...props}
    >
      {config.icon}
      {config.label}
    </Badge>
  )
}
