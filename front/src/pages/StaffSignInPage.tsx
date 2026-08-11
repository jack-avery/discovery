import { Navigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { PageShell } from '@/components/shared/PageShell'
import { APP_BRANDING } from '@/config/appBranding'
import { SignInForm } from '@/features/staff/auth/SignInForm'

export function StaffSignInPage() {
  const { isAuthenticated, isInitializing } = useAuth()

  if (isInitializing && !isAuthenticated) {
    return (
      <PageShell title="Staff Sign In">
        <div className="flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground" role="status">
            Checking session…
          </p>
        </div>
      </PageShell>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/staff" replace />
  }

  return (
    <PageShell title="Staff Sign In">
      <div className="mx-auto w-full max-w-md space-y-section">
        <p className="text-center text-sm text-muted-foreground">
          Authorized {APP_BRANDING.communityName} staff only.
          <br />
          Public visitors can browse and submit resources without an account.
        </p>
        <SignInForm />
      </div>
    </PageShell>
  )
}
