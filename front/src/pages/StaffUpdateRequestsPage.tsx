import { FilePenLine } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
import { EmptyState } from '@/components/shared'

/**
 * Placeholder staff page for Resource Updates.
 * Primary moderation lives under Review Submissions (contribution type filter).
 *
 * TODO(update-resource): Rename StaffUpdateRequestsPage / route path when
 * aligning internal names with "Resource Update" terminology.
 */
export function StaffUpdateRequestsPage() {
  return (
    <PageShell
      title="Review Resource Updates"
      description="Review community Resource Updates to existing listings."
    >
      <div className="flex min-h-[16rem] items-center justify-center">
        <EmptyState
          title="Review Resource Updates coming next"
          description="Resource Updates are reviewed in Review Submissions. A dedicated view may appear here in a later milestone."
          icon={
            <FilePenLine className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          }
        />
      </div>
    </PageShell>
  )
}
