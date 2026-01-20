import { FieldWrapper } from './FieldWrapper';
import type { BaseFieldProps } from './types';

/**
 * Props for the SelectField component.
 */
export interface SelectFieldProps extends BaseFieldProps<string> {
  /** Placeholder text for the select */
  placeholder?: string;
}

/**
 * SelectField renders a dropdown select for choosing a single option.
 *
 * The available options are defined in the field's options.options array.
 */
export function SelectField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id,
  placeholder = 'Select an option...',
}: SelectFieldProps) {
  const fieldId = id || `field-${field.name}`;
  const options = field.options?.options ?? [];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <FieldWrapper field={field} error={error} className={className} id={fieldId}>
      <select
        id={fieldId}
        name={field.name}
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled || readOnly}
        required={field.required}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`field-select ${error ? 'field-select--error' : ''}`}
      >
        <option value="" disabled={field.required}>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
