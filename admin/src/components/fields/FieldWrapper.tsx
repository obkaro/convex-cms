import { ReactNode } from 'react';
import type { FieldDefinition, FieldError } from './types';

interface FieldWrapperProps {
  /** The field definition */
  field: FieldDefinition;
  /** The form control element(s) to wrap */
  children: ReactNode;
  /** Validation error to display */
  error?: FieldError;
  /** Optional CSS class name */
  className?: string;
  /** Unique ID for the field */
  id: string;
}

/**
 * FieldWrapper provides consistent layout and styling for all field types.
 *
 * It renders:
 * - Label with required indicator
 * - The field input (children)
 * - Description/help text
 * - Validation error message
 */
export function FieldWrapper({
  field,
  children,
  error,
  className = '',
  id,
}: FieldWrapperProps) {
  const hasError = !!error;

  return (
    <div className={`field-wrapper ${hasError ? 'field-wrapper--error' : ''} ${className}`}>
      <label htmlFor={id} className="field-label">
        {field.label}
        {field.required && <span className="field-required">*</span>}
      </label>

      <div className="field-control">{children}</div>

      {field.description && !hasError && (
        <p className="field-description">{field.description}</p>
      )}

      {hasError && (
        <p className="field-error" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
