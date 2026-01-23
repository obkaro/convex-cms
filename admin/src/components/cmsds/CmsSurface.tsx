import * as React from 'react'
import { cn } from '~/lib/cn'

export interface CmsSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 'base' | 'elevated' | 'floating'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  rounded?: 'none' | 'sm' | 'md' | 'lg'
  asChild?: boolean
}

const elevationClasses = {
  base: 'surface-base',
  elevated: 'surface-elevated',
  floating: 'surface-floating',
} as const

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const

const roundedClasses = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
} as const

export function CmsSurface({
  elevation = 'base',
  padding = 'md',
  rounded = 'lg',
  className,
  children,
  ...props
}: CmsSurfaceProps) {
  return (
    <div
      className={cn(
        elevationClasses[elevation],
        paddingClasses[padding],
        roundedClasses[rounded],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
