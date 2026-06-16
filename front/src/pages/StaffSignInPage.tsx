import { LogIn } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
import { EmptyState } from '@/components/shared'

export function StaffSignInPage() {
  return (
    <PageShell title="Staff Sign In">
      <EmptyState
        title="Staff authentication not available"
        description="Sign-in for RRCRC staff will be available in a future release. Public users can browse and submit resources without an account."
        icon={<LogIn className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
      />
    </PageShell>
  )
}
