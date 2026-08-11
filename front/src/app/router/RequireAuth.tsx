import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { PUBLIC_POST_LOGIN_PATH } from '@/auth/postLoginNavigation'

/**
 * Guards Staff Workspace routes (`/staff/*`).
 * - Unauthenticated → `/sign-in` (return path preserved)
 * - Authenticated without staff workspace access (e.g. trusted_contributor) → Discover
 */
export function RequireAuth() {
  const { isAuthenticated, isInitializing, permissions } = useAuth()
  const location = useLocation()

  if (isInitializing && !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-muted-foreground" role="status">
          Checking session…
        </p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />
  }

  if (!permissions.canAccessStaffWorkspace) {
    return <Navigate to={PUBLIC_POST_LOGIN_PATH} replace />
  }

  return <Outlet />
}
