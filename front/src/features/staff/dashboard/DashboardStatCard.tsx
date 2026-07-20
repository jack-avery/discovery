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
  value: number | string
  description: string
  icon: LucideIcon
  accent?: StatAccent
  /** Renders plain red priority text directly below the icon. */
  showHighPriorityLabel?: boolean
  /** When set, the card navigates to this route on click. */
  to?: string
}

function StatCardContent({
  title,
  value,
  description,
  icon: Icon,
  accent = 'primary',
  showHighPriorityLabel = false,
}: Omit<DashboardStatCardProps, 'to'>) {
  const styles = accentStyles[accent]

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
        <p
          className={cn(
            'font-heading text-3xl font-bold leading-none tracking-tight',
            styles.value,
          )}
        >
          {value}
        </p>
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
  ...contentProps
}: DashboardStatCardProps) {
  const cardClassName = cn(
    'h-full shadow-sm',
    to && 'transition-shadow hover:shadow-md',
  )

  if (to) {
    return (
      <Link
        to={to}
        className="block h-full rounded-xl focus-ring"
        aria-label={`${title}: ${contentProps.description}`}
      >
        <Card className={cardClassName}>
          <StatCardContent title={title} {...contentProps} />
        </Card>
      </Link>
    )
  }

  return (
    <Card className={cardClassName}>
      <StatCardContent title={title} {...contentProps} />
    </Card>
  )
}
