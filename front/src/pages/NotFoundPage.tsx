import { Link } from 'react-router-dom'
import { useSidebar } from '@/app/providers/SidebarProvider'
import { SidebarToggle } from '@/components/shared'
import { Button } from '@/components/ui'

export function NotFoundPage() {
  const { openSidebar } = useSidebar()

  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <div className="absolute left-4 top-4 lg:hidden">
        <SidebarToggle onClick={openSidebar} />
      </div>
      <p className="font-heading text-6xl font-bold text-muted-foreground/30">404</p>
      <h1 className="mt-4 font-heading text-xl font-semibold text-foreground">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link to="/" className="mt-6">
        <Button>Back to Discover</Button>
      </Link>
    </div>
  )
}
