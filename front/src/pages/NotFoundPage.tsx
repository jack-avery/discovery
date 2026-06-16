import { Link } from 'react-router-dom'
import { useSidebar } from '@/app/providers/SidebarProvider'
import { SidebarToggle } from '@/components/shared'
import { Button } from '@/components/ui'

export function NotFoundPage() {
  const { openSidebar } = useSidebar()

  return (
    <div className="flex h-full flex-col">
      <header className="app-header flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-5">
        <div className="shrink-0 lg:hidden">
          <SidebarToggle onClick={openSidebar} />
        </div>
        <h1 className="font-heading text-base font-semibold text-foreground">Page not found</h1>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="font-heading text-6xl font-bold text-muted-foreground/30">404</p>
        <p className="mt-4 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link to="/" className="mt-6">
          <Button>Back to Discover</Button>
        </Link>
      </div>
    </div>
  )
}
