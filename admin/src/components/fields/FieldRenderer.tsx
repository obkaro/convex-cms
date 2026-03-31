import type { FieldRendererProps } from "./types";
import { TextField } from "./TextField";
import { TextAreaField as _TextAreaField } from "./TextAreaField";
import { NumberField } from "./NumberField";
import { BooleanField } from "./BooleanField";
import { DateField } from "./DateField";
import { RichTextField } from "./RichTextField";
import { SelectField } from "./SelectField";
import { MultiSelectField } from "./MultiSelectField";
import { JsonField } from "./JsonField";
import { MediaField } from "./MediaField";
import { ReferenceField } from "./ReferenceField";
import { TagField } from "./TagField";
import { CategoryField } from "./CategoryField";
import { MoneyField } from "./MoneyField";
import { DefaultFieldRenderer } from "./DefaultFieldRenderer";
import { getFieldRenderer } from "./registry";

/**
 * FieldRenderer is the main entry point for rendering any field type.
 *
 * It maps field types to their respective components and passes
 * the appropriate props. This allows forms to render fields
 * dynamically based on content type definitions.
 *
 * For custom field types, it uses the field renderer registry.
 * If no custom renderer is registered, it falls back to DefaultFieldRenderer.
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
  className = "",
}: FieldRendererProps) {
  const commonProps = {
    field,
    error,
    disabled,
    readOnly,
    className,
  };

  switch (field.type) {
    case "text":
      return (
        <TextField
          {...commonProps}
          value={(value as string) ?? ""}
          onChange={onChange as (value: string) => void}
        />
      );

    case "richText":
      return (
        <RichTextField
          {...commonProps}
          value={(value as string) ?? ""}
          onChange={onChange as (value: string) => void}
        />
      );

    case "number":
      return (
        <NumberField
          {...commonProps}
          value={(value as number | null) ?? null}
          onChange={onChange as (value: number | null) => void}
        />
      );

    case "boolean":
      return (
        <BooleanField
          {...commonProps}
          value={(value as boolean) ?? false}
          onChange={onChange as (value: boolean) => void}
        />
      );

    case "date":
      return (
        <DateField
          {...commonProps}
          value={(value as string | null) ?? null}
          onChange={onChange as (value: string | null) => void}
          includeTime={false}
        />
      );

    case "datetime":
      return (
        <DateField
          {...commonProps}
          value={(value as string | null) ?? null}
          onChange={onChange as (value: string | null) => void}
          includeTime={true}
        />
      );

    case "select":
      return (
        <SelectField
          {...commonProps}
          value={(value as string) ?? ""}
          onChange={onChange as (value: string) => void}
        />
      );

    case "multiSelect":
      return (
        <MultiSelectField
          {...commonProps}
          value={(value as string[]) ?? []}
          onChange={onChange as (value: string[]) => void}
        />
      );

    case "json":
      return <JsonField {...commonProps} value={value ?? null} onChange={onChange} />;

    case "media":
      return (
        <MediaField
          {...commonProps}
          value={(value as string | null) ?? null}
          onChange={onChange as (value: string | null) => void}
        />
      );

    case "reference":
      return (
        <ReferenceField
          {...commonProps}
          value={(value as string | string[] | null) ?? null}
          onChange={onChange as (value: string | string[] | null) => void}
        />
      );

    case "tags":
      return (
        <TagField
          {...commonProps}
          value={(value as string[]) ?? []}
          onChange={onChange as (value: string[]) => void}
        />
      );

    case "category":
      return (
        <CategoryField
          {...commonProps}
          value={(value as string | string[] | null) ?? null}
          onChange={onChange as (value: string | string[] | null) => void}
        />
      );

    case "money":
      return (
        <MoneyField
          {...commonProps}
          value={
            (value as { amount: number; currency: string } | null) ?? null
          }
          onChange={
            onChange as (
              value: { amount: number; currency: string } | null
            ) => void
          }
        />
      );

    default: {
      // Check if a custom renderer is registered for this field type
      const CustomRenderer = getFieldRenderer(field.type);
      if (CustomRenderer) {
        return <CustomRenderer {...commonProps} value={value} onChange={onChange} />;
      }

      // Fall back to the default JSON renderer for unknown types
      return <DefaultFieldRenderer {...commonProps} value={value} onChange={onChange} />;
    }
  }
}
