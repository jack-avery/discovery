import type { ReactNode } from 'react'
import { useSidebar } from '@/app/providers/SidebarProvider'
import { SidebarToggle } from './Sidebar'

interface PageShellProps {
  title: string
  description?: string
  children: ReactNode
}

export function PageShell({ title, description, children }: PageShellProps) {
  const { openSidebar } = useSidebar()

  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-thin">
      <header className="app-header flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-5">
        <div className="shrink-0 lg:hidden">
          <SidebarToggle onClick={openSidebar} />
        </div>
        <h1 className="min-w-0 flex-1 truncate font-heading text-base font-semibold text-foreground">
          {title}
        </h1>
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
