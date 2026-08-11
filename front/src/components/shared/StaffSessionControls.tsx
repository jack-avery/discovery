import { LogOut } from 'lucide-react'
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
 * Anonymous: Sign in link. Authenticated (any role): display name | Sign out.
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
        <span
          aria-hidden="true"
          className="h-4 w-px shrink-0 bg-border"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isLoading}
          onClick={() => {
            void logout()
          }}
          className="h-8 shrink-0 gap-1.5 pl-0 pr-2"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Sign out
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
