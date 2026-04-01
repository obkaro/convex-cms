import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { CmsButton } from './CmsButton'
import { cn } from '../../lib/cn'

export interface CmsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
} as const

export function CmsDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: CmsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[85vh] flex-col overflow-hidden',
          sizeClasses[size],
          className
        )}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div
          className="min-h-0 flex-1 overflow-y-auto py-4 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {children}
        </div>
        {footer && <DialogFooter className="shrink-0 border-t pt-4">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}

export interface CmsConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
  variant?: 'default' | 'danger' | 'primary' | 'warning'
  isLoading?: boolean
  loading?: boolean
  error?: string | null
}

export function CmsConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  loading,
  isLoading,
  error,
}: CmsConfirmDialogProps) {
  const isLoadingState = loading ?? isLoading ?? false

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const handleConfirm = () => {
    onConfirm()
  }

  const getButtonVariant = () => {
    if (variant === 'danger') return 'danger'
    if (variant === 'warning') return 'warning'
    return 'primary'
  }

  return (
    <CmsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="sm"
      footer={
        <>
          <CmsButton variant="outline" onClick={handleCancel} disabled={isLoadingState}>
            {cancelLabel}
          </CmsButton>
          <CmsButton
            variant={getButtonVariant()}
            onClick={handleConfirm}
            loading={isLoadingState}
          >
            {confirmLabel}
          </CmsButton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    </CmsDialog>
  )
}
