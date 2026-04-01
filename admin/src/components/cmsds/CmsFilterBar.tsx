import * as React from 'react'
import { Search, X } from 'lucide-react'
import { CmsSelect, type CmsSelectOption } from './CmsSelect'
import { CmsButton } from './CmsButton'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '../ui/input-group'
import { cn } from '../../lib/cn'

export interface CmsFilterBarFilter {
  key: string
  value: string
  onChange: (value: string) => void
  options: CmsSelectOption[]
  placeholder?: string
  className?: string
}

export interface CmsFilterBarProps {
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
  }
  filters?: CmsFilterBarFilter[]
  actions?: React.ReactNode
  onClearFilters?: () => void
  hasActiveFilters?: boolean
  className?: string
}

export function CmsFilterBar({
  search,
  filters,
  actions,
  onClearFilters,
  hasActiveFilters,
  className,
}: CmsFilterBarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 pb-4", className)}>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {search && (
          <InputGroup className={cn("w-full max-w-xs", search.className)}>
            <InputGroupAddon align="inline-start">
              <InputGroupText><Search /></InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder={search.placeholder ?? "Search..."}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
            />
          </InputGroup>
        )}
        {filters?.map((filter) => (
          <CmsSelect
            key={filter.key}
            value={filter.value}
            onValueChange={filter.onChange}
            options={filter.options}
            placeholder={filter.placeholder}
            className={cn("w-[150px]", filter.className)}
          />
        ))}
        {hasActiveFilters && onClearFilters && (
          <CmsButton variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="mr-1 size-4" />
            Clear
          </CmsButton>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
