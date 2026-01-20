import type { FieldRendererProps } from './types';
import { TextField } from './TextField';
import { TextAreaField } from './TextAreaField';
import { NumberField } from './NumberField';
import { BooleanField } from './BooleanField';
import { DateField } from './DateField';
import { RichTextField } from './RichTextField';

/**
 * FieldRenderer is the main entry point for rendering any field type.
 *
 * It maps field types to their respective components and passes
 * the appropriate props. This allows forms to render fields
 * dynamically based on content type definitions.
 *
 * Usage:
 * ```tsx
 * <FieldRenderer
 *   field={fieldDefinition}
 *   value={data[fieldDefinition.name]}
 *   onChange={(value) => setData({ ...data, [fieldDefinition.name]: value })}
 *   error={errors[fieldDefinition.name]}
 * />
 * ```
 */
export function FieldRenderer({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
}: FieldRendererProps) {
  // Common props shared by all field components
  const commonProps = {
    field,
    error,
    disabled,
    readOnly,
    className,
  };

  switch (field.type) {
    case 'text':
      return (
        <TextField
          {...commonProps}
          value={(value as string) ?? ''}
          onChange={onChange as (value: string) => void}
        />
      );

    case 'richText':
      return (
        <RichTextField
          {...commonProps}
          value={(value as string) ?? ''}
          onChange={onChange as (value: string) => void}
        />
      );

    case 'number':
      return (
        <NumberField
          {...commonProps}
          value={(value as number | null) ?? null}
          onChange={onChange as (value: number | null) => void}
        />
      );

    case 'boolean':
      return (
        <BooleanField
          {...commonProps}
          value={(value as boolean) ?? false}
          onChange={onChange as (value: boolean) => void}
        />
      );

    case 'date':
      return (
        <DateField
          {...commonProps}
          value={(value as string | null) ?? null}
          onChange={onChange as (value: string | null) => void}
          includeTime={false}
        />
      );

    case 'datetime':
      return (
        <DateField
          {...commonProps}
          value={(value as string | null) ?? null}
          onChange={onChange as (value: string | null) => void}
          includeTime={true}
        />
      );

    // For field types not yet implemented, render a placeholder
    case 'reference':
    case 'media':
    case 'json':
    case 'select':
    case 'multiSelect':
      return (
        <div className={`field-wrapper field-wrapper--unsupported ${className}`}>
          <label className="field-label">
            {field.label}
            {field.required && <span className="field-required">*</span>}
          </label>
          <div className="field-unsupported">
            <span className="field-unsupported-text">
              Field type "{field.type}" is not yet implemented.
            </span>
          </div>
          {field.description && (
            <p className="field-description">{field.description}</p>
          )}
        </div>
      );

    default:
      // TypeScript exhaustiveness check
      const _exhaustiveCheck: never = field.type;
      return (
        <div className="field-wrapper field-wrapper--error">
          <p className="field-error">Unknown field type: {_exhaustiveCheck}</p>
        </div>
      );
  }
}
