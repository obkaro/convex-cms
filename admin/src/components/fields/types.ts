/**
 * Type definitions for field renderer components.
 *
 * These types define the props interface for all field renderers,
 * ensuring consistent behavior across different field types.
 */

/**
 * Built-in field types supported by the CMS.
 */
export type BuiltInFieldType =
  | 'text'
  | 'richText'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'reference'
  | 'media'
  | 'json'
  | 'select'
  | 'multiSelect'
  | 'tags'
  | 'category';

/**
 * Field types supported by the CMS.
 * Includes built-in types and allows custom types via string.
 */
export type FieldType = BuiltInFieldType | (string & {});

/**
 * Select option for select/multiSelect fields.
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Field-specific options that control validation and behavior.
 * These are passed from the content type field definition.
 */
export interface FieldOptions {
  // Text fields
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  // Number fields
  min?: number;
  max?: number;
  step?: number;
  /** Number of decimal places. 0 for integer. */
  precision?: number;

  // Reference fields
  allowedContentTypes?: string[];
  multiple?: boolean;
  minItems?: number;

  // Media fields
  allowedMimeTypes?: string[];
  maxFileSize?: number;

  // Select fields
  options?: SelectOption[];

  // Rich text fields
  allowedBlocks?: string[];
  allowedMarks?: string[];

  // Tag fields
  taxonomyId?: string;
  allowCreate?: boolean;
  maxTags?: number;
  minTags?: number;

  // Category fields
  allowMultiple?: boolean;
}

/**
 * Field definition as stored in content type.
 */
export interface FieldDefinition {
  /** Unique field identifier within the content type */
  name: string;
  /** Human-readable label */
  label: string;
  /** Field type */
  type: FieldType;
  /** Whether the field is required */
  required: boolean;
  /** Whether the field is searchable */
  searchable?: boolean;
  /** Whether the field supports localization */
  localized?: boolean;
  /** Help text displayed below the field */
  description?: string;
  /** Default value for new entries */
  defaultValue?: unknown;
  /** Type-specific options */
  options?: FieldOptions;
}

/**
 * Validation error for a field.
 */
export interface FieldError {
  /** Error message to display */
  message: string;
  /** Optional error code for programmatic handling */
  code?: string;
}

/**
 * Base props shared by all field renderer components.
 */
export interface BaseFieldProps<T = unknown> {
  /** The field definition from the content type */
  field: FieldDefinition;
  /** Current value of the field */
  value: T;
  /** Callback when the value changes */
  onChange: (value: T) => void;
  /** Validation error to display */
  error?: FieldError;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is in read-only mode */
  readOnly?: boolean;
  /** Optional CSS class name */
  className?: string;
  /** Unique ID for the field (for label association) */
  id?: string;
}

/**
 * Props for text input field.
 */
export interface TextFieldProps extends BaseFieldProps<string> {
  /** Placeholder text */
  placeholder?: string;
  /** Input type (text, email, url, etc.) */
  inputType?: 'text' | 'email' | 'url' | 'tel';
}

/**
 * Props for textarea field.
 */
export interface TextAreaFieldProps extends BaseFieldProps<string> {
  /** Placeholder text */
  placeholder?: string;
  /** Number of visible rows */
  rows?: number;
  /** Whether to auto-resize based on content */
  autoResize?: boolean;
}

/**
 * Props for number input field.
 */
export interface NumberFieldProps extends BaseFieldProps<number | null> {
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Props for boolean toggle field.
 */
export interface BooleanFieldProps extends BaseFieldProps<boolean> {
  /** Label for the true state */
  trueLabel?: string;
  /** Label for the false state */
  falseLabel?: string;
}

/**
 * Props for date picker field.
 */
export interface DateFieldProps extends BaseFieldProps<string | null> {
  /** Whether to include time picker (datetime) */
  includeTime?: boolean;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Props for rich text (markdown) field.
 */
export interface RichTextFieldProps extends BaseFieldProps<string> {
  /** Placeholder text */
  placeholder?: string;
  /** Minimum height for the editor */
  minHeight?: number;
}

/**
 * Props for the unified FieldRenderer component.
 */
export interface FieldRendererProps {
  /** The field definition from the content type */
  field: FieldDefinition;
  /** Current value of the field */
  value: unknown;
  /** Callback when the value changes */
  onChange: (value: unknown) => void;
  /** Validation error to display */
  error?: FieldError;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is in read-only mode */
  readOnly?: boolean;
  /** Optional CSS class name */
  className?: string;
}
