import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface DetailGlanceRowProps {
  label: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Single row inside the grouped service-details panel.
 */
export function DetailGlanceRow({ label, icon, children, className }: DetailGlanceRowProps) {
  return (
    <div className={cn('flex gap-2.5 py-2.5 first:pt-0 last:pb-0', className)}>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {icon && (
            <span className="inline-flex shrink-0 text-interactive" aria-hidden="true">
              {icon}
            </span>
          )}
          <span>{label}</span>
        </div>
        <div className="text-sm leading-snug text-foreground">{children}</div>
      </div>
    </div>
  )
}

interface DetailGlancePanelProps {
  children: ReactNode
  footer?: ReactNode
  className?: string
}

/**
 * Grouped summary panel for eligibility, cost, accessibility, and hours.
 */
export function DetailGlancePanel({ children, footer, className }: DetailGlancePanelProps) {
  return (
    <div className={cn(className)}>
      {children}
      {footer && <div className="mt-1 border-t border-border pt-2">{footer}</div>}
    </div>
  )
}

interface DetailSectionCardProps {
  icon?: ReactNode
  title: ReactNode
  headerAction?: ReactNode
  children?: ReactNode
  className?: string
  'aria-label'?: string
  /** When set, the header toggles expanded content. Collapsed cards show header only. */
  expanded?: boolean
  onToggle?: () => void
  panelId?: string
}

/**
 * Shared information card chrome for About, Location, and Service Details.
 */
export function DetailSectionCard({
  icon,
  title,
  headerAction,
  children,
  className,
  'aria-label': ariaLabel,
  expanded,
  onToggle,
  panelId,
}: DetailSectionCardProps) {
  const isCollapsible = typeof onToggle === 'function'
  const showBody =
    children !== undefined &&
    children !== null &&
    children !== false &&
    (!isCollapsible || Boolean(expanded))

  const heading = (
    <>
      {icon && (
        <span className="inline-flex shrink-0 text-interactive" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="truncate">{title}</span>
    </>
  )

  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        'rounded-xl border border-border bg-surface p-3 shadow-sm',
        className,
      )}
    >
      {isCollapsible ? (
        <button
          type="button"
          className="flex w-full min-h-[var(--ds-min-touch)] items-center justify-between gap-2 rounded-md text-left focus-ring sm:min-h-0"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
            {heading}
          </span>
          {headerAction}
        </button>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
            {heading}
          </h3>
          {headerAction && <div className="flex shrink-0 items-center">{headerAction}</div>}
        </div>
      )}

      {showBody && (
        <div id={panelId} className="mt-2.5">
          {children}
        </div>
      )}
    </section>
  )
}
