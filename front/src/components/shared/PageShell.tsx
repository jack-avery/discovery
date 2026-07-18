import type { ReactNode } from 'react'
import { StaffSessionControls } from '@/components/shared/StaffSessionControls'
import { cn } from '@/utils/cn'

interface PageShellProps {
  title: string
  description?: string
  children: ReactNode
  /** Optional header trailing content. Defaults to Staff Portal / session controls. */
  actions?: ReactNode
  /**
   * When true, content fills the remaining viewport height without page-level
   * scroll — used by split-pane staff workspaces.
   */
  fill?: boolean
}

export function PageShell({
  title,
  description,
  children,
  actions,
  fill = false,
}: PageShellProps) {
  return (
    <div
      className={cn(
        'flex h-full flex-col',
        fill ? 'overflow-hidden' : 'overflow-y-auto scrollbar-thin',
      )}
    >
      <header className="app-header flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-5">
        <h1 className="min-w-0 flex-1 truncate font-heading text-base font-semibold text-foreground">
          {title}
        </h1>
        {actions ?? <StaffSessionControls />}
      </header>

      <div
        className={cn(
          'page-container flex-1',
          fill
            ? 'flex min-h-0 flex-col overflow-hidden pt-4'
            : 'space-y-section',
        )}
      >
        {description ? (
          <p
            className={cn(
              'text-sm text-muted-foreground',
              fill && 'mb-3 shrink-0',
            )}
          >
            {description}
          </p>
        ) : null}
        {fill ? (
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
