import { FieldWrapper } from './FieldWrapper';
import type { BaseFieldProps } from './types';

/**
 * Props for the MultiSelectField component.
 */
export interface MultiSelectFieldProps extends BaseFieldProps<string[]> {
  /** Placeholder text when no options are selected */
  placeholder?: string;
}

/**
 * MultiSelectField renders a checkbox group for selecting multiple options.
 *
 * The available options are defined in the field's options.options array.
 */
export function MultiSelectField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id,
}: MultiSelectFieldProps) {
  const fieldId = id || `field-${field.name}`;
  const options = field.options?.options ?? [];
  const selectedValues = value ?? [];

  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, optionValue]);
    } else {
      onChange(selectedValues.filter((v) => v !== optionValue));
    }
  };

  const handleSelectAll = () => {
    const allValues = options.map((o) => o.value);
    onChange(allValues);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <FieldWrapper field={field} error={error} className={className} id={fieldId}>
      <div
        className={`field-multiselect ${error ? 'field-multiselect--error' : ''}`}
        role="group"
        aria-labelledby={`${fieldId}-label`}
      >
        {options.length > 3 && (
          <div className="field-multiselect-actions">
            <button
              type="button"
              className="field-multiselect-action"
              onClick={handleSelectAll}
              disabled={disabled || readOnly}
            >
              Select all
            </button>
            <button
              type="button"
              className="field-multiselect-action"
              onClick={handleClearAll}
              disabled={disabled || readOnly || selectedValues.length === 0}
            >
              Clear
            </button>
          </div>
        )}

        <div className="field-multiselect-options">
          {options.map((option) => {
            const optionId = `${fieldId}-${option.value}`;
            const isChecked = selectedValues.includes(option.value);

            return (
              <label
                key={option.value}
                className={`field-multiselect-option ${isChecked ? 'field-multiselect-option--selected' : ''}`}
                htmlFor={optionId}
              >
                <input
                  type="checkbox"
                  id={optionId}
                  name={`${field.name}[]`}
                  value={option.value}
                  checked={isChecked}
                  onChange={(e) => handleChange(option.value, e.target.checked)}
                  disabled={disabled || readOnly}
                  className="field-multiselect-checkbox"
                />
                <span className="field-multiselect-label">{option.label}</span>
              </label>
            );
          })}
        </div>

        {selectedValues.length > 0 && (
          <div className="field-multiselect-count">
            {selectedValues.length} of {options.length} selected
          </div>
        )}
      </div>
    </FieldWrapper>
  );
}
