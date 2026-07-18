import { FilePenLine } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
import { EmptyState } from '@/components/shared'

/**
 * Placeholder for Milestone 4 — Review Update Requests.
 */
export function StaffUpdateRequestsPage() {
  return (
    <PageShell
      title="Review Update Requests"
      description="Review community requests to update existing resources."
    >
      <div className="flex min-h-[16rem] items-center justify-center">
        <EmptyState
          title="Review Update Requests coming next"
          description="The update-request queue and comparison view will appear here in a later milestone."
          icon={
            <FilePenLine className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          }
        />
      </div>
    </PageShell>
  )
}
