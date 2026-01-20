import { useId, ChangeEvent, useRef, useEffect } from 'react';
import { FieldWrapper } from './FieldWrapper';
import type { TextAreaFieldProps } from './types';

/**
 * TextAreaField renders a multi-line text input.
 *
 * Supports:
 * - Text validation (minLength, maxLength)
 * - Configurable row count
 * - Auto-resize based on content
 */
export function TextAreaField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id: providedId,
  placeholder,
  rows = 4,
  autoResize = false,
}: TextAreaFieldProps) {
  const generatedId = useId();
  const id = providedId ?? `field-${field.name}-${generatedId}`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // Auto-resize logic
  useEffect(() => {
    if (autoResize && textareaRef.current) {
      const textarea = textareaRef.current;
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set the height to the scroll height
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value, autoResize]);

  // Extract options for validation attributes
  const { minLength, maxLength } = field.options ?? {};

  return (
    <FieldWrapper field={field} error={error} className={className} id={id}>
      <textarea
        ref={textareaRef}
        id={id}
        name={field.name}
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled}
        readOnly={readOnly}
        required={field.required}
        minLength={minLength}
        maxLength={maxLength}
        placeholder={placeholder}
        rows={rows}
        className={`field-textarea ${error ? 'field-textarea--error' : ''} ${autoResize ? 'field-textarea--auto-resize' : ''}`}
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
