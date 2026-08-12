import { Navigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import {
  PUBLIC_POST_LOGIN_PATH,
  resolveAuthenticatedSignInRedirect,
} from '@/auth/postLoginNavigation'
import { PageShell } from '@/components/shared/PageShell'
import { APP_BRANDING } from '@/config/appBranding'
import { SignInForm } from '@/features/staff/auth/SignInForm'
import { useIsMobile } from '@/hooks/useIsMobile'

export function StaffSignInPage() {
  const { isAuthenticated, isInitializing, user } = useAuth()
  const isMobile = useIsMobile()

  if (isInitializing && !isAuthenticated) {
    return (
      <PageShell title="Sign In">
        <div className="flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground" role="status">
            Checking session…
          </p>
        </div>
      </PageShell>
    )
  }

  if (isAuthenticated && user) {
    const redirect = resolveAuthenticatedSignInRedirect(user.roles)
    return (
      <Navigate
        to={
          isMobile && redirect.startsWith('/staff')
            ? PUBLIC_POST_LOGIN_PATH
            : redirect
        }
        replace
      />
    )
  }

  return (
    <PageShell title="Sign In">
      <div className="mx-auto w-full max-w-md space-y-section">
        <p className="text-center text-sm text-muted-foreground">
          Sign in with your {APP_BRANDING.communityName} account.
          <br />
          Public visitors can browse and submit resources without signing in.
        </p>
        <SignInForm />
      </div>
    </PageShell>
  )
}
