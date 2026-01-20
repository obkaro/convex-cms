import { useId, ChangeEvent } from 'react';
import { FieldWrapper } from './FieldWrapper';
import type { NumberFieldProps } from './types';

/**
 * NumberField renders a numeric input.
 *
 * Supports:
 * - Min/max validation
 * - Step increments
 * - Precision (decimal places, 0 for integer)
 */
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
  const generatedId = useId();
  const id = providedId ?? `field-${field.name}-${generatedId}`;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Handle empty input
    if (inputValue === '') {
      onChange(null);
      return;
    }

    // Parse the number
    const numValue = parseFloat(inputValue);

    if (!isNaN(numValue)) {
      // Apply precision if specified
      const { precision } = field.options ?? {};
      if (precision !== undefined && precision >= 0) {
        const factor = Math.pow(10, precision);
        onChange(Math.round(numValue * factor) / factor);
      } else {
        onChange(numValue);
      }
    }
  };

  // Extract options for validation attributes
  const { min, max, step, precision } = field.options ?? {};

  // Calculate step from precision if not explicitly set
  const computedStep = step ?? (precision !== undefined ? Math.pow(10, -precision) : 'any');

  return (
    <FieldWrapper field={field} error={error} className={className} id={id}>
      <input
        type="number"
        id={id}
        name={field.name}
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled}
        readOnly={readOnly}
        required={field.required}
        min={min}
        max={max}
        step={computedStep}
        placeholder={placeholder}
        className={`field-input field-input--number ${error ? 'field-input--error' : ''}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : field.description ? `${id}-description` : undefined}
      />
      {(min !== undefined || max !== undefined) && (
        <span className="field-range-hint">
          {min !== undefined && max !== undefined
            ? `Range: ${min} - ${max}`
            : min !== undefined
              ? `Min: ${min}`
              : `Max: ${max}`}
        </span>
      )}
    </FieldWrapper>
  );
}
