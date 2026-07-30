import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/utils/cn'

type StatAccent = 'success' | 'primary' | 'danger'

const accentStyles: Record<
  StatAccent,
  { iconWrap: string; value: string }
> = {
  success: {
    iconWrap: 'bg-success/15 text-success',
    value: 'text-success',
  },
  primary: {
    iconWrap: 'bg-primary-muted text-primary',
    value: 'text-primary',
  },
  danger: {
    iconWrap: 'bg-[#dc2626]/10 text-[#dc2626]',
    value: 'text-[#dc2626]',
  },
}

interface DashboardStatCardProps {
  title: string
  /** Live value, or null when unavailable. Ignored while loading. */
  value: number | string | null
  description: string
  icon: LucideIcon
  accent?: StatAccent
  /** Renders plain red priority text directly below the icon. */
  showHighPriorityLabel?: boolean
  /** When set, the card navigates to this route on click (disabled while loading/unavailable). */
  to?: string
  isLoading?: boolean
  /** When true (and not loading), show an unavailable placeholder instead of a number. */
  unavailable?: boolean
}

function StatCardContent({
  title,
  value,
  description,
  icon: Icon,
  accent = 'primary',
  showHighPriorityLabel = false,
  isLoading = false,
  unavailable = false,
}: Omit<DashboardStatCardProps, 'to'>) {
  const styles = accentStyles[accent]
  const showUnavailable = !isLoading && (unavailable || value == null)

  return (
    <CardContent className="flex h-full items-start gap-4">
      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <span
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full',
            styles.iconWrap,
          )}
          aria-hidden="true"
        >
          <Icon className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <span
          className={cn(
            'min-h-[1rem] text-center text-xs font-medium leading-none',
            showHighPriorityLabel ? 'text-[#dc2626]' : 'invisible',
          )}
          aria-hidden={!showHighPriorityLabel}
        >
          High Priority
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        {isLoading ? (
          <div
            className="h-8 w-16 animate-pulse rounded-md bg-muted"
            role="status"
            aria-label={`Loading ${title}`}
          />
        ) : (
          <p
            className={cn(
              'font-heading text-3xl font-bold leading-none tracking-tight',
              showUnavailable ? 'text-muted-foreground' : styles.value,
            )}
          >
            {showUnavailable ? '—' : value}
          </p>
        )}
        <p className="font-heading text-sm font-semibold text-foreground">
          {title}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </CardContent>
  )
}

/**
 * Informational KPI tile. Optionally navigates when `to` is provided.
 */
export function DashboardStatCard({
  to,
  title,
  isLoading = false,
  unavailable = false,
  value,
  ...contentProps
}: DashboardStatCardProps) {
  const isInteractive = Boolean(to) && !isLoading && !unavailable && value != null
  const cardClassName = cn(
    'h-full shadow-sm',
    isInteractive && 'transition-shadow hover:shadow-md',
  )

  const content = (
    <StatCardContent
      title={title}
      value={value}
      isLoading={isLoading}
      unavailable={unavailable}
      {...contentProps}
    />
  )

  if (isInteractive && to) {
    const valueLabel = typeof value === 'number' ? String(value) : String(value)
    return (
      <Link
        to={to}
        className="block h-full rounded-xl focus-ring"
        aria-label={`${title}: ${valueLabel}. ${contentProps.description}`}
      >
        <Card className={cardClassName}>{content}</Card>
      </Link>
    )
  }

  return <Card className={cardClassName}>{content}</Card>
}
