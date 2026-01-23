import { useId } from 'react'
import { FieldWrapper } from './FieldWrapper'
import type { BaseFieldProps } from './types'
import { Checkbox } from '~/components/ui/checkbox'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { cn } from '~/lib/cn'

export interface MultiSelectFieldProps extends BaseFieldProps<string[]> {
  placeholder?: string
}

export function MultiSelectField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id,
}: MultiSelectFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? `field-${field.name}-${generatedId}`
  const options = field.options?.options ?? []
  const selectedValues = value ?? []

  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, optionValue])
    } else {
      onChange(selectedValues.filter((v) => v !== optionValue))
    }
  }

  const handleSelectAll = () => {
    const allValues = options.map((o) => o.value)
    onChange(allValues)
  }

  const handleClearAll = () => {
    onChange([])
  }

  return (
    <FieldWrapper field={field} error={error} className={className} id={fieldId}>
      <div
        className={cn(
          'rounded-md border border-input p-3',
          error && 'border-destructive'
        )}
        role="group"
        aria-labelledby={`${fieldId}-label`}
      >
        {options.length > 3 && (
          <div className="mb-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={disabled || readOnly}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={disabled || readOnly || selectedValues.length === 0}
            >
              Clear
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {options.map((option) => {
            const optionId = `${fieldId}-${option.value}`
            const isChecked = selectedValues.includes(option.value)

            return (
              <div
                key={option.value}
                className={cn(
                  'flex items-center space-x-2 rounded-md p-2',
                  isChecked && 'bg-accent'
                )}
              >
                <Checkbox
                  id={optionId}
                  checked={isChecked}
                  onCheckedChange={(checked) =>
                    handleChange(option.value, checked === true)
                  }
                  disabled={disabled || readOnly}
                />
                <Label
                  htmlFor={optionId}
                  className="cursor-pointer text-sm font-normal"
                >
                  {option.label}
                </Label>
              </div>
            )
          })}
        </div>

        {selectedValues.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {selectedValues.length} of {options.length} selected
          </div>
        )}
      </div>
    </FieldWrapper>
  )
}
