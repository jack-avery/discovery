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
    <PageShell
      title="Staff Sign In"
      description="Authorized RRCRC staff only. Public visitors can browse and submit resources without an account."
    >
      <SignInForm />
    </PageShell>
  )
}
