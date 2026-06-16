import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'pending' | 'outline' | 'success' | 'warning' | 'danger'
}

const variantStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary-muted text-primary border border-primary/20',
  pending: 'bg-pending-muted text-pending border border-pending/25',
  outline: 'border border-border text-muted-foreground',
  success: 'bg-success/15 text-success border border-success/20',
  warning: 'bg-warning/15 text-warning border border-warning/20',
  danger: 'bg-danger/15 text-danger border border-danger/20',
}

export function Badge({
  className,
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
