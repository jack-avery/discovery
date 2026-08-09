import { PageShell } from '@/components/shared/PageShell'
import { SetupPasswordForm } from '@/features/staff/auth/SetupPasswordForm'

/**
 * Public password setup page for one-time admin-issued tokens.
 * Not wrapped in RequireAuth.
 */
export function SetupPasswordPage() {
  return (
    <PageShell title="Set Password">
      <div className="mx-auto w-full max-w-md space-y-section">
        <p className="text-center text-sm text-muted-foreground">
          Use the one-time link from your administrator to choose a password.
        </p>
        <SetupPasswordForm />
      </div>
    </PageShell>
  )
}
