import { Link } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { Button } from '@/components/ui'
import { displayName } from '@/types/auth'
import { cn } from '@/utils/cn'

interface StaffSessionControlsProps {
  className?: string
}

/**
 * Top-right session controls for public and authenticated states.
 * Public: Staff Portal link. Authenticated: display name | Sign Out.
 */
export function StaffSessionControls({ className }: StaffSessionControlsProps) {
  const { isAuthenticated, user, isLoading, logout } = useAuth()

  if (isAuthenticated && user) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center gap-2 text-sm text-muted-foreground',
          className,
        )}
      >
        <span className="max-w-[10rem] truncate font-medium text-foreground sm:max-w-[14rem]">
          {displayName(user)}
        </span>
        <span aria-hidden="true">|</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isLoading}
          onClick={() => {
            void logout()
          }}
          className="min-h-0 px-2"
        >
          Sign Out
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
      Staff Portal
    </Link>
  )
}
