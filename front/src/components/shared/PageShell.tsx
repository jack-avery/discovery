import type { ReactNode } from 'react'
import { StaffSessionControls } from '@/components/shared/StaffSessionControls'

interface PageShellProps {
  title: string
  description?: string
  children: ReactNode
  /** Optional header trailing content. Defaults to Staff Portal / session controls. */
  actions?: ReactNode
}

export function PageShell({ title, description, children, actions }: PageShellProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-thin">
      <header className="app-header flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-5">
        <h1 className="min-w-0 flex-1 truncate font-heading text-base font-semibold text-foreground">
          {title}
        </h1>
        {actions ?? <StaffSessionControls />}
      </header>

      <div className="page-container flex-1 space-y-section">
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {children}
      </div>
    </div>
  )
}
