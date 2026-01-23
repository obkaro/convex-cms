import { useId, type ChangeEvent } from 'react'
import { FieldWrapper } from './FieldWrapper'
import type { TextFieldProps } from './types'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/cn'

export function TextField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id: providedId,
  placeholder,
  inputType = 'text',
}: TextFieldProps) {
  const generatedId = useId()
  const id = providedId ?? `field-${field.name}-${generatedId}`

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const { minLength, maxLength, pattern } = field.options ?? {}

  return (
    <FieldWrapper field={field} error={error} className={className} id={id}>
      <Input
        type={inputType}
        id={id}
        name={field.name}
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled}
        readOnly={readOnly}
        required={field.required}
        minLength={minLength}
        maxLength={maxLength}
        pattern={pattern}
        placeholder={placeholder}
        className={cn(error && 'border-destructive focus-visible:ring-destructive')}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${id}-error` : field.description ? `${id}-description` : undefined
        }
      />
      {maxLength && (
        <span className="mt-1 block text-right text-xs text-muted-foreground">
          {(value ?? '').length} / {maxLength}
        </span>
      )}
    </FieldWrapper>
  )
}
