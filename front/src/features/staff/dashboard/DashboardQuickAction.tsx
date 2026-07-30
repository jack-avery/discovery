import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { PlaceholderQuickAction } from '@/features/staff/dashboard/placeholderData'
import { cn } from '@/utils/cn'

interface DashboardQuickActionProps {
  action: PlaceholderQuickAction
}

/**
 * Quick action tile for the dashboard grid.
 */
export function DashboardQuickAction({ action }: DashboardQuickActionProps) {
  const Icon = action.icon
  const isInteractive = Boolean(action.to || action.onClick)

  const className = cn(
    'flex h-full w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm',
    'transition-colors text-left',
    // Links get pointer from the browser; buttons need it explicitly (Tailwind v4).
    isInteractive && 'cursor-pointer',
  )

  const content = (
    <>
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          action.iconClassName,
        )}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-heading text-sm font-semibold text-foreground">
          {action.title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {action.description}
        </p>
      </div>

      <ChevronRight
        className="h-5 w-5 shrink-0 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </>
  )

  if (action.onClick) {
    return (
      <button type="button" onClick={action.onClick} className={className}>
        {content}
      </button>
    )
  }

  if (action.to) {
    return (
      <Link to={action.to} className={className}>
        {content}
      </Link>
    )
  }

  return <div className={className}>{content}</div>
}
