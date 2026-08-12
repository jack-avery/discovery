import { LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { Button } from '@/components/ui'
import { displayName } from '@/types/auth'
import { cn } from '@/utils/cn'

interface StaffSessionControlsProps {
  className?: string
  /**
   * Compact chrome for the mobile public header — hides the display name and
   * shortens Sign out so controls fit beside the hamburger without overflow.
   * Desktop callers must omit this (default false).
   */
  compact?: boolean
}

/**
 * Top-right session controls for public and authenticated states.
 * Anonymous: Sign in link. Authenticated (any role): display name | Sign out.
 */
export function StaffSessionControls({
  className,
  compact = false,
}: StaffSessionControlsProps) {
  const { isAuthenticated, user, isLoading, logout } = useAuth()

  if (isAuthenticated && user) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center gap-2 text-sm text-muted-foreground',
          className,
        )}
      >
        {!compact ? (
          <>
            <span className="max-w-[10rem] truncate font-medium text-foreground sm:max-w-[14rem]">
              {displayName(user)}
            </span>
            <span
              aria-hidden="true"
              className="h-4 w-px shrink-0 bg-border"
            />
          </>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isLoading}
          onClick={() => {
            void logout()
          }}
          className={cn(
            'h-8 shrink-0 gap-1.5',
            compact ? 'px-2' : 'pl-0 pr-2',
          )}
          aria-label={compact ? `Sign out (${displayName(user)})` : undefined}
          title={compact ? displayName(user) : undefined}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {compact ? null : 'Sign out'}
          {compact ? <span className="sr-only">Sign out</span> : null}
        </Button>
      </div>
    )
  }

  return (
    <Link
      to="/sign-in"
      className={cn(
        'shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-interactive',
        'hover:bg-interactive-muted focus-ring',
        className,
      )}
    >
      Sign in
    </Link>
  )
}
