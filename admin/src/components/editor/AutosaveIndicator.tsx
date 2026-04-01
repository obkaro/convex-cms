import { Spinner } from '../ui/spinner'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AutosaveIndicatorProps {
  status: AutosaveStatus
  error?: string | null
  retryCount?: number
  maxRetries?: number
  isDirty?: boolean
  onRetry?: () => void
}

export function AutosaveIndicator({
  status,
  error,
  retryCount = 0,
  maxRetries = 3,
  isDirty = false,
  onRetry,
}: AutosaveIndicatorProps) {
  if (status === 'idle' && !isDirty) return null

  return (
    <div className="flex items-center gap-2 text-sm">
      {status === 'saving' && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Spinner />
          {retryCount > 0 ? `Retrying (${retryCount}/${maxRetries})...` : 'Saving...'}
        </span>
      )}
      {status === 'saved' && (
        <span className="flex items-center gap-1.5 text-success">
          <CheckCircle />
          Saved
        </span>
      )}
      {status === 'error' && (
        <span className="flex items-center gap-1.5 text-destructive">
          <AlertCircle />
          {error ?? 'Save failed'}
          {retryCount === 0 && onRetry && (
            <Button type="button" variant="ghost" size="sm" onClick={onRetry} className="h-auto px-1.5 py-0.5 text-xs">
              Retry
            </Button>
          )}
        </span>
      )}
      {status === 'idle' && isDirty && (
        <span className="text-sm text-warning">Unsaved changes</span>
      )}
    </div>
  )
}
