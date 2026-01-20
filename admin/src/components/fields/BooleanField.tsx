import { useId, ChangeEvent } from 'react';
import type { BooleanFieldProps, FieldError } from './types';

/**
 * BooleanField renders a toggle switch for true/false values.
 *
 * Uses a custom toggle design rather than a plain checkbox
 * for better visual feedback and modern UX.
 */
export function BooleanField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id: providedId,
  trueLabel = 'Yes',
  falseLabel = 'No',
}: BooleanFieldProps) {
  const generatedId = useId();
  const id = providedId ?? `field-${field.name}-${generatedId}`;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!readOnly) {
      onChange(e.target.checked);
    }
  };

  const hasError = !!error;

  return (
    <div className={`field-wrapper ${hasError ? 'field-wrapper--error' : ''} ${className}`}>
      <div className="field-toggle-container">
        <label htmlFor={id} className="field-toggle-label">
          <span className="field-label-text">
            {field.label}
            {field.required && <span className="field-required">*</span>}
          </span>

          <div className="field-toggle-wrapper">
            <input
              type="checkbox"
              id={id}
              name={field.name}
              checked={value ?? false}
              onChange={handleChange}
              disabled={disabled || readOnly}
              className="field-toggle-input"
              aria-invalid={hasError}
              aria-describedby={error ? `${id}-error` : field.description ? `${id}-description` : undefined}
            />
            <span className={`field-toggle ${value ? 'field-toggle--active' : ''}`}>
              <span className="field-toggle-knob" />
            </span>
            <span className="field-toggle-state">
              {value ? trueLabel : falseLabel}
            </span>
          </div>
        </label>
      </div>

      {field.description && !hasError && (
        <p id={`${id}-description`} className="field-description">
          {field.description}
        </p>
      )}

      {hasError && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
