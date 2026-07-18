import { PageShell } from '@/components/shared/PageShell'
import { ReviewSubmissionsWorkspace } from '@/features/staff/submissions'

/**
 * Staff moderator workspace for reviewing pending community submissions.
 */
export function StaffSubmissionsPage() {
  return (
    <PageShell
      title="Review Submissions"
      description="Review community submissions awaiting moderation."
      fill
    >
      <ReviewSubmissionsWorkspace />
    </PageShell>
  )
}
