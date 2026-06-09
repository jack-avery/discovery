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
      <header className="flex shrink-0 items-start gap-3 border-b border-border bg-surface px-4 py-4 sm:px-6">
        <div className="lg:hidden">
          <SidebarToggle onClick={openSidebar} />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </header>

      <div className="page-container flex-1 space-y-section">{children}</div>
    </div>
  )
}
