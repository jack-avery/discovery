import { Navigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { PageShell } from '@/components/shared/PageShell'
import { SignInForm } from '@/features/staff/auth/SignInForm'

export function StaffSignInPage() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/staff" replace />
  }

  return (
    <PageShell title="Staff Sign In">
      <div className="mx-auto w-full max-w-md space-y-section">
        <p className="text-center text-sm text-muted-foreground">
          Authorized RRCRC staff only.
          <br />
          Public visitors can browse and submit resources without an account.
        </p>
        <SignInForm />
      </div>
    </PageShell>
  )
}
