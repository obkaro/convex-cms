import { useId, ChangeEvent } from 'react';
import { FieldWrapper } from './FieldWrapper';
import type { TextFieldProps } from './types';

/**
 * TextField renders a single-line text input.
 *
 * Supports:
 * - Text validation (minLength, maxLength, pattern)
 * - Input types (text, email, url, tel)
 * - Required field validation
 */
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
  const generatedId = useId();
  const id = providedId ?? `field-${field.name}-${generatedId}`;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // Extract options for validation attributes
  const { minLength, maxLength, pattern } = field.options ?? {};

  return (
    <FieldWrapper field={field} error={error} className={className} id={id}>
      <input
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
        className={`field-input ${error ? 'field-input--error' : ''}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : field.description ? `${id}-description` : undefined}
      />
      {maxLength && (
        <span className="field-char-count">
          {(value ?? '').length} / {maxLength}
        </span>
      )}
    </FieldWrapper>
  );
}
