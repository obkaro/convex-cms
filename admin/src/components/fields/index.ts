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

// Default renderer for custom field types
export { DefaultFieldRenderer } from './DefaultFieldRenderer';

// Field renderer registry for custom field types
export {
  registerFieldRenderer,
  registerFieldRenderers,
  getFieldRenderer,
  hasFieldRenderer,
  isBuiltInRenderer,
  getAllRegisteredFieldTypes,
  getCustomRendererTypes,
  type FieldRendererComponent,
} from './registry';

// Types
export type {
  FieldType,
  BuiltInFieldType,
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
