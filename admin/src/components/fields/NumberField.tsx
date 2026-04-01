import { useId, useState, useEffect, type ChangeEvent, type KeyboardEvent, type ClipboardEvent } from 'react'
import { FieldWrapper } from './FieldWrapper'
import type { NumberFieldProps } from './types'
import { Input } from '../ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '../ui/input-group'
import { cn } from '../../lib/cn'

export function NumberField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id: providedId,
  placeholder,
}: NumberFieldProps) {
  const generatedId = useId()
  const id = providedId ?? `field-${field.name}-${generatedId}`

  const { min, max, precision, prefix, suffix } = (field.options ?? {}) as {
    min?: number
    max?: number
    precision?: number
    prefix?: string
    suffix?: string
  }

  const allowDecimal = precision === undefined || precision > 0
  const allowNegative = min === undefined || min < 0

  // Local string state so partial values like "3." work during typing
  const [localValue, setLocalValue] = useState(() => {
    if (value == null) return ''
    if (precision !== undefined && precision >= 0) {
      return value.toFixed(precision)
    }
    return String(value)
  })

  // Sync from parent when value changes externally (e.g. undo, load)
  useEffect(() => {
    if (value == null) {
      if (localValue !== '') setLocalValue('')
      return
    }
    const localNum = parseFloat(localValue)
    if (!isNaN(localNum) && localNum === value) return
    if (precision !== undefined && precision >= 0) {
      setLocalValue(value.toFixed(precision))
    } else {
      setLocalValue(String(value))
    }
  }, [value, precision]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setLocalValue(raw)

    if (raw === '') {
      onChange(null)
      return
    }

    const numValue = parseFloat(raw)
    if (!isNaN(numValue)) {
      if (precision !== undefined && precision >= 0) {
        const factor = Math.pow(10, precision)
        onChange(Math.round(numValue * factor) / factor)
      } else {
        onChange(numValue)
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End',
    ]
    if (allowedKeys.includes(e.key)) return
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x', 'z'].includes(e.key)) return
    if (e.key >= '0' && e.key <= '9') return
    if (e.key === '.' && allowDecimal && !localValue.includes('.')) return
    if (e.key === '-' && allowNegative && (e.currentTarget.selectionStart === 0) && !localValue.includes('-')) return
    e.preventDefault()
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const pattern = allowDecimal ? /[^\d.\-]/g : /[^\d\-]/g
    const sanitized = text.replace(pattern, '')
    // Only keep the first decimal point and first minus sign
    const parts = sanitized.split('.')
    const clean = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : sanitized

    if (clean === '') return

    const input = e.currentTarget
    const start = input.selectionStart ?? 0
    const end = input.selectionEnd ?? 0
    const next = localValue.slice(0, start) + clean + localValue.slice(end)

    setLocalValue(next)

    const numValue = parseFloat(next)
    if (!isNaN(numValue)) {
      if (precision !== undefined && precision >= 0) {
        const factor = Math.pow(10, precision)
        onChange(Math.round(numValue * factor) / factor)
      } else {
        onChange(numValue)
      }
    }
  }

  const handleBlur = () => {
    if (localValue === '') return
    const num = parseFloat(localValue)
    if (isNaN(num)) return
    if (precision !== undefined && precision >= 0) {
      setLocalValue(num.toFixed(precision))
    } else {
      // Clean up trailing dots or leading zeros
      setLocalValue(String(num))
    }
  }

  const inputMode = allowDecimal ? 'decimal' : 'numeric'
  const hasGroup = !!(prefix || suffix)

  const inputProps = {
    type: 'text' as const,
    inputMode: inputMode as 'decimal' | 'numeric',
    id,
    name: field.name,
    value: localValue,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
    onPaste: handlePaste,
    disabled,
    readOnly,
    required: field.required,
    placeholder,
    'aria-invalid': !!error || undefined,
    'aria-describedby': error ? `${id}-error` : field.description ? `${id}-description` : undefined,
  }

  return (
    <FieldWrapper field={field} error={error} className={className} id={id}>
      {hasGroup ? (
        <InputGroup data-disabled={disabled || undefined}>
          {prefix && (
            <InputGroupAddon align="inline-start">
              <InputGroupText>{prefix}</InputGroupText>
            </InputGroupAddon>
          )}
          <InputGroupInput {...inputProps} />
          {suffix && (
            <InputGroupAddon align="inline-end">
              <InputGroupText className="text-xs font-medium">{suffix}</InputGroupText>
            </InputGroupAddon>
          )}
        </InputGroup>
      ) : (
        <Input
          {...inputProps}
          className={cn(error && 'border-destructive focus-visible:ring-destructive')}
        />
      )}
      {(min !== undefined || max !== undefined) && (
        <span className="mt-1 block text-xs text-muted-foreground">
          {min !== undefined && max !== undefined
            ? `Range: ${min} - ${max}`
            : min !== undefined
              ? `Min: ${min}`
              : `Max: ${max}`}
        </span>
      )}
    </FieldWrapper>
  )
}
