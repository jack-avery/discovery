import { PageShell } from '@/components/shared/PageShell'
import { SubmissionsPanel } from '@/features/submissions'

export function SubmissionsPage() {
  return (
    <PageShell
      title="Submissions"
      description="Review community-submitted resources pending moderation."
    >
      <SubmissionsPanel />
    </PageShell>
  )
}
