import { useState, useCallback, useEffect, useId } from 'react'
import { FieldWrapper } from './FieldWrapper'
import type { BaseFieldProps } from './types'
import { Textarea } from '~/components/ui/textarea'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/cn'
import { Check, AlertCircle } from 'lucide-react'

export interface JsonFieldProps extends BaseFieldProps<unknown> {
  placeholder?: string
  rows?: number
}

export function JsonField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id,
  placeholder = '{\n  \n}',
  rows = 8,
}: JsonFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? `field-${field.name}-${generatedId}`

  const [textValue, setTextValue] = useState(() => {
    if (value === null || value === undefined) return ''
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return ''
    }
  })

  const [syntaxError, setSyntaxError] = useState<string | null>(null)

  useEffect(() => {
    if (value === null || value === undefined) {
      setTextValue('')
      return
    }
    try {
      const formatted = JSON.stringify(value, null, 2)
      const currentParsed = textValue ? JSON.parse(textValue) : null
      if (JSON.stringify(currentParsed) !== JSON.stringify(value)) {
        setTextValue(formatted)
      }
    } catch {
      // Keep current text
    }
  }, [value])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value
      setTextValue(newText)

      if (newText.trim() === '') {
        setSyntaxError(null)
        onChange(null)
        return
      }

      try {
        const parsed = JSON.parse(newText)
        setSyntaxError(null)
        onChange(parsed)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid JSON'
        setSyntaxError(message)
      }
    },
    [onChange]
  )

  const handleFormat = useCallback(() => {
    if (textValue.trim() === '') return
    try {
      const parsed = JSON.parse(textValue)
      const formatted = JSON.stringify(parsed, null, 2)
      setTextValue(formatted)
      setSyntaxError(null)
    } catch {
      // Can't format invalid JSON
    }
  }, [textValue])

  const handleMinify = useCallback(() => {
    if (textValue.trim() === '') return
    try {
      const parsed = JSON.parse(textValue)
      const minified = JSON.stringify(parsed)
      setTextValue(minified)
      setSyntaxError(null)
    } catch {
      // Can't minify invalid JSON
    }
  }, [textValue])

  const displayError = syntaxError
    ? { message: `JSON syntax error: ${syntaxError}`, code: 'SYNTAX_ERROR' }
    : error

  return (
    <FieldWrapper field={field} error={displayError} className={className} id={fieldId}>
      <div
        className={cn(
          'overflow-hidden rounded-md border border-input',
          displayError && 'border-destructive'
        )}
      >
        <div className="flex items-center gap-1 border-b bg-muted/50 px-2 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleFormat}
            disabled={disabled || readOnly || !!syntaxError}
          >
            Format
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleMinify}
            disabled={disabled || readOnly || !!syntaxError}
          >
            Minify
          </Button>
        </div>

        <Textarea
          id={fieldId}
          name={field.name}
          value={textValue}
          onChange={handleChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          readOnly={readOnly}
          required={field.required}
          aria-invalid={!!displayError}
          aria-describedby={displayError ? `${fieldId}-error` : undefined}
          className="resize-none rounded-none border-0 font-mono text-sm focus-visible:ring-0"
          spellCheck={false}
        />

        <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
          <span>Enter valid JSON data</span>
          {syntaxError && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="size-3" />
              Invalid
            </span>
          )}
          {!syntaxError && textValue.trim() !== '' && (
            <span className="flex items-center gap-1 text-success">
              <Check className="size-3" />
              Valid JSON
            </span>
          )}
        </div>
      </div>
    </FieldWrapper>
  )
}
