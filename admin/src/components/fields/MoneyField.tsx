import { useId, useState, useEffect, type ChangeEvent, type KeyboardEvent, type ClipboardEvent } from 'react'
import { FieldWrapper } from './FieldWrapper'
import type { MoneyFieldProps } from './types'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '../ui/input-group'

const CURRENCY_SYMBOLS: Record<string, string> = {
  CAD: '$',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  NGN: '₦',
  AUD: 'A$',
  NZD: 'NZ$',
}

const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND'])

function getMinorUnitDivisor(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100
}

function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency
}

export function MoneyField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id: providedId,
  placeholder,
}: MoneyFieldProps) {
  const generatedId = useId()
  const id = providedId ?? `field-${field.name}-${generatedId}`

  const defaultCurrency =
    (field.options as Record<string, unknown> | undefined)?.defaultCurrency as string ?? 'CAD'
  const currency = value?.currency ?? defaultCurrency
  const divisor = getMinorUnitDivisor(currency)
  const symbol = getCurrencySymbol(currency)
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency)

  // Local string state so the input isn't fighting the user while typing.
  // Only sync to the parent (as minor units) when the input changes.
  const [localValue, setLocalValue] = useState(() => {
    if (value?.amount == null) return ''
    return isZeroDecimal
      ? String(value.amount)
      : String(value.amount / divisor)
  })

  // Sync from parent when value changes externally (e.g. undo, load)
  useEffect(() => {
    const parentDisplay =
      value?.amount == null
        ? ''
        : isZeroDecimal
          ? String(value.amount)
          : String(value.amount / divisor)

    // Only update local state if the numeric value actually differs,
    // to avoid clobbering what the user is typing
    const localNum = parseFloat(localValue)
    const parentNum = parseFloat(parentDisplay)
    if (localValue === '' && parentDisplay === '') return
    if (!isNaN(localNum) && !isNaN(parentNum) && localNum === parentNum) return
    if (localValue === '' && parentDisplay !== '') setLocalValue(parentDisplay)
    if (localValue !== '' && parentDisplay === '') setLocalValue('')
  }, [value?.amount, currency, divisor, isZeroDecimal]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setLocalValue(raw)

    if (raw === '') {
      onChange(null)
      return
    }

    const numValue = parseFloat(raw)
    if (!isNaN(numValue)) {
      const amount = isZeroDecimal ? numValue : Math.round(numValue * divisor)
      onChange({ amount, currency })
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
    if (e.key === '.' && !isZeroDecimal && !localValue.includes('.')) return
    e.preventDefault()
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const sanitized = text.replace(isZeroDecimal ? /[^\d]/g : /[^\d.]/g, '')
    // Only keep the first decimal point
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
      const amount = isZeroDecimal ? numValue : Math.round(numValue * divisor)
      onChange({ amount, currency })
    }
  }

  const handleBlur = () => {
    if (localValue === '') return
    const num = parseFloat(localValue)
    if (isNaN(num)) return
    if (isZeroDecimal) {
      setLocalValue(String(Math.round(num)))
    } else {
      setLocalValue(num.toFixed(2))
    }
  }

  return (
    <FieldWrapper field={field} error={error} className={className} id={id}>
      <InputGroup data-disabled={disabled || undefined}>
        <InputGroupAddon align="inline-start">
          <InputGroupText>{symbol}</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          type="text"
          inputMode={isZeroDecimal ? 'numeric' : 'decimal'}
          id={id}
          name={field.name}
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onPaste={handlePaste}
          disabled={disabled}
          readOnly={readOnly}
          required={field.required}
          placeholder={placeholder ?? (isZeroDecimal ? '0' : '0.00')}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${id}-error`
              : field.description
                ? `${id}-description`
                : undefined
          }
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText className="text-xs font-medium">{currency}</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </FieldWrapper>
  )
}
