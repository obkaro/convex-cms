/**
 * Field renderer components for the CMS admin.
 *
 * These components render form inputs for each content type field.
 * Use FieldRenderer for automatic field type detection, or import
 * individual components for more control.
 */

// Main renderer (recommended for dynamic forms)
export { FieldRenderer } from './FieldRenderer';

// Individual field components
export { TextField } from './TextField';
export { TextAreaField } from './TextAreaField';
export { NumberField } from './NumberField';
export { BooleanField } from './BooleanField';
export { DateField } from './DateField';
export { RichTextField } from './RichTextField';

// Wrapper component
export { FieldWrapper } from './FieldWrapper';

// Types
export type {
  FieldType,
  FieldOptions,
  FieldDefinition,
  FieldError,
  SelectOption,
  BaseFieldProps,
  TextFieldProps,
  TextAreaFieldProps,
  NumberFieldProps,
  BooleanFieldProps,
  DateFieldProps,
  RichTextFieldProps,
  FieldRendererProps,
} from './types';
