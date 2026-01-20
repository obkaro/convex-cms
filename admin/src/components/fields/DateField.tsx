import { useId, ChangeEvent } from 'react';
import { FieldWrapper } from './FieldWrapper';
import type { DateFieldProps } from './types';

/**
 * DateField renders a date or datetime picker.
 *
 * Uses native HTML date/datetime-local inputs for
 * cross-browser compatibility and mobile support.
 *
 * Value format:
 * - date: "YYYY-MM-DD"
 * - datetime: "YYYY-MM-DDTHH:mm"
 */
export function DateField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id: providedId,
  includeTime = false,
  placeholder,
}: DateFieldProps) {
  const generatedId = useId();
  const id = providedId ?? `field-${field.name}-${generatedId}`;

  // Determine if we should include time based on field type or prop
  const showTime = includeTime || field.type === 'datetime';

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue || null);
  };

  // Format the value for the input
  const formatValue = (val: string | null): string => {
    if (!val) return '';

    // If we have a datetime and only need date, extract the date part
    if (!showTime && val.includes('T')) {
      return val.split('T')[0];
    }

    // If we need datetime and only have date, append time
    if (showTime && !val.includes('T')) {
      return `${val}T00:00`;
    }

    return val;
  };

  // Format for display (human-readable)
  const formatDisplayValue = (val: string | null): string | null => {
    if (!val) return null;

    try {
      const date = new Date(val);
      if (isNaN(date.getTime())) return null;

      if (showTime) {
        return date.toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
      }

      return date.toLocaleDateString(undefined, {
        dateStyle: 'medium',
      });
    } catch {
      return null;
    }
  };

  const displayValue = formatDisplayValue(value);

  return (
    <FieldWrapper field={field} error={error} className={className} id={id}>
      <div className="field-date-container">
        <input
          type={showTime ? 'datetime-local' : 'date'}
          id={id}
          name={field.name}
          value={formatValue(value)}
          onChange={handleChange}
          disabled={disabled}
          readOnly={readOnly}
          required={field.required}
          placeholder={placeholder}
          className={`field-input field-input--date ${error ? 'field-input--error' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : field.description ? `${id}-description` : undefined}
        />
        {value && displayValue && (
          <span className="field-date-preview">
            {displayValue}
          </span>
        )}
        {value && !readOnly && !disabled && (
          <button
            type="button"
            className="field-date-clear"
            onClick={() => onChange(null)}
            aria-label="Clear date"
          >
            &times;
          </button>
        )}
      </div>
    </FieldWrapper>
  );
}
