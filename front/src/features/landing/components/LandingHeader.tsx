import { Link } from 'react-router-dom'
import { CircleUser } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { StaffSessionControls } from '@/components/shared/StaffSessionControls'
import { APP_BRANDING } from '@/config/appBranding'

/**
 * Minimal public landing header: brand + Sign in / session controls.
 * Application navigation stays in the left rail — do not duplicate it here.
 */
export function LandingHeader() {
  const { isAuthenticated } = useAuth()

  return (
    <header className="app-header flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6 lg:px-10">
      <Link
        to="/home"
        className="flex min-w-0 items-center gap-3 rounded-lg focus-ring"
        aria-label="Rideau-Rockcliffe Community Resource Map home"
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary"
          aria-hidden="true"
        >
          <span className="font-heading text-xs font-bold text-primary-foreground">
            {APP_BRANDING.communityMark}
          </span>
        </div>
        <span className="truncate font-heading text-sm font-semibold text-foreground sm:text-base">
          Rideau-Rockcliffe Community Resource Map
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-1.5">
        {!isAuthenticated ? (
          <CircleUser
            className="h-4 w-4 text-foreground"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        ) : null}
        <StaffSessionControls className="text-foreground hover:bg-muted hover:text-foreground" />
      </div>
    </header>
  )
}
