import { PageShell } from '@/components/shared/PageShell'
import { EmptyState } from '@/components/shared'
import { LayoutDashboard } from 'lucide-react'

/**
 * Temporary authenticated landing page for Milestone 1.
 * Milestone 2 replaces this with the staff dashboard.
 */
export function StaffHomePage() {
  return (
    <PageShell
      title="Staff Workspace"
      description="You are signed in to the RRCRC Staff Portal."
    >
      <EmptyState
        title="Staff workspace coming next"
        description="The dashboard, review queue, and update-request tools will appear here in the next milestone."
        icon={
          <LayoutDashboard className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
        }
      />
    </PageShell>
  )
}
