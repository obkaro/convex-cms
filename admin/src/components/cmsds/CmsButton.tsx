import * as React from 'react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/cn'
import { motion } from '~/lib/motion'

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

const LoadingSpinner = () => (
  <svg
    className="size-4 animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

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
      {loading && <LoadingSpinner />}
      {children}
    </Button>
  )
}
