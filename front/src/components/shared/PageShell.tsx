import type { ReactNode } from 'react'
import { StaffSessionControls } from '@/components/shared/StaffSessionControls'
import { cn } from '@/utils/cn'

interface PageShellProps {
  title: string
  description?: string
  children: ReactNode
  /** Optional header trailing content. Defaults to Sign in / session controls. */
  actions?: ReactNode
  /**
   * When true, content fills the remaining viewport height without page-level
   * scroll — used by split-pane staff workspaces.
   */
  fill?: boolean
  /**
   * When true, children render below the shared header without `page-container`
   * chrome — used by full-bleed experiences (e.g. Submit Resource hero).
   */
  uncontained?: boolean
}

export function PageShell({
  title,
  description,
  children,
  actions,
  fill = false,
  uncontained = false,
}: PageShellProps) {
  return (
    <div
      className={cn(
        'flex h-full flex-col',
        fill || uncontained
          ? 'overflow-hidden'
          : 'overflow-y-auto scrollbar-thin',
      )}
    >
      {/* Desktop/tablet header — mobile uses MobilePublicHeader in AppLayout. */}
      <header className="app-header hidden shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-5 md:flex">
        <h1 className="min-w-0 flex-1 truncate font-heading text-base font-semibold text-foreground">
          {title}
        </h1>
        {actions ?? <StaffSessionControls />}
      </header>

      {uncontained ? (
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-hidden">
          {children}
        </div>
      ) : (
        <div
          className={cn(
            'page-container flex-1 overflow-x-hidden',
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
      )}
    </div>
  )
}
