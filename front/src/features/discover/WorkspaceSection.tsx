import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface WorkspaceSectionProps {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  divider?: boolean
  'aria-label'?: string
  className?: string
}

/**
 * Standard section layout inside a workspace panel.
 * Spacing is defined by design tokens — do not add ad-hoc margins in section content.
 */
export function WorkspaceSection({
  title,
  subtitle,
  actions,
  children,
  divider = false,
  'aria-label': ariaLabel,
  className,
}: WorkspaceSectionProps) {
  const hasHeader = Boolean(title || subtitle || actions)
  const hasContent = children !== undefined && children !== null && children !== false

  if (!hasHeader && !hasContent) {
    return null
  }

  return (
    <section
      aria-label={!title ? ariaLabel : undefined}
      className={cn(divider && 'border-b border-border', className)}
    >
      {hasHeader && (
        <div className="workspace-section__header flex items-start justify-between gap-2">
          <div className="min-w-0">
            {title && (
              <div className="workspace-section__title truncate">{title}</div>
            )}
            {subtitle && (
              <div className="workspace-section__subtitle truncate">{subtitle}</div>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center">{actions}</div>}
        </div>
      )}

      {hasContent && <div className="workspace-section__content">{children}</div>}
    </section>
  )
}
