import * as React from 'react'
import { cn } from '~/lib/cn'
import { Input } from '~/components/ui/input'
import { Search } from 'lucide-react'

export interface CmsToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }
  filters?: React.ReactNode
  actions?: React.ReactNode
}

export function CmsToolbar({
  search,
  filters,
  actions,
  className,
  children,
  ...props
}: CmsToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 pb-4',
        className
      )}
      {...props}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {search && (
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={search.placeholder ?? 'Search...'}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
        {filters}
        {children}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
