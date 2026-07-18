import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface PanelHeaderProps {
  /** Primary label — string or custom element. */
  title?: ReactNode
  /** Secondary label shown beneath the title. */
  subtitle?: ReactNode
  /** Content before the title block (e.g. logo, icon). */
  leading?: ReactNode
  /** Trailing actions (e.g. collapse, settings). */
  trailing?: ReactNode
  /** Reduced horizontal padding for narrow panels. */
  compact?: boolean
  /** Centre content when no trailing actions (e.g. collapsed nav logo). */
  centered?: boolean
  className?: string
}

/**
 * Standard header for application panels (navigation rail, workspaces, detail panels).
 * Height, padding, divider, and alignment are defined in design tokens / `.panel-header`.
 */
export function PanelHeader({
  title,
  subtitle,
  leading,
  trailing,
  compact = false,
  centered = false,
  className,
}: PanelHeaderProps) {
  const hasTitleBlock = Boolean(title || subtitle)
  const hasTrailing = Boolean(trailing)

  return (
    <header
      className={cn(
        'panel-header flex shrink-0 items-center border-b border-border bg-surface',
        compact && 'panel-header--compact',
        centered && 'justify-center',
        className,
      )}
    >
      <div
        className={cn(
          'flex min-w-0 items-center',
          centered ? 'justify-center' : 'flex-1',
          hasTitleBlock || leading ? 'gap-[var(--ds-panel-header-gap)]' : undefined,
        )}
      >
        {leading}
        {hasTitleBlock && (
          <div className="min-w-0">
            {title && (
              <div className="truncate leading-tight">{title}</div>
            )}
            {subtitle && (
              <div className="truncate leading-tight">{subtitle}</div>
            )}
          </div>
        )}
      </div>

      {hasTrailing && !centered && (
        <div className="ml-2 flex shrink-0 items-center">{trailing}</div>
      )}
    </header>
  )
}
