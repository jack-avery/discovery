import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'interactive'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm',
  interactive:
    'bg-interactive text-interactive-foreground hover:bg-interactive-hover shadow-sm',
  secondary:
    'bg-surface text-foreground hover:bg-surface-raised border border-border',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  outline:
    'border border-border text-foreground hover:border-interactive hover:text-interactive',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 min-h-[var(--ds-min-touch)] sm:min-h-0',
  md: 'h-10 px-4 text-sm gap-2 min-h-[var(--ds-min-touch)]',
  lg: 'h-11 px-5 text-base gap-2 min-h-[var(--ds-min-touch)]',
  icon: 'h-10 w-10 min-h-[var(--ds-min-touch)] min-w-[var(--ds-min-touch)]',
}

function buttonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
) {
  return cn(
    'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-ring',
    'disabled:pointer-events-none disabled:opacity-50',
    variantStyles[variant],
    sizeStyles[size],
    className,
  )
}

type SharedButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children?: ReactNode
}

type NativeButtonProps = SharedButtonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    href?: undefined
  }

type AnchorButtonProps = SharedButtonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'> & {
    href: string
  }

export type ButtonProps = NativeButtonProps | AnchorButtonProps

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  const classes = buttonClassName(variant, size, className)

  if ('href' in props && props.href) {
    const { href, ...anchorProps } = props
    return (
      <a href={href} className={classes} {...anchorProps}>
        {children}
      </a>
    )
  }

  const buttonProps = props as NativeButtonProps
  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  )
}
