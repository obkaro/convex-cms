import { useId, type ChangeEvent, useRef, useEffect } from 'react'
import { FieldWrapper } from './FieldWrapper'
import type { TextAreaFieldProps } from './types'
import { Textarea } from '../ui/textarea'
import { cn } from '../../lib/cn'

export function TextAreaField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id: providedId,
  placeholder,
  rows = 4,
  autoResize = false,
}: TextAreaFieldProps) {
  const generatedId = useId()
  const id = providedId ?? `field-${field.name}-${generatedId}`
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  useEffect(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value, autoResize])

  const { minLength, maxLength } = field.options ?? {}

  return (
    <FieldWrapper field={field} error={error} className={className} id={id}>
      <Textarea
        ref={textareaRef}
        id={id}
        name={field.name}
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled}
        readOnly={readOnly}
        required={field.required}
        minLength={minLength}
        maxLength={maxLength}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          autoResize && 'resize-none overflow-hidden',
          error && 'border-destructive focus-visible:ring-destructive'
        )}
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
