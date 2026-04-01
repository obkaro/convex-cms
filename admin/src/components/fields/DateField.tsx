import { useState, useId, type ChangeEvent } from 'react'
import { CalendarIcon, X } from 'lucide-react'
import { FieldWrapper } from './FieldWrapper'
import type { DateFieldProps } from './types'
import { Button } from '../ui/button'
import { Calendar } from '../ui/calendar'
import { Input } from '../ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover'
import { cn } from '../../lib/cn'

function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function DateField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className = '',
  id: providedId,
  includeTime = false,
}: DateFieldProps) {
  const generatedId = useId()
  const id = providedId ?? `field-${field.name}-${generatedId}`
  const [open, setOpen] = useState(false)
  const showTime = includeTime || field.type === 'datetime'

  const selectedDate = value ? new Date(value) : undefined
  const isValidDate = selectedDate && !isNaN(selectedDate.getTime())

  const timeValue =
    value && showTime && value.includes('T')
      ? value.split('T')[1]?.substring(0, 5) || ''
      : ''

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange(null)
      setOpen(false)
      return
    }

    if (showTime && timeValue) {
      const [hours, minutes] = timeValue.split(':').map(Number)
      date.setHours(hours || 0, minutes || 0)
    }

    const formatted = showTime ? formatDateTimeLocal(date) : formatDateOnly(date)
    onChange(formatted)

    if (!showTime) {
      setOpen(false)
    }
  }

  const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value
    if (!time) return

    const [hours, minutes] = time.split(':').map(Number)

    if (isValidDate && selectedDate) {
      const newDate = new Date(selectedDate)
      newDate.setHours(hours || 0, minutes || 0)
      onChange(formatDateTimeLocal(newDate))
    } else {
      const today = new Date()
      today.setHours(hours || 0, minutes || 0, 0, 0)
      onChange(formatDateTimeLocal(today))
    }
  }

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <FieldWrapper field={field} error={error} className={className} id={id}>
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled || readOnly}
              className={cn(
                'justify-between font-normal',
                showTime ? 'w-44' : 'flex-1',
                !value && 'text-muted-foreground',
                error && 'border-destructive focus-visible:ring-destructive'
              )}
              aria-invalid={!!error}
              aria-describedby={
                error
                  ? `${id}-error`
                  : field.description
                    ? `${id}-description`
                    : undefined
              }
            >
              <span>
                {isValidDate && selectedDate
                  ? formatDisplayDate(selectedDate)
                  : 'Select date'}
              </span>
              <CalendarIcon className="size-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              captionLayout="dropdown"
              disabled={disabled || readOnly}
            />
          </PopoverContent>
        </Popover>

        {showTime && (
          <Input
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            disabled={disabled || readOnly}
            className={cn(
              'w-28',
              error && 'border-destructive focus-visible:ring-destructive'
            )}
            aria-label="Time"
          />
        )}

        {value && !readOnly && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            onClick={() => onChange(null)}
            aria-label="Clear date"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </FieldWrapper>
  )
}
