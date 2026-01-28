import * as React from 'react'
import { CmsSurface } from './CmsSurface'
import { cn } from '~/lib/cn'

export interface CmsStatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  onClick?: () => void
  isLoading?: boolean
  className?: string
}

export function CmsStatCard({
  title,
  value,
  description,
  icon,
  trend,
  onClick,
  isLoading,
  className,
}: CmsStatCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {isLoading ? (
            <div className="h-8 w-16 animate-pulse rounded bg-muted" />
          ) : (
            <p className="text-2xl font-semibold text-foreground">{value}</p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {icon && (
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </div>
      {trend && !isLoading && (
        <div className={cn(
          "mt-2 text-xs font-medium",
          trend.value >= 0 ? "text-diff-added-foreground" : "text-diff-removed-foreground"
        )}>
          {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
        </div>
      )}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "text-left w-full cursor-pointer transition-colors hover:bg-accent/50",
          className
        )}
      >
        <CmsSurface elevation="base" padding="md" className="h-full">
          {content}
        </CmsSurface>
      </button>
    )
  }

  return (
    <CmsSurface elevation="base" padding="md" className={cn("h-full", className)}>
      {content}
    </CmsSurface>
  )
}
