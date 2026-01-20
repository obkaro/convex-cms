import { useState, useCallback, useEffect } from 'react';
import { FieldWrapper } from './FieldWrapper';
import type { BaseFieldProps } from './types';

/**
 * Props for the JsonField component.
 */
export interface JsonFieldProps extends BaseFieldProps<unknown> {
  /** Placeholder text for the textarea */
  placeholder?: string;
  /** Number of visible rows */
  rows?: number;
}

/**
 * JsonField renders a textarea for editing JSON data.
 *
 * Features:
 * - Real-time JSON validation
 * - Pretty-print formatting
 * - Syntax error display
 */
export function JsonField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id,
  placeholder = '{\n  \n}',
  rows = 8,
}: JsonFieldProps) {
  const fieldId = id || `field-${field.name}`;

  // Store the raw text representation
  const [textValue, setTextValue] = useState(() => {
    if (value === null || value === undefined) {
      return '';
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '';
    }
  });

  // Syntax error state
  const [syntaxError, setSyntaxError] = useState<string | null>(null);

  // Update text value when external value changes
  useEffect(() => {
    if (value === null || value === undefined) {
      setTextValue('');
      return;
    }
    try {
      const formatted = JSON.stringify(value, null, 2);
      // Only update if the parsed value is different
      // This prevents cursor jumping during editing
      const currentParsed = textValue ? JSON.parse(textValue) : null;
      if (JSON.stringify(currentParsed) !== JSON.stringify(value)) {
        setTextValue(formatted);
      }
    } catch {
      // Keep current text if external value is invalid
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setTextValue(newText);

    // Validate JSON and update value if valid
    if (newText.trim() === '') {
      setSyntaxError(null);
      onChange(null);
      return;
    }

    try {
      const parsed = JSON.parse(newText);
      setSyntaxError(null);
      onChange(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid JSON';
      setSyntaxError(message);
      // Don't update the value on syntax error - keep the last valid value
    }
  }, [onChange]);

  const handleFormat = useCallback(() => {
    if (textValue.trim() === '') return;

    try {
      const parsed = JSON.parse(textValue);
      const formatted = JSON.stringify(parsed, null, 2);
      setTextValue(formatted);
      setSyntaxError(null);
    } catch {
      // Can't format invalid JSON
    }
  }, [textValue]);

  const handleMinify = useCallback(() => {
    if (textValue.trim() === '') return;

    try {
      const parsed = JSON.parse(textValue);
      const minified = JSON.stringify(parsed);
      setTextValue(minified);
      setSyntaxError(null);
    } catch {
      // Can't minify invalid JSON
    }
  }, [textValue]);

  // Combine syntax error with field error
  const displayError = syntaxError
    ? { message: `JSON syntax error: ${syntaxError}`, code: 'SYNTAX_ERROR' }
    : error;

  return (
    <FieldWrapper field={field} error={displayError} className={className} id={fieldId}>
      <div className="field-json-container">
        <div className="field-json-toolbar">
          <button
            type="button"
            className="field-json-toolbar-btn"
            onClick={handleFormat}
            disabled={disabled || readOnly || !!syntaxError}
            title="Format JSON"
          >
            Format
          </button>
          <button
            type="button"
            className="field-json-toolbar-btn"
            onClick={handleMinify}
            disabled={disabled || readOnly || !!syntaxError}
            title="Minify JSON"
          >
            Minify
          </button>
        </div>

        <textarea
          id={fieldId}
          name={field.name}
          value={textValue}
          onChange={handleChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          readOnly={readOnly}
          required={field.required}
          aria-invalid={!!displayError}
          aria-describedby={displayError ? `${fieldId}-error` : undefined}
          className={`field-textarea field-textarea--json ${displayError ? 'field-textarea--error' : ''} ${syntaxError ? 'field-textarea--syntax-error' : ''}`}
          spellCheck={false}
        />

        <div className="field-json-footer">
          <span className="field-json-hint">Enter valid JSON data</span>
          {syntaxError && (
            <span className="field-json-status field-json-status--error">Invalid</span>
          )}
          {!syntaxError && textValue.trim() !== '' && (
            <span className="field-json-status field-json-status--valid">Valid JSON</span>
          )}
        </div>
      </div>
    </FieldWrapper>
  );
}
