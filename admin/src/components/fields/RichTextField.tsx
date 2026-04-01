import { useId, type ChangeEvent, useState, useCallback } from 'react'
import { FieldWrapper } from './FieldWrapper'
import type { RichTextFieldProps } from './types'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import { cn } from '../../lib/cn'
import { Bold, Italic, Heading2, Link, List, Quote, Code } from 'lucide-react'

interface ToolbarAction {
  label: string
  icon: React.ReactNode
  prefix: string
  suffix: string
  block?: boolean
}

const toolbarActions: ToolbarAction[] = [
  { label: 'Bold', icon: <Bold className="size-4" />, prefix: '**', suffix: '**' },
  { label: 'Italic', icon: <Italic className="size-4" />, prefix: '_', suffix: '_' },
  { label: 'Heading', icon: <Heading2 className="size-4" />, prefix: '## ', suffix: '', block: true },
  { label: 'Link', icon: <Link className="size-4" />, prefix: '[', suffix: '](url)' },
  { label: 'List', icon: <List className="size-4" />, prefix: '- ', suffix: '', block: true },
  { label: 'Quote', icon: <Quote className="size-4" />, prefix: '> ', suffix: '', block: true },
  { label: 'Code', icon: <Code className="size-4" />, prefix: '`', suffix: '`' },
]

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
  const generatedId = useId()
  const id = providedId ?? `field-${field.name}-${generatedId}`
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null)

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  const applyFormatting = useCallback(
    (action: ToolbarAction) => {
      if (!textareaRef || disabled || readOnly) return

      const start = textareaRef.selectionStart
      const end = textareaRef.selectionEnd
      const selectedText = value.slice(start, end)
      const currentValue = value

      let newValue: string
      let newCursorPos: number

      if (action.block) {
        const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1
        const beforeLine = currentValue.slice(0, lineStart)
        const afterLine = currentValue.slice(lineStart)

        if (afterLine.startsWith(action.prefix)) {
          newValue = beforeLine + afterLine.slice(action.prefix.length)
          newCursorPos = start - action.prefix.length
        } else {
          newValue = beforeLine + action.prefix + afterLine
          newCursorPos = start + action.prefix.length
        }
      } else {
        if (selectedText) {
          newValue =
            currentValue.slice(0, start) +
            action.prefix +
            selectedText +
            action.suffix +
            currentValue.slice(end)
          newCursorPos = end + action.prefix.length + action.suffix.length
        } else {
          const placeholderText = action.label.toLowerCase()
          newValue =
            currentValue.slice(0, start) +
            action.prefix +
            placeholderText +
            action.suffix +
            currentValue.slice(end)
          newCursorPos = start + action.prefix.length
        }
      }

      onChange(newValue)

      requestAnimationFrame(() => {
        if (textareaRef) {
          textareaRef.focus()
          textareaRef.setSelectionRange(newCursorPos, newCursorPos)
        }
      })
    },
    [textareaRef, value, onChange, disabled, readOnly]
  )

  const { maxLength } = field.options ?? {}

  return (
    <FieldWrapper field={field} error={error} className={className} id={id}>
      <div
        className={cn(
          'overflow-hidden rounded-md border border-input',
          error && 'border-destructive'
        )}
      >
        {!readOnly && !disabled && (
          <>
            <div
              className="flex flex-wrap gap-1 bg-muted/50 p-1.5"
              role="toolbar"
              aria-label="Formatting options"
            >
              {toolbarActions.map((action) => (
                <Button
                  key={action.label}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => applyFormatting(action)}
                  title={action.label}
                  aria-label={action.label}
                >
                  {action.icon}
                </Button>
              ))}
            </div>
            <Separator />
          </>
        )}

        <Textarea
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
          className="resize-none rounded-none border-0 focus-visible:ring-0"
          style={{ minHeight: `${minHeight}px` }}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${id}-error` : field.description ? `${id}-description` : undefined
          }
        />

        <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
          <span>Markdown supported</span>
          {maxLength && (
            <span>
              {(value ?? '').length} / {maxLength}
            </span>
          )}
        </div>
      </div>
    </FieldWrapper>
  )
}
