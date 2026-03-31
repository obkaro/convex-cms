import { useId, type ChangeEvent } from 'react'
import { FieldWrapper } from './FieldWrapper'
import type { MoneyFieldProps } from './types'
import { Input } from '../ui/input'
import { cn } from '../../lib/cn'

/**
 * Currency symbols for common ISO 4217 codes.
 * Falls back to the code itself for unknown currencies.
 */
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

/**
 * Minor unit divisors for currencies.
 * Most currencies have 2 decimal places (100), but some differ.
 */
const MINOR_UNIT_DIVISORS: Record<string, number> = {
  JPY: 1,
  KRW: 1,
  VND: 1,
}

function getMinorUnitDivisor(currency: string): number {
  return MINOR_UNIT_DIVISORS[currency] ?? 100
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

  // Get default currency from field options or fall back to CAD
  const defaultCurrency =
    (field.options as Record<string, unknown> | undefined)?.defaultCurrency as string ?? 'CAD'
  const currency = value?.currency ?? defaultCurrency
  const divisor = getMinorUnitDivisor(currency)
  const symbol = getCurrencySymbol(currency)

  // Convert minor units to major units for display
  const displayValue =
    value?.amount !== undefined && value?.amount !== null
      ? (value.amount / divisor).toFixed(divisor === 1 ? 0 : 2)
      : ''

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    if (inputValue === '') {
      onChange(null)
      return
    }

    const numValue = parseFloat(inputValue)
    if (!isNaN(numValue)) {
      // Convert major units to minor units (e.g. 15.00 → 1500)
      const amount = Math.round(numValue * divisor)
      onChange({ amount, currency })
    }
  }

  const step = divisor === 1 ? '1' : '0.01'

  return (
    <FieldWrapper field={field} error={error} className={className} id={id}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {symbol}
        </span>
        <Input
          type="number"
          id={id}
          name={field.name}
          value={displayValue}
          onChange={handleChange}
          disabled={disabled}
          readOnly={readOnly}
          required={field.required}
          min={0}
          step={step}
          placeholder={placeholder ?? '0.00'}
          className={cn(
            'pl-8',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${id}-error`
              : field.description
                ? `${id}-description`
                : undefined
          }
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
          {currency}
        </span>
      </div>
    </FieldWrapper>
  )
}
