import { hasStaffAccess } from '@/auth/permissions'

/** Public Discover after trusted-contributor (or any non-staff) login. */
export const PUBLIC_POST_LOGIN_PATH = '/'

/** Default staff landing after moderator+ login. */
export const STAFF_POST_LOGIN_PATH = '/staff'

/**
 * Resolve where to send the user after a successful sign-in.
 *
 * Staff may return to a preserved `/staff/*` location; everyone else goes to
 * Discover. Never send a non-staff account into the Staff Workspace.
 */
export function resolvePostLoginPath(
  roles: readonly string[],
  locationState: unknown,
): string {
  if (!hasStaffAccess(roles)) {
    return PUBLIC_POST_LOGIN_PATH
  }

  if (
    locationState &&
    typeof locationState === 'object' &&
    'from' in locationState &&
    locationState.from &&
    typeof locationState.from === 'object' &&
    'pathname' in locationState.from &&
    typeof locationState.from.pathname === 'string' &&
    locationState.from.pathname.startsWith('/staff')
  ) {
    const from = locationState.from as {
      pathname: string
      search?: string
      hash?: string
    }
    return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
  }

  return STAFF_POST_LOGIN_PATH
}

/**
 * Where an already-authenticated visitor should go when opening `/sign-in`.
 */
export function resolveAuthenticatedSignInRedirect(
  roles: readonly string[],
): string {
  return hasStaffAccess(roles) ? STAFF_POST_LOGIN_PATH : PUBLIC_POST_LOGIN_PATH
}
