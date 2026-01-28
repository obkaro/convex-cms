import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { cn } from '~/lib/cn'

export interface CmsSelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface CmsSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  options: CmsSelectOption[]
  placeholder?: string
  disabled?: boolean
  error?: boolean
  className?: string
}

export function CmsSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  disabled,
  error,
  className,
}: CmsSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          error && "border-destructive focus:ring-destructive",
          className
        )}
        aria-invalid={error}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
