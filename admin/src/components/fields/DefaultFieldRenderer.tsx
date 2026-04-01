/**
 * Default Field Renderer
 *
 * Fallback renderer for custom field types that don't have a specific renderer.
 * Renders as a JSON editor with the field type displayed.
 */

import { useId } from "react";
import { Textarea } from "../ui/textarea";
import { FieldWrapper } from "./FieldWrapper";
import type { BaseFieldProps } from "./types";

export function DefaultFieldRenderer({
  field,
  value,
  onChange,
  error,
  disabled,
  readOnly,
  className,
}: BaseFieldProps<unknown>) {
  const generatedId = useId();
  const id = `field-${generatedId}`;

  const stringValue =
    value === undefined || value === null ? "" : JSON.stringify(value, null, 2);

  const handleChange = (newValue: string) => {
    if (readOnly) return;

    if (newValue.trim() === "") {
      onChange(null);
      return;
    }

    try {
      const parsed = JSON.parse(newValue);
      onChange(parsed);
    } catch {
      // Keep the string value for invalid JSON to allow editing
      onChange(newValue);
    }
  };

  return (
    <FieldWrapper
      field={field}
      error={error}
      id={id}
      className={className}
      customLabel={
        <span>
          {field.label}
          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
            {field.type}
          </span>
        </span>
      }
    >
      <Textarea
        id={id}
        value={stringValue}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        readOnly={readOnly}
        className="font-mono text-sm"
        rows={6}
        placeholder={`Enter ${field.type} value as JSON...`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : field.description ? `${id}-desc` : undefined}
      />
    </FieldWrapper>
  );
}
