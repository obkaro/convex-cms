import { useId } from 'react'
import { FieldWrapper } from './FieldWrapper'
import type { BaseFieldProps } from './types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { cn } from '~/lib/cn'

export interface SelectFieldProps extends BaseFieldProps<string> {
  placeholder?: string
}

export function SelectField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id,
  placeholder = 'Select an option...',
}: SelectFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? `field-${field.name}-${generatedId}`
  const options = field.options?.options ?? []

  const handleChange = (newValue: string) => {
    onChange(newValue)
  }

  return (
    <FieldWrapper field={field} error={error} className={className} id={fieldId}>
      <Select
        value={value ?? ''}
        onValueChange={handleChange}
        disabled={disabled || readOnly}
        required={field.required}
      >
        <SelectTrigger
          id={fieldId}
          className={cn(error && 'border-destructive focus:ring-destructive')}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldWrapper>
  )
}
