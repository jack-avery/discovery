import { Link } from 'react-router-dom'
import { StaffSessionControls } from '@/components/shared/StaffSessionControls'

export function NotFoundPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="app-header flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-5">
        <h1 className="min-w-0 flex-1 font-heading text-base font-semibold text-foreground">
          Page not found
        </h1>
        <StaffSessionControls />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="font-heading text-6xl font-bold text-muted-foreground/30">404</p>
        <p className="mt-4 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          to="/discover"
          className="mt-6 inline-flex h-10 min-h-[var(--ds-min-touch)] items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-ring"
        >
          Back to Discover
        </Link>
      </div>
    </div>
  )
}
