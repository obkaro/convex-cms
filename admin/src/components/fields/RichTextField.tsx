import { useId, ChangeEvent, useState, useCallback } from 'react';
import { FieldWrapper } from './FieldWrapper';
import type { RichTextFieldProps } from './types';

/**
 * Toolbar button configuration for markdown formatting.
 */
interface ToolbarAction {
  label: string;
  icon: string;
  prefix: string;
  suffix: string;
  block?: boolean;
}

const toolbarActions: ToolbarAction[] = [
  { label: 'Bold', icon: 'B', prefix: '**', suffix: '**' },
  { label: 'Italic', icon: 'I', prefix: '_', suffix: '_' },
  { label: 'Heading', icon: 'H', prefix: '## ', suffix: '', block: true },
  { label: 'Link', icon: '🔗', prefix: '[', suffix: '](url)' },
  { label: 'List', icon: '•', prefix: '- ', suffix: '', block: true },
  { label: 'Quote', icon: '❝', prefix: '> ', suffix: '', block: true },
  { label: 'Code', icon: '`', prefix: '`', suffix: '`' },
];

/**
 * RichTextField renders a markdown editor with a formatting toolbar.
 *
 * Features:
 * - Markdown formatting toolbar (bold, italic, headings, links, lists)
 * - Live character count
 * - Auto-resize option
 * - Preview toggle (optional enhancement)
 */
export function RichTextField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id: providedId,
  placeholder = 'Write your content here... (Markdown supported)',
  minHeight = 200,
}: RichTextFieldProps) {
  const generatedId = useId();
  const id = providedId ?? `field-${field.name}-${generatedId}`;
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  /**
   * Apply markdown formatting around selection or at cursor.
   */
  const applyFormatting = useCallback((action: ToolbarAction) => {
    if (!textareaRef || disabled || readOnly) return;

    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const selectedText = value.slice(start, end);
    const currentValue = value;

    let newValue: string;
    let newCursorPos: number;

    if (action.block) {
      // For block-level formatting, insert at the start of the line
      const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;
      const beforeLine = currentValue.slice(0, lineStart);
      const afterLine = currentValue.slice(lineStart);

      // Check if we're toggling off (line already starts with prefix)
      if (afterLine.startsWith(action.prefix)) {
        newValue = beforeLine + afterLine.slice(action.prefix.length);
        newCursorPos = start - action.prefix.length;
      } else {
        newValue = beforeLine + action.prefix + afterLine;
        newCursorPos = start + action.prefix.length;
      }
    } else {
      // For inline formatting, wrap the selection
      if (selectedText) {
        newValue =
          currentValue.slice(0, start) +
          action.prefix +
          selectedText +
          action.suffix +
          currentValue.slice(end);
        newCursorPos = end + action.prefix.length + action.suffix.length;
      } else {
        // No selection - insert placeholder
        const placeholder = action.label.toLowerCase();
        newValue =
          currentValue.slice(0, start) +
          action.prefix +
          placeholder +
          action.suffix +
          currentValue.slice(end);
        // Position cursor to select the placeholder
        newCursorPos = start + action.prefix.length;
      }
    }

    onChange(newValue);

    // Restore focus and cursor position after React re-render
    requestAnimationFrame(() => {
      if (textareaRef) {
        textareaRef.focus();
        textareaRef.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  }, [textareaRef, value, onChange, disabled, readOnly]);

  // Extract options
  const { maxLength } = field.options ?? {};

  return (
    <FieldWrapper field={field} error={error} className={className} id={id}>
      <div className="field-richtext-container">
        {/* Markdown Toolbar */}
        {!readOnly && !disabled && (
          <div className="field-richtext-toolbar" role="toolbar" aria-label="Formatting options">
            {toolbarActions.map((action) => (
              <button
                key={action.label}
                type="button"
                className="field-richtext-toolbar-btn"
                onClick={() => applyFormatting(action)}
                title={action.label}
                aria-label={action.label}
              >
                {action.icon}
              </button>
            ))}
          </div>
        )}

        {/* Editor */}
        <textarea
          ref={setTextareaRef}
          id={id}
          name={field.name}
          value={value ?? ''}
          onChange={handleChange}
          disabled={disabled}
          readOnly={readOnly}
          required={field.required}
          maxLength={maxLength}
          placeholder={placeholder}
          className={`field-textarea field-textarea--richtext ${error ? 'field-textarea--error' : ''}`}
          style={{ minHeight: `${minHeight}px` }}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : field.description ? `${id}-description` : undefined}
        />

        {/* Footer with character count */}
        <div className="field-richtext-footer">
          <span className="field-richtext-hint">
            Markdown supported
          </span>
          {maxLength && (
            <span className="field-char-count">
              {(value ?? '').length} / {maxLength}
            </span>
          )}
        </div>
      </div>
    </FieldWrapper>
  );
}
