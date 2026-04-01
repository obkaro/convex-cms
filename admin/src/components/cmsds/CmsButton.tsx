import * as React from 'react'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import { cn } from '../../lib/cn'
import { motion } from '../../lib/motion'

type ButtonProps = React.ComponentProps<typeof Button>

export interface CmsButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'danger'
    | 'ghost'
    | 'outline'
    | 'link'
    | 'success'
    | 'warning'
  loading?: boolean
}

const variantMap = {
  primary: 'default',
  secondary: 'secondary',
  danger: 'destructive',
  ghost: 'ghost',
  outline: 'outline',
  link: 'link',
  success: 'default',
  warning: 'default',
} as const

const customVariantClasses = {
  success:
    'bg-success text-success-foreground hover:bg-success/90 focus-visible:ring-success',
  warning:
    'bg-warning text-warning-foreground hover:bg-warning/90 focus-visible:ring-warning',
} as Record<string, string>

export function CmsButton({
  variant = 'primary',
  loading,
  disabled,
  children,
  className,
  asChild,
  ...props
}: CmsButtonProps) {
  const mappedVariant = variantMap[variant]
  const customClass = customVariantClasses[variant]

  // When asChild is true, Slot expects exactly one child
  // Don't render loading spinner as sibling - just pass children through
  if (asChild) {
    return (
      <Button
        variant={mappedVariant}
        disabled={disabled || loading}
        className={cn(motion.fast, customClass, className)}
        asChild
        {...props}
      >
        {children}
      </Button>
    )
  }

  return (
    <Button
      variant={mappedVariant}
      disabled={disabled || loading}
      className={cn(motion.fast, customClass, className)}
      {...props}
    >
      {loading && <Spinner data-icon="inline-start" />}
      {children}
    </Button>
  )
}
