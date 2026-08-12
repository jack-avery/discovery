import { Link } from 'react-router-dom'
import { APP_BRANDING } from '@/config/appBranding'

/**
 * Shown for `/staff/*` when the viewport is below the `md` breakpoint.
 * Staff portal remains fully available on desktop.
 */
export function StaffMobileUnavailable() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto bg-background px-6 py-10 scrollbar-thin">
      <div className="mx-auto w-full max-w-md space-y-4 text-center">
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary"
          aria-hidden="true"
        >
          <span className="font-heading text-sm font-bold text-primary-foreground">
            {APP_BRANDING.communityMark}
          </span>
        </div>
        <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
          Staff Portal Unavailable on Mobile
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The staff portal is designed for larger screens. Please access it from
          a desktop or laptop computer.
        </p>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          <Link
            to="/home"
            className="inline-flex h-10 min-h-[var(--ds-min-touch)] w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover focus-ring sm:w-auto"
          >
            Return to Home
          </Link>
          <Link
            to="/"
            className="inline-flex h-10 min-h-[var(--ds-min-touch)] w-full items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-surface-raised focus-ring sm:w-auto"
          >
            Discover Resources
          </Link>
        </div>
      </div>
    </div>
  )
}
