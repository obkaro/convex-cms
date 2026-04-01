import { useId } from 'react'
import { FieldWrapper } from './FieldWrapper'
import type { BaseFieldProps } from './types'
import { Checkbox } from '../ui/checkbox'
import { Button } from '../ui/button'
import { Field, FieldLabel, FieldSet, FieldLegend } from '../ui/field'
import { cn } from '../../lib/cn'

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
      >
        <FieldSet aria-labelledby={`${fieldId}-label`}>
          <FieldLegend variant="label" className="sr-only">
            {field.label}
          </FieldLegend>

          {options.length > 3 && (
            <div className="flex gap-2">
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

          <div className="flex flex-col gap-2">
            {options.map((option) => {
              const optionId = `${fieldId}-${option.value}`
              const isChecked = selectedValues.includes(option.value)

              return (
                <Field
                  key={option.value}
                  orientation="horizontal"
                  className={cn(
                    'rounded-md p-2',
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
                  <FieldLabel
                    htmlFor={optionId}
                    className="cursor-pointer font-normal"
                  >
                    {option.label}
                  </FieldLabel>
                </Field>
              )
            })}
          </div>

          {selectedValues.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {selectedValues.length} of {options.length} selected
            </div>
          )}
        </FieldSet>
      </div>
    </FieldWrapper>
  )
}
