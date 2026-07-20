import { ChevronRight } from 'lucide-react'
import type { PlaceholderQuickAction } from '@/features/staff/dashboard/placeholderData'
import { cn } from '@/utils/cn'

interface DashboardQuickActionProps {
  action: PlaceholderQuickAction
}

/**
 * Quick action tile for the dashboard grid. Navigation wiring arrives in a later milestone.
 */
export function DashboardQuickAction({ action }: DashboardQuickActionProps) {
  const Icon = action.icon

  return (
    <div
      className={cn(
        'flex h-full w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm',
        'transition-colors',
      )}
    >
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
    </div>
  )
}
